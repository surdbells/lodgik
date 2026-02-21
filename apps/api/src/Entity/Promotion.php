<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'promotions')]
#[ORM\Index(columns: ['tenant_id', 'code'], name: 'idx_promo_code')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'is_active'], name: 'idx_promo_active')] #[ORM\HasLifecycleCallbacks]
class Promotion implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(type: Types::STRING, length: 20, unique: true)] private string $code;
    #[ORM\Column(type: Types::STRING, length: 100)] private string $name;
    /** percentage|fixed|room_upgrade|free_night */
    #[ORM\Column(type: Types::STRING, length: 15)] private string $type;
    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)] private string $value;
    #[ORM\Column(name: 'start_date', type: Types::DATE_IMMUTABLE)] private \DateTimeImmutable $startDate;
    #[ORM\Column(name: 'end_date', type: Types::DATE_IMMUTABLE)] private \DateTimeImmutable $endDate;
    #[ORM\Column(name: 'usage_limit', type: Types::INTEGER, nullable: true)] private ?int $usageLimit = null;
    #[ORM\Column(name: 'usage_count', type: Types::INTEGER, options: ['default' => 0])] private int $usageCount = 0;
    #[ORM\Column(name: 'min_booking_amount', type: Types::BIGINT, nullable: true)] private ?string $minBookingAmount = null;
    #[ORM\Column(name: 'applicable_room_types', type: Types::JSON, nullable: true)] private ?array $applicableRoomTypes = null;
    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])] private bool $isActive = true;
    #[ORM\Column(type: Types::TEXT, nullable: true)] private ?string $description = null;

    public function __construct(string $propertyId, string $code, string $name, string $type, string $value, \DateTimeImmutable $startDate, \DateTimeImmutable $endDate, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->code = strtoupper($code); $this->name = $name; $this->type = $type; $this->value = $value; $this->startDate = $startDate; $this->endDate = $endDate; $this->setTenantId($tenantId); }

    public function getCode(): string { return $this->code; }
    public function getType(): string { return $this->type; }
    public function getValue(): string { return $this->value; }
    public function getUsageCount(): int { return $this->usageCount; }
    public function isActive(): bool { return $this->isActive; }
    public function setUsageLimit(?int $v): void { $this->usageLimit = $v; }
    public function setMinBookingAmount(?string $v): void { $this->minBookingAmount = $v; }
    public function setApplicableRoomTypes(?array $v): void { $this->applicableRoomTypes = $v; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function setDescription(?string $v): void { $this->description = $v; }

    public function isValid(\DateTimeImmutable $date = new \DateTimeImmutable()): bool
    { return $this->isActive && $date >= $this->startDate && $date <= $this->endDate && ($this->usageLimit === null || $this->usageCount < $this->usageLimit); }

    public function apply(string $amount): string
    { return match ($this->type) {
        'percentage' => (string)((int)$amount - (int)round((int)$amount * (float)$this->value / 100)),
        'fixed' => (string)max(0, (int)$amount - (int)$this->value),
        default => $amount,
    }; }

    public function recordUsage(): void { $this->usageCount++; }

    public function toArray(): array { return ['id' => $this->getId(), 'property_id' => $this->propertyId, 'code' => $this->code, 'name' => $this->name, 'type' => $this->type, 'value' => $this->value, 'start_date' => $this->startDate->format('Y-m-d'), 'end_date' => $this->endDate->format('Y-m-d'), 'usage_limit' => $this->usageLimit, 'usage_count' => $this->usageCount, 'min_booking_amount' => $this->minBookingAmount, 'applicable_room_types' => $this->applicableRoomTypes, 'is_active' => $this->isActive, 'description' => $this->description]; }
}
