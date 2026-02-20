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
#[ORM\Table(name: 'gym_classes')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'scheduled_at'], name: 'idx_gc_schedule')]
#[ORM\HasLifecycleCallbacks]
class GymClass implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(name: 'instructor_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $instructorName = null;

    #[ORM\Column(name: 'scheduled_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $scheduledAt;

    /** Duration in minutes */
    #[ORM\Column(name: 'duration_minutes', type: Types::INTEGER, options: ['default' => 60])]
    private int $durationMinutes = 60;

    #[ORM\Column(name: 'max_capacity', type: Types::INTEGER, options: ['default' => 20])]
    private int $maxCapacity = 20;

    #[ORM\Column(name: 'current_bookings', type: Types::INTEGER, options: ['default' => 0])]
    private int $currentBookings = 0;

    /** 'yoga', 'hiit', 'spin', 'pilates', 'boxing', 'dance', 'crossfit', 'other' */
    #[ORM\Column(type: Types::STRING, length: 30, options: ['default' => 'other'])]
    private string $category = 'other';

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $location = null;

    /** Recurring: 'none', 'weekly' */
    #[ORM\Column(name: 'recurrence', type: Types::STRING, length: 20, options: ['default' => 'none'])]
    private string $recurrence = 'none';

    #[ORM\Column(name: 'is_cancelled', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isCancelled = false;

    public function __construct(string $propertyId, string $name, \DateTimeImmutable $scheduledAt, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->name = $name;
        $this->scheduledAt = $scheduledAt;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }
    public function getInstructorName(): ?string { return $this->instructorName; }
    public function setInstructorName(?string $v): void { $this->instructorName = $v; }
    public function getScheduledAt(): \DateTimeImmutable { return $this->scheduledAt; }
    public function setScheduledAt(\DateTimeImmutable $v): void { $this->scheduledAt = $v; }
    public function getDurationMinutes(): int { return $this->durationMinutes; }
    public function setDurationMinutes(int $v): void { $this->durationMinutes = $v; }
    public function getMaxCapacity(): int { return $this->maxCapacity; }
    public function setMaxCapacity(int $v): void { $this->maxCapacity = $v; }
    public function getCurrentBookings(): int { return $this->currentBookings; }
    public function getCategory(): string { return $this->category; }
    public function setCategory(string $v): void { $this->category = $v; }
    public function getLocation(): ?string { return $this->location; }
    public function setLocation(?string $v): void { $this->location = $v; }
    public function getRecurrence(): string { return $this->recurrence; }
    public function setRecurrence(string $v): void { $this->recurrence = $v; }
    public function isCancelled(): bool { return $this->isCancelled; }
    public function cancel(): void { $this->isCancelled = true; }
    public function isFull(): bool { return $this->currentBookings >= $this->maxCapacity; }
    public function getSpotsLeft(): int { return max(0, $this->maxCapacity - $this->currentBookings); }
    public function incrementBookings(): void { $this->currentBookings++; }
    public function decrementBookings(): void { $this->currentBookings = max(0, $this->currentBookings - 1); }

    public function getEndTime(): \DateTimeImmutable
    {
        return $this->scheduledAt->modify("+{$this->durationMinutes} minutes");
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'name' => $this->name, 'description' => $this->description,
            'instructor_name' => $this->instructorName,
            'scheduled_at' => $this->scheduledAt->format('Y-m-d H:i:s'),
            'end_time' => $this->getEndTime()->format('Y-m-d H:i:s'),
            'duration_minutes' => $this->durationMinutes,
            'max_capacity' => $this->maxCapacity, 'current_bookings' => $this->currentBookings,
            'spots_left' => $this->getSpotsLeft(), 'is_full' => $this->isFull(),
            'category' => $this->category, 'location' => $this->location,
            'recurrence' => $this->recurrence, 'is_cancelled' => $this->isCancelled,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
