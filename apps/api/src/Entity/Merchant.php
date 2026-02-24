<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\MerchantStatus;
use Lodgik\Enum\MerchantCategory;

#[ORM\Entity]
#[ORM\Table(name: 'merchants')]
#[ORM\Index(columns: ['status'], name: 'idx_merchants_status')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_merchants_merchant_id')]
#[ORM\Index(columns: ['email'], name: 'idx_merchants_email')]
#[ORM\HasLifecycleCallbacks]
class Merchant
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(name: 'merchant_id', type: Types::STRING, length: 20, unique: true)]
    private string $merchantId;

    #[ORM\Column(name: 'legal_name', type: Types::STRING, length: 255)]
    private string $legalName;

    #[ORM\Column(name: 'business_name', type: Types::STRING, length: 255)]
    private string $businessName;

    #[ORM\Column(type: Types::STRING, length: 320)]
    private string $email;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $address = null;

    #[ORM\Column(name: 'operating_region', type: Types::STRING, length: 100, nullable: true)]
    private ?string $operatingRegion = null;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: MerchantCategory::class)]
    private MerchantCategory $category;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $type = 'individual';

    #[ORM\Column(name: 'commission_tier_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $commissionTierId = null;

    #[ORM\Column(name: 'settlement_currency', type: Types::STRING, length: 3)]
    private string $settlementCurrency = 'NGN';

    #[ORM\Column(type: Types::STRING, length: 30, enumType: MerchantStatus::class)]
    private MerchantStatus $status;

    #[ORM\Column(name: 'user_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $userId = null;

    #[ORM\Column(name: 'logo_url', type: Types::STRING, length: 255, nullable: true)]
    private ?string $logoUrl = null;

    #[ORM\Column(name: 'suspension_reason', type: Types::TEXT, nullable: true)]
    private ?string $suspensionReason = null;

    #[ORM\Column(name: 'approved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $approvedAt = null;

    #[ORM\Column(name: 'suspended_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $suspendedAt = null;

    #[ORM\Column(name: 'terminated_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $terminatedAt = null;

    public function __construct()
    {
        $this->generateId();
        $this->merchantId = 'MRC-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        $this->status = MerchantStatus::PENDING_APPROVAL;
        $this->category = MerchantCategory::SALES_AGENT;
    }

    // Getters & setters
    public function getMerchantId(): string { return $this->merchantId; }
    public function getLegalName(): string { return $this->legalName; }
    public function setLegalName(string $v): self { $this->legalName = $v; return $this; }
    public function getBusinessName(): string { return $this->businessName; }
    public function setBusinessName(string $v): self { $this->businessName = $v; return $this; }
    public function getEmail(): string { return $this->email; }
    public function setEmail(string $v): self { $this->email = $v; return $this; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $v): self { $this->phone = $v; return $this; }
    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $v): self { $this->address = $v; return $this; }
    public function getOperatingRegion(): ?string { return $this->operatingRegion; }
    public function setOperatingRegion(?string $v): self { $this->operatingRegion = $v; return $this; }
    public function getCategory(): MerchantCategory { return $this->category; }
    public function setCategory(MerchantCategory $v): self { $this->category = $v; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $v): self { $this->type = $v; return $this; }
    public function getCommissionTierId(): ?string { return $this->commissionTierId; }
    public function setCommissionTierId(?string $v): self { $this->commissionTierId = $v; return $this; }
    public function getSettlementCurrency(): string { return $this->settlementCurrency; }
    public function setSettlementCurrency(string $v): self { $this->settlementCurrency = $v; return $this; }
    public function getStatus(): MerchantStatus { return $this->status; }
    public function setStatus(MerchantStatus $v): self { $this->status = $v; return $this; }
    public function getUserId(): ?string { return $this->userId; }
    public function setUserId(?string $v): self { $this->userId = $v; return $this; }
    public function getLogoUrl(): ?string { return $this->logoUrl; }
    public function setLogoUrl(?string $v): self { $this->logoUrl = $v; return $this; }
    public function getSuspensionReason(): ?string { return $this->suspensionReason; }
    public function setSuspensionReason(?string $v): self { $this->suspensionReason = $v; return $this; }
    public function getApprovedAt(): ?\DateTimeImmutable { return $this->approvedAt; }
    public function setApprovedAt(?\DateTimeImmutable $v): self { $this->approvedAt = $v; return $this; }
    public function getSuspendedAt(): ?\DateTimeImmutable { return $this->suspendedAt; }
    public function setSuspendedAt(?\DateTimeImmutable $v): self { $this->suspendedAt = $v; return $this; }
    public function getTerminatedAt(): ?\DateTimeImmutable { return $this->terminatedAt; }
    public function setTerminatedAt(?\DateTimeImmutable $v): self { $this->terminatedAt = $v; return $this; }

    public function isActive(): bool { return $this->status === MerchantStatus::ACTIVE; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'legal_name' => $this->legalName,
            'business_name' => $this->businessName, 'email' => $this->email, 'phone' => $this->phone,
            'address' => $this->address, 'operating_region' => $this->operatingRegion,
            'category' => $this->category->value, 'type' => $this->type,
            'commission_tier_id' => $this->commissionTierId, 'settlement_currency' => $this->settlementCurrency,
            'status' => $this->status->value, 'user_id' => $this->userId, 'logo_url' => $this->logoUrl,
            'approved_at' => $this->approvedAt?->format(\DateTimeInterface::ATOM),
            'suspended_at' => $this->suspendedAt?->format(\DateTimeInterface::ATOM),
            'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
