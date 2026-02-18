<?php

declare(strict_types=1);

namespace Lodgik\Module\Onboarding;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Property;
use Lodgik\Entity\PropertyBankAccount;
use Lodgik\Entity\Tenant;
use Lodgik\Entity\TenantInvitation;
use Lodgik\Entity\User;
use Lodgik\Entity\UserProperty;
use Lodgik\Enum\SubscriptionStatus;
use Lodgik\Enum\UserRole;
use Lodgik\Repository\TenantRepository;
use Lodgik\Service\AuditService;
use Lodgik\Service\FileStorageService;
use Lodgik\Service\ZeptoMailService;

/**
 * 7-Step Onboarding Wizard:
 *  1. Hotel basic info (name, email, phone)
 *  2. Admin account (name, email, password)
 *  3. Property details (address, city, state, star rating, check-in/out times)
 *  4. Bank account setup (for guest payments)
 *  5. Branding (logo upload, colors)
 *  6. Choose plan
 *  7. Invite staff (optional)
 */
final class OnboardingService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantRepository $tenantRepo,
        private readonly AuditService $audit,
        private readonly FileStorageService $fileStorage,
        private readonly ZeptoMailService $mailer,
    ) {}

    // ─── Full Registration (Steps 1-3 combined) ────────────────

    /**
     * Complete steps 1-3 in a single call (matches existing register flow).
     * Creates tenant + admin user + first property.
     *
     * @return array{tenant: Tenant, user: User, property: Property}
     */
    public function registerTenant(array $data): array
    {
        // Validate uniqueness
        $slug = $this->generateSlug($data['hotel_name']);
        $existingTenant = $this->tenantRepo->findBySlug($slug);
        if ($existingTenant) {
            throw new \RuntimeException('A hotel with this name already exists');
        }

        // Check email uniqueness across all tenants (safe: disable tenant filter if active)
        $filters = $this->em->getFilters();
        $tenantFilterWasEnabled = $filters->isEnabled('tenant_filter');
        if ($tenantFilterWasEnabled) {
            $filters->disable('tenant_filter');
        }
        $existingUser = $this->em->getRepository(User::class)->findOneBy(['email' => strtolower(trim($data['admin_email']))]);
        if ($tenantFilterWasEnabled) {
            $filters->enable('tenant_filter');
        }
        if ($existingUser) {
            throw new \RuntimeException('This email is already registered');
        }

        // Step 1: Create tenant
        $tenant = new Tenant($data['hotel_name'], $slug);
        $tenant->setEmail($data['hotel_email'] ?? $data['admin_email']);
        $tenant->setPhone($data['hotel_phone'] ?? null);
        $tenant->setSubscriptionStatus(SubscriptionStatus::TRIAL);
        $tenant->setTrialEndsAt(new \DateTimeImmutable('+14 days'));
        // Default modules for trial
        $tenant->setEnabledModules(['room_management', 'guest_management', 'booking_engine', 'front_desk', 'dashboard']);
        $this->em->persist($tenant);
        $this->em->flush(); // Need tenant ID for user

        // Step 2: Create admin user
        $user = new User(
            $data['admin_first_name'],
            $data['admin_last_name'],
            $data['admin_email'],
            password_hash($data['admin_password'], PASSWORD_ARGON2ID),
            UserRole::PROPERTY_ADMIN,
            $tenant->getId(),
        );
        $user->markEmailVerified();

        // Step 3: Create first property
        $property = new Property($data['hotel_name'], $tenant->getId());
        $property->setSlug($slug);
        $property->setEmail($data['hotel_email'] ?? $data['admin_email']);
        $property->setPhone($data['hotel_phone'] ?? null);
        $property->setAddress($data['address'] ?? null);
        $property->setCity($data['city'] ?? null);
        $property->setState($data['state'] ?? null);
        $property->setStarRating($data['star_rating'] ?? null);
        if (isset($data['check_in_time'])) $property->setCheckInTime($data['check_in_time']);
        if (isset($data['check_out_time'])) $property->setCheckOutTime($data['check_out_time']);
        $this->em->persist($property);
        $this->em->flush();

        $user->setPropertyId($property->getId());
        $this->em->persist($user);

        // UserProperty pivot
        $up = new UserProperty($user->getId(), $property->getId(), $tenant->getId());
        $up->setIsPrimary(true);
        $this->em->persist($up);

        $this->em->flush();

        $this->audit->log('registered', 'tenant', $tenant->getId(), null,
            "Tenant '{$data['hotel_name']}' registered by {$user->getFullName()}");

        return ['tenant' => $tenant, 'user' => $user, 'property' => $property];
    }

    // ─── Step 4: Bank Account ──────────────────────────────────

    /**
     * Add bank account during onboarding.
     */
    public function setupBankAccount(string $tenantId, string $propertyId, array $data): PropertyBankAccount
    {
        $property = $this->em->find(Property::class, $propertyId);
        if (!$property || $property->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Property not found');
        }

        if (!preg_match('/^\d{10}$/', $data['account_number'])) {
            throw new \RuntimeException('Account number must be exactly 10 digits');
        }

        $bank = new PropertyBankAccount(
            $propertyId,
            $data['bank_name'],
            $data['account_number'],
            $data['account_name'],
            $tenantId,
        );
        $bank->setBankCode($data['bank_code'] ?? null);
        $bank->setIsPrimary(true);

        $this->em->persist($bank);
        $this->em->flush();

        return $bank;
    }

    // ─── Step 5: Branding ──────────────────────────────────────

    /**
     * Update branding (logo, colors).
     */
    public function updateBranding(string $tenantId, array $data): Tenant
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if (!$tenant) throw new \RuntimeException('Tenant not found');

        if (isset($data['primary_color'])) {
            $this->validateColor($data['primary_color']);
            $tenant->setPrimaryColor($data['primary_color']);
        }
        if (isset($data['secondary_color'])) {
            $this->validateColor($data['secondary_color']);
            $tenant->setSecondaryColor($data['secondary_color']);
        }

        // Logo upload (base64)
        if (!empty($data['logo_base64'])) {
            $result = $this->fileStorage->storeLogo($data['logo_base64'], $tenant->getSlug());
            $tenant->setLogoUrl($result['url']);
        }

        $this->em->flush();
        return $tenant;
    }

    // ─── Step 6: Choose Plan ───────────────────────────────────

    /**
     * Select a plan during onboarding (doesn't charge yet, just assigns).
     */
    public function selectPlan(string $tenantId, string $planId): Tenant
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if (!$tenant) throw new \RuntimeException('Tenant not found');

        $plan = $this->em->find(\Lodgik\Entity\SubscriptionPlan::class, $planId);
        if (!$plan || !$plan->isActive()) throw new \RuntimeException('Plan not found or inactive');

        $tenant->setSubscriptionPlanId($planId);
        $tenant->setMaxRooms($plan->getMaxRooms());
        $tenant->setMaxStaff($plan->getMaxStaff());
        $tenant->setMaxProperties($plan->getMaxProperties());
        $tenant->setEnabledModules($plan->getIncludedModules());
        $tenant->setTrialEndsAt(new \DateTimeImmutable("+{$plan->getTrialDays()} days"));

        $this->em->flush();
        return $tenant;
    }

    // ─── Step 7: Invite Staff ──────────────────────────────────

    /**
     * Bulk invite staff during onboarding.
     * @param array<array{email: string, first_name: string, last_name: string, role: string}> $invites
     * @return array{invited: int, skipped: int, errors: array}
     */
    public function inviteStaff(string $tenantId, string $propertyId, string $invitedBy, array $invites): array
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if (!$tenant) throw new \RuntimeException('Tenant not found');

        $invited = 0;
        $skipped = 0;
        $errors = [];

        foreach ($invites as $i => $invite) {
            try {
                $email = strtolower(trim($invite['email'] ?? ''));
                if (empty($email)) {
                    $errors[] = "Row {$i}: Email required";
                    continue;
                }

                $role = UserRole::tryFrom($invite['role'] ?? 'front_desk');
                if (!$role) {
                    $errors[] = "Row {$i}: Invalid role '{$invite['role']}'";
                    continue;
                }

                // Check if already exists
                $existing = $this->em->getRepository(User::class)->findOneBy([
                    'email' => $email, 'tenantId' => $tenantId,
                ]);
                if ($existing) {
                    $skipped++;
                    continue;
                }

                // Check staff limit
                $staffCount = (int) $this->em->getConnection()->fetchOne(
                    "SELECT COUNT(*) FROM users WHERE tenant_id = ? AND is_active = true AND deleted_at IS NULL AND role != 'super_admin'",
                    [$tenantId]
                );
                if ($staffCount >= $tenant->getMaxStaff()) {
                    $errors[] = "Staff limit ({$tenant->getMaxStaff()}) reached";
                    break;
                }

                // Create user with invitation token
                $user = new User(
                    $invite['first_name'] ?? 'Staff',
                    $invite['last_name'] ?? 'Member',
                    $email,
                    password_hash(bin2hex(random_bytes(16)), PASSWORD_ARGON2ID),
                    $role,
                    $tenantId,
                );
                $user->setPropertyId($propertyId);
                $user->setInvitationToken(bin2hex(random_bytes(32)));
                $user->setIsActive(false); // Activate on accept

                $this->em->persist($user);

                // Send invitation email
                try {
                    $this->mailer->sendStaffInvitation(
                        $email,
                        $user->getFullName(),
                        $tenant->getName(),
                        $user->getInvitationToken(),
                    );
                } catch (\Throwable $e) {
                    // Log but don't fail the whole batch
                }

                $invited++;
            } catch (\Throwable $e) {
                $errors[] = "Row {$i}: {$e->getMessage()}";
            }
        }

        $this->em->flush();

        return ['invited' => $invited, 'skipped' => $skipped, 'errors' => $errors];
    }

    // ─── Onboarding Progress ───────────────────────────────────

    /**
     * Get the onboarding progress for a tenant.
     */
    public function getProgress(string $tenantId): array
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if (!$tenant) throw new \RuntimeException('Tenant not found');

        $conn = $this->em->getConnection();

        $propertyCount = (int) $conn->fetchOne("SELECT COUNT(*) FROM properties WHERE tenant_id = ? AND deleted_at IS NULL", [$tenantId]);
        $bankCount = (int) $conn->fetchOne("SELECT COUNT(*) FROM property_bank_accounts WHERE tenant_id = ? AND is_active = true", [$tenantId]);
        $staffCount = (int) $conn->fetchOne("SELECT COUNT(*) FROM users WHERE tenant_id = ? AND is_active = true AND deleted_at IS NULL AND role != 'super_admin'", [$tenantId]);

        $steps = [
            ['step' => 1, 'name' => 'Hotel Info', 'complete' => true], // Always done (created at registration)
            ['step' => 2, 'name' => 'Admin Account', 'complete' => true], // Always done
            ['step' => 3, 'name' => 'Property Details', 'complete' => $propertyCount > 0],
            ['step' => 4, 'name' => 'Bank Account', 'complete' => $bankCount > 0],
            ['step' => 5, 'name' => 'Branding', 'complete' => $tenant->getLogoUrl() !== null || $tenant->getPrimaryColor() !== null],
            ['step' => 6, 'name' => 'Choose Plan', 'complete' => $tenant->getSubscriptionPlanId() !== null],
            ['step' => 7, 'name' => 'Invite Staff', 'complete' => $staffCount > 1], // > 1 because admin is already 1
        ];

        $completedCount = count(array_filter($steps, fn($s) => $s['complete']));

        return [
            'steps' => $steps,
            'completed' => $completedCount,
            'total' => 7,
            'percent' => round($completedCount / 7 * 100),
            'is_complete' => $completedCount >= 6, // 6 of 7 required (staff invite is optional)
        ];
    }

    // ─── Tenant Invitations (Super Admin) ──────────────────────

    /**
     * Create a tenant invitation (super admin invites a hotel to join).
     */
    public function createInvitation(array $data, ?string $invitedBy = null): TenantInvitation
    {
        $invitation = new TenantInvitation(
            $data['email'],
            $data['hotel_name'],
            (int) ($data['expiry_days'] ?? 30),
        );
        $invitation->setContactName($data['contact_name'] ?? null);
        $invitation->setPhone($data['phone'] ?? null);
        $invitation->setSuggestedPlanId($data['suggested_plan_id'] ?? null);
        $invitation->setInvitedBy($invitedBy);

        $this->em->persist($invitation);
        $this->em->flush();

        // Send invitation email
        try {
            $this->mailer->sendTenantInvitation(
                $invitation->getEmail(),
                $invitation->getHotelName(),
                $invitation->getToken(),
                $invitation->getContactName(),
            );
        } catch (\Throwable $e) {
            // Log but don't fail
        }

        return $invitation;
    }

    /**
     * Verify an invitation token.
     */
    public function verifyInvitation(string $token): TenantInvitation
    {
        $invitation = $this->em->getRepository(TenantInvitation::class)
            ->findOneBy(['token' => $token]);

        if (!$invitation) throw new \RuntimeException('Invitation not found');
        if ($invitation->isExpired()) throw new \RuntimeException('Invitation has expired');
        if (!$invitation->isPending()) throw new \RuntimeException('Invitation is no longer valid');

        return $invitation;
    }

    /**
     * List tenant invitations (super admin).
     */
    public function listInvitations(int $page = 1, int $limit = 20, ?string $status = null): array
    {
        $qb = $this->em->getRepository(TenantInvitation::class)->createQueryBuilder('i');

        if ($status) {
            $qb->where('i.status = :status')->setParameter('status', $status);
        }

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(i.id)')->getQuery()->getSingleScalarResult();

        $items = $qb->orderBy('i.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()->getResult();

        return ['items' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit];
    }

    /**
     * Revoke an invitation.
     */
    public function revokeInvitation(string $id): TenantInvitation
    {
        $invitation = $this->em->find(TenantInvitation::class, $id);
        if (!$invitation) throw new \RuntimeException('Invitation not found');
        $invitation->revoke();
        $this->em->flush();
        return $invitation;
    }

    // ─── Helpers ───────────────────────────────────────────────

    private function generateSlug(string $name): string
    {
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $name), '-'));
        // Check uniqueness, append random suffix if taken
        $existing = $this->tenantRepo->findBySlug($slug);
        if ($existing) {
            $slug .= '-' . substr(bin2hex(random_bytes(3)), 0, 6);
        }
        return $slug;
    }

    private function validateColor(string $color): void
    {
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            throw new \RuntimeException("Invalid color format: {$color}. Use hex format like #1a1a2e");
        }
    }
}
