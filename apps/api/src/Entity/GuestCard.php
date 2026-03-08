<?php
declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\GuestCardStatus;

/**
 * Physical guest card — RFID/QR dual-interface card issued at check-in.
 * card_uid is the same value encoded on the RFID chip and printed as the QR payload.
 */
#[ORM\Entity]
#[ORM\Table(name: 'guest_cards')]
#[ORM\UniqueConstraint(name: 'uq_guest_cards_uid', columns: ['card_uid'])]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_guest_cards_property')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'],  name: 'idx_guest_cards_booking')]
#[ORM\Index(columns: ['tenant_id', 'status'],      name: 'idx_guest_cards_status')]
#[ORM\HasLifecycleCallbacks]
class GuestCard implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    /** The RFID chip UID and QR payload — identical value, hardware-agnostic. */
    #[ORM\Column(name: 'card_uid', type: Types::STRING, length: 100)]
    private string $cardUid;

    /** Human-readable label printed on card: "CARD-0042" */
    #[ORM\Column(name: 'card_number', type: Types::STRING, length: 30)]
    private string $cardNumber;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: GuestCardStatus::class, options: ['default' => 'available'])]
    private GuestCardStatus $status = GuestCardStatus::AVAILABLE;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $bookingId = null;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $guestId = null;

    #[ORM\Column(name: 'issued_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $issuedBy = null;

    #[ORM\Column(name: 'issued_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $issuedAt = null;

    #[ORM\Column(name: 'deactivated_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $deactivatedAt = null;

    /** Points to replacement card when this one is reported lost */
    #[ORM\Column(name: 'replaced_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $replacedBy = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    // ── Security-gate issuance fields ────────────────────────────

    /**
     * Vehicle plate number captured when security issues the card at the gate.
     * Optional — only recorded when the guest arrives by vehicle.
     */
    #[ORM\Column(name: 'plate_number', type: Types::STRING, length: 20, nullable: true)]
    private ?string $plateNumber = null;

    /**
     * True when the card was issued at the security gate before check-in.
     * False (default) for the traditional reception-issue flow.
     */
    #[ORM\Column(name: 'issued_by_security', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $issuedBySecurity = false;

    /** Timestamp of security gate issuance. Null for reception-issued cards. */
    #[ORM\Column(name: 'security_issued_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $securityIssuedAt = null;

    public function __construct(string $propertyId, string $cardUid, string $cardNumber, string $tenantId)
    {
        $this->propertyId  = $propertyId;
        $this->cardUid     = $cardUid;
        $this->cardNumber  = $cardNumber;
        $this->tenantId    = $tenantId;
    }

    // ── Getters ─────────────────────────────────────────────────
    public function getPropertyId(): string              { return $this->propertyId; }
    public function getCardUid(): string                 { return $this->cardUid; }
    public function getCardNumber(): string              { return $this->cardNumber; }
    public function getStatus(): GuestCardStatus         { return $this->status; }
    public function getBookingId(): ?string              { return $this->bookingId; }
    public function getGuestId(): ?string                { return $this->guestId; }
    public function getIssuedBy(): ?string               { return $this->issuedBy; }
    public function getIssuedAt(): ?\DateTimeImmutable   { return $this->issuedAt; }
    public function getDeactivatedAt(): ?\DateTimeImmutable { return $this->deactivatedAt; }
    public function getReplacedBy(): ?string             { return $this->replacedBy; }
    public function getNotes(): ?string                  { return $this->notes; }
    public function getPlateNumber(): ?string            { return $this->plateNumber; }
    public function isIssuedBySecurity(): bool           { return $this->issuedBySecurity; }
    public function getSecurityIssuedAt(): ?\DateTimeImmutable { return $this->securityIssuedAt; }

    // ── Business methods ─────────────────────────────────────────

    /**
     * Security gate: move card from AVAILABLE → PENDING_CHECKIN.
     * Card enters the pending pool — no booking attached yet.
     * Reception will call attachToBooking() when the guest checks in.
     */
    public function issueAtGate(string $issuedBy, ?string $plateNumber = null): void
    {
        $this->issuedBy          = $issuedBy;
        $this->issuedBySecurity  = true;
        $this->securityIssuedAt  = new \DateTimeImmutable();
        $this->plateNumber       = $plateNumber;
        $this->status            = GuestCardStatus::PENDING_CHECKIN;
    }

    /**
     * Reception: attach a PENDING_CHECKIN card to a booking at check-in.
     * Transitions PENDING_CHECKIN → ACTIVE.
     */
    public function attachToBooking(string $bookingId, string $guestId): void
    {
        $this->bookingId = $bookingId;
        $this->guestId   = $guestId;
        $this->issuedAt  = new \DateTimeImmutable();
        $this->status    = GuestCardStatus::ACTIVE;
    }
    public function issue(string $bookingId, string $guestId, string $issuedBy): void
    {
        $this->bookingId = $bookingId;
        $this->guestId   = $guestId;
        $this->issuedBy  = $issuedBy;
        $this->issuedAt  = new \DateTimeImmutable();
        $this->status    = GuestCardStatus::ACTIVE;
    }

    public function deactivate(string $reason = 'checkout'): void
    {
        $this->status          = GuestCardStatus::DEACTIVATED;
        $this->deactivatedAt   = new \DateTimeImmutable();
        $this->notes           = $reason;
        $this->bookingId       = null;
        $this->guestId         = null;
    }

    public function markLost(string $replacedById): void
    {
        $this->status      = GuestCardStatus::LOST;
        $this->replacedBy  = $replacedById;
        $this->bookingId   = null;
        $this->guestId     = null;
    }

    public function resetToAvailable(): void
    {
        $this->status          = GuestCardStatus::AVAILABLE;
        $this->bookingId       = null;
        $this->guestId         = null;
        $this->issuedBy        = null;
        $this->issuedAt        = null;
        $this->deactivatedAt   = null;
        $this->replacedBy      = null;
        $this->notes           = null;
    }

    public function isUsable(): bool
    {
        return $this->status->isUsable();
    }

    public function setNotes(?string $notes): void { $this->notes = $notes; }
}
