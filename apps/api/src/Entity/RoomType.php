<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Entity\Traits\SoftDeletable;

#[ORM\Entity]
#[ORM\Table(name: 'room_types')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_room_types_tenant')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_room_types_tenant_property')]
#[ORM\HasLifecycleCallbacks]
class RoomType implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;
    use SoftDeletable;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(name: 'base_rate', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $baseRate;

    #[ORM\Column(name: 'hourly_rate', type: Types::DECIMAL, precision: 12, scale: 2, nullable: true)]
    private ?string $hourlyRate = null;

    #[ORM\Column(name: 'max_occupancy', type: Types::SMALLINT, options: ['default' => 2])]
    private int $maxOccupancy = 2;

    /** @var array<string, mixed>|null Amenities included in this room type */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $amenities = null;

    /** @var array<string, mixed>|null Photos for this room type */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $photos = null;

    #[ORM\Column(name: 'sort_order', type: Types::SMALLINT, options: ['default' => 0])]
    private int $sortOrder = 0;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $name, string $propertyId, string $tenantId, string $baseRate)
    {
        $this->generateId();
        $this->name = $name;
        $this->propertyId = $propertyId;
        $this->setTenantId($tenantId);
        $this->baseRate = $baseRate;
    }

    // ─── Getters & Setters ─────────────────────────────────────

    public function getPropertyId(): string { return $this->propertyId; }
    public function setPropertyId(string $id): void { $this->propertyId = $id; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): void { $this->name = $name; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $desc): void { $this->description = $desc; }

    public function getBaseRate(): string { return $this->baseRate; }
    public function setBaseRate(string $rate): void { $this->baseRate = $rate; }

    public function getHourlyRate(): ?string { return $this->hourlyRate; }
    public function setHourlyRate(?string $rate): void { $this->hourlyRate = $rate; }

    public function getMaxOccupancy(): int { return $this->maxOccupancy; }
    public function setMaxOccupancy(int $max): void { $this->maxOccupancy = $max; }

    public function getAmenities(): ?array { return $this->amenities; }
    public function setAmenities(?array $amenities): void { $this->amenities = $amenities; }

    public function getPhotos(): ?array { return $this->photos; }
    public function setPhotos(?array $photos): void { $this->photos = $photos; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $order): void { $this->sortOrder = $order; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }
}
