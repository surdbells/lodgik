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
#[ORM\Table(name: 'pos_categories')]
#[ORM\HasLifecycleCallbacks]
class PosCategory implements TenantAware
{
    use HasUuid; use HasTenant; use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;
    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;
    #[ORM\Column(type: Types::STRING, length: 30, options: ['default' => 'food'])]
    private string $type = 'food'; // 'food', 'drink', 'dessert', 'other'
    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;
    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $propertyId, string $name, string $tenantId)
    {
        $this->generateId(); $this->propertyId = $propertyId; $this->name = $name; $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getType(): string { return $this->type; }
    public function setType(string $v): void { $this->type = $v; }
    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $v): void { $this->sortOrder = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array
    {
        return ['id' => $this->getId(), 'property_id' => $this->propertyId, 'name' => $this->name, 'type' => $this->type, 'sort_order' => $this->sortOrder, 'is_active' => $this->isActive, 'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s')];
    }
}
