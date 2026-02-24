<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'asset_categories')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_acat_tenant')] #[ORM\HasLifecycleCallbacks]
class AssetCategory implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'parent_id', type: Types::STRING, length: 100)] private string $name;
    #[ORM\Column(name: 'parent_id', type: Types::STRING, length: 36, nullable: true)] private ?string $parentId = null;
    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)] private ?string $icon = null;
    #[ORM\Column(type: Types::TEXT, nullable: true)] private ?string $description = null;

    public function __construct(string $name, string $tenantId) { $this->generateId(); $this->name = $name; $this->setTenantId($tenantId); }
    public function getName(): string { return $this->name; } public function setName(string $v): void { $this->name = $v; }
    public function getParentId(): ?string { return $this->parentId; } public function setParentId(?string $v): void { $this->parentId = $v; }
    public function setIcon(?string $v): void { $this->icon = $v; } public function setDescription(?string $v): void { $this->description = $v; }
    public function toArray(): array { return ['id' => $this->getId(), 'name' => $this->name, 'parent_id' => $this->parentId, 'icon' => $this->icon, 'description' => $this->description]; }
}
