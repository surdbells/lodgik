<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'property_bank_accounts')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_pba_tenant')]
#[ORM\Index(columns: ['property_id'], name: 'idx_pba_property')]
#[ORM\HasLifecycleCallbacks]
class PropertyBankAccount implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'bank_name', type: Types::STRING, length: 255)]
    private string $bankName;

    #[ORM\Column(name: 'account_number', type: Types::STRING, length: 20)]
    private string $accountNumber;

    #[ORM\Column(name: 'account_name', type: Types::STRING, length: 255)]
    private string $accountName;

    #[ORM\Column(name: 'bank_code', type: Types::STRING, length: 10, nullable: true)]
    private ?string $bankCode = null;

    #[ORM\Column(name: 'is_primary', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isPrimary = false;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(
        string $propertyId,
        string $bankName,
        string $accountNumber,
        string $accountName,
        string $tenantId,
    ) {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->bankName = $bankName;
        $this->accountNumber = $accountNumber;
        $this->accountName = $accountName;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }

    public function getBankName(): string { return $this->bankName; }
    public function setBankName(string $name): void { $this->bankName = $name; }

    public function getAccountNumber(): string { return $this->accountNumber; }
    public function setAccountNumber(string $number): void { $this->accountNumber = $number; }

    public function getAccountName(): string { return $this->accountName; }
    public function setAccountName(string $name): void { $this->accountName = $name; }

    public function getBankCode(): ?string { return $this->bankCode; }
    public function setBankCode(?string $code): void { $this->bankCode = $code; }

    public function isPrimary(): bool { return $this->isPrimary; }
    public function setIsPrimary(bool $primary): void { $this->isPrimary = $primary; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }
}
