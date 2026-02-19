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
 * Concierge tablet device, permanently assigned to a room.
 * Auto-authenticates guests based on active booking for the room.
 */
#[ORM\Entity]
#[ORM\Table(name: 'tablet_devices')]
#[ORM\UniqueConstraint(name: 'uq_tablet_token', columns: ['device_token'])]
#[ORM\Index(columns: ['tenant_id', 'room_id'], name: 'idx_td_room')]
#[ORM\HasLifecycleCallbacks]
class TabletDevice implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36)]
    private string $roomId;

    /** Friendly label e.g. "Room 101 Tablet" */
    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    /** Long-lived device token for auto-auth (UUID) */
    #[ORM\Column(name: 'device_token', type: Types::STRING, length: 64)]
    private string $deviceToken;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(name: 'last_ping_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastPingAt = null;

    #[ORM\Column(name: 'current_booking_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $currentBookingId = null;

    #[ORM\Column(name: 'current_guest_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $currentGuestId = null;

    public function __construct(string $propertyId, string $roomId, string $name, string $deviceToken, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->roomId = $roomId;
        $this->name = $name;
        $this->deviceToken = $deviceToken;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getRoomId(): string { return $this->roomId; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getDeviceToken(): string { return $this->deviceToken; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function getLastPingAt(): ?\DateTimeImmutable { return $this->lastPingAt; }
    public function setLastPingAt(?\DateTimeImmutable $v): void { $this->lastPingAt = $v; }
    public function getCurrentBookingId(): ?string { return $this->currentBookingId; }
    public function setCurrentBookingId(?string $v): void { $this->currentBookingId = $v; }
    public function getCurrentGuestId(): ?string { return $this->currentGuestId; }
    public function setCurrentGuestId(?string $v): void { $this->currentGuestId = $v; }

    /** Bind tablet to a booking's guest on check-in */
    public function bindToBooking(string $bookingId, string $guestId): void
    {
        $this->currentBookingId = $bookingId;
        $this->currentGuestId = $guestId;
    }

    /** Reset tablet on checkout */
    public function unbind(): void
    {
        $this->currentBookingId = null;
        $this->currentGuestId = null;
    }

    public function ping(): void { $this->lastPingAt = new \DateTimeImmutable(); }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'property_id' => $this->propertyId,
            'room_id' => $this->roomId,
            'name' => $this->name,
            'is_active' => $this->isActive,
            'last_ping_at' => $this->lastPingAt?->format('Y-m-d H:i:s'),
            'current_booking_id' => $this->currentBookingId,
            'current_guest_id' => $this->currentGuestId,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
