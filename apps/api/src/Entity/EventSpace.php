<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'event_spaces')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_espace_prop')]
#[ORM\HasLifecycleCallbacks]
class EventSpace implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    /** Maximum guest/attendee capacity */
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $capacity = 0;

    /** Configurable layouts: boardroom, theatre, u-shape, classroom, cocktail, banquet */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $layouts = null;

    /** Amenities: projector, screen, sound_system, whiteboard, ac, wifi, stage */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $amenities = null;

    /** Half-day rate in kobo */
    #[ORM\Column(name: 'half_day_rate_kobo', type: Types::BIGINT, nullable: true)]
    private ?int $halfDayRateKobo = null;

    /** Full-day rate in kobo */
    #[ORM\Column(name: 'full_day_rate_kobo', type: Types::BIGINT, nullable: true)]
    private ?int $fullDayRateKobo = null;

    /** Hourly rate in kobo */
    #[ORM\Column(name: 'hourly_rate_kobo', type: Types::BIGINT, nullable: true)]
    private ?int $hourlyRateKobo = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $tenantId, string $propertyId, string $name)
    {
        $this->generateId();
        $this->setTenantId($tenantId);
        $this->propertyId = $propertyId;
        $this->name       = $name;
    }

    public function getPropertyId(): string   { return $this->propertyId; }
    public function getName(): string          { return $this->name; }
    public function getDescription(): ?string  { return $this->description; }
    public function getCapacity(): int         { return $this->capacity; }
    public function getLayouts(): ?array       { return $this->layouts; }
    public function getAmenities(): ?array     { return $this->amenities; }
    public function getHalfDayRateKobo(): ?int { return $this->halfDayRateKobo; }
    public function getFullDayRateKobo(): ?int { return $this->fullDayRateKobo; }
    public function getHourlyRateKobo(): ?int  { return $this->hourlyRateKobo; }
    public function isActive(): bool           { return $this->isActive; }
    public function getNotes(): ?string        { return $this->notes; }

    public function setName(string $v): void          { $this->name = $v; }
    public function setDescription(?string $v): void  { $this->description = $v; }
    public function setCapacity(int $v): void          { $this->capacity = $v; }
    public function setLayouts(?array $v): void        { $this->layouts = $v; }
    public function setAmenities(?array $v): void      { $this->amenities = $v; }
    public function setHalfDayRateKobo(?int $v): void  { $this->halfDayRateKobo = $v; }
    public function setFullDayRateKobo(?int $v): void  { $this->fullDayRateKobo = $v; }
    public function setHourlyRateKobo(?int $v): void   { $this->hourlyRateKobo = $v; }
    public function setIsActive(bool $v): void         { $this->isActive = $v; }
    public function setNotes(?string $v): void         { $this->notes = $v; }

    public function toArray(): array
    {
        return [
            'id'                  => $this->getId(),
            'tenant_id'           => $this->getTenantId(),
            'property_id'         => $this->propertyId,
            'name'                => $this->name,
            'description'         => $this->description,
            'capacity'            => $this->capacity,
            'layouts'             => $this->layouts ?? [],
            'amenities'           => $this->amenities ?? [],
            'half_day_rate_kobo'  => $this->halfDayRateKobo,
            'half_day_rate_ngn'   => $this->halfDayRateKobo !== null ? round($this->halfDayRateKobo / 100, 2) : null,
            'full_day_rate_kobo'  => $this->fullDayRateKobo,
            'full_day_rate_ngn'   => $this->fullDayRateKobo !== null ? round($this->fullDayRateKobo / 100, 2) : null,
            'hourly_rate_kobo'    => $this->hourlyRateKobo,
            'hourly_rate_ngn'     => $this->hourlyRateKobo !== null ? round($this->hourlyRateKobo / 100, 2) : null,
            'is_active'           => $this->isActive,
            'notes'               => $this->notes,
            'created_at'          => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
            'updated_at'          => $this->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
