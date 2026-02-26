<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'spa_services')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_spa_prop')] #[ORM\HasLifecycleCallbacks]
class SpaService implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(type: Types::STRING, length: 100)] private string $name;
    #[ORM\Column(type: Types::TEXT, nullable: true)] private ?string $description = null;
    #[ORM\Column(name: 'category', type: Types::STRING, length: 50)] private string $category;
    #[ORM\Column(name: 'duration_minutes', type: Types::INTEGER)] private int $durationMinutes;
    #[ORM\Column(name: 'price', type: Types::BIGINT)] private string $price;
    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])] private bool $isActive = true;

    public function __construct(string $propertyId, string $name, string $category, int $durationMinutes, string $price, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->name = $name; $this->category = $category; $this->durationMinutes = $durationMinutes; $this->price = $price; $this->setTenantId($tenantId); }
    public function getName(): string { return $this->name; } public function setName(string $v): void { $this->name = $v; }
    public function setDescription(?string $v): void { $this->description = $v; } public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function toArray(): array { return ['id' => $this->getId(), 'name' => $this->name, 'description' => $this->description, 'category' => $this->category, 'duration_minutes' => $this->durationMinutes, 'price' => $this->price, 'is_active' => $this->isActive]; }
}
