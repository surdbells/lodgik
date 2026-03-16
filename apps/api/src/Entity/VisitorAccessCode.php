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
 * Time-limited access codes that primary guests generate for visitors.
 * Tied to a booking, validated at security post, auto-expires.
 */
#[ORM\Entity]
#[ORM\Table(name: 'visitor_access_codes')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_vac_booking')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'code'], name: 'idx_vac_code')]
#[ORM\HasLifecycleCallbacks]
class VisitorAccessCode implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    /** Guest who created this visitor code */
    #[ORM\Column(name: 'created_by_guest_id', type: Types::STRING, length: 36)]
    private string $createdByGuestId;

    /** Visitor details */
    #[ORM\Column(name: 'visitor_name', type: Types::STRING, length: 150)]
    private string $visitorName;

    #[ORM\Column(name: 'visitor_phone', type: Types::STRING, length: 20, nullable: true)]
    private ?string $visitorPhone = null;

    #[ORM\Column(name: 'purpose', type: Types::STRING, length: 200, nullable: true)]
    private ?string $purpose = null;

    /** 8-char alphanumeric code */
    #[ORM\Column(type: Types::STRING, length: 8)]
    private string $code;

    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 10, nullable: true)]
    private ?string $roomNumber = null;

    #[ORM\Column(name: 'valid_from', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $validFrom;

    #[ORM\Column(name: 'valid_until', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $validUntil;

    /** 'active' | 'used' | 'expired' | 'revoked' */
    #[ORM\Column(type: Types::STRING, length: 10, options: ['default' => 'active'])]
    private string $status = 'active';

    #[ORM\Column(name: 'checked_in_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $checkedInAt = null;

    #[ORM\Column(name: 'checked_out_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $checkedOutAt = null;

    public function __construct(string $bookingId, string $propertyId, string $createdByGuestId, string $visitorName, \DateTimeImmutable $validFrom, \DateTimeImmutable $validUntil, string $tenantId)
    {
        $this->generateId();
        $this->bookingId = $bookingId;
        $this->propertyId = $propertyId;
        $this->createdByGuestId = $createdByGuestId;
        $this->visitorName = $visitorName;
        $this->validFrom = $validFrom;
        $this->validUntil = $validUntil;
        $this->code = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        $this->setTenantId($tenantId);
    }

    public function getBookingId(): string { return $this->bookingId; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getCreatedByGuestId(): string { return $this->createdByGuestId; }
    public function getVisitorName(): string { return $this->visitorName; }
    public function getVisitorPhone(): ?string { return $this->visitorPhone; }
    public function setVisitorPhone(?string $v): void { $this->visitorPhone = $v; }
    public function getPurpose(): ?string { return $this->purpose; }
    public function setPurpose(?string $v): void { $this->purpose = $v; }
    public function getCode(): string { return $this->code; }
    public function getRoomNumber(): ?string { return $this->roomNumber; }
    public function setRoomNumber(?string $v): void { $this->roomNumber = $v; }
    public function getValidFrom(): \DateTimeImmutable { return $this->validFrom; }
    public function getValidUntil(): \DateTimeImmutable { return $this->validUntil; }
    public function setValidUntil(\DateTimeImmutable $v): void { $this->validUntil = $v; }
    public function getStatus(): string { return $this->status; }
    public function getCheckedInAt(): ?\DateTimeImmutable { return $this->checkedInAt; }
    public function getCheckedOutAt(): ?\DateTimeImmutable { return $this->checkedOutAt; }

    public function isValid(): bool
    {
        $now = new \DateTimeImmutable();
        return $this->status === 'active' && $now >= $this->validFrom && $now <= $this->validUntil;
    }

    public function checkIn(): void { $this->status = 'used'; $this->checkedInAt = new \DateTimeImmutable(); }
    public function checkOut(): void { $this->checkedOutAt = new \DateTimeImmutable(); }
    public function revoke(): void { $this->status = 'revoked'; }
    public function expire(): void { $this->status = 'expired'; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'booking_id' => $this->bookingId,
            'visitor_name' => $this->visitorName,
            'visitor_phone' => $this->visitorPhone,
            'purpose' => $this->purpose,
            'code' => $this->code,
            'room_number' => $this->roomNumber,
            'valid_from' => $this->validFrom->format('Y-m-d H:i'),
            'valid_until' => $this->validUntil->format('Y-m-d H:i'),
            'status' => $this->status,
            'checked_in_at' => $this->checkedInAt?->format('Y-m-d H:i:s'),
            'checked_out_at' => $this->checkedOutAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
