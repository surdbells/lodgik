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
#[ORM\Table(name: 'stock_locations')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_sl_property')]
#[ORM\Index(columns: ['tenant_id', 'type'], name: 'idx_sl_type')]
#[ORM\HasLifecycleCallbacks]
class StockLocation implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    /**
     * NULL for the central warehouse (chain-level).
     * Set for property stores and department stores.
     */
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $propertyId = null;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    /**
     * warehouse   — Central chain warehouse (property_id NULL)
     * store       — Property-level store (receives from warehouse)
     * department  — Department sub-store (kitchen, bar, housekeeping, etc.)
     */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'store'])]
    private string $type = 'store';

    /**
     * UUID of parent location.
     * A department store's parent is the property store.
     * A property store's parent is the central warehouse.
     * The warehouse has no parent (NULL).
     */
    #[ORM\Column(name: 'parent_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $parentId = null;

    /** kitchen | bar | housekeeping | maintenance | front_office | general (for department type only) */
    #[ORM\Column(type: Types::STRING, length: 30, nullable: true)]
    private ?string $department = null;

    /** Name of the person responsible for this location */
    #[ORM\Column(name: 'manager_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $managerName = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $name, string $type, string $tenantId, ?string $propertyId = null)
    {
        $this->generateId();
        $this->name       = $name;
        $this->type       = $type;
        $this->propertyId = $propertyId;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): ?string { return $this->propertyId; }
    public function setPropertyId(?string $v): void { $this->propertyId = $v; }

    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }

    public function getType(): string { return $this->type; }
    public function setType(string $v): void { $this->type = $v; }

    public function getParentId(): ?string { return $this->parentId; }
    public function setParentId(?string $v): void { $this->parentId = $v; }

    public function getDepartment(): ?string { return $this->department; }
    public function setDepartment(?string $v): void { $this->department = $v; }

    public function getManagerName(): ?string { return $this->managerName; }
    public function setManagerName(?string $v): void { $this->managerName = $v; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array
    {
        return [
            'id'           => $this->getId(),
            'tenant_id'    => $this->getTenantId(),
            'property_id'  => $this->propertyId,
            'name'         => $this->name,
            'description'  => $this->description,
            'type'         => $this->type,
            'parent_id'    => $this->parentId,
            'department'   => $this->department,
            'manager_name' => $this->managerName,
            'is_active'    => $this->isActive,
            'created_at'   => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at'   => $this->updatedAt->format('Y-m-d H:i:s'),
        ];
    }
}
