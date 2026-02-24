<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'commission_payouts')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_cpay_merchant')]
#[ORM\Index(columns: ['status'], name: 'idx_cpay_status')]
#[ORM\HasLifecycleCallbacks]
class CommissionPayout
{
    use HasUuid; use HasTimestamps;

    #[ORM\Column(name: 'merchant_id', type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(name: 'payout_period', type: Types::STRING, length: 20)]
    private string $payoutPeriod;
    #[ORM\Column(name: 'total_amount', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $totalAmount;
    #[ORM\Column(name: 'commission_ids', type: Types::JSON)]
    private array $commissionIds = [];
    #[ORM\Column(name: 'bank_account_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $bankAccountId = null;
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'pending';
    #[ORM\Column(name: 'payment_reference', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paymentReference = null;
    #[ORM\Column(name: 'processing_started_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $processingStartedAt = null;
    #[ORM\Column(name: 'paid_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $paidAt = null;
    #[ORM\Column(name: 'failure_reason', type: Types::TEXT, nullable: true)]
    private ?string $failureReason = null;

    public function __construct() { $this->generateId(); }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getPayoutPeriod(): string { return $this->payoutPeriod; }
    public function setPayoutPeriod(string $v): self { $this->payoutPeriod = $v; return $this; }
    public function getTotalAmount(): string { return $this->totalAmount; }
    public function setTotalAmount(string $v): self { $this->totalAmount = $v; return $this; }
    public function getCommissionIds(): array { return $this->commissionIds; }
    public function setCommissionIds(array $v): self { $this->commissionIds = $v; return $this; }
    public function getBankAccountId(): ?string { return $this->bankAccountId; }
    public function setBankAccountId(?string $v): self { $this->bankAccountId = $v; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): self { $this->status = $v; return $this; }
    public function getPaymentReference(): ?string { return $this->paymentReference; }
    public function setPaymentReference(?string $v): self { $this->paymentReference = $v; return $this; }
    public function getProcessingStartedAt(): ?\DateTimeImmutable { return $this->processingStartedAt; }
    public function setProcessingStartedAt(?\DateTimeImmutable $v): self { $this->processingStartedAt = $v; return $this; }
    public function getPaidAt(): ?\DateTimeImmutable { return $this->paidAt; }
    public function setPaidAt(?\DateTimeImmutable $v): self { $this->paidAt = $v; return $this; }
    public function getFailureReason(): ?string { return $this->failureReason; }
    public function setFailureReason(?string $v): self { $this->failureReason = $v; return $this; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'payout_period' => $this->payoutPeriod,
            'total_amount' => $this->totalAmount, 'commission_ids' => $this->commissionIds,
            'bank_account_id' => $this->bankAccountId, 'status' => $this->status,
            'payment_reference' => $this->paymentReference, 'paid_at' => $this->paidAt?->format(\DateTimeInterface::ATOM),
            'failure_reason' => $this->failureReason, 'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
