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
#[ORM\Table(name: 'stock_categories')]
#[ORM\Index(columns: ['tenant_id', 'parent_id'], name: 'stk_cat_parent')]
#[ORM\HasLifecycleCallbacks]
class StockCategory implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    /** housekeeping | kitchen | bar | maintenance | front_office | general */
    #[ORM\Column(type: Types::STRING, length: 30, options: ['default' => 'general'])]
    private string $department = 'general';

    /** UUID of parent category — null means top-level */
    #[ORM\Column(name: 'parent_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $parentId = null;

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $name, string $tenantId, string $department = 'general')
    {
        $this->generateId();
        $this->name       = $name;
        $this->department = $department;
        $this->setTenantId($tenantId);
    }

    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }

    public function getDepartment(): string { return $this->department; }
    public function setDepartment(string $v): void { $this->department = $v; }

    public function getParentId(): ?string { return $this->parentId; }
    public function setParentId(?string $v): void { $this->parentId = $v; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $v): void { $this->sortOrder = $v; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array
    {
        return [
            'id'          => $this->getId(),
            'tenant_id'   => $this->getTenantId(),
            'name'        => $this->name,
            'description' => $this->description,
            'department'  => $this->department,
            'parent_id'   => $this->parentId,
            'sort_order'  => $this->sortOrder,
            'is_active'   => $this->isActive,
            'created_at'  => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at'  => $this->updatedAt->format('Y-m-d H:i:s'),
        ];
    }
}
