<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'loyalty_tiers')]
#[ORM\Index(columns: ['tenant_id', 'priority'], name: 'idx_lt_priority')] #[ORM\HasLifecycleCallbacks]
class LoyaltyTier implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(type: Types::STRING, length: 50)] private string $name;
    #[ORM\Column(name: 'min_points', type: Types::INTEGER)] private int $minPoints;
    #[ORM\Column(name: 'discount_percentage', type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '0.00'])] private string $discountPercentage = '0.00';
    #[ORM\Column(type: Types::JSON, nullable: true)] private ?array $benefits = null;
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])] private int $priority = 0;
    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)] private ?string $color = null;
    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])] private bool $isActive = true;

    public function __construct(string $name, int $minPoints, string $discountPercentage, string $tenantId)
    { $this->generateId(); $this->name = $name; $this->minPoints = $minPoints; $this->discountPercentage = $discountPercentage; $this->setTenantId($tenantId); }

    public function getName(): string { return $this->name; } public function setName(string $v): void { $this->name = $v; }
    public function getMinPoints(): int { return $this->minPoints; } public function setMinPoints(int $v): void { $this->minPoints = $v; }
    public function getDiscountPercentage(): string { return $this->discountPercentage; } public function setDiscountPercentage(string $v): void { $this->discountPercentage = $v; }
    public function getBenefits(): ?array { return $this->benefits; } public function setBenefits(?array $v): void { $this->benefits = $v; }
    public function setPriority(int $v): void { $this->priority = $v; } public function setColor(?string $v): void { $this->color = $v; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array { return ['id' => $this->getId(), 'name' => $this->name, 'min_points' => $this->minPoints, 'discount_percentage' => $this->discountPercentage, 'benefits' => $this->benefits, 'priority' => $this->priority, 'color' => $this->color, 'is_active' => $this->isActive]; }
}
