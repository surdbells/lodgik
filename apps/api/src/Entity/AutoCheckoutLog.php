<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Immutable audit record written whenever the system automatically
 * closes a booking (NoonCheckoutCommand or FraudAutoCheckoutCommand).
 * Never written by manual checkout — this is system-only.
 */
#[ORM\Entity]
#[ORM\Table(name: 'auto_checkout_log')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_acl_tenant_property')]
#[ORM\Index(columns: ['booking_id'], name: 'idx_acl_booking')]
#[ORM\HasLifecycleCallbacks]
class AutoCheckoutLog
{
    use HasUuid, HasTenant, HasTimestamps;

    /** Reason codes for automated checkout */
    public const REASON_NOON_OVERDUE   = 'noon_overdue';       // 12 PM passed, not checked out
    public const REASON_DUAL_CLEARANCE = 'dual_clearance';     // Both front-desk + security cleared
    public const REASON_24H_OVERDUE    = '24h_overdue';        // 24+ hours past checkout date

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $guestId = null;

    #[ORM\Column(name: 'guest_name', type: Types::STRING, length: 200, nullable: true)]
    private ?string $guestName = null;

    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 20, nullable: true)]
    private ?string $roomNumber = null;

    #[ORM\Column(name: 'booking_ref', type: Types::STRING, length: 20, nullable: true)]
    private ?string $bookingRef = null;

    /** One of the REASON_* constants */
    #[ORM\Column(type: Types::STRING, length: 30)]
    private string $reason;

    #[ORM\Column(name: 'original_checkout_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $originalCheckoutDate = null;

    #[ORM\Column(name: 'auto_checked_out_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $autoCheckedOutAt;

    #[ORM\Column(name: 'hours_overdue', type: Types::INTEGER, options: ['default' => 0])]
    private int $hoursOverdue = 0;

    /** JSON snapshot of key booking fields at time of auto-checkout */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $metadata = null;

    public function __construct(
        string $bookingId,
        string $propertyId,
        string $tenantId,
        string $reason,
    ) {
        $this->generateId();
        $this->bookingId        = $bookingId;
        $this->propertyId       = $propertyId;
        $this->setTenantId($tenantId);
        $this->reason           = $reason;
        $this->autoCheckedOutAt = new \DateTimeImmutable();
    }

    public function setGuestId(?string $v): void { $this->guestId = $v; }
    public function setGuestName(?string $v): void { $this->guestName = $v; }
    public function setRoomNumber(?string $v): void { $this->roomNumber = $v; }
    public function setBookingRef(?string $v): void { $this->bookingRef = $v; }
    public function setOriginalCheckoutDate(?\DateTimeImmutable $v): void { $this->originalCheckoutDate = $v; }
    public function setHoursOverdue(int $v): void { $this->hoursOverdue = $v; }
    public function setMetadata(?array $v): void { $this->metadata = $v; }

    public function toArray(): array
    {
        return [
            'id'                    => $this->getId(),
            'booking_id'            => $this->bookingId,
            'property_id'           => $this->propertyId,
            'guest_id'              => $this->guestId,
            'guest_name'            => $this->guestName,
            'room_number'           => $this->roomNumber,
            'booking_ref'           => $this->bookingRef,
            'reason'                => $this->reason,
            'original_checkout_date'=> $this->originalCheckoutDate?->format('Y-m-d'),
            'auto_checked_out_at'   => $this->autoCheckedOutAt->format('Y-m-d H:i:s'),
            'hours_overdue'         => $this->hoursOverdue,
            'metadata'              => $this->metadata,
            'created_at'            => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
