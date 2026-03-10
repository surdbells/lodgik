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
#[ORM\Table(name: 'amenities')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_amenities_tenant')]
#[ORM\HasLifecycleCallbacks]
class Amenity implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $category = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $icon = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $name, string $tenantId)
    {
        $this->generateId();
        $this->name = $name;
        $this->setTenantId($tenantId);
    }

    // ─── Getters & Setters ─────────────────────────────────────

    public function getName(): string { return $this->name; }
    public function setName(string $name): void { $this->name = $name; }

    public function getCategory(): ?string { return $this->category; }
    public function setCategory(?string $cat): void { $this->category = $cat; }

    public function getIcon(): ?string { return $this->icon; }
    public function setIcon(?string $icon): void { $this->icon = $icon; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }

    public function toArray(): array
    {
        return [
            'id'         => $this->getId(),
            'name'       => $this->name,
            'category'   => $this->category,
            'icon'       => $this->icon,
            'is_active'  => $this->isActive,
            'tenant_id'  => $this->getTenantId(),
        ];
    }
}
