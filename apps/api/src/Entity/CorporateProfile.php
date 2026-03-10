<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Entity\Traits\HasUuid;

#[ORM\Entity]
#[ORM\Table(name: 'corporate_profiles')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_corp_tenant_prop')]
#[ORM\Index(columns: ['tenant_id', 'is_active'],   name: 'idx_corp_tenant_active')]
#[ORM\HasLifecycleCallbacks]
class CorporateProfile implements TenantAware
{
    use HasUuid, HasTimestamps;

    #[ORM\Column(name: 'tenant_id',    type: Types::STRING, length: 36)]
    private string $tenantId;

    #[ORM\Column(name: 'property_id',  type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'company_name', type: Types::STRING, length: 200)]
    private string $companyName;

    #[ORM\Column(name: 'contact_name', type: Types::STRING, length: 200)]
    private string $contactName;

    #[ORM\Column(name: 'contact_email', type: Types::STRING, length: 150, nullable: true)]
    private ?string $contactEmail = null;

    #[ORM\Column(name: 'contact_phone', type: Types::STRING, length: 50, nullable: true)]
    private ?string $contactPhone = null;

    #[ORM\Column(name: 'billing_address', type: Types::TEXT, nullable: true)]
    private ?string $billingAddress = null;

    /** CAC number or TIN for Nigerian companies */
    #[ORM\Column(name: 'tax_id', type: Types::STRING, length: 50, nullable: true)]
    private ?string $taxId = null;

    #[ORM\Column(name: 'credit_limit_type', type: Types::STRING, length: 10, options: ['default' => 'fixed'])]
    private string $creditLimitType = 'fixed';

    /** Stored in kobo (₦ * 100) */
    #[ORM\Column(name: 'credit_limit_kobo', type: Types::BIGINT, nullable: true)]
    private ?int $creditLimitKobo = null;

    /** Percentage discount applied to standard room rates, e.g. 10.00 = 10% off */
    #[ORM\Column(name: 'negotiated_rate_discount', type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $negotiatedRateDiscount = '0.00';

    /** e.g. "NET 30", "On Checkout", "Prepaid" */
    #[ORM\Column(name: 'payment_terms', type: Types::STRING, length: 50, nullable: true)]
    private ?string $paymentTerms = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(
        string $tenantId,
        string $propertyId,
        string $companyName,
        string $contactName,
    ) {
        $this->generateId();
        $this->tenantId    = $tenantId;
        $this->propertyId  = $propertyId;
        $this->companyName = $companyName;
        $this->contactName = $contactName;
    }

    // ── Getters ──────────────────────────────────────────────────
    public function getTenantId(): string  { return $this->tenantId; }
    public function setTenantId(string $v): void { $this->tenantId = $v; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getCompanyName(): string { return $this->companyName; }
    public function getContactName(): string { return $this->contactName; }
    public function getContactEmail(): ?string { return $this->contactEmail; }
    public function getContactPhone(): ?string { return $this->contactPhone; }
    public function getBillingAddress(): ?string { return $this->billingAddress; }
    public function getTaxId(): ?string { return $this->taxId; }
    public function getCreditLimitType(): string { return $this->creditLimitType; }
    public function getCreditLimitKobo(): ?int { return $this->creditLimitKobo; }
    public function getNegotiatedRateDiscount(): string { return $this->negotiatedRateDiscount; }
    public function getPaymentTerms(): ?string { return $this->paymentTerms; }
    public function isActive(): bool { return $this->isActive; }
    public function getNotes(): ?string { return $this->notes; }

    // ── Setters ──────────────────────────────────────────────────
    public function setCompanyName(string $v): void { $this->companyName = $v; }
    public function setContactName(string $v): void { $this->contactName = $v; }
    public function setContactEmail(?string $v): void { $this->contactEmail = $v; }
    public function setContactPhone(?string $v): void { $this->contactPhone = $v; }
    public function setBillingAddress(?string $v): void { $this->billingAddress = $v; }
    public function setTaxId(?string $v): void { $this->taxId = $v; }
    public function setCreditLimitType(string $v): void { $this->creditLimitType = $v; }
    public function setCreditLimitKobo(?int $v): void { $this->creditLimitKobo = $v; }
    public function setNegotiatedRateDiscount(string $v): void { $this->negotiatedRateDiscount = $v; }
    public function setPaymentTerms(?string $v): void { $this->paymentTerms = $v; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    // ── Serialization ────────────────────────────────────────────
    public function toArray(): array
    {
        return [
            'id'                       => $this->getId(),
            'tenant_id'                => $this->tenantId,
            'property_id'              => $this->propertyId,
            'company_name'             => $this->companyName,
            'contact_name'             => $this->contactName,
            'contact_email'            => $this->contactEmail,
            'contact_phone'            => $this->contactPhone,
            'billing_address'          => $this->billingAddress,
            'tax_id'                   => $this->taxId,
            'credit_limit_type'        => $this->creditLimitType,
            'credit_limit_kobo'        => $this->creditLimitKobo,
            'credit_limit_ngn'         => $this->creditLimitKobo !== null
                ? round($this->creditLimitKobo / 100, 2)
                : null,
            'negotiated_rate_discount' => $this->negotiatedRateDiscount,
            'payment_terms'            => $this->paymentTerms,
            'is_active'                => $this->isActive,
            'notes'                    => $this->notes,
            'created_at'               => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
            'updated_at'               => $this->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
