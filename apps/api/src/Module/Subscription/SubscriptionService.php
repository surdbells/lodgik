<?php

declare(strict_types=1);

namespace Lodgik\Module\Subscription;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Subscription;
use Lodgik\Entity\SubscriptionInvoice;
use Lodgik\Entity\SubscriptionPlan;
use Lodgik\Entity\Tenant;
use Lodgik\Repository\TenantRepository;
use Lodgik\Service\AuditService;
use Lodgik\Service\PaystackService;

final class SubscriptionService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantRepository $tenantRepo,
        private readonly PaystackService $paystack,
        private readonly AuditService $audit,
        private readonly ?\Lodgik\Service\ZeptoMailService $mailService = null,
    ) {}

    // ─── Current Subscription ──────────────────────────────────

    public function getCurrentSubscription(string $tenantId): ?Subscription
    {
        return $this->em->getRepository(Subscription::class)
            ->findOneBy(['tenantId' => $tenantId], ['createdAt' => 'DESC']);
    }

    /**
     * @return array Formatted current subscription details
     */
    public function getCurrentDetails(string $tenantId): array
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        $sub = $this->getCurrentSubscription($tenantId);
        $plan = $tenant->getSubscriptionPlanId()
            ? $this->em->find(SubscriptionPlan::class, $tenant->getSubscriptionPlanId())
            : null;

        return [
            'tenant_id' => $tenantId,
            'status' => $tenant->getSubscriptionStatus()->value,
            'plan_id' => $plan?->getId(),
            'plan_name' => $plan?->getName(),
            'plan' => $plan ? [
                'id' => $plan->getId(),
                'name' => $plan->getName(),
                'tier' => $plan->getTier(),
                'monthly_price' => $plan->getMonthlyPrice(),
                'annual_price' => $plan->getAnnualPrice(),
            ] : null,
            'billing_cycle' => $sub?->getBillingCycle(),
            'next_payment_date' => $sub?->getNextPaymentDate()?->format('c'),
            'subscription' => $sub ? [
                'id' => $sub->getId(),
                'billing_cycle' => $sub->getBillingCycle(),
                'amount' => $sub->getAmount(),
                'current_period_start' => $sub->getCurrentPeriodStart()->format('c'),
                'current_period_end' => $sub->getCurrentPeriodEnd()->format('c'),
                'cancel_at_period_end' => $sub->getCancelAtPeriodEnd(),
                'next_payment_date' => $sub->getNextPaymentDate()?->format('c'),
            ] : null,
            'trial_ends_at' => $tenant->getTrialEndsAt()?->format('c'),
            'subscription_ends_at' => $tenant->getSubscriptionEndsAt()?->format('c'),
            'limits' => [
                'max_rooms' => $tenant->getMaxRooms(),
                'max_staff' => $tenant->getMaxStaff(),
                'max_properties' => $tenant->getMaxProperties(),
            ],
            'paystack_configured' => $this->paystack->isConfigured(),
        ];
    }

    // ─── Initialize Checkout ───────────────────────────────────

    /**
     * Initialize a Paystack transaction for subscription payment.
     */
    public function initializeCheckout(
        string $tenantId,
        string $planId,
        string $billingCycle,
        string $email,
        ?string $callbackUrl = null,
        ?int $amountOverride = null,
    ): array {
        $plan = $this->em->find(SubscriptionPlan::class, $planId);
        if ($plan === null) {
            throw new \RuntimeException('Plan not found');
        }

        if (!$plan->isActive()) {
            throw new \RuntimeException('Plan is not available');
        }

        $amount = $amountOverride ?? ($billingCycle === 'annual' ? $plan->getAnnualPrice() : $plan->getMonthlyPrice());
        $paystackPlanCode = $billingCycle === 'annual'
            ? $plan->getPaystackPlanCodeAnnual()
            : $plan->getPaystackPlanCodeMonthly();

        $reference = PaystackService::generateReference();

        $metadata = [
            'tenant_id' => $tenantId,
            'plan_id' => $planId,
            'plan_name' => $plan->getName(),
            'billing_cycle' => $billingCycle,
            'custom_fields' => [
                ['display_name' => 'Plan', 'variable_name' => 'plan', 'value' => $plan->getName()],
                ['display_name' => 'Cycle', 'variable_name' => 'cycle', 'value' => $billingCycle],
            ],
        ];

        if (!$this->paystack->isConfigured()) {
            // Return a mock response for development
            return [
                'authorization_url' => null,
                'reference' => $reference,
                'amount' => $amount,
                'plan' => $plan->getName(),
                'billing_cycle' => $billingCycle,
                'paystack_configured' => false,
                'message' => 'Paystack not configured. Use manual activation via super admin.',
            ];
        }

        $result = $this->paystack->initializeTransaction(
            email: $email,
            amountInKobo: $amount,
            reference: $reference,
            planCode: $paystackPlanCode,
            metadata: $metadata,
            callbackUrl: $callbackUrl,
        );

        return [
            'authorization_url' => $result['authorization_url'],
            'access_code' => $result['access_code'],
            'reference' => $result['reference'] ?? $reference,
            'amount' => $amount,
            'plan' => $plan->getName(),
            'billing_cycle' => $billingCycle,
            'paystack_configured' => true,
        ];
    }

    // ─── Verify Payment ────────────────────────────────────────

    /**
     * Verify a Paystack transaction and activate subscription.
     */
    public function verifyPayment(string $reference, string $tenantId): array
    {
        if (!$this->paystack->isConfigured()) {
            throw new \RuntimeException('Paystack not configured');
        }

        $txn = $this->paystack->verifyTransaction($reference);

        if ($txn['status'] !== 'success') {
            throw new \RuntimeException('Payment not successful: ' . ($txn['gateway_response'] ?? 'Unknown'));
        }

        $metadata = $txn['metadata'] ?? [];
        $planId = $metadata['plan_id'] ?? null;
        $billingCycle = $metadata['billing_cycle'] ?? 'monthly';

        if ($planId === null) {
            throw new \RuntimeException('Missing plan_id in payment metadata');
        }

        return $this->activateSubscription(
            tenantId: $tenantId,
            planId: $planId,
            billingCycle: $billingCycle,
            amount: (int) $txn['amount'],
            paystackReference: $reference,
            paystackTransactionId: (string) ($txn['id'] ?? ''),
            paystackChannel: $txn['channel'] ?? null,
            paystackCustomerCode: $txn['customer']['customer_code'] ?? null,
            paystackAuthorizationCode: $txn['authorization']['authorization_code'] ?? null,
            paystackSubscriptionCode: $txn['plan_object']['subscriptions'][0]['subscription_code'] ?? null,
            paymentData: $txn,
        );
    }

    // ─── Activate Subscription ─────────────────────────────────

    /**
     * Create or renew a subscription (called after successful payment or by super admin).
     */
    public function activateSubscription(
        string $tenantId,
        string $planId,
        string $billingCycle,
        int $amount,
        ?string $paystackReference = null,
        ?string $paystackTransactionId = null,
        ?string $paystackChannel = null,
        ?string $paystackCustomerCode = null,
        ?string $paystackAuthorizationCode = null,
        ?string $paystackSubscriptionCode = null,
        ?array $paymentData = null,
        string $commissionScope = 'new_subscription',
    ): array {
        $tenant = $this->tenantRepo->find($tenantId);
        $plan = $this->em->find(SubscriptionPlan::class, $planId);

        if ($tenant === null || $plan === null) {
            throw new \RuntimeException('Tenant or plan not found');
        }

        $now = new \DateTimeImmutable();
        $periodEnd = $billingCycle === 'annual'
            ? $now->modify('+1 year')
            : $now->modify('+30 days');

        // Create subscription record
        $sub = new Subscription($tenantId, $planId, $billingCycle, $amount, $now, $periodEnd);
        $sub->setStatus('active');
        $sub->setPaystackCustomerCode($paystackCustomerCode);
        $sub->setPaystackAuthorizationCode($paystackAuthorizationCode);
        $sub->setPaystackSubscriptionCode($paystackSubscriptionCode);
        $sub->setNextPaymentDate($periodEnd);
        $this->em->persist($sub);

        // Create invoice
        $invoiceNumber = 'INV-' . strtoupper(substr($tenantId, 0, 8)) . '-' . date('Ymd') . '-' . rand(100, 999);
        $invoice = new SubscriptionInvoice(
            $tenantId, $sub->getId(), $planId, $invoiceNumber,
            $amount, $billingCycle, $now, $periodEnd,
        );
        if ($paystackReference) {
            $invoice->markPaid($paystackReference, $paystackTransactionId, $paystackChannel);
            $invoice->setPaymentData($paymentData);
        }
        $this->em->persist($invoice);

        // Update tenant
        $tenant->setSubscriptionPlanId($planId);
        $tenant->setSubscriptionStatus(\Lodgik\Enum\SubscriptionStatus::ACTIVE);
        $tenant->setSubscriptionEndsAt($periodEnd);
        $tenant->setMaxRooms($plan->getMaxRooms());
        $tenant->setMaxStaff($plan->getMaxStaff());
        $tenant->setMaxProperties($plan->getMaxProperties());
        $tenant->setEnabledModules($plan->getIncludedModules());
        $tenant->setPaystackCustomerCode($paystackCustomerCode);
        $tenant->setPaystackSubscriptionCode($paystackSubscriptionCode);

        $this->em->flush();

        $this->audit->log('subscription.activated', $tenantId, $sub->getId(), null,
            "Activated {$plan->getName()} ({$billingCycle}) for ₦" . number_format($amount / 100),
        );

        // Phase 9D: Auto-trigger merchant commission if hotel bound to merchant
        $this->triggerMerchantCommission($tenantId, $sub->getId(), $plan->getName(), $billingCycle, $amount, $commissionScope);

        // Send subscription confirmation email
        try {
            if ($this->mailService && $tenant->getEmail()) {
                $this->mailService->sendSubscriptionConfirmation(
                    $tenant->getEmail(),
                    $tenant->getBusinessName() ?? 'Hotel',
                    ['plan_name' => $plan->getName(), 'billing_cycle' => $billingCycle, 'amount' => $amount, 'period_end' => $periodEnd->format('Y-m-d')],
                );
            }
        } catch (\Throwable) {}

        return [
            'subscription_id' => $sub->getId(),
            'invoice_id' => $invoice->getId(),
            'invoice_number' => $invoiceNumber,
            'status' => 'active',
            'plan' => $plan->getName(),
            'period_end' => $periodEnd->format('c'),
        ];
    }

    // ─── Upgrade ───────────────────────────────────────────────

    public function upgrade(string $tenantId, string $newPlanId, string $billingCycle, string $email): array
    {
        $newPlan = $this->em->find(SubscriptionPlan::class, $newPlanId);
        if ($newPlan === null || !$newPlan->isActive()) {
            throw new \RuntimeException('Plan not available');
        }

        $newAmount = $billingCycle === 'annual' ? $newPlan->getAnnualPrice() : $newPlan->getMonthlyPrice();

        // Calculate pro-rata credit from current subscription
        $currentSub = $this->getCurrentSubscription($tenantId);
        $credit = 0;
        if ($currentSub !== null && $currentSub->getStatus() === 'active') {
            $now = new \DateTimeImmutable();
            $periodEnd = $currentSub->getCurrentPeriodEnd();
            $periodStart = $currentSub->getCurrentPeriodStart();
            if ($periodEnd && $periodStart && $periodEnd > $now) {
                $totalDays = max(1, $periodStart->diff($periodEnd)->days);
                $remainingDays = max(0, $now->diff($periodEnd)->days);
                $currentAmount = (int) $currentSub->getAmount();
                $credit = (int) round($currentAmount * ($remainingDays / $totalDays));
            }
        }

        $chargeAmount = max(0, $newAmount - $credit);

        // If Paystack not configured or no charge needed, do immediate upgrade
        if (!$this->paystack->isConfigured() || $chargeAmount <= 0) {
            $result = $this->activateSubscription($tenantId, $newPlanId, $billingCycle, (string) $newAmount);
            $result['credit'] = $credit;
            $result['charge_amount'] = $chargeAmount;
            return $result;
        }

        // Initialize Paystack payment for the pro-rated amount
        return $this->initializeCheckout($tenantId, $newPlanId, $billingCycle, $email, null, $chargeAmount);
    }

    // ─── Cancel ────────────────────────────────────────────────

    public function cancel(string $tenantId): array
    {
        $sub = $this->getCurrentSubscription($tenantId);
        if ($sub === null) {
            throw new \RuntimeException('No active subscription');
        }

        // Cancel on Paystack if configured
        if ($this->paystack->isConfigured() && $sub->getPaystackSubscriptionCode() && $sub->getPaystackEmailToken()) {
            try {
                $this->paystack->disableSubscription(
                    $sub->getPaystackSubscriptionCode(),
                    $sub->getPaystackEmailToken(),
                );
            } catch (\Throwable) {
                // Log but don't fail — we still cancel locally
            }
        }

        $sub->setCancelAtPeriodEnd(true);
        $sub->setCancelledAt(new \DateTimeImmutable());

        $this->em->flush();

        $this->audit->log('subscription.cancelled', $tenantId, $sub->getId(), null,
            'Cancelled. Access until ' . $sub->getCurrentPeriodEnd()->format('Y-m-d'),
        );

        return [
            'cancelled' => true,
            'access_until' => $sub->getCurrentPeriodEnd()->format('c'),
            'message' => 'Subscription cancelled. Access continues until ' . $sub->getCurrentPeriodEnd()->format('Y-m-d'),
        ];
    }

    // ─── Webhook ───────────────────────────────────────────────

    /**
     * Process a Paystack webhook event.
     * @return array Result of processing
     */
    public function processWebhook(string $event, array $data): array
    {
        return match ($event) {
            'charge.success' => $this->handleChargeSuccess($data),
            'subscription.create' => $this->handleSubscriptionCreate($data),
            'subscription.not_renew' => $this->handleSubscriptionNotRenew($data),
            'subscription.disable' => $this->handleSubscriptionDisable($data),
            'invoice.payment_failed' => $this->handlePaymentFailed($data),
            default => ['handled' => false, 'event' => $event],
        };
    }

    private function handleChargeSuccess(array $data): array
    {
        $metadata = $data['metadata'] ?? [];
        $tenantId = $metadata['tenant_id'] ?? null;
        if ($tenantId === null) {
            return ['handled' => false, 'reason' => 'No tenant_id in metadata'];
        }

        // Check if this reference already has an invoice
        $existing = $this->em->getRepository(SubscriptionInvoice::class)
            ->findOneBy(['paystackReference' => $data['reference'] ?? '']);
        if ($existing !== null) {
            return ['handled' => true, 'reason' => 'Already processed'];
        }

        $planId = $metadata['plan_id'] ?? null;
        $billingCycle = $metadata['billing_cycle'] ?? 'monthly';

        if ($planId !== null) {
            // Detect if renewal (tenant already has active subscription)
            $existingSub = $this->getCurrentSubscription($tenantId);
            $scope = ($existingSub !== null && $existingSub->getStatus() === 'active') ? 'renewal' : 'new_subscription';

            $result = $this->activateSubscription(
                tenantId: $tenantId,
                planId: $planId,
                billingCycle: $billingCycle,
                amount: (int) ($data['amount'] ?? 0),
                paystackReference: $data['reference'] ?? null,
                paystackTransactionId: (string) ($data['id'] ?? ''),
                paystackChannel: $data['channel'] ?? null,
                paystackCustomerCode: $data['customer']['customer_code'] ?? null,
                paymentData: $data,
                commissionScope: $scope,
            );
            return ['handled' => true, 'result' => $result];
        }

        return ['handled' => false, 'reason' => 'No plan_id in metadata'];
    }

    private function handleSubscriptionCreate(array $data): array
    {
        // Paystack created a subscription — we already handle via charge.success
        return ['handled' => true, 'event' => 'subscription.create'];
    }

    private function handleSubscriptionNotRenew(array $data): array
    {
        $code = $data['subscription_code'] ?? null;
        if ($code === null) return ['handled' => false];

        $sub = $this->em->getRepository(Subscription::class)
            ->findOneBy(['paystackSubscriptionCode' => $code]);
        if ($sub !== null) {
            $sub->setCancelAtPeriodEnd(true);
            $this->em->flush();
        }

        return ['handled' => true, 'event' => 'subscription.not_renew'];
    }

    private function handleSubscriptionDisable(array $data): array
    {
        $code = $data['subscription_code'] ?? null;
        if ($code === null) return ['handled' => false];

        $sub = $this->em->getRepository(Subscription::class)
            ->findOneBy(['paystackSubscriptionCode' => $code]);
        if ($sub !== null) {
            $sub->setStatus('cancelled');
            $sub->setCancelledAt(new \DateTimeImmutable());
            $this->em->flush();
        }

        return ['handled' => true, 'event' => 'subscription.disable'];
    }

    private function handlePaymentFailed(array $data): array
    {
        $metadata = $data['metadata'] ?? [];
        $tenantId = $metadata['tenant_id'] ?? null;
        if ($tenantId === null) return ['handled' => false];

        $sub = $this->getCurrentSubscription($tenantId);
        if ($sub !== null) {
            $sub->setStatus('past_due');
            $this->em->flush();
        }

        // Update tenant status
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant !== null) {
            $tenant->setSubscriptionStatus(\Lodgik\Enum\SubscriptionStatus::PAST_DUE);
            $this->em->flush();
        }

        return ['handled' => true, 'event' => 'invoice.payment_failed'];
    }

    // ─── Invoices ──────────────────────────────────────────────

    /**
     * @return SubscriptionInvoice[]
     */
    public function getInvoices(string $tenantId, int $limit = 20): array
    {
        return $this->em->getRepository(SubscriptionInvoice::class)
            ->findBy(['tenantId' => $tenantId], ['createdAt' => 'DESC'], $limit);
    }

    // ─── Phase 9D: Merchant Commission Auto-Trigger ───────────

    /**
     * If this tenant's hotel is bound to a merchant, auto-calculate commission.
     */
    private function triggerMerchantCommission(
        string $tenantId, string $subscriptionId, string $planName,
        string $billingCycle, int $amountKobo, string $scope
    ): void {
        try {
            $hotel = $this->em->getRepository(\Lodgik\Entity\MerchantHotel::class)
                ->findOneBy(['tenantId' => $tenantId]);
            if (!$hotel) return;

            $merchant = $this->em->find(\Lodgik\Entity\Merchant::class, $hotel->getMerchantId());
            if (!$merchant || !$merchant->isActive()) return;

            $tier = $merchant->getCommissionTierId()
                ? $this->em->find(\Lodgik\Entity\CommissionTier::class, $merchant->getCommissionTierId())
                : $this->em->getRepository(\Lodgik\Entity\CommissionTier::class)->findOneBy(['isDefault' => true, 'isActive' => true]);
            if (!$tier) return;

            $commissionScope = \Lodgik\Enum\CommissionScope::from($scope);
            $amountNaira = bcdiv((string) $amountKobo, '100', 2);
            $rate = $tier->getRateForScope($scope, $planName);
            $commissionAmount = $tier->getType() === 'percentage'
                ? bcmul($amountNaira, bcdiv($rate, '100', 4), 2)
                : $rate;

            $c = new \Lodgik\Entity\Commission();
            $c->setMerchantId($merchant->getId());
            $c->setHotelId($hotel->getId());
            $c->setTenantId($tenantId);
            $c->setSubscriptionId($subscriptionId);
            $c->setCommissionTierId($tier->getId());
            $c->setScope($commissionScope);
            $c->setPlanName($planName);
            $c->setBillingCycle($billingCycle);
            $c->setSubscriptionAmount($amountNaira);
            $c->setCommissionRate($rate);
            $c->setCommissionAmount($commissionAmount);
            $c->setStatus(\Lodgik\Enum\CommissionStatus::PENDING);
            $c->setCoolingPeriodEnds(new \DateTimeImmutable('+7 days'));
            $this->em->persist($c);

            // Notify merchant
            $n = new \Lodgik\Entity\MerchantNotification();
            $n->setMerchantId($merchant->getId());
            $n->setType('commission_approved');
            $n->setTitle('New Commission Earned');
            $n->setBody("You earned ₦{$commissionAmount} commission on a {$commissionScope->label()} payment for {$hotel->getHotelName()}.");
            $n->setData(['commission_amount' => $commissionAmount, 'hotel_id' => $hotel->getId(), 'scope' => $scope]);
            $this->em->persist($n);

            $this->em->flush();
        } catch (\Throwable $e) {
            // Commission trigger must never break subscription flow
            // Log silently and continue
            error_log("Merchant commission trigger failed: " . $e->getMessage());
        }
    }
}
