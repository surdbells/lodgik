<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Real-time log of guest step-in/step-out movements.
 * Enhances security by tracking who is on-premise.
 */
#[ORM\Entity]
#[ORM\Table(name: 'guest_movements')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'direction'], name: 'idx_gm_direction')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_gm_booking')]
#[ORM\HasLifecycleCallbacks]
class GuestMovement implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)]
    private string $guestId;

    #[ORM\Column(name: 'guest_name', type: Types::STRING, length: 150)]
    private string $guestName;

    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 10, nullable: true)]
    private ?string $roomNumber = null;

    /** 'step_out' | 'step_in' */
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $direction;

    /** 'guest_app' | 'security_post' | 'reception' */
    #[ORM\Column(name: 'recorded_by', type: Types::STRING, length: 20, options: ['default' => 'guest_app'])]
    private string $recordedBy = 'guest_app';

    #[ORM\Column(name: 'recorded_by_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $recordedById = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    /** GPS lat/long if available */
    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $location = null;

    public function __construct(string $propertyId, string $bookingId, string $guestId, string $guestName, string $direction, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->bookingId = $bookingId;
        $this->guestId = $guestId;
        $this->guestName = $guestName;
        $this->direction = $direction;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getBookingId(): string { return $this->bookingId; }
    public function getGuestId(): string { return $this->guestId; }
    public function getGuestName(): string { return $this->guestName; }
    public function getRoomNumber(): ?string { return $this->roomNumber; }
    public function setRoomNumber(?string $v): void { $this->roomNumber = $v; }
    public function getDirection(): string { return $this->direction; }
    public function getRecordedBy(): string { return $this->recordedBy; }
    public function setRecordedBy(string $v): void { $this->recordedBy = $v; }
    public function getRecordedById(): ?string { return $this->recordedById; }
    public function setRecordedById(?string $v): void { $this->recordedById = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getLocation(): ?string { return $this->location; }
    public function setLocation(?string $v): void { $this->location = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'booking_id' => $this->bookingId,
            'guest_id' => $this->guestId, 'guest_name' => $this->guestName,
            'room_number' => $this->roomNumber, 'direction' => $this->direction,
            'recorded_by' => $this->recordedBy, 'notes' => $this->notes,
            'location' => $this->location,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
