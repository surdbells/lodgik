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
use Lodgik\Enum\RoomStatus;

#[ORM\Entity]
#[ORM\Table(name: 'rooms')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_rooms_tenant')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_rooms_tenant_property')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_rooms_tenant_property_status')]
#[ORM\UniqueConstraint(name: 'uq_rooms_property_number', columns: ['tenant_id', 'property_id', 'room_number'])]
#[ORM\HasLifecycleCallbacks]
class Room implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;
    use SoftDeletable;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'room_type_id', type: Types::STRING, length: 36)]
    private string $roomTypeId;

    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 20)]
    private string $roomNumber;

    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    private ?int $floor = null;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: RoomStatus::class, options: ['default' => 'vacant_clean'])]
    private RoomStatus $status = RoomStatus::VACANT_CLEAN;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    /** @var array<string, mixed>|null Custom amenities beyond room type defaults */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $amenities = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $roomNumber, string $roomTypeId, string $propertyId, string $tenantId)
    {
        $this->generateId();
        $this->roomNumber = $roomNumber;
        $this->roomTypeId = $roomTypeId;
        $this->propertyId = $propertyId;
        $this->setTenantId($tenantId);
    }

    // ─── Getters & Setters ─────────────────────────────────────

    public function getPropertyId(): string { return $this->propertyId; }
    public function setPropertyId(string $id): void { $this->propertyId = $id; }

    public function getRoomTypeId(): string { return $this->roomTypeId; }
    public function setRoomTypeId(string $id): void { $this->roomTypeId = $id; }

    public function getRoomNumber(): string { return $this->roomNumber; }
    public function setRoomNumber(string $number): void { $this->roomNumber = $number; }

    public function getFloor(): ?int { return $this->floor; }
    public function setFloor(?int $floor): void { $this->floor = $floor; }

    public function getStatus(): RoomStatus { return $this->status; }
    public function setStatus(RoomStatus $status): void { $this->status = $status; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $notes): void { $this->notes = $notes; }

    public function getAmenities(): ?array { return $this->amenities; }
    public function setAmenities(?array $amenities): void { $this->amenities = $amenities; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }
}
