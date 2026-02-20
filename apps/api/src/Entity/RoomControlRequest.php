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
 * Digital room control requests: DND, make-up room, maintenance.
 * Sent by guest from app, received by housekeeping/reception.
 */
#[ORM\Entity]
#[ORM\Table(name: 'room_control_requests')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'room_id'], name: 'idx_rcr_room')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_rcr_booking')]
#[ORM\HasLifecycleCallbacks]
class RoomControlRequest implements TenantAware
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

    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36)]
    private string $roomId;

    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 10)]
    private string $roomNumber;

    /** 'dnd' | 'make_up_room' | 'maintenance' */
    #[ORM\Column(name: 'request_type', type: Types::STRING, length: 20)]
    private string $requestType;

    /** DND/MakeUp: true=on, false=off. Maintenance: always true */
    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    /** 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'cancelled' */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'pending'])]
    private string $status = 'pending';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    /** For maintenance: photo of the issue */
    #[ORM\Column(name: 'photo_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $photoUrl = null;

    #[ORM\Column(name: 'assigned_to', type: Types::STRING, length: 36, nullable: true)]
    private ?string $assignedTo = null;

    #[ORM\Column(name: 'assigned_to_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $assignedToName = null;

    #[ORM\Column(name: 'staff_notes', type: Types::TEXT, nullable: true)]
    private ?string $staffNotes = null;

    #[ORM\Column(name: 'resolved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    public function __construct(string $propertyId, string $bookingId, string $guestId, string $roomId, string $roomNumber, string $requestType, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->bookingId = $bookingId;
        $this->guestId = $guestId;
        $this->roomId = $roomId;
        $this->roomNumber = $roomNumber;
        $this->requestType = $requestType;
        // DND and make_up_room auto-acknowledge
        if (in_array($requestType, ['dnd', 'make_up_room'])) $this->status = 'acknowledged';
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getBookingId(): string { return $this->bookingId; }
    public function getGuestId(): string { return $this->guestId; }
    public function getRoomId(): string { return $this->roomId; }
    public function getRoomNumber(): string { return $this->roomNumber; }
    public function getRequestType(): string { return $this->requestType; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function getStatus(): string { return $this->status; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }
    public function getPhotoUrl(): ?string { return $this->photoUrl; }
    public function setPhotoUrl(?string $v): void { $this->photoUrl = $v; }
    public function getAssignedTo(): ?string { return $this->assignedTo; }
    public function getAssignedToName(): ?string { return $this->assignedToName; }
    public function getStaffNotes(): ?string { return $this->staffNotes; }
    public function setStaffNotes(?string $v): void { $this->staffNotes = $v; }

    public function acknowledge(): void { $this->status = 'acknowledged'; }
    public function assign(string $userId, string $name): void { $this->assignedTo = $userId; $this->assignedToName = $name; $this->status = 'in_progress'; }
    public function resolve(?string $staffNotes = null): void { $this->status = 'resolved'; $this->resolvedAt = new \DateTimeImmutable(); if ($staffNotes) $this->staffNotes = $staffNotes; if ($this->requestType !== 'maintenance') $this->isActive = false; }
    public function cancel(): void { $this->status = 'cancelled'; $this->isActive = false; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'booking_id' => $this->bookingId, 'room_id' => $this->roomId,
            'room_number' => $this->roomNumber, 'request_type' => $this->requestType,
            'is_active' => $this->isActive, 'status' => $this->status,
            'description' => $this->description, 'photo_url' => $this->photoUrl,
            'assigned_to_name' => $this->assignedToName, 'staff_notes' => $this->staffNotes,
            'resolved_at' => $this->resolvedAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
