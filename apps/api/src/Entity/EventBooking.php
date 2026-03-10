<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * An event or banquet booking for a dedicated event space.
 * Can stand alone or link to a group_booking (conferences, weddings).
 */
#[ORM\Entity]
#[ORM\Table(name: 'event_bookings')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_evtbk_prop')]
#[ORM\Index(columns: ['tenant_id', 'event_date'],  name: 'idx_evtbk_date')]
#[ORM\HasLifecycleCallbacks]
class EventBooking implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'event_space_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $eventSpaceId = null;

    /** Optional link to a group booking (e.g. conference package) */
    #[ORM\Column(name: 'group_booking_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $groupBookingId = null;

    /** Unique event reference, auto-generated */
    #[ORM\Column(name: 'reference', type: Types::STRING, length: 30)]
    private string $reference;

    #[ORM\Column(name: 'event_name', type: Types::STRING, length: 200)]
    private string $eventName;

    /**
     * conference | wedding | birthday | corporate | seminar |
     * product_launch | gala | training | other
     */
    #[ORM\Column(name: 'event_type', type: Types::STRING, length: 30)]
    private string $eventType;

    /** Date of the event */
    #[ORM\Column(name: 'event_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $eventDate;

    /** Actual start time on the day */
    #[ORM\Column(name: 'start_time', type: Types::STRING, length: 8, nullable: true)]
    private ?string $startTime = null;

    /** Actual end time on the day */
    #[ORM\Column(name: 'end_time', type: Types::STRING, length: 8, nullable: true)]
    private ?string $endTime = null;

    /** Duration type for pricing: hourly | half_day | full_day */
    #[ORM\Column(name: 'duration_type', type: Types::STRING, length: 15, options: ['default' => 'full_day'])]
    private string $durationType = 'full_day';

    /** Expected number of attendees */
    #[ORM\Column(name: 'expected_guests', type: Types::INTEGER, options: ['default' => 0])]
    private int $expectedGuests = 0;

    /** Room layout requested: boardroom | theatre | u_shape | classroom | cocktail | banquet */
    #[ORM\Column(name: 'layout', type: Types::STRING, length: 30, nullable: true)]
    private ?string $layout = null;

    // ── Client / organiser ─────────────────────────────────────

    #[ORM\Column(name: 'client_name', type: Types::STRING, length: 200)]
    private string $clientName;

    #[ORM\Column(name: 'client_email', type: Types::STRING, length: 150, nullable: true)]
    private ?string $clientEmail = null;

    #[ORM\Column(name: 'client_phone', type: Types::STRING, length: 50, nullable: true)]
    private ?string $clientPhone = null;

    #[ORM\Column(name: 'company_name', type: Types::STRING, length: 200, nullable: true)]
    private ?string $companyName = null;

    // ── Status ─────────────────────────────────────────────────

    /** tentative | confirmed | in_progress | completed | cancelled */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'tentative'])]
    private string $status = 'tentative';

    // ── Pricing ────────────────────────────────────────────────

    /** Venue hire fee in kobo */
    #[ORM\Column(name: 'venue_rate_kobo', type: Types::BIGINT, options: ['default' => 0])]
    private int $venueRateKobo = 0;

    /** Catering charges in kobo (can be zero if no catering) */
    #[ORM\Column(name: 'catering_total_kobo', type: Types::BIGINT, options: ['default' => 0])]
    private int $cateringTotalKobo = 0;

    /** Extra services/AV/decor in kobo */
    #[ORM\Column(name: 'extras_total_kobo', type: Types::BIGINT, options: ['default' => 0])]
    private int $extrasTotalKobo = 0;

    /** Amount collected as deposit in kobo */
    #[ORM\Column(name: 'deposit_paid_kobo', type: Types::BIGINT, options: ['default' => 0])]
    private int $depositPaidKobo = 0;

    /**
     * Catering menu / F&B details as structured JSON array:
     * [{ item: string, quantity: int, unit_price_kobo: int, total_kobo: int }]
     */
    #[ORM\Column(name: 'catering_items', type: Types::JSON, nullable: true)]
    private ?array $cateringItems = null;

    /**
     * Extra services / AV / equipment / decor:
     * [{ item: string, quantity: int, unit_price_kobo: int, total_kobo: int }]
     */
    #[ORM\Column(name: 'extra_items', type: Types::JSON, nullable: true)]
    private ?array $extraItems = null;

    #[ORM\Column(name: 'special_requirements', type: Types::TEXT, nullable: true)]
    private ?string $specialRequirements = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    /** Folio ID once invoice is generated */
    #[ORM\Column(name: 'folio_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $folioId = null;

    #[ORM\Column(name: 'created_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $createdBy = null;

    public function __construct(
        string $tenantId,
        string $propertyId,
        string $reference,
        string $eventName,
        string $eventType,
        \DateTimeImmutable $eventDate,
        string $clientName,
    ) {
        $this->generateId();
        $this->setTenantId($tenantId);
        $this->propertyId = $propertyId;
        $this->reference  = $reference;
        $this->eventName  = $eventName;
        $this->eventType  = $eventType;
        $this->eventDate  = $eventDate;
        $this->clientName = $clientName;
    }

    // Getters
    public function getPropertyId(): string        { return $this->propertyId; }
    public function getEventSpaceId(): ?string      { return $this->eventSpaceId; }
    public function getGroupBookingId(): ?string    { return $this->groupBookingId; }
    public function getReference(): string          { return $this->reference; }
    public function getEventName(): string          { return $this->eventName; }
    public function getEventType(): string          { return $this->eventType; }
    public function getEventDate(): \DateTimeImmutable { return $this->eventDate; }
    public function getStartTime(): ?string         { return $this->startTime; }
    public function getEndTime(): ?string           { return $this->endTime; }
    public function getDurationType(): string       { return $this->durationType; }
    public function getExpectedGuests(): int        { return $this->expectedGuests; }
    public function getLayout(): ?string            { return $this->layout; }
    public function getClientName(): string         { return $this->clientName; }
    public function getClientEmail(): ?string       { return $this->clientEmail; }
    public function getClientPhone(): ?string       { return $this->clientPhone; }
    public function getCompanyName(): ?string       { return $this->companyName; }
    public function getStatus(): string             { return $this->status; }
    public function getVenueRateKobo(): int         { return $this->venueRateKobo; }
    public function getCateringTotalKobo(): int     { return $this->cateringTotalKobo; }
    public function getExtrasTotalKobo(): int       { return $this->extrasTotalKobo; }
    public function getDepositPaidKobo(): int       { return $this->depositPaidKobo; }
    public function getCateringItems(): ?array      { return $this->cateringItems; }
    public function getExtraItems(): ?array         { return $this->extraItems; }
    public function getSpecialRequirements(): ?string { return $this->specialRequirements; }
    public function getNotes(): ?string             { return $this->notes; }
    public function getFolioId(): ?string           { return $this->folioId; }
    public function getCreatedBy(): ?string         { return $this->createdBy; }

    // Setters
    public function setEventSpaceId(?string $v): void     { $this->eventSpaceId = $v; }
    public function setGroupBookingId(?string $v): void   { $this->groupBookingId = $v; }
    public function setEventName(string $v): void          { $this->eventName = $v; }
    public function setEventType(string $v): void          { $this->eventType = $v; }
    public function setEventDate(\DateTimeImmutable $v): void { $this->eventDate = $v; }
    public function setStartTime(?string $v): void         { $this->startTime = $v; }
    public function setEndTime(?string $v): void           { $this->endTime = $v; }
    public function setDurationType(string $v): void       { $this->durationType = $v; }
    public function setExpectedGuests(int $v): void        { $this->expectedGuests = $v; }
    public function setLayout(?string $v): void            { $this->layout = $v; }
    public function setClientName(string $v): void         { $this->clientName = $v; }
    public function setClientEmail(?string $v): void       { $this->clientEmail = $v; }
    public function setClientPhone(?string $v): void       { $this->clientPhone = $v; }
    public function setCompanyName(?string $v): void       { $this->companyName = $v; }
    public function setStatus(string $v): void             { $this->status = $v; }
    public function setVenueRateKobo(int $v): void         { $this->venueRateKobo = $v; }
    public function setCateringTotalKobo(int $v): void     { $this->cateringTotalKobo = $v; }
    public function setExtrasTotalKobo(int $v): void       { $this->extrasTotalKobo = $v; }
    public function setDepositPaidKobo(int $v): void       { $this->depositPaidKobo = $v; }
    public function setCateringItems(?array $v): void      { $this->cateringItems = $v; }
    public function setExtraItems(?array $v): void         { $this->extraItems = $v; }
    public function setSpecialRequirements(?string $v): void { $this->specialRequirements = $v; }
    public function setNotes(?string $v): void             { $this->notes = $v; }
    public function setFolioId(?string $v): void           { $this->folioId = $v; }
    public function setCreatedBy(?string $v): void         { $this->createdBy = $v; }

    public function confirm(): void   { $this->status = 'confirmed'; }
    public function cancel(): void    { $this->status = 'cancelled'; }
    public function complete(): void  { $this->status = 'completed'; }
    public function start(): void     { $this->status = 'in_progress'; }

    public function getTotalKobo(): int
    {
        return $this->venueRateKobo + $this->cateringTotalKobo + $this->extrasTotalKobo;
    }

    public function getBalanceDueKobo(): int
    {
        return max(0, $this->getTotalKobo() - $this->depositPaidKobo);
    }

    public function toArray(): array
    {
        $totalKobo   = $this->getTotalKobo();
        $balanceKobo = $this->getBalanceDueKobo();

        return [
            'id'                    => $this->getId(),
            'tenant_id'             => $this->getTenantId(),
            'property_id'           => $this->propertyId,
            'event_space_id'        => $this->eventSpaceId,
            'group_booking_id'      => $this->groupBookingId,
            'reference'             => $this->reference,
            'event_name'            => $this->eventName,
            'event_type'            => $this->eventType,
            'event_date'            => $this->eventDate->format('Y-m-d'),
            'start_time'            => $this->startTime,
            'end_time'              => $this->endTime,
            'duration_type'         => $this->durationType,
            'expected_guests'       => $this->expectedGuests,
            'layout'                => $this->layout,
            'client_name'           => $this->clientName,
            'client_email'          => $this->clientEmail,
            'client_phone'          => $this->clientPhone,
            'company_name'          => $this->companyName,
            'status'                => $this->status,
            'venue_rate_kobo'       => $this->venueRateKobo,
            'venue_rate_ngn'        => round($this->venueRateKobo / 100, 2),
            'catering_total_kobo'   => $this->cateringTotalKobo,
            'catering_total_ngn'    => round($this->cateringTotalKobo / 100, 2),
            'extras_total_kobo'     => $this->extrasTotalKobo,
            'extras_total_ngn'      => round($this->extrasTotalKobo / 100, 2),
            'deposit_paid_kobo'     => $this->depositPaidKobo,
            'deposit_paid_ngn'      => round($this->depositPaidKobo / 100, 2),
            'total_kobo'            => $totalKobo,
            'total_ngn'             => round($totalKobo / 100, 2),
            'balance_due_kobo'      => $balanceKobo,
            'balance_due_ngn'       => round($balanceKobo / 100, 2),
            'catering_items'        => $this->cateringItems ?? [],
            'extra_items'           => $this->extraItems ?? [],
            'special_requirements'  => $this->specialRequirements,
            'notes'                 => $this->notes,
            'folio_id'              => $this->folioId,
            'created_by'            => $this->createdBy,
            'created_at'            => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
            'updated_at'            => $this->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
