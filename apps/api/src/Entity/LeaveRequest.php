<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\LeaveRequestStatus;

#[ORM\Entity]
#[ORM\Table(name: 'leave_requests')]
#[ORM\Index(columns: ['tenant_id', 'employee_id'], name: 'idx_lr_employee')]
#[ORM\Index(columns: ['tenant_id', 'status'], name: 'idx_lr_status')]
#[ORM\HasLifecycleCallbacks]
class LeaveRequest implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'employee_id', type: Types::STRING, length: 36)]
    private string $employeeId;

    #[ORM\Column(name: 'leave_type_id', type: Types::STRING, length: 36)]
    private string $leaveTypeId;

    #[ORM\Column(name: 'start_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $startDate;

    #[ORM\Column(name: 'end_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $endDate;

    /** Number of working days requested */
    #[ORM\Column(name: 'days_requested', type: Types::DECIMAL, precision: 5, scale: 1)]
    private string $daysRequested;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: LeaveRequestStatus::class)]
    private LeaveRequestStatus $status = LeaveRequestStatus::PENDING;

    #[ORM\Column(name: 'reviewed_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $reviewedBy = null;

    #[ORM\Column(name: 'reviewed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $reviewedAt = null;

    #[ORM\Column(name: 'review_notes', type: Types::TEXT, nullable: true)]
    private ?string $reviewNotes = null;

    public function __construct(string $employeeId, string $leaveTypeId, \DateTimeImmutable $startDate, \DateTimeImmutable $endDate, string $daysRequested, string $tenantId)
    {
        $this->generateId();
        $this->employeeId = $employeeId;
        $this->leaveTypeId = $leaveTypeId;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->daysRequested = $daysRequested;
        $this->setTenantId($tenantId);
    }

    public function getEmployeeId(): string { return $this->employeeId; }
    public function getLeaveTypeId(): string { return $this->leaveTypeId; }
    public function getStartDate(): \DateTimeImmutable { return $this->startDate; }
    public function getEndDate(): \DateTimeImmutable { return $this->endDate; }
    public function getDaysRequested(): string { return $this->daysRequested; }
    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $v): void { $this->reason = $v; }
    public function getStatus(): LeaveRequestStatus { return $this->status; }
    public function setStatus(LeaveRequestStatus $v): void { $this->status = $v; }
    public function getReviewedBy(): ?string { return $this->reviewedBy; }
    public function setReviewedBy(?string $v): void { $this->reviewedBy = $v; }
    public function getReviewedAt(): ?\DateTimeImmutable { return $this->reviewedAt; }
    public function setReviewedAt(?\DateTimeImmutable $v): void { $this->reviewedAt = $v; }
    public function getReviewNotes(): ?string { return $this->reviewNotes; }
    public function setReviewNotes(?string $v): void { $this->reviewNotes = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'employee_id' => $this->employeeId,
            'leave_type_id' => $this->leaveTypeId,
            'start_date' => $this->startDate->format('Y-m-d'),
            'end_date' => $this->endDate->format('Y-m-d'),
            'days_requested' => $this->daysRequested,
            'reason' => $this->reason,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'reviewed_by' => $this->reviewedBy,
            'reviewed_at' => $this->reviewedAt?->format('Y-m-d H:i:s'),
            'review_notes' => $this->reviewNotes,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
