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
#[ORM\Table(name: 'gym_membership_plans')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_gmp_property')]
#[ORM\HasLifecycleCallbacks]
class GymMembershipPlan implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    /** Duration in days (e.g. 30, 90, 365) */
    #[ORM\Column(name: 'duration_days', type: Types::INTEGER)]
    private int $durationDays;

    /** Price in kobo */
    #[ORM\Column(type: Types::BIGINT)]
    private string $price;

    /** Max number of classes per period, null = unlimited */
    #[ORM\Column(name: 'max_classes', type: Types::INTEGER, nullable: true)]
    private ?int $maxClasses = null;

    /** Includes pool/sauna/spa access */
    #[ORM\Column(name: 'includes_pool', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $includesPool = false;

    #[ORM\Column(name: 'includes_classes', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $includesClasses = true;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;

    public function __construct(string $propertyId, string $name, int $durationDays, string $price, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->name = $name;
        $this->durationDays = $durationDays;
        $this->price = $price;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }
    public function getDurationDays(): int { return $this->durationDays; }
    public function setDurationDays(int $v): void { $this->durationDays = $v; }
    public function getPrice(): string { return $this->price; }
    public function setPrice(string $v): void { $this->price = $v; }
    public function getMaxClasses(): ?int { return $this->maxClasses; }
    public function setMaxClasses(?int $v): void { $this->maxClasses = $v; }
    public function getIncludesPool(): bool { return $this->includesPool; }
    public function setIncludesPool(bool $v): void { $this->includesPool = $v; }
    public function getIncludesClasses(): bool { return $this->includesClasses; }
    public function setIncludesClasses(bool $v): void { $this->includesClasses = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $v): void { $this->sortOrder = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'name' => $this->name, 'description' => $this->description,
            'duration_days' => $this->durationDays, 'price' => $this->price,
            'max_classes' => $this->maxClasses, 'includes_pool' => $this->includesPool,
            'includes_classes' => $this->includesClasses, 'is_active' => $this->isActive,
            'sort_order' => $this->sortOrder,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
