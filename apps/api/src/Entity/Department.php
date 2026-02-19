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
#[ORM\Table(name: 'departments')]
#[ORM\UniqueConstraint(name: 'uq_dept_tenant_name', columns: ['tenant_id', 'name'])]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_dept_tenant')]
#[ORM\HasLifecycleCallbacks]
class Department implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(name: 'head_employee_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $headEmployeeId = null;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $propertyId = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $name, string $tenantId, ?string $propertyId = null)
    {
        $this->generateId();
        $this->name = $name;
        $this->setTenantId($tenantId);
        $this->propertyId = $propertyId;
    }

    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }
    public function getHeadEmployeeId(): ?string { return $this->headEmployeeId; }
    public function setHeadEmployeeId(?string $v): void { $this->headEmployeeId = $v; }
    public function getPropertyId(): ?string { return $this->propertyId; }
    public function setPropertyId(?string $v): void { $this->propertyId = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'name' => $this->name,
            'description' => $this->description,
            'head_employee_id' => $this->headEmployeeId,
            'property_id' => $this->propertyId,
            'is_active' => $this->isActive,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
