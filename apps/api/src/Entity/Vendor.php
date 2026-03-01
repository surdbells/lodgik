<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Vendor / supplier master record.
 *
 * Vendors are scoped to a tenant (shared across all properties).
 * They are referenced by PurchaseOrder at creation time; the vendor's
 * name and email are denormalised onto the PO header so historical
 * records remain stable even if the vendor record changes.
 *
 * preferred_items is a JSON array of stock_item_id UUIDs that this
 * vendor typically supplies — used to pre-filter the vendor list when
 * creating a PO for a specific item.
 */
#[ORM\Entity]
#[ORM\Table(name: 'vendors')]
#[ORM\Index(columns: ['tenant_id', 'is_active'], name: 'vnd_tenant')]
#[ORM\Index(columns: ['tenant_id', 'name'], name: 'vnd_name')]
#[ORM\HasLifecycleCallbacks]
class Vendor implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    // ── Identity ────────────────────────────────────────────────

    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 150, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 30, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(name: 'contact_person', type: Types::STRING, length: 100, nullable: true)]
    private ?string $contactPerson = null;

    // ── Address ─────────────────────────────────────────────────

    #[ORM\Column(type: Types::STRING, length: 250, nullable: true)]
    private ?string $address = null;

    #[ORM\Column(type: Types::STRING, length: 80, nullable: true)]
    private ?string $city = null;

    #[ORM\Column(type: Types::STRING, length: 80, nullable: true)]
    private ?string $country = null;

    // ── Financial ───────────────────────────────────────────────

    /**
     * Payment terms: net7 | net15 | net30 | cod (cash on delivery)
     */
    #[ORM\Column(name: 'payment_terms', type: Types::STRING, length: 10, options: ['default' => 'net30'])]
    private string $paymentTerms = 'net30';

    #[ORM\Column(name: 'bank_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $bankName = null;

    #[ORM\Column(name: 'bank_account_number', type: Types::STRING, length: 30, nullable: true)]
    private ?string $bankAccountNumber = null;

    #[ORM\Column(name: 'bank_sort_code', type: Types::STRING, length: 20, nullable: true)]
    private ?string $bankSortCode = null;

    #[ORM\Column(name: 'tax_id', type: Types::STRING, length: 50, nullable: true)]
    private ?string $taxId = null;

    // ── Misc ────────────────────────────────────────────────────

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    /**
     * JSON array of stock_item_id UUIDs this vendor typically supplies.
     * Used for pre-filtering vendors on PO creation.
     */
    #[ORM\Column(name: 'preferred_items', type: Types::JSON, nullable: true)]
    private ?array $preferredItems = null;

    // ── Constructor ─────────────────────────────────────────────

    public function __construct(string $name, string $tenantId)
    {
        $this->generateId();
        $this->name = $name;
        $this->setTenantId($tenantId);
    }

    // ── Getters / Setters ───────────────────────────────────────

    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $v): void { $this->email = $v; }

    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $v): void { $this->phone = $v; }

    public function getContactPerson(): ?string { return $this->contactPerson; }
    public function setContactPerson(?string $v): void { $this->contactPerson = $v; }

    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $v): void { $this->address = $v; }

    public function getCity(): ?string { return $this->city; }
    public function setCity(?string $v): void { $this->city = $v; }

    public function getCountry(): ?string { return $this->country; }
    public function setCountry(?string $v): void { $this->country = $v; }

    public function getPaymentTerms(): string { return $this->paymentTerms; }
    public function setPaymentTerms(string $v): void { $this->paymentTerms = $v; }

    public function getBankName(): ?string { return $this->bankName; }
    public function setBankName(?string $v): void { $this->bankName = $v; }

    public function getBankAccountNumber(): ?string { return $this->bankAccountNumber; }
    public function setBankAccountNumber(?string $v): void { $this->bankAccountNumber = $v; }

    public function getBankSortCode(): ?string { return $this->bankSortCode; }
    public function setBankSortCode(?string $v): void { $this->bankSortCode = $v; }

    public function getTaxId(): ?string { return $this->taxId; }
    public function setTaxId(?string $v): void { $this->taxId = $v; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function getPreferredItems(): ?array { return $this->preferredItems; }
    public function setPreferredItems(?array $v): void { $this->preferredItems = $v; }

    // ── Serialise ────────────────────────────────────────────────

    public function toArray(): array
    {
        return [
            'id'                   => $this->getId(),
            'name'                 => $this->name,
            'email'                => $this->email,
            'phone'                => $this->phone,
            'contact_person'       => $this->contactPerson,
            'address'              => $this->address,
            'city'                 => $this->city,
            'country'              => $this->country,
            'payment_terms'        => $this->paymentTerms,
            'bank_name'            => $this->bankName,
            'bank_account_number'  => $this->bankAccountNumber,
            'bank_sort_code'       => $this->bankSortCode,
            'tax_id'               => $this->taxId,
            'notes'                => $this->notes,
            'is_active'            => $this->isActive,
            'preferred_items'      => $this->preferredItems ?? [],
            'created_at'           => $this->getCreatedAt()->format('Y-m-d H:i:s'),
            'updated_at'           => $this->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
