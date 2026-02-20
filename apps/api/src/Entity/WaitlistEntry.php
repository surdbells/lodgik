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
 * Guest waitlist for preferred rooms, room upgrades, or sold-out amenities.
 * Auto-notifies when availability opens.
 */
#[ORM\Entity]
#[ORM\Table(name: 'waitlist_entries')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_wl_status')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_wl_booking')]
#[ORM\HasLifecycleCallbacks]
class WaitlistEntry implements TenantAware
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

    /** 'room_upgrade' | 'room_type' | 'amenity' | 'spa_slot' | 'restaurant' */
    #[ORM\Column(name: 'waitlist_type', type: Types::STRING, length: 20)]
    private string $waitlistType;

    /** What they're waiting for (e.g. "Suite", "Pool access", "Spa 3pm") */
    #[ORM\Column(name: 'requested_item', type: Types::STRING, length: 200)]
    private string $requestedItem;

    /** Optional: specific room type or amenity ID */
    #[ORM\Column(name: 'target_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $targetId = null;

    #[ORM\Column(name: 'preferred_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $preferredDate = null;

    /** Position in queue (auto-set) */
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $position = 0;

    /** 'waiting' | 'notified' | 'fulfilled' | 'cancelled' | 'expired' */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'waiting'])]
    private string $status = 'waiting';

    #[ORM\Column(name: 'notified_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $notifiedAt = null;

    #[ORM\Column(name: 'fulfilled_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $fulfilledAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $propertyId, string $bookingId, string $guestId, string $guestName, string $waitlistType, string $requestedItem, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->bookingId = $bookingId;
        $this->guestId = $guestId;
        $this->guestName = $guestName;
        $this->waitlistType = $waitlistType;
        $this->requestedItem = $requestedItem;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getBookingId(): string { return $this->bookingId; }
    public function getGuestId(): string { return $this->guestId; }
    public function getGuestName(): string { return $this->guestName; }
    public function getWaitlistType(): string { return $this->waitlistType; }
    public function getRequestedItem(): string { return $this->requestedItem; }
    public function getTargetId(): ?string { return $this->targetId; }
    public function setTargetId(?string $v): void { $this->targetId = $v; }
    public function getPreferredDate(): ?\DateTimeImmutable { return $this->preferredDate; }
    public function setPreferredDate(?\DateTimeImmutable $v): void { $this->preferredDate = $v; }
    public function getPosition(): int { return $this->position; }
    public function setPosition(int $v): void { $this->position = $v; }
    public function getStatus(): string { return $this->status; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function notify(): void { $this->status = 'notified'; $this->notifiedAt = new \DateTimeImmutable(); }
    public function fulfill(): void { $this->status = 'fulfilled'; $this->fulfilledAt = new \DateTimeImmutable(); }
    public function cancel(): void { $this->status = 'cancelled'; }
    public function expire(): void { $this->status = 'expired'; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'booking_id' => $this->bookingId,
            'guest_id' => $this->guestId, 'guest_name' => $this->guestName,
            'waitlist_type' => $this->waitlistType, 'requested_item' => $this->requestedItem,
            'target_id' => $this->targetId, 'preferred_date' => $this->preferredDate?->format('Y-m-d'),
            'position' => $this->position, 'status' => $this->status,
            'notified_at' => $this->notifiedAt?->format('Y-m-d H:i:s'),
            'fulfilled_at' => $this->fulfilledAt?->format('Y-m-d H:i:s'),
            'notes' => $this->notes, 'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
