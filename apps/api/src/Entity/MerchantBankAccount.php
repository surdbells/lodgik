<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_bank_accounts')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_mba_merchant')]
#[ORM\HasLifecycleCallbacks]
class MerchantBankAccount
{
    use HasUuid; use HasTimestamps;

    #[ORM\Column(name: 'merchant_id', type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(name: 'bank_name', type: Types::STRING, length: 100)]
    private string $bankName;
    #[ORM\Column(name: 'account_name', type: Types::STRING, length: 100)]
    private string $accountName;
    #[ORM\Column(name: 'account_number', type: Types::STRING, length: 20)]
    private string $accountNumber;
    #[ORM\Column(name: 'settlement_currency', type: Types::STRING, length: 3)]
    private string $settlementCurrency = 'NGN';
    #[ORM\Column(name: 'payment_method', type: Types::STRING, length: 20)]
    private string $paymentMethod = 'bank_transfer';
    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $tin = null;
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'pending_approval';
    #[ORM\Column(name: 'change_requires_approval', type: Types::BOOLEAN)]
    private bool $changeRequiresApproval = true;
    #[ORM\Column(name: 'approved_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $approvedBy = null;
    #[ORM\Column(name: 'approved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $approvedAt = null;

    public function __construct() { $this->generateId(); }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getBankName(): string { return $this->bankName; }
    public function setBankName(string $v): self { $this->bankName = $v; return $this; }
    public function getAccountName(): string { return $this->accountName; }
    public function setAccountName(string $v): self { $this->accountName = $v; return $this; }
    public function getAccountNumber(): string { return $this->accountNumber; }
    public function setAccountNumber(string $v): self { $this->accountNumber = $v; return $this; }
    public function getSettlementCurrency(): string { return $this->settlementCurrency; }
    public function setSettlementCurrency(string $v): self { $this->settlementCurrency = $v; return $this; }
    public function getPaymentMethod(): string { return $this->paymentMethod; }
    public function setPaymentMethod(string $v): self { $this->paymentMethod = $v; return $this; }
    public function getTin(): ?string { return $this->tin; }
    public function setTin(?string $v): self { $this->tin = $v; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): self { $this->status = $v; return $this; }
    public function getApprovedBy(): ?string { return $this->approvedBy; }
    public function setApprovedBy(?string $v): self { $this->approvedBy = $v; return $this; }
    public function getApprovedAt(): ?\DateTimeImmutable { return $this->approvedAt; }
    public function setApprovedAt(?\DateTimeImmutable $v): self { $this->approvedAt = $v; return $this; }
    public function isApproved(): bool { return $this->status === 'approved'; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'bank_name' => $this->bankName,
            'account_name' => $this->accountName, 'account_number' => $this->accountNumber,
            'settlement_currency' => $this->settlementCurrency, 'payment_method' => $this->paymentMethod,
            'tin' => $this->tin, 'status' => $this->status, 'approved_by' => $this->approvedBy,
            'approved_at' => $this->approvedAt?->format(\DateTimeInterface::ATOM),
            'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
