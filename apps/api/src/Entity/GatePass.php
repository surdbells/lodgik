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
 * Real-time gate pass for security post.
 * Notifies security of expected visitors or verified guest departures.
 */
#[ORM\Entity]
#[ORM\Table(name: 'gate_passes')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_gp_status')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_gp_booking')]
#[ORM\HasLifecycleCallbacks]
class GatePass implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    /** 'visitor_entry' | 'visitor_exit' | 'guest_departure' | 'guest_return' */
    #[ORM\Column(name: 'pass_type', type: Types::STRING, length: 20)]
    private string $passType;

    #[ORM\Column(name: 'person_name', type: Types::STRING, length: 150)]
    private string $personName;

    #[ORM\Column(name: 'person_phone', type: Types::STRING, length: 20, nullable: true)]
    private ?string $personPhone = null;

    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 10, nullable: true)]
    private ?string $roomNumber = null;

    #[ORM\Column(name: 'guest_name', type: Types::STRING, length: 150)]
    private string $guestName;

    #[ORM\Column(name: 'visitor_code_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $visitorCodeId = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $purpose = null;

    #[ORM\Column(name: 'expected_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $expectedAt = null;

    /** 'pending' | 'approved' | 'checked_in' | 'checked_out' | 'denied' | 'expired' */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'pending'])]
    private string $status = 'pending';

    #[ORM\Column(name: 'approved_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $approvedBy = null;

    #[ORM\Column(name: 'security_notes', type: Types::TEXT, nullable: true)]
    private ?string $securityNotes = null;

    #[ORM\Column(name: 'checked_in_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $checkedInAt = null;

    #[ORM\Column(name: 'checked_out_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $checkedOutAt = null;

    public function __construct(string $propertyId, string $bookingId, string $passType, string $personName, string $guestName, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->bookingId = $bookingId;
        $this->passType = $passType;
        $this->personName = $personName;
        $this->guestName = $guestName;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getBookingId(): string { return $this->bookingId; }
    public function getPassType(): string { return $this->passType; }
    public function getPersonName(): string { return $this->personName; }
    public function getPersonPhone(): ?string { return $this->personPhone; }
    public function setPersonPhone(?string $v): void { $this->personPhone = $v; }
    public function getRoomNumber(): ?string { return $this->roomNumber; }
    public function setRoomNumber(?string $v): void { $this->roomNumber = $v; }
    public function getGuestName(): string { return $this->guestName; }
    public function getVisitorCodeId(): ?string { return $this->visitorCodeId; }
    public function setVisitorCodeId(?string $v): void { $this->visitorCodeId = $v; }
    public function getPurpose(): ?string { return $this->purpose; }
    public function setPurpose(?string $v): void { $this->purpose = $v; }
    public function getExpectedAt(): ?\DateTimeImmutable { return $this->expectedAt; }
    public function setExpectedAt(?\DateTimeImmutable $v): void { $this->expectedAt = $v; }
    public function getStatus(): string { return $this->status; }
    public function getApprovedBy(): ?string { return $this->approvedBy; }
    public function getSecurityNotes(): ?string { return $this->securityNotes; }
    public function setSecurityNotes(?string $v): void { $this->securityNotes = $v; }

    public function approve(string $userId): void { $this->status = 'approved'; $this->approvedBy = $userId; }
    public function deny(string $userId, ?string $notes = null): void { $this->status = 'denied'; $this->approvedBy = $userId; $this->securityNotes = $notes; }
    public function checkIn(): void { $this->status = 'checked_in'; $this->checkedInAt = new \DateTimeImmutable(); }
    public function checkOut(): void { $this->status = 'checked_out'; $this->checkedOutAt = new \DateTimeImmutable(); }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId, 'booking_id' => $this->bookingId,
            'pass_type' => $this->passType, 'person_name' => $this->personName, 'person_phone' => $this->personPhone,
            'room_number' => $this->roomNumber, 'guest_name' => $this->guestName,
            'purpose' => $this->purpose, 'expected_at' => $this->expectedAt?->format('Y-m-d H:i'),
            'status' => $this->status, 'approved_by' => $this->approvedBy,
            'security_notes' => $this->securityNotes,
            'checked_in_at' => $this->checkedInAt?->format('Y-m-d H:i:s'),
            'checked_out_at' => $this->checkedOutAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
