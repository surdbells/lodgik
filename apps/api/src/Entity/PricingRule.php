<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'pricing_rules')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'is_active'], name: 'idx_pr_active')]
#[ORM\HasLifecycleCallbacks]
class PricingRule implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;
    #[ORM\Column(name: 'room_type_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $roomTypeId = null;
    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;
    /** seasonal | day_of_week | occupancy | length_of_stay | early_bird | last_minute | event */
    #[ORM\Column(name: 'rule_type', type: Types::STRING, length: 20)]
    private string $ruleType;
    /** percentage | fixed */
    #[ORM\Column(name: 'adjustment_type', type: Types::STRING, length: 15)]
    private string $adjustmentType;
    /** Positive = surcharge, negative = discount */
    #[ORM\Column(name: 'adjustment_value', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $adjustmentValue;
    #[ORM\Column(name: 'start_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $startDate = null;
    #[ORM\Column(name: 'end_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $endDate = null;
    /** For day_of_week: [0=Sun,1=Mon...6=Sat] */
    #[ORM\Column(name: 'days_of_week', type: Types::JSON, nullable: true)]
    private ?array $daysOfWeek = null;
    /** For occupancy: min threshold % */
    #[ORM\Column(name: 'min_occupancy', type: Types::INTEGER, nullable: true)]
    private ?int $minOccupancy = null;
    #[ORM\Column(name: 'max_occupancy', type: Types::INTEGER, nullable: true)]
    private ?int $maxOccupancy = null;
    /** For length_of_stay */
    #[ORM\Column(name: 'min_nights', type: Types::INTEGER, nullable: true)]
    private ?int $minNights = null;
    /** For early_bird: days in advance */
    #[ORM\Column(name: 'advance_days', type: Types::INTEGER, nullable: true)]
    private ?int $advanceDays = null;
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $priority = 0;
    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    public function __construct(string $propertyId, string $name, string $ruleType, string $adjustmentType, string $adjustmentValue, string $tenantId)
    {
        $this->generateId(); $this->propertyId = $propertyId; $this->name = $name;
        $this->ruleType = $ruleType; $this->adjustmentType = $adjustmentType;
        $this->adjustmentValue = $adjustmentValue; $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getRoomTypeId(): ?string { return $this->roomTypeId; }
    public function setRoomTypeId(?string $v): void { $this->roomTypeId = $v; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getRuleType(): string { return $this->ruleType; }
    public function getAdjustmentType(): string { return $this->adjustmentType; }
    public function getAdjustmentValue(): string { return $this->adjustmentValue; }
    public function setAdjustmentType(string $v): void { $this->adjustmentType = $v; }
    public function setAdjustmentValue(string $v): void { $this->adjustmentValue = $v; }
    public function setRuleType(string $v): void { $this->ruleType = $v; }
    public function getStartDate(): ?\DateTimeImmutable { return $this->startDate; }
    public function setStartDate(?\DateTimeImmutable $v): void { $this->startDate = $v; }
    public function getEndDate(): ?\DateTimeImmutable { return $this->endDate; }
    public function setEndDate(?\DateTimeImmutable $v): void { $this->endDate = $v; }
    public function getDaysOfWeek(): ?array { return $this->daysOfWeek; }
    public function setDaysOfWeek(?array $v): void { $this->daysOfWeek = $v; }
    public function getMinOccupancy(): ?int { return $this->minOccupancy; }
    public function setMinOccupancy(?int $v): void { $this->minOccupancy = $v; }
    public function getMaxOccupancy(): ?int { return $this->maxOccupancy; }
    public function setMaxOccupancy(?int $v): void { $this->maxOccupancy = $v; }
    public function getMinNights(): ?int { return $this->minNights; }
    public function setMinNights(?int $v): void { $this->minNights = $v; }
    public function getAdvanceDays(): ?int { return $this->advanceDays; }
    public function setAdvanceDays(?int $v): void { $this->advanceDays = $v; }
    public function getPriority(): int { return $this->priority; }
    public function setPriority(int $v): void { $this->priority = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function setDescription(?string $v): void { $this->description = $v; }

    /** Check if rule applies to a given date */
    public function appliesOnDate(\DateTimeImmutable $date): bool
    {
        if (!$this->isActive) return false;
        if ($this->startDate && $date < $this->startDate) return false;
        if ($this->endDate && $date > $this->endDate) return false;
        if ($this->daysOfWeek && !in_array((int)$date->format('w'), $this->daysOfWeek)) return false;
        return true;
    }

    /** Calculate adjusted rate (amounts in kobo as strings) */
    public function applyTo(string $baseRate): string
    {
        $base = (int) $baseRate;
        if ($this->adjustmentType === 'percentage') {
            $adj = (int) round($base * ((float) $this->adjustmentValue / 100));
            return (string) ($base + $adj);
        }
        return (string) ($base + (int) $this->adjustmentValue);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId, 'room_type_id' => $this->roomTypeId,
            'name' => $this->name, 'rule_type' => $this->ruleType, 'adjustment_type' => $this->adjustmentType,
            'adjustment_value' => $this->adjustmentValue, 'start_date' => $this->startDate?->format('Y-m-d'),
            'end_date' => $this->endDate?->format('Y-m-d'), 'days_of_week' => $this->daysOfWeek,
            'min_occupancy' => $this->minOccupancy, 'max_occupancy' => $this->maxOccupancy,
            'min_nights' => $this->minNights, 'advance_days' => $this->advanceDays,
            'priority' => $this->priority, 'is_active' => $this->isActive, 'description' => $this->description,
        ];
    }
}
