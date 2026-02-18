<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'subscriptions')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_subscriptions_tenant')]
#[ORM\Index(columns: ['status'], name: 'idx_subscriptions_status')]
#[ORM\HasLifecycleCallbacks]
class Subscription
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36)]
    private string $tenantId;

    #[ORM\Column(name: 'plan_id', type: Types::STRING, length: 36)]
    private string $planId;

    #[ORM\Column(name: 'billing_cycle', type: Types::STRING, length: 10)]
    private string $billingCycle = 'monthly';

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'active';

    #[ORM\Column(type: Types::BIGINT)]
    private int $amount;

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'NGN'])]
    private string $currency = 'NGN';

    #[ORM\Column(name: 'current_period_start', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $currentPeriodStart;

    #[ORM\Column(name: 'current_period_end', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $currentPeriodEnd;

    #[ORM\Column(name: 'trial_end', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $trialEnd = null;

    #[ORM\Column(name: 'cancelled_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $cancelledAt = null;

    #[ORM\Column(name: 'cancel_at_period_end', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $cancelAtPeriodEnd = false;

    #[ORM\Column(name: 'paystack_subscription_code', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paystackSubscriptionCode = null;

    #[ORM\Column(name: 'paystack_customer_code', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paystackCustomerCode = null;

    #[ORM\Column(name: 'paystack_email_token', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paystackEmailToken = null;

    #[ORM\Column(name: 'paystack_authorization_code', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paystackAuthorizationCode = null;

    #[ORM\Column(name: 'next_payment_date', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $nextPaymentDate = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $metadata = null;

    public function __construct(
        string $tenantId,
        string $planId,
        string $billingCycle,
        int $amount,
        ?\DateTimeImmutable $periodStart = null,
        ?\DateTimeImmutable $periodEnd = null,
    ) {
        $this->generateId();
        $this->tenantId = $tenantId;
        $this->planId = $planId;
        $this->billingCycle = $billingCycle;
        $this->amount = $amount;
        $this->currentPeriodStart = $periodStart ?? new \DateTimeImmutable();
        $this->currentPeriodEnd = $periodEnd ?? ($billingCycle === 'annual'
            ? new \DateTimeImmutable('+1 year')
            : new \DateTimeImmutable('+30 days'));
    }

    public function getTenantId(): string { return $this->tenantId; }
    public function getPlanId(): string { return $this->planId; }
    public function setPlanId(string $id): void { $this->planId = $id; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $s): void { $this->status = $s; }
    public function getBillingCycle(): string { return $this->billingCycle; }
    public function getAmount(): int { return $this->amount; }
    public function setAmount(int $a): void { $this->amount = $a; }
    public function getCurrency(): string { return $this->currency; }
    public function getCurrentPeriodStart(): \DateTimeImmutable { return $this->currentPeriodStart; }
    public function setCurrentPeriodStart(\DateTimeImmutable $d): void { $this->currentPeriodStart = $d; }
    public function getCurrentPeriodEnd(): \DateTimeImmutable { return $this->currentPeriodEnd; }
    public function setCurrentPeriodEnd(\DateTimeImmutable $d): void { $this->currentPeriodEnd = $d; }
    public function getTrialEnd(): ?\DateTimeImmutable { return $this->trialEnd; }
    public function setTrialEnd(?\DateTimeImmutable $d): void { $this->trialEnd = $d; }
    public function getCancelledAt(): ?\DateTimeImmutable { return $this->cancelledAt; }
    public function setCancelledAt(?\DateTimeImmutable $d): void { $this->cancelledAt = $d; }
    public function getCancelAtPeriodEnd(): bool { return $this->cancelAtPeriodEnd; }
    public function setCancelAtPeriodEnd(bool $v): void { $this->cancelAtPeriodEnd = $v; }
    public function getPaystackSubscriptionCode(): ?string { return $this->paystackSubscriptionCode; }
    public function setPaystackSubscriptionCode(?string $c): void { $this->paystackSubscriptionCode = $c; }
    public function getPaystackCustomerCode(): ?string { return $this->paystackCustomerCode; }
    public function setPaystackCustomerCode(?string $c): void { $this->paystackCustomerCode = $c; }
    public function getPaystackEmailToken(): ?string { return $this->paystackEmailToken; }
    public function setPaystackEmailToken(?string $t): void { $this->paystackEmailToken = $t; }
    public function getPaystackAuthorizationCode(): ?string { return $this->paystackAuthorizationCode; }
    public function setPaystackAuthorizationCode(?string $c): void { $this->paystackAuthorizationCode = $c; }
    public function getNextPaymentDate(): ?\DateTimeImmutable { return $this->nextPaymentDate; }
    public function setNextPaymentDate(?\DateTimeImmutable $d): void { $this->nextPaymentDate = $d; }
    public function getMetadata(): ?array { return $this->metadata; }
    public function setMetadata(?array $m): void { $this->metadata = $m; }
    public function getStartedAt(): \DateTimeImmutable { return $this->getCreatedAt(); }

    public function isActive(): bool { return $this->status === 'active'; }

    public function cancel(): void
    {
        $this->status = 'cancelled';
        $this->cancelledAt = new \DateTimeImmutable();
    }

    public function renew(): void
    {
        $this->currentPeriodStart = new \DateTimeImmutable();
        $this->currentPeriodEnd = $this->billingCycle === 'annual'
            ? new \DateTimeImmutable('+1 year')
            : new \DateTimeImmutable('+30 days');
        $this->status = 'active';
    }
}
