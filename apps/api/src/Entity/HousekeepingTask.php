<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\HousekeepingTaskStatus;

#[ORM\Entity]
#[ORM\Table(name: 'housekeeping_tasks')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_hkt_status')]
#[ORM\Index(columns: ['tenant_id', 'assigned_to'], name: 'idx_hkt_assigned')]
#[ORM\HasLifecycleCallbacks]
class HousekeepingTask implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36)]
    private string $roomId;

    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 20)]
    private string $roomNumber;

    /** 'checkout_clean', 'stayover_clean', 'deep_clean', 'inspection', 'turndown' */
    #[ORM\Column(name: 'task_type', type: Types::STRING, length: 30)]
    private string $taskType;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: HousekeepingTaskStatus::class)]
    private HousekeepingTaskStatus $status;

    /** Priority: 1=urgent, 2=high, 3=normal, 4=low */
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 3])]
    private int $priority = 3;

    #[ORM\Column(name: 'assigned_to', type: Types::STRING, length: 36, nullable: true)]
    private ?string $assignedTo = null;

    #[ORM\Column(name: 'assigned_to_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $assignedToName = null;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $bookingId = null;

    #[ORM\Column(name: 'started_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $startedAt = null;

    #[ORM\Column(name: 'completed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $completedAt = null;

    #[ORM\Column(name: 'inspected_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $inspectedBy = null;

    #[ORM\Column(name: 'inspected_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $inspectedAt = null;

    #[ORM\Column(name: 'inspection_passed', type: Types::BOOLEAN, nullable: true)]
    private ?bool $inspectionPassed = null;

    #[ORM\Column(name: 'inspection_notes', type: Types::TEXT, nullable: true)]
    private ?string $inspectionNotes = null;

    /** JSON array of checklist items e.g. [{"item":"Bed made","checked":true}] */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $checklist = null;

    #[ORM\Column(name: 'photo_before', type: Types::TEXT, nullable: true)]
    private ?string $photoBefore = null;

    #[ORM\Column(name: 'photo_after', type: Types::TEXT, nullable: true)]
    private ?string $photoAfter = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    /** Estimated minutes to complete */
    #[ORM\Column(name: 'estimated_minutes', type: Types::INTEGER, options: ['default' => 30])]
    private int $estimatedMinutes = 30;

    #[ORM\Column(name: 'due_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $dueAt = null;

    public function __construct(string $propertyId, string $roomId, string $roomNumber, string $taskType, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->roomId = $roomId;
        $this->roomNumber = $roomNumber;
        $this->taskType = $taskType;
        $this->status = HousekeepingTaskStatus::PENDING;
        $this->setTenantId($tenantId);
    }

    // Getters
    public function getPropertyId(): string { return $this->propertyId; }
    public function getRoomId(): string { return $this->roomId; }
    public function getRoomNumber(): string { return $this->roomNumber; }
    public function getTaskType(): string { return $this->taskType; }
    public function getStatus(): HousekeepingTaskStatus { return $this->status; }
    public function getPriority(): int { return $this->priority; }
    public function setPriority(int $v): void { $this->priority = $v; }
    public function getAssignedTo(): ?string { return $this->assignedTo; }
    public function getAssignedToName(): ?string { return $this->assignedToName; }
    public function getBookingId(): ?string { return $this->bookingId; }
    public function setBookingId(?string $v): void { $this->bookingId = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getEstimatedMinutes(): int { return $this->estimatedMinutes; }
    public function setEstimatedMinutes(int $v): void { $this->estimatedMinutes = $v; }
    public function getDueAt(): ?\DateTimeImmutable { return $this->dueAt; }
    public function setDueAt(?\DateTimeImmutable $v): void { $this->dueAt = $v; }
    public function getPhotoBefore(): ?string { return $this->photoBefore; }
    public function setPhotoBefore(?string $v): void { $this->photoBefore = $v; }
    public function getPhotoAfter(): ?string { return $this->photoAfter; }
    public function setPhotoAfter(?string $v): void { $this->photoAfter = $v; }
    public function getChecklist(): ?array { return $this->checklist ? json_decode($this->checklist, true) : null; }
    public function setChecklist(?array $v): void { $this->checklist = $v ? json_encode($v) : null; }

    // State transitions
    public function assign(string $userId, string $name): void
    {
        $this->assignedTo = $userId;
        $this->assignedToName = $name;
        $this->status = HousekeepingTaskStatus::ASSIGNED;
    }

    public function start(): void
    {
        $this->status = HousekeepingTaskStatus::IN_PROGRESS;
        $this->startedAt = new \DateTimeImmutable();
    }

    public function complete(): void
    {
        $this->status = HousekeepingTaskStatus::COMPLETED;
        $this->completedAt = new \DateTimeImmutable();
    }

    public function inspect(string $inspectorId, bool $passed, ?string $notes = null): void
    {
        $this->inspectedBy = $inspectorId;
        $this->inspectedAt = new \DateTimeImmutable();
        $this->inspectionPassed = $passed;
        $this->inspectionNotes = $notes;
        $this->status = $passed ? HousekeepingTaskStatus::INSPECTED : HousekeepingTaskStatus::NEEDS_REWORK;
    }

    public function getDurationMinutes(): ?int
    {
        if (!$this->startedAt || !$this->completedAt) return null;
        return (int)round(($this->completedAt->getTimestamp() - $this->startedAt->getTimestamp()) / 60);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'room_id' => $this->roomId, 'room_number' => $this->roomNumber,
            'task_type' => $this->taskType, 'status' => $this->status->value,
            'status_label' => $this->status->label(), 'status_color' => $this->status->color(),
            'priority' => $this->priority, 'assigned_to' => $this->assignedTo,
            'assigned_to_name' => $this->assignedToName, 'booking_id' => $this->bookingId,
            'started_at' => $this->startedAt?->format('Y-m-d H:i:s'),
            'completed_at' => $this->completedAt?->format('Y-m-d H:i:s'),
            'duration_minutes' => $this->getDurationMinutes(),
            'inspected_by' => $this->inspectedBy,
            'inspected_at' => $this->inspectedAt?->format('Y-m-d H:i:s'),
            'inspection_passed' => $this->inspectionPassed,
            'inspection_notes' => $this->inspectionNotes,
            'checklist' => $this->getChecklist(), 'photo_before' => $this->photoBefore,
            'photo_after' => $this->photoAfter, 'notes' => $this->notes,
            'estimated_minutes' => $this->estimatedMinutes,
            'due_at' => $this->dueAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
