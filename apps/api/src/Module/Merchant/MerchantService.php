<?php
declare(strict_types=1);
namespace Lodgik\Module\Merchant;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{Merchant, MerchantKyc, MerchantBankAccount, MerchantHotel, CommissionTier, Commission, CommissionPayout, MerchantResource, MerchantResourceDownload, MerchantSupportTicket, MerchantAuditLog, MerchantNotification, MerchantLead, MerchantStatement, User};
use Lodgik\Enum\{MerchantStatus, MerchantCategory, CommissionScope, CommissionStatus, UserRole};
use Lodgik\Service\ZeptoMailService;
use Lodgik\Service\JwtService;
use Lodgik\Entity\RefreshToken;

final class MerchantService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ZeptoMailService $mailer,
        private readonly JwtService $jwt,
    ) {}

    // ─── Registration & Lifecycle ──────────────────────────────

    /**
     * Admin-initiated merchant onboarding.
     * Creates: User (merchant_admin) + Merchant + KYC placeholder.
     * Returns merchant + invitation link for the merchant to set password.
     */
    public function onboardMerchant(array $data, string $adminUserId, string $adminTenantId): array
    {
        // Check email uniqueness
        $filters = $this->em->getFilters();
        $tenantWasEnabled = $filters->isEnabled('tenant_filter');
        if ($tenantWasEnabled) $filters->disable('tenant_filter');

        $existingUser = $this->em->getRepository(User::class)->findOneBy(['email' => strtolower(trim($data['email']))]);

        if ($tenantWasEnabled) $filters->enable('tenant_filter');

        if ($existingUser) {
            throw new \RuntimeException('A user with this email already exists');
        }

        // 1. Create user with merchant_admin role and a random unusable password
        $tempHash = password_hash(bin2hex(random_bytes(32)), PASSWORD_ARGON2ID);
        $names = $this->splitName($data['contact_name'] ?? $data['business_name']);

        $user = new User(
            $names['first'],
            $names['last'],
            $data['email'],
            $tempHash,
            UserRole::MERCHANT_ADMIN,
            $adminTenantId,
        );

        // Generate invitation token so merchant can set their password
        $inviteToken = bin2hex(random_bytes(32));
        $user->setInvitationToken($inviteToken);
        $this->em->persist($user);

        // 2. Create merchant linked to the new user
        $m = new Merchant();
        $m->setLegalName($data['legal_name']);
        $m->setBusinessName($data['business_name']);
        $m->setEmail($data['email']);
        if (isset($data['phone'])) $m->setPhone($data['phone']);
        if (isset($data['address'])) $m->setAddress($data['address']);
        if (isset($data['operating_region'])) $m->setOperatingRegion($data['operating_region']);
        if (isset($data['type'])) $m->setType($data['type']);
        if (isset($data['category'])) $m->setCategory(MerchantCategory::from($data['category']));
        if (isset($data['settlement_currency'])) $m->setSettlementCurrency($data['settlement_currency']);
        $m->setUserId($user->getId());
        $this->em->persist($m);

        // 3. Auto-create KYC placeholder
        $kyc = new MerchantKyc();
        $kyc->setMerchantId($m->getId());
        $kyc->setKycType(($data['type'] ?? 'individual') === 'company' ? 'business' : 'individual');
        $this->em->persist($kyc);

        $this->em->flush();
        $this->audit($m->getId(), $adminUserId, 'admin', 'merchant_onboarded', 'Merchant', $m->getId());

        // 4. Send invitation email
        $merchantPortalUrl = $_ENV['MERCHANT_APP_URL'] ?? 'https://merchant.lodgik.co';
        $inviteUrl = rtrim($merchantPortalUrl, '/') . '/login?invite=' . urlencode($inviteToken);

        try {
            $this->mailer->sendMerchantInvitation(
                $data['email'],
                $names['first'],
                $data['business_name'],
                $inviteUrl,
            );
        } catch (\Throwable $e) {
            // Log but don't fail — admin can copy the link manually
        }

        return [
            'merchant' => $m->toArray(),
            'user_id' => $user->getId(),
            'invite_token' => $inviteToken,
            'invite_url' => $inviteUrl,
        ];
    }

    private function splitName(string $fullName): array
    {
        $parts = explode(' ', trim($fullName), 2);
        return ['first' => $parts[0] ?: 'Merchant', 'last' => $parts[1] ?? 'User'];
    }

    /**
     * Public self-registration. Creates User + Merchant + returns JWT tokens.
     */
    public function selfRegisterMerchant(array $data): array
    {
        // Check email uniqueness
        $filters = $this->em->getFilters();
        $tenantWasEnabled = $filters->isEnabled('tenant_filter');
        if ($tenantWasEnabled) $filters->disable('tenant_filter');

        $existingUser = $this->em->getRepository(User::class)->findOneBy(['email' => strtolower(trim($data['email']))]);

        if ($tenantWasEnabled) $filters->enable('tenant_filter');

        if ($existingUser) {
            throw new \RuntimeException('An account with this email already exists. Please login instead.');
        }

        // 1. Create user
        $passwordHash = password_hash($data['password'], PASSWORD_ARGON2ID);
        $user = new User(
            $data['first_name'],
            $data['last_name'],
            $data['email'],
            $passwordHash,
            UserRole::MERCHANT_ADMIN,
            'platform', // merchant users are platform-level
        );
        $user->markEmailVerified();
        $user->setIsActive(true);
        $this->em->persist($user);

        // 2. Create merchant
        $m = new Merchant();
        $m->setLegalName($data['legal_name'] ?? $data['business_name']);
        $m->setBusinessName($data['business_name']);
        $m->setEmail($data['email']);
        if (isset($data['phone'])) $m->setPhone($data['phone']);
        if (isset($data['address'])) $m->setAddress($data['address']);
        if (isset($data['operating_region'])) $m->setOperatingRegion($data['operating_region']);
        if (isset($data['type'])) $m->setType($data['type']);
        if (isset($data['category'])) $m->setCategory(MerchantCategory::from($data['category'] ?? 'sales_agent'));
        if (isset($data['settlement_currency'])) $m->setSettlementCurrency($data['settlement_currency']);
        $m->setUserId($user->getId());
        $this->em->persist($m);

        // 3. KYC placeholder
        $kyc = new MerchantKyc();
        $kyc->setMerchantId($m->getId());
        $kyc->setKycType(($data['type'] ?? 'individual') === 'company' ? 'business' : 'individual');
        $this->em->persist($kyc);

        // 4. Generate JWT token pair for auto-login
        $accessToken = $this->jwt->createAccessToken($user->getJwtClaims());
        $rawRefresh = bin2hex(random_bytes(32));
        $refreshEntity = new RefreshToken(
            userId: $user->getId(),
            tokenHash: RefreshToken::hashToken($rawRefresh),
            expiresAt: new \DateTimeImmutable('+30 days'),
        );
        $this->em->persist($refreshEntity);

        $this->em->flush();
        $this->audit($m->getId(), $user->getId(), 'merchant', 'merchant_self_registered', 'Merchant', $m->getId());

        return [
            'merchant' => $m->toArray(),
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'name' => $user->getFirstName() . ' ' . $user->getLastName(),
                'role' => $user->getRole()->value,
            ],
            'access_token' => $accessToken,
            'refresh_token' => $rawRefresh,
        ];
    }

    public function registerMerchant(array $data): Merchant
    {
        $m = new Merchant();
        $m->setLegalName($data['legal_name']);
        $m->setBusinessName($data['business_name']);
        $m->setEmail($data['email']);
        if (isset($data['phone'])) $m->setPhone($data['phone']);
        if (isset($data['address'])) $m->setAddress($data['address']);
        if (isset($data['operating_region'])) $m->setOperatingRegion($data['operating_region']);
        if (isset($data['type'])) $m->setType($data['type']);
        if (isset($data['category'])) $m->setCategory(MerchantCategory::from($data['category']));
        if (isset($data['settlement_currency'])) $m->setSettlementCurrency($data['settlement_currency']);
        if (isset($data['user_id'])) $m->setUserId($data['user_id']);

        $this->em->persist($m);

        // Auto-create KYC placeholder
        $kyc = new MerchantKyc();
        $kyc->setMerchantId($m->getId());
        $kyc->setKycType($data['type'] === 'company' ? 'business' : 'individual');
        $this->em->persist($kyc);

        $this->em->flush();
        $this->audit($m->getId(), $data['user_id'] ?? $m->getId(), 'merchant', 'merchant_registered', 'Merchant', $m->getId());
        return $m;
    }

    public function approveMerchant(string $id): Merchant
    {
        $m = $this->getMerchant($id);
        $kyc = $this->em->getRepository(MerchantKyc::class)->findOneBy(['merchantId' => $id]);
        $newStatus = ($kyc && $kyc->getStatus() === 'approved') ? MerchantStatus::ACTIVE : MerchantStatus::KYC_IN_PROGRESS;
        $m->setStatus($newStatus);
        if ($newStatus === MerchantStatus::ACTIVE) $m->setApprovedAt(new \DateTimeImmutable());

        // Assign default tier if none
        if (!$m->getCommissionTierId()) {
            $default = $this->em->getRepository(CommissionTier::class)->findOneBy(['isDefault' => true, 'isActive' => true]);
            if ($default) $m->setCommissionTierId($default->getId());
        }

        $this->em->flush();
        $this->notify($m->getId(), 'kyc_update', 'Application Approved', "Your merchant application has been approved. Status: {$newStatus->label()}");
        return $m;
    }

    public function suspendMerchant(string $id, string $reason): Merchant
    {
        $m = $this->getMerchant($id);
        $m->setStatus(MerchantStatus::SUSPENDED);
        $m->setSuspensionReason($reason);
        $m->setSuspendedAt(new \DateTimeImmutable());
        $this->em->flush();
        $this->notify($m->getId(), 'policy_change', 'Account Suspended', "Your merchant account has been suspended. Reason: $reason");
        return $m;
    }

    public function terminateMerchant(string $id, string $reason): Merchant
    {
        $m = $this->getMerchant($id);
        $m->setStatus(MerchantStatus::TERMINATED);
        $m->setSuspensionReason($reason);
        $m->setTerminatedAt(new \DateTimeImmutable());
        $this->em->flush();
        return $m;
    }

    public function getMerchant(string $id): Merchant
    {
        $m = $this->em->find(Merchant::class, $id);
        if (!$m) throw new \RuntimeException('Merchant not found');
        return $m;
    }

    public function getMerchantByUserId(string $userId): ?Merchant
    {
        return $this->em->getRepository(Merchant::class)->findOneBy(['userId' => $userId]);
    }

    public function getMerchantProfile(string $id): array
    {
        $m = $this->getMerchant($id);
        $kyc = $this->em->getRepository(MerchantKyc::class)->findOneBy(['merchantId' => $id]);
        $bank = $this->em->getRepository(MerchantBankAccount::class)->findOneBy(['merchantId' => $id]);
        $hotelCount = (int) $this->em->createQuery("SELECT COUNT(h) FROM Lodgik\Entity\MerchantHotel h WHERE h.merchantId = :m")->setParameter('m', $id)->getSingleScalarResult();
        $tier = $m->getCommissionTierId() ? $this->em->find(CommissionTier::class, $m->getCommissionTierId()) : null;

        // Fetch linked user info
        $userInfo = null;
        if ($m->getUserId()) {
            $filters = $this->em->getFilters();
            $tenantWasEnabled = $filters->isEnabled('tenant_filter');
            if ($tenantWasEnabled) $filters->disable('tenant_filter');

            $user = $this->em->find(User::class, $m->getUserId());

            if ($tenantWasEnabled) $filters->enable('tenant_filter');

            if ($user) {
                $merchantPortalUrl = $_ENV['MERCHANT_APP_URL'] ?? 'https://merchant.lodgik.co';
                $userInfo = [
                    'id' => $user->getId(),
                    'email' => $user->getEmail(),
                    'name' => $user->getFirstName() . ' ' . $user->getLastName(),
                    'is_active' => $user->isActive(),
                    'has_invitation' => $user->getInvitationToken() !== null,
                    'invite_url' => $user->getInvitationToken()
                        ? rtrim($merchantPortalUrl, '/') . '/login?invite=' . urlencode($user->getInvitationToken())
                        : null,
                ];
            }
        }

        return array_merge($m->toArray(), [
            'kyc' => $kyc?->toArray(), 'bank_account' => $bank?->toArray(),
            'hotel_count' => $hotelCount, 'commission_tier' => $tier?->toArray(),
            'user' => $userInfo,
        ]);
    }

    public function listMerchants(?string $status = null, ?string $search = null, int $limit = 50, int $offset = 0): array
    {
        $qb = $this->em->createQueryBuilder()->select('m')->from(Merchant::class, 'm')->orderBy('m.createdAt', 'DESC');
        if ($status) $qb->andWhere('m.status = :s')->setParameter('s', $status);
        if ($search) $qb->andWhere('m.businessName LIKE :q OR m.email LIKE :q OR m.merchantId LIKE :q')->setParameter('q', "%$search%");
        $qb->setMaxResults($limit)->setFirstResult($offset);
        return array_map(fn($m) => $m->toArray(), $qb->getQuery()->getResult());
    }

    // ─── KYC ───────────────────────────────────────────────────

    public function submitKyc(string $merchantId, array $docs): MerchantKyc
    {
        $kyc = $this->em->getRepository(MerchantKyc::class)->findOneBy(['merchantId' => $merchantId]);
        if (!$kyc) { $kyc = new MerchantKyc(); $kyc->setMerchantId($merchantId); $this->em->persist($kyc); }

        foreach (['government_id_type' => 'setGovernmentIdType', 'government_id_number' => 'setGovernmentIdNumber',
            'government_id_url' => 'setGovernmentIdUrl', 'selfie_url' => 'setSelfieUrl',
            'proof_of_address_url' => 'setProofOfAddressUrl', 'cac_certificate_url' => 'setCacCertificateUrl',
            'business_address_verification_url' => 'setBusinessAddressVerificationUrl'] as $k => $setter) {
            if (isset($docs[$k])) $kyc->$setter($docs[$k]);
        }
        if (isset($docs['director_ids'])) $kyc->setDirectorIds($docs['director_ids']);
        if (isset($docs['kyc_type'])) $kyc->setKycType($docs['kyc_type']);
        $kyc->setStatus('under_review');
        $this->em->flush();

        // Move merchant to KYC_IN_PROGRESS
        $m = $this->getMerchant($merchantId);
        if ($m->getStatus() === MerchantStatus::PENDING_APPROVAL) {
            $m->setStatus(MerchantStatus::KYC_IN_PROGRESS);
            $this->em->flush();
        }
        return $kyc;
    }

    public function reviewKyc(string $kycId, string $status, ?string $reason = null, ?string $reviewerId = null): MerchantKyc
    {
        $kyc = $this->em->find(MerchantKyc::class, $kycId);
        if (!$kyc) throw new \RuntimeException('KYC record not found');
        $kyc->setStatus($status);
        $kyc->setReviewedAt(new \DateTimeImmutable());
        if ($reviewerId) $kyc->setReviewedBy($reviewerId);
        if ($reason) $kyc->setRejectionReason($reason);

        if ($status === 'approved') {
            $m = $this->getMerchant($kyc->getMerchantId());
            $m->setStatus(MerchantStatus::ACTIVE);
            $m->setApprovedAt(new \DateTimeImmutable());
            if (!$m->getCommissionTierId()) {
                $default = $this->em->getRepository(CommissionTier::class)->findOneBy(['isDefault' => true, 'isActive' => true]);
                if ($default) $m->setCommissionTierId($default->getId());
            }
            $this->notify($kyc->getMerchantId(), 'kyc_update', 'KYC Approved', 'Your KYC has been approved. Your account is now fully active.');
        } elseif ($status === 'rejected') {
            $this->notify($kyc->getMerchantId(), 'kyc_update', 'KYC Rejected', "Your KYC was rejected. Reason: $reason. Please resubmit.");
        }
        $this->em->flush();
        return $kyc;
    }

    public function getKycStatus(string $merchantId): ?MerchantKyc
    {
        return $this->em->getRepository(MerchantKyc::class)->findOneBy(['merchantId' => $merchantId]);
    }

    // ─── Bank Account ──────────────────────────────────────────

    public function addBankAccount(string $merchantId, array $data): MerchantBankAccount
    {
        $b = new MerchantBankAccount();
        $b->setMerchantId($merchantId);
        $b->setBankName($data['bank_name']);
        $b->setAccountName($data['account_name']);
        $b->setAccountNumber($data['account_number']);
        if (isset($data['settlement_currency'])) $b->setSettlementCurrency($data['settlement_currency']);
        if (isset($data['payment_method'])) $b->setPaymentMethod($data['payment_method']);
        if (isset($data['tin'])) $b->setTin($data['tin']);
        $this->em->persist($b);
        $this->em->flush();
        $this->audit($merchantId, $merchantId, 'merchant', 'bank_account_added', 'MerchantBankAccount', $b->getId());
        return $b;
    }

    public function updateBankAccount(string $id, array $data): MerchantBankAccount
    {
        $b = $this->em->find(MerchantBankAccount::class, $id);
        if (!$b) throw new \RuntimeException('Bank account not found');
        foreach (['bank_name' => 'setBankName', 'account_name' => 'setAccountName', 'account_number' => 'setAccountNumber', 'tin' => 'setTin'] as $k => $setter) {
            if (isset($data[$k])) $b->$setter($data[$k]);
        }
        $b->setStatus('pending_approval'); // Require re-approval on change
        $this->em->flush();
        $this->notify($b->getMerchantId(), 'policy_change', 'Bank Account Updated', 'Your bank account details have been updated and require admin re-approval.');
        return $b;
    }

    public function approveBankAccount(string $id, string $adminId): MerchantBankAccount
    {
        $b = $this->em->find(MerchantBankAccount::class, $id);
        if (!$b) throw new \RuntimeException('Bank account not found');
        $b->setStatus('approved');
        $b->setApprovedBy($adminId);
        $b->setApprovedAt(new \DateTimeImmutable());
        $this->em->flush();
        return $b;
    }

    public function freezeBankAccount(string $id, string $reason): MerchantBankAccount
    {
        $b = $this->em->find(MerchantBankAccount::class, $id);
        if (!$b) throw new \RuntimeException('Bank account not found');
        $b->setStatus('frozen');
        $this->em->flush();
        return $b;
    }

    // ─── Hotel Management ──────────────────────────────────────

    public function registerHotel(string $merchantId, array $data): MerchantHotel
    {
        $m = $this->getMerchant($merchantId);
        if (!$m->isActive()) throw new \RuntimeException('Only active merchants can register hotels');

        $h = new MerchantHotel();
        $h->setMerchantId($merchantId);
        $h->setHotelName($data['hotel_name']);
        if (isset($data['location'])) $h->setLocation($data['location']);
        if (isset($data['contact_person'])) $h->setContactPerson($data['contact_person']);
        if (isset($data['contact_phone'])) $h->setContactPhone($data['contact_phone']);
        if (isset($data['contact_email'])) $h->setContactEmail($data['contact_email']);
        if (isset($data['rooms_count'])) $h->setRoomsCount((int) $data['rooms_count']);
        if (isset($data['hotel_category'])) $h->setHotelCategory($data['hotel_category']);
        if (isset($data['subscription_plan'])) $h->setSubscriptionPlan($data['subscription_plan']);
        $h->setBoundAt(new \DateTimeImmutable());
        $h->setOnboardingStatus('pending');

        $this->em->persist($h);
        $this->em->flush();
        $this->audit($merchantId, $merchantId, 'merchant', 'hotel_registered', 'MerchantHotel', $h->getId());
        return $h;
    }

    public function listMerchantHotels(string $merchantId, ?string $status = null): array
    {
        $criteria = ['merchantId' => $merchantId];
        if ($status) $criteria['onboardingStatus'] = $status;
        return array_map(fn($h) => $h->toArray(), $this->em->getRepository(MerchantHotel::class)->findBy($criteria, ['createdAt' => 'DESC']));
    }

    public function getHotelDetail(string $merchantId, string $hotelId): array
    {
        $h = $this->em->find(MerchantHotel::class, $hotelId);
        if (!$h || $h->getMerchantId() !== $merchantId) throw new \RuntimeException('Hotel not found');
        $commissions = $this->em->getRepository(Commission::class)->findBy(['merchantId' => $merchantId, 'hotelId' => $hotelId], ['createdAt' => 'DESC'], 20);
        return array_merge($h->toArray(), ['commissions' => array_map(fn($c) => $c->toArray(), $commissions)]);
    }

    public function updateHotelOnboarding(string $hotelId, string $status, ?string $tenantId = null, ?string $propertyId = null): MerchantHotel
    {
        $h = $this->em->find(MerchantHotel::class, $hotelId);
        if (!$h) throw new \RuntimeException('Hotel not found');
        $h->setOnboardingStatus($status);
        if ($tenantId) $h->setTenantId($tenantId);
        if ($propertyId) $h->setPropertyId($propertyId);
        $this->em->flush();
        return $h;
    }

    // ─── Commission Engine ─────────────────────────────────────

    public function calculateCommission(string $merchantId, string $hotelId, string $tenantId, CommissionScope $scope, string $subscriptionAmount, ?string $subscriptionId = null, ?string $planName = null, ?string $billingCycle = null): Commission
    {
        $m = $this->getMerchant($merchantId);
        $tier = $m->getCommissionTierId() ? $this->em->find(CommissionTier::class, $m->getCommissionTierId()) : null;
        if (!$tier) {
            $tier = $this->em->getRepository(CommissionTier::class)->findOneBy(['isDefault' => true, 'isActive' => true]);
        }
        if (!$tier) throw new \RuntimeException('No commission tier configured');

        $rate = $tier->getRateForScope($scope->value, $planName);
        $amount = $tier->getType() === 'percentage'
            ? bcmul($subscriptionAmount, bcdiv($rate, '100', 4), 2)
            : $rate;

        $c = new Commission();
        $c->setMerchantId($merchantId);
        $c->setHotelId($hotelId);
        $c->setTenantId($tenantId);
        $c->setSubscriptionId($subscriptionId);
        $c->setCommissionTierId($tier->getId());
        $c->setScope($scope);
        $c->setPlanName($planName);
        $c->setBillingCycle($billingCycle);
        $c->setSubscriptionAmount($subscriptionAmount);
        $c->setCommissionRate($rate);
        $c->setCommissionAmount($amount);
        $c->setStatus(CommissionStatus::PENDING);
        $c->setCoolingPeriodEnds(new \DateTimeImmutable('+7 days'));
        $this->em->persist($c);
        $this->em->flush();

        $this->notify($merchantId, 'commission_approved', 'Commission Earned', "You earned a ₦{$amount} commission on a {$scope->label()} payment.");
        $this->audit($merchantId, 'system', 'system', 'commission_calculated', 'Commission', $c->getId());
        return $c;
    }

    public function approveCommission(string $id): Commission
    {
        $c = $this->em->find(Commission::class, $id);
        if (!$c) throw new \RuntimeException('Commission not found');
        if ($c->getStatus() !== CommissionStatus::PENDING) throw new \RuntimeException('Only pending commissions can be approved');
        $c->setStatus(CommissionStatus::APPROVED);
        $c->setApprovedAt(new \DateTimeImmutable());
        $this->em->flush();
        $this->notify($c->getMerchantId(), 'commission_approved', 'Commission Approved', "Your commission of ₦{$c->getCommissionAmount()} has been approved.");
        return $c;
    }

    public function reverseCommission(string $id, string $reason): Commission
    {
        $c = $this->em->find(Commission::class, $id);
        if (!$c) throw new \RuntimeException('Commission not found');
        if ($c->getStatus() === CommissionStatus::PAID) throw new \RuntimeException('Cannot reverse a paid commission');
        $c->setStatus(CommissionStatus::REVERSED);
        $c->setReversedAt(new \DateTimeImmutable());
        $c->setReversalReason($reason);
        $this->em->flush();
        return $c;
    }

    public function listCommissions(string $merchantId, ?string $status = null, ?string $hotelId = null, int $limit = 50): array
    {
        $qb = $this->em->createQueryBuilder()->select('c')->from(Commission::class, 'c')
            ->where('c.merchantId = :m')->setParameter('m', $merchantId)->orderBy('c.createdAt', 'DESC');
        if ($status) $qb->andWhere('c.status = :s')->setParameter('s', $status);
        if ($hotelId) $qb->andWhere('c.hotelId = :h')->setParameter('h', $hotelId);
        $qb->setMaxResults($limit);
        return array_map(fn($c) => $c->toArray(), $qb->getQuery()->getResult());
    }

    public function getMerchantEarnings(string $merchantId): array
    {
        $commissions = $this->em->getRepository(Commission::class)->findBy(['merchantId' => $merchantId]);
        $total = '0.00'; $pending = '0.00'; $paid = '0.00';
        foreach ($commissions as $c) {
            if ($c->getStatus() === CommissionStatus::REVERSED) continue;
            $total = bcadd($total, $c->getCommissionAmount(), 2);
            if (in_array($c->getStatus(), [CommissionStatus::PENDING, CommissionStatus::APPROVED, CommissionStatus::PAYABLE])) {
                $pending = bcadd($pending, $c->getCommissionAmount(), 2);
            }
            if ($c->getStatus() === CommissionStatus::PAID) {
                $paid = bcadd($paid, $c->getCommissionAmount(), 2);
            }
        }
        return ['total_earned' => $total, 'pending' => $pending, 'paid' => $paid, 'commission_count' => count($commissions)];
    }

    // ─── Payouts ───────────────────────────────────────────────

    public function generatePayout(string $merchantId, string $periodStart, string $periodEnd): CommissionPayout
    {
        // Check KYC approved
        $kyc = $this->getKycStatus($merchantId);
        if (!$kyc || $kyc->getStatus() !== 'approved') throw new \RuntimeException('KYC not approved — payout blocked');

        // Get payable commissions
        $payable = $this->em->createQueryBuilder()->select('c')->from(Commission::class, 'c')
            ->where('c.merchantId = :m')->andWhere('c.status IN (:s)')
            ->setParameter('m', $merchantId)->setParameter('s', [CommissionStatus::APPROVED->value, CommissionStatus::PAYABLE->value])
            ->getQuery()->getResult();

        if (empty($payable)) throw new \RuntimeException('No payable commissions found');

        $total = '0.00';
        $ids = [];
        foreach ($payable as $c) {
            $total = bcadd($total, $c->getCommissionAmount(), 2);
            $ids[] = $c->getId();
            $c->setStatus(CommissionStatus::PAYABLE);
        }

        $bank = $this->em->getRepository(MerchantBankAccount::class)->findOneBy(['merchantId' => $merchantId, 'status' => 'approved']);

        $p = new CommissionPayout();
        $p->setMerchantId($merchantId);
        $p->setPayoutPeriod("{$periodStart}_to_{$periodEnd}");
        $p->setTotalAmount($total);
        $p->setCommissionIds($ids);
        if ($bank) $p->setBankAccountId($bank->getId());
        $this->em->persist($p);
        $this->em->flush();
        return $p;
    }

    public function processPayout(string $payoutId, string $paymentReference): CommissionPayout
    {
        $p = $this->em->find(CommissionPayout::class, $payoutId);
        if (!$p) throw new \RuntimeException('Payout not found');
        $p->setStatus('processing');
        $p->setProcessingStartedAt(new \DateTimeImmutable());
        $p->setPaymentReference($paymentReference);
        $p->setStatus('paid');
        $p->setPaidAt(new \DateTimeImmutable());

        // Mark commissions as paid
        foreach ($p->getCommissionIds() as $cid) {
            $c = $this->em->find(Commission::class, $cid);
            if ($c) { $c->setStatus(CommissionStatus::PAID); $c->setPaidAt(new \DateTimeImmutable()); $c->setPaymentReference($paymentReference); }
        }
        $this->em->flush();
        $this->notify($p->getMerchantId(), 'commission_paid', 'Payout Processed', "Your payout of ₦{$p->getTotalAmount()} has been processed. Ref: $paymentReference");
        return $p;
    }

    public function listPayouts(string $merchantId): array
    {
        return array_map(fn($p) => $p->toArray(), $this->em->getRepository(CommissionPayout::class)->findBy(['merchantId' => $merchantId], ['createdAt' => 'DESC']));
    }

    // ─── Resources ─────────────────────────────────────────────

    public function listResources(?string $visibility = null, ?string $category = null): array
    {
        $criteria = ['status' => 'active'];
        if ($visibility) $criteria['visibility'] = $visibility;
        if ($category) $criteria['category'] = $category;
        return array_map(fn($r) => $r->toArray(), $this->em->getRepository(MerchantResource::class)->findBy($criteria, ['createdAt' => 'DESC']));
    }

    public function getResource(string $id): MerchantResource
    {
        $r = $this->em->find(MerchantResource::class, $id);
        if (!$r) throw new \RuntimeException('Resource not found');
        return $r;
    }

    public function downloadResource(string $resourceId, string $merchantId, ?string $ip = null, ?string $ua = null): MerchantResourceDownload
    {
        $d = new MerchantResourceDownload();
        $d->setResourceId($resourceId);
        $d->setMerchantId($merchantId);
        if ($ip) $d->setIpAddress($ip);
        if ($ua) $d->setUserAgent($ua);
        $this->em->persist($d);
        $this->em->flush();
        return $d;
    }

    public function createResource(array $data, ?string $userId = null): MerchantResource
    {
        $r = new MerchantResource();
        $r->setTitle($data['title']);
        $r->setFileUrl($data['file_url']);
        if (isset($data['description'])) $r->setDescription($data['description']);
        if (isset($data['category'])) $r->setCategory($data['category']);
        if (isset($data['sub_category'])) $r->setSubCategory($data['sub_category']);
        if (isset($data['file_type'])) $r->setFileType($data['file_type']);
        if (isset($data['file_size'])) $r->setFileSize((int) $data['file_size']);
        if (isset($data['version'])) $r->setVersion($data['version']);
        if (isset($data['visibility'])) $r->setVisibility($data['visibility']);
        if ($userId) $r->setUploadedBy($userId);
        $this->em->persist($r);
        $this->em->flush();
        // Notify all active merchants
        $merchants = $this->em->getRepository(Merchant::class)->findBy(['status' => MerchantStatus::ACTIVE]);
        foreach ($merchants as $m) {
            $this->notify($m->getId(), 'new_resource', 'New Resource Available', "A new resource '{$data['title']}' has been uploaded.");
        }
        return $r;
    }

    public function archiveResource(string $id): MerchantResource
    {
        $r = $this->getResource($id);
        $r->setStatus('archived');
        $this->em->flush();
        return $r;
    }

    public function getResourceAnalytics(string $id): array
    {
        $downloads = (int) $this->em->createQuery("SELECT COUNT(d) FROM Lodgik\Entity\MerchantResourceDownload d WHERE d.resourceId = :r")->setParameter('r', $id)->getSingleScalarResult();
        $uniqueMerchants = (int) $this->em->createQuery("SELECT COUNT(DISTINCT d.merchantId) FROM Lodgik\Entity\MerchantResourceDownload d WHERE d.resourceId = :r")->setParameter('r', $id)->getSingleScalarResult();
        return ['total_downloads' => $downloads, 'unique_merchants' => $uniqueMerchants];
    }

    // ─── Support ───────────────────────────────────────────────

    public function createTicket(string $merchantId, array $data): MerchantSupportTicket
    {
        $t = new MerchantSupportTicket();
        $t->setMerchantId($merchantId);
        $t->setSubject($data['subject']);
        $t->setDescription($data['description']);
        if (isset($data['priority_tag'])) $t->setPriorityTag($data['priority_tag']);
        if (isset($data['hotel_id'])) $t->setHotelId($data['hotel_id']);
        // SLA: 24h for finance, 48h for others
        $hours = ($data['priority_tag'] ?? 'sales') === 'finance' ? 24 : 48;
        $t->setSlaDueAt(new \DateTimeImmutable("+{$hours} hours"));
        $this->em->persist($t);
        $this->em->flush();
        return $t;
    }

    public function listTickets(string $merchantId, ?string $status = null): array
    {
        $criteria = ['merchantId' => $merchantId];
        if ($status) $criteria['status'] = $status;
        return array_map(fn($t) => $t->toArray(), $this->em->getRepository(MerchantSupportTicket::class)->findBy($criteria, ['createdAt' => 'DESC']));
    }

    public function updateTicketStatus(string $id, string $status, ?string $notes = null): MerchantSupportTicket
    {
        $t = $this->em->find(MerchantSupportTicket::class, $id);
        if (!$t) throw new \RuntimeException('Ticket not found');
        $t->setStatus($status);
        if ($status === 'resolved') { $t->setResolvedAt(new \DateTimeImmutable()); if ($notes) $t->setResolutionNotes($notes); }
        $this->em->flush();
        return $t;
    }

    public function assignTicket(string $id, string $staffId): MerchantSupportTicket
    {
        $t = $this->em->find(MerchantSupportTicket::class, $id);
        if (!$t) throw new \RuntimeException('Ticket not found');
        $t->setAssignedTo($staffId);
        $t->setStatus('in_progress');
        $this->em->flush();
        return $t;
    }

    // ─── Leads ─────────────────────────────────────────────────

    public function createLead(string $merchantId, array $data): MerchantLead
    {
        $l = new MerchantLead();
        $l->setMerchantId($merchantId);
        $l->setHotelName($data['hotel_name']);
        if (isset($data['contact_name'])) $l->setContactName($data['contact_name']);
        if (isset($data['contact_phone'])) $l->setContactPhone($data['contact_phone']);
        if (isset($data['contact_email'])) $l->setContactEmail($data['contact_email']);
        if (isset($data['location'])) $l->setLocation($data['location']);
        if (isset($data['rooms_estimate'])) $l->setRoomsEstimate((int) $data['rooms_estimate']);
        if (isset($data['notes'])) $l->setNotes($data['notes']);
        if (isset($data['follow_up_date'])) $l->setFollowUpDate(new \DateTimeImmutable($data['follow_up_date']));
        $this->em->persist($l);
        $this->em->flush();
        return $l;
    }

    public function updateLead(string $id, string $status, ?string $notes = null): MerchantLead
    {
        $l = $this->em->find(MerchantLead::class, $id);
        if (!$l) throw new \RuntimeException('Lead not found');
        $l->setStatus($status);
        if ($notes) $l->setNotes($notes);
        $this->em->flush();
        return $l;
    }

    public function convertLead(string $leadId, array $hotelData): MerchantHotel
    {
        $l = $this->em->find(MerchantLead::class, $leadId);
        if (!$l) throw new \RuntimeException('Lead not found');

        // Merge lead data into hotel data
        $hotelData['hotel_name'] = $hotelData['hotel_name'] ?? $l->getHotelName();
        $hotelData['contact_person'] = $hotelData['contact_person'] ?? $l->getContactName();
        $hotelData['contact_phone'] = $hotelData['contact_phone'] ?? $l->getContactPhone();
        $hotelData['contact_email'] = $hotelData['contact_email'] ?? $l->getContactEmail();
        $hotelData['location'] = $hotelData['location'] ?? $l->getLocation();
        $hotelData['rooms_count'] = $hotelData['rooms_count'] ?? $l->getRoomsEstimate();

        $hotel = $this->registerHotel($l->getMerchantId(), $hotelData);
        $l->setStatus('converted');
        $l->setConvertedHotelId($hotel->getId());
        $this->em->flush();
        return $hotel;
    }

    public function listLeads(string $merchantId, ?string $status = null): array
    {
        $criteria = ['merchantId' => $merchantId];
        if ($status) $criteria['status'] = $status;
        return array_map(fn($l) => $l->toArray(), $this->em->getRepository(MerchantLead::class)->findBy($criteria, ['createdAt' => 'DESC']));
    }

    // ─── Notifications ─────────────────────────────────────────

    public function notify(string $merchantId, string $type, string $title, string $body, string $channel = 'in_app', ?array $data = null): MerchantNotification
    {
        $n = new MerchantNotification();
        $n->setMerchantId($merchantId);
        $n->setType($type);
        $n->setTitle($title);
        $n->setBody($body);
        $n->setChannel($channel);
        if ($data) $n->setData($data);
        $this->em->persist($n);
        $this->em->flush();
        return $n;
    }

    public function listNotifications(string $merchantId, bool $unreadOnly = false): array
    {
        $criteria = ['merchantId' => $merchantId];
        if ($unreadOnly) $criteria['isRead'] = false;
        return array_map(fn($n) => $n->toArray(), $this->em->getRepository(MerchantNotification::class)->findBy($criteria, ['sentAt' => 'DESC'], 100));
    }

    public function markNotificationRead(string $id): void
    {
        $n = $this->em->find(MerchantNotification::class, $id);
        if ($n) { $n->setIsRead(true); $this->em->flush(); }
    }

    public function markAllNotificationsRead(string $merchantId): int
    {
        return (int) $this->em->createQuery("UPDATE Lodgik\Entity\MerchantNotification n SET n.isRead = true WHERE n.merchantId = :m AND n.isRead = false")
            ->setParameter('m', $merchantId)->execute();
    }

    // ─── Commission Tiers (admin) ──────────────────────────────

    public function listTiers(): array
    {
        return array_map(fn($t) => $t->toArray(), $this->em->getRepository(CommissionTier::class)->findBy([], ['name' => 'ASC']));
    }

    public function createTier(array $data): CommissionTier
    {
        $t = new CommissionTier();
        $t->setName($data['name']);
        if (isset($data['description'])) $t->setDescription($data['description']);
        if (isset($data['type'])) $t->setType($data['type']);
        if (isset($data['new_subscription_rate'])) $t->setNewSubscriptionRate($data['new_subscription_rate']);
        if (isset($data['renewal_rate'])) $t->setRenewalRate($data['renewal_rate']);
        if (isset($data['upgrade_rate'])) $t->setUpgradeRate($data['upgrade_rate']);
        if (isset($data['plan_overrides'])) $t->setPlanOverrides($data['plan_overrides']);
        if (isset($data['is_default'])) $t->setIsDefault((bool) $data['is_default']);
        $this->em->persist($t);
        $this->em->flush();
        return $t;
    }

    public function updateTier(string $id, array $data): CommissionTier
    {
        $t = $this->em->find(CommissionTier::class, $id);
        if (!$t) throw new \RuntimeException('Tier not found');
        foreach (['name' => 'setName', 'description' => 'setDescription', 'type' => 'setType', 'new_subscription_rate' => 'setNewSubscriptionRate', 'renewal_rate' => 'setRenewalRate', 'upgrade_rate' => 'setUpgradeRate'] as $k => $setter) {
            if (isset($data[$k])) $t->$setter($data[$k]);
        }
        if (isset($data['plan_overrides'])) $t->setPlanOverrides($data['plan_overrides']);
        if (isset($data['is_default'])) $t->setIsDefault((bool) $data['is_default']);
        if (isset($data['is_active'])) $t->setIsActive((bool) $data['is_active']);
        $this->em->flush();
        return $t;
    }

    // ─── Statements ────────────────────────────────────────────

    public function generateStatement(string $merchantId, string $periodStart, string $periodEnd): MerchantStatement
    {
        $earnings = $this->getMerchantEarnings($merchantId);
        $s = new MerchantStatement();
        $s->setMerchantId($merchantId);
        $s->setPeriodStart(new \DateTimeImmutable($periodStart));
        $s->setPeriodEnd(new \DateTimeImmutable($periodEnd));
        $s->setTotalEarned($earnings['total_earned']);
        $s->setTotalPaid($earnings['paid']);
        $s->setClosingBalance(bcsub($earnings['total_earned'], $earnings['paid'], 2));
        $this->em->persist($s);
        $this->em->flush();
        return $s;
    }

    public function listStatements(string $merchantId): array
    {
        return array_map(fn($s) => $s->toArray(), $this->em->getRepository(MerchantStatement::class)->findBy(['merchantId' => $merchantId], ['periodStart' => 'DESC']));
    }

    // ─── Dashboard ─────────────────────────────────────────────

    public function getMerchantDashboard(string $merchantId): array
    {
        $hotels = $this->em->getRepository(MerchantHotel::class)->findBy(['merchantId' => $merchantId]);
        $earnings = $this->getMerchantEarnings($merchantId);
        $leads = $this->em->getRepository(MerchantLead::class)->findBy(['merchantId' => $merchantId]);
        $openTickets = (int) $this->em->createQuery("SELECT COUNT(t) FROM Lodgik\Entity\MerchantSupportTicket t WHERE t.merchantId = :m AND t.status IN ('open','in_progress')")->setParameter('m', $merchantId)->getSingleScalarResult();
        $unreadNotifs = (int) $this->em->createQuery("SELECT COUNT(n) FROM Lodgik\Entity\MerchantNotification n WHERE n.merchantId = :m AND n.isRead = false")->setParameter('m', $merchantId)->getSingleScalarResult();

        $leadsByStatus = [];
        foreach ($leads as $l) { $leadsByStatus[$l->getStatus()] = ($leadsByStatus[$l->getStatus()] ?? 0) + 1; }

        $hotelsByStatus = [];
        foreach ($hotels as $h) { $hotelsByStatus[$h->getOnboardingStatus()] = ($hotelsByStatus[$h->getOnboardingStatus()] ?? 0) + 1; }

        return [
            'hotels' => ['total' => count($hotels), 'by_status' => $hotelsByStatus],
            'earnings' => $earnings,
            'leads' => ['total' => count($leads), 'by_status' => $leadsByStatus],
            'open_tickets' => $openTickets,
            'unread_notifications' => $unreadNotifs,
        ];
    }

    // ─── Admin: All Commissions / Payouts ──────────────────────

    public function listAllCommissions(?string $status = null, int $limit = 100): array
    {
        $qb = $this->em->createQueryBuilder()->select('c')->from(Commission::class, 'c')->orderBy('c.createdAt', 'DESC');
        if ($status) $qb->andWhere('c.status = :s')->setParameter('s', $status);
        $qb->setMaxResults($limit);
        return array_map(fn($c) => $c->toArray(), $qb->getQuery()->getResult());
    }

    public function listAllPayouts(?string $status = null): array
    {
        $criteria = $status ? ['status' => $status] : [];
        return array_map(fn($p) => $p->toArray(), $this->em->getRepository(CommissionPayout::class)->findBy($criteria, ['createdAt' => 'DESC']));
    }

    public function listPendingKyc(): array
    {
        return array_map(fn($k) => $k->toArray(), $this->em->getRepository(MerchantKyc::class)->findBy(['status' => 'under_review'], ['createdAt' => 'ASC']));
    }

    // ─── Audit Log ─────────────────────────────────────────────

    private function audit(string $merchantId, string $actorId, string $actorType, string $action, ?string $entityType = null, ?string $entityId = null, ?array $old = null, ?array $new = null): void
    {
        $log = new MerchantAuditLog();
        $log->setMerchantId($merchantId);
        $log->setActorId($actorId);
        $log->setActorType($actorType);
        $log->setAction($action);
        if ($entityType) $log->setEntityType($entityType);
        if ($entityId) $log->setEntityId($entityId);
        if ($old) $log->setOldValue($old);
        if ($new) $log->setNewValue($new);
        $this->em->persist($log);
        // Don't flush here — let the caller flush
    }

    public function getAuditLog(string $merchantId, int $limit = 100): array
    {
        return array_map(fn($l) => $l->toArray(), $this->em->getRepository(MerchantAuditLog::class)->findBy(['merchantId' => $merchantId], ['timestamp' => 'DESC'], $limit));
    }
}
