<?php
declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Enum\GuestCardEventType;
use Lodgik\Enum\ScanPointType;

/**
 * Immutable audit record of every card scan across the property.
 * No update lifecycle — events are written once and never modified.
 */
#[ORM\Entity]
#[ORM\Table(name: 'guest_card_events')]
#[ORM\Index(columns: ['tenant_id', 'card_id'],   name: 'idx_gce_card')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'],name: 'idx_gce_booking')]
#[ORM\Index(columns: ['tenant_id', 'guest_id'],  name: 'idx_gce_guest')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'scanned_at'], name: 'idx_gce_property_time')]
#[ORM\Index(columns: ['tenant_id', 'event_type'],name: 'idx_gce_event_type')]
class GuestCardEvent
{
    use HasUuid;
    use HasTenant;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'card_id', type: Types::STRING, length: 36)]
    private string $cardId;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $bookingId = null;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $guestId = null;

    #[ORM\Column(name: 'event_type', type: Types::STRING, length: 30, enumType: GuestCardEventType::class)]
    private GuestCardEventType $eventType;

    #[ORM\Column(name: 'scan_point', type: Types::STRING, length: 100, nullable: true)]
    private ?string $scanPoint = null;

    #[ORM\Column(name: 'scan_point_type', type: Types::STRING, length: 20, enumType: ScanPointType::class, nullable: true)]
    private ?ScanPointType $scanPointType = null;

    #[ORM\Column(name: 'scan_point_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $scanPointId = null;

    #[ORM\Column(name: 'scan_device_id', type: Types::STRING, length: 100, nullable: true)]
    private ?string $scanDeviceId = null;

    /** For pos_charge events — references the FolioCharge created */
    #[ORM\Column(name: 'folio_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $folioId = null;

    #[ORM\Column(name: 'charge_amount', type: Types::DECIMAL, precision: 12, scale: 2, nullable: true)]
    private ?string $chargeAmount = null;

    /** Extra context: guest_name, room_number, denial_reason, facility_name, etc. */
    #[ORM\Column(type: Types::JSON, options: ['default' => '{}'])]
    private array $metadata = [];

    #[ORM\Column(name: 'scanned_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $scannedBy = null;

    #[ORM\Column(name: 'scanned_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $scannedAt;

    public function __construct(
        string            $tenantId,
        string            $propertyId,
        string            $cardId,
        GuestCardEventType $eventType,
    ) {
        $this->tenantId   = $tenantId;
        $this->propertyId = $propertyId;
        $this->cardId     = $cardId;
        $this->eventType  = $eventType;
        $this->scannedAt  = new \DateTimeImmutable();
    }

    // ── Getters ─────────────────────────────────────────────────
    public function getPropertyId(): string                { return $this->propertyId; }
    public function getCardId(): string                    { return $this->cardId; }
    public function getBookingId(): ?string                { return $this->bookingId; }
    public function getGuestId(): ?string                  { return $this->guestId; }
    public function getEventType(): GuestCardEventType     { return $this->eventType; }
    public function getScanPoint(): ?string                { return $this->scanPoint; }
    public function getScanPointType(): ?ScanPointType     { return $this->scanPointType; }
    public function getScanPointId(): ?string              { return $this->scanPointId; }
    public function getFolioId(): ?string                  { return $this->folioId; }
    public function getChargeAmount(): ?string             { return $this->chargeAmount; }
    public function getMetadata(): array                   { return $this->metadata; }
    public function getScannedBy(): ?string                { return $this->scannedBy; }
    public function getScannedAt(): \DateTimeImmutable     { return $this->scannedAt; }

    // ── Fluent setters ───────────────────────────────────────────
    public function setBookingId(?string $v): self   { $this->bookingId   = $v; return $this; }
    public function setGuestId(?string $v): self     { $this->guestId     = $v; return $this; }
    public function setScanPoint(?string $v): self   { $this->scanPoint   = $v; return $this; }
    public function setScanPointType(?ScanPointType $v): self { $this->scanPointType = $v; return $this; }
    public function setScanPointId(?string $v): self { $this->scanPointId = $v; return $this; }
    public function setScanDeviceId(?string $v): self{ $this->scanDeviceId= $v; return $this; }
    public function setFolioId(?string $v): self     { $this->folioId     = $v; return $this; }
    public function setChargeAmount(?string $v): self{ $this->chargeAmount= $v; return $this; }
    public function setMetadata(array $v): self      { $this->metadata    = $v; return $this; }
    public function setScannedBy(?string $v): self   { $this->scannedBy   = $v; return $this; }

    public function toArray(): array
    {
        return [
            'id'              => $this->getId(),
            'card_id'         => $this->cardId,
            'booking_id'      => $this->bookingId,
            'guest_id'        => $this->guestId,
            'event_type'      => $this->eventType->value,
            'event_label'     => $this->eventType->label(),
            'event_icon'      => $this->eventType->icon(),
            'scan_point'      => $this->scanPoint,
            'scan_point_type' => $this->scanPointType?->value,
            'scan_point_id'   => $this->scanPointId,
            'folio_id'        => $this->folioId,
            'charge_amount'   => $this->chargeAmount,
            'metadata'        => $this->metadata,
            'scanned_by'      => $this->scannedBy,
            'scanned_at'      => $this->scannedAt->format('c'),
        ];
    }
}
