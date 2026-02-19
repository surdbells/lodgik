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
use Lodgik\Enum\BookingStatus;
use Lodgik\Enum\BookingType;

#[ORM\Entity]
#[ORM\Table(name: 'bookings')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_bookings_tenant')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_bookings_tenant_property')]
#[ORM\Index(columns: ['tenant_id', 'status'], name: 'idx_bookings_tenant_status')]
#[ORM\Index(columns: ['tenant_id', 'room_id', 'check_in', 'check_out'], name: 'idx_bookings_room_dates')]
#[ORM\Index(columns: ['tenant_id', 'guest_id'], name: 'idx_bookings_guest')]
#[ORM\UniqueConstraint(name: 'uq_bookings_ref', columns: ['tenant_id', 'booking_ref'])]
#[ORM\HasLifecycleCallbacks]
class Booking implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;
    use SoftDeletable;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)]
    private string $guestId;

    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $roomId = null;

    #[ORM\Column(name: 'booking_ref', type: Types::STRING, length: 20)]
    private string $bookingRef;

    #[ORM\Column(name: 'booking_type', type: Types::STRING, length: 20, enumType: BookingType::class)]
    private BookingType $bookingType;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: BookingStatus::class, options: ['default' => 'pending'])]
    private BookingStatus $status = BookingStatus::PENDING;

    #[ORM\Column(name: 'check_in', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $checkIn;

    #[ORM\Column(name: 'check_out', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $checkOut;

    #[ORM\Column(name: 'duration_hours', type: Types::SMALLINT, nullable: true)]
    private ?int $durationHours = null;

    #[ORM\Column(type: Types::SMALLINT, options: ['default' => 1])]
    private int $adults = 1;

    #[ORM\Column(type: Types::SMALLINT, options: ['default' => 0])]
    private int $children = 0;

    #[ORM\Column(name: 'rate_per_night', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $ratePerNight;

    #[ORM\Column(name: 'total_amount', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $totalAmount;

    #[ORM\Column(name: 'discount_amount', type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $discountAmount = '0.00';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $source = null;

    #[ORM\Column(name: 'special_requests', type: Types::TEXT, nullable: true)]
    private ?string $specialRequests = null;

    #[ORM\Column(name: 'created_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $createdBy = null;

    #[ORM\Column(name: 'checked_in_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $checkedInAt = null;

    #[ORM\Column(name: 'checked_out_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $checkedOutAt = null;

    public function __construct(
        string $bookingRef,
        BookingType $bookingType,
        string $guestId,
        string $propertyId,
        string $tenantId,
        \DateTimeImmutable $checkIn,
        \DateTimeImmutable $checkOut,
        string $ratePerNight,
        string $totalAmount,
    ) {
        $this->generateId();
        $this->bookingRef = $bookingRef;
        $this->bookingType = $bookingType;
        $this->guestId = $guestId;
        $this->propertyId = $propertyId;
        $this->setTenantId($tenantId);
        $this->checkIn = $checkIn;
        $this->checkOut = $checkOut;
        $this->ratePerNight = $ratePerNight;
        $this->totalAmount = $totalAmount;
    }

    // ─── Getters & Setters ─────────────────────────────────────

    public function getPropertyId(): string { return $this->propertyId; }
    public function getGuestId(): string { return $this->guestId; }
    public function getRoomId(): ?string { return $this->roomId; }
    public function setRoomId(?string $v): void { $this->roomId = $v; }
    public function getBookingRef(): string { return $this->bookingRef; }
    public function getBookingType(): BookingType { return $this->bookingType; }
    public function getStatus(): BookingStatus { return $this->status; }
    public function setStatus(BookingStatus $v): void { $this->status = $v; }
    public function getCheckIn(): \DateTimeImmutable { return $this->checkIn; }
    public function setCheckIn(\DateTimeImmutable $v): void { $this->checkIn = $v; }
    public function getCheckOut(): \DateTimeImmutable { return $this->checkOut; }
    public function setCheckOut(\DateTimeImmutable $v): void { $this->checkOut = $v; }
    public function getDurationHours(): ?int { return $this->durationHours; }
    public function setDurationHours(?int $v): void { $this->durationHours = $v; }
    public function getAdults(): int { return $this->adults; }
    public function setAdults(int $v): void { $this->adults = $v; }
    public function getChildren(): int { return $this->children; }
    public function setChildren(int $v): void { $this->children = $v; }
    public function getRatePerNight(): string { return $this->ratePerNight; }
    public function setRatePerNight(string $v): void { $this->ratePerNight = $v; }
    public function getTotalAmount(): string { return $this->totalAmount; }
    public function setTotalAmount(string $v): void { $this->totalAmount = $v; }
    public function getDiscountAmount(): string { return $this->discountAmount; }
    public function setDiscountAmount(string $v): void { $this->discountAmount = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getSource(): ?string { return $this->source; }
    public function setSource(?string $v): void { $this->source = $v; }
    public function getSpecialRequests(): ?string { return $this->specialRequests; }
    public function setSpecialRequests(?string $v): void { $this->specialRequests = $v; }
    public function getCreatedBy(): ?string { return $this->createdBy; }
    public function setCreatedBy(?string $v): void { $this->createdBy = $v; }
    public function getCheckedInAt(): ?\DateTimeImmutable { return $this->checkedInAt; }
    public function setCheckedInAt(?\DateTimeImmutable $v): void { $this->checkedInAt = $v; }
    public function getCheckedOutAt(): ?\DateTimeImmutable { return $this->checkedOutAt; }
    public function setCheckedOutAt(?\DateTimeImmutable $v): void { $this->checkedOutAt = $v; }

    public function getNights(): int
    {
        $diff = $this->checkIn->diff($this->checkOut);
        return max(1, $diff->days);
    }
}
