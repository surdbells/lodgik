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
#[ORM\Table(name: 'expense_categories')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_expc_tenant')]
#[ORM\HasLifecycleCallbacks]
class ExpenseCategory implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(name: 'parent_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $parentId = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $name, string $tenantId) { $this->generateId(); $this->name = $name; $this->setTenantId($tenantId); }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getParentId(): ?string { return $this->parentId; }
    public function setParentId(?string $v): void { $this->parentId = $v; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array { return ['id' => $this->getId(), 'name' => $this->name, 'parent_id' => $this->parentId, 'description' => $this->description, 'is_active' => $this->isActive]; }
}
