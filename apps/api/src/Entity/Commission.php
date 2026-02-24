<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\CommissionScope;
use Lodgik\Enum\CommissionStatus;

#[ORM\Entity]
#[ORM\Table(name: 'commissions')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_comm_merchant')]
#[ORM\Index(columns: ['status'], name: 'idx_comm_status')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_comm_tenant')]
#[ORM\HasLifecycleCallbacks]
class Commission
{
    use HasUuid; use HasTimestamps;

    #[ORM\Column(name: 'merchant_id', type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(name: 'hotel_id', type: Types::STRING, length: 36)]
    private string $hotelId;
    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36)]
    private string $tenantId;
    #[ORM\Column(name: 'subscription_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $subscriptionId = null;
    #[ORM\Column(name: 'commission_tier_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $commissionTierId = null;
    #[ORM\Column(type: Types::STRING, length: 20, enumType: CommissionScope::class)]
    private CommissionScope $scope;
    #[ORM\Column(name: 'plan_name', type: Types::STRING, length: 50, nullable: true)]
    private ?string $planName = null;
    #[ORM\Column(name: 'billing_cycle', type: Types::STRING, length: 10, nullable: true)]
    private ?string $billingCycle = null;
    #[ORM\Column(name: 'subscription_amount', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $subscriptionAmount;
    #[ORM\Column(name: 'commission_rate', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $commissionRate;
    #[ORM\Column(name: 'commission_amount', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $commissionAmount;
    #[ORM\Column(type: Types::STRING, length: 20, enumType: CommissionStatus::class)]
    private CommissionStatus $status;
    #[ORM\Column(name: 'cooling_period_ends', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $coolingPeriodEnds = null;
    #[ORM\Column(name: 'approved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $approvedAt = null;
    #[ORM\Column(name: 'paid_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $paidAt = null;
    #[ORM\Column(name: 'payment_reference', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paymentReference = null;
    #[ORM\Column(name: 'reversed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $reversedAt = null;
    #[ORM\Column(name: 'reversal_reason', type: Types::TEXT, nullable: true)]
    private ?string $reversalReason = null;

    public function __construct()
    {
        $this->generateId();
        $this->status = CommissionStatus::PENDING;
        $this->coolingPeriodEnds = new \DateTimeImmutable('+7 days');
    }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getHotelId(): string { return $this->hotelId; }
    public function setHotelId(string $v): self { $this->hotelId = $v; return $this; }
    public function getTenantId(): string { return $this->tenantId; }
    public function setTenantId(string $v): self { $this->tenantId = $v; return $this; }
    public function getSubscriptionId(): ?string { return $this->subscriptionId; }
    public function setSubscriptionId(?string $v): self { $this->subscriptionId = $v; return $this; }
    public function getCommissionTierId(): ?string { return $this->commissionTierId; }
    public function setCommissionTierId(?string $v): self { $this->commissionTierId = $v; return $this; }
    public function getScope(): CommissionScope { return $this->scope; }
    public function setScope(CommissionScope $v): self { $this->scope = $v; return $this; }
    public function getPlanName(): ?string { return $this->planName; }
    public function setPlanName(?string $v): self { $this->planName = $v; return $this; }
    public function getBillingCycle(): ?string { return $this->billingCycle; }
    public function setBillingCycle(?string $v): self { $this->billingCycle = $v; return $this; }
    public function getSubscriptionAmount(): string { return $this->subscriptionAmount; }
    public function setSubscriptionAmount(string $v): self { $this->subscriptionAmount = $v; return $this; }
    public function getCommissionRate(): string { return $this->commissionRate; }
    public function setCommissionRate(string $v): self { $this->commissionRate = $v; return $this; }
    public function getCommissionAmount(): string { return $this->commissionAmount; }
    public function setCommissionAmount(string $v): self { $this->commissionAmount = $v; return $this; }
    public function getStatus(): CommissionStatus { return $this->status; }
    public function setStatus(CommissionStatus $v): self { $this->status = $v; return $this; }
    public function getCoolingPeriodEnds(): ?\DateTimeImmutable { return $this->coolingPeriodEnds; }
    public function setCoolingPeriodEnds(?\DateTimeImmutable $v): self { $this->coolingPeriodEnds = $v; return $this; }
    public function getApprovedAt(): ?\DateTimeImmutable { return $this->approvedAt; }
    public function setApprovedAt(?\DateTimeImmutable $v): self { $this->approvedAt = $v; return $this; }
    public function getPaidAt(): ?\DateTimeImmutable { return $this->paidAt; }
    public function setPaidAt(?\DateTimeImmutable $v): self { $this->paidAt = $v; return $this; }
    public function getPaymentReference(): ?string { return $this->paymentReference; }
    public function setPaymentReference(?string $v): self { $this->paymentReference = $v; return $this; }
    public function getReversedAt(): ?\DateTimeImmutable { return $this->reversedAt; }
    public function setReversedAt(?\DateTimeImmutable $v): self { $this->reversedAt = $v; return $this; }
    public function getReversalReason(): ?string { return $this->reversalReason; }
    public function setReversalReason(?string $v): self { $this->reversalReason = $v; return $this; }
    public function isCoolingComplete(): bool { return $this->coolingPeriodEnds !== null && $this->coolingPeriodEnds <= new \DateTimeImmutable(); }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'hotel_id' => $this->hotelId,
            'tenant_id' => $this->tenantId, 'subscription_id' => $this->subscriptionId,
            'scope' => $this->scope->value, 'plan_name' => $this->planName,
            'billing_cycle' => $this->billingCycle, 'subscription_amount' => $this->subscriptionAmount,
            'commission_rate' => $this->commissionRate, 'commission_amount' => $this->commissionAmount,
            'status' => $this->status->value, 'cooling_period_ends' => $this->coolingPeriodEnds?->format(\DateTimeInterface::ATOM),
            'approved_at' => $this->approvedAt?->format(\DateTimeInterface::ATOM),
            'paid_at' => $this->paidAt?->format(\DateTimeInterface::ATOM),
            'payment_reference' => $this->paymentReference, 'reversed_at' => $this->reversedAt?->format(\DateTimeInterface::ATOM),
            'reversal_reason' => $this->reversalReason, 'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
