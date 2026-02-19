<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\AttendanceStatus;

#[ORM\Entity]
#[ORM\Table(name: 'attendance_records')]
#[ORM\UniqueConstraint(name: 'uq_attendance_emp_date', columns: ['tenant_id', 'employee_id', 'attendance_date'])]
#[ORM\Index(columns: ['tenant_id', 'attendance_date'], name: 'idx_att_date')]
#[ORM\Index(columns: ['tenant_id', 'employee_id'], name: 'idx_att_employee')]
#[ORM\HasLifecycleCallbacks]
class AttendanceRecord implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'employee_id', type: Types::STRING, length: 36)]
    private string $employeeId;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'attendance_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $attendanceDate;

    #[ORM\Column(name: 'status', type: Types::STRING, length: 20, enumType: AttendanceStatus::class)]
    private AttendanceStatus $status = AttendanceStatus::ABSENT;

    #[ORM\Column(name: 'clock_in', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $clockIn = null;

    #[ORM\Column(name: 'clock_out', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $clockOut = null;

    /** Computed hours worked (decimal) */
    #[ORM\Column(name: 'hours_worked', type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $hoursWorked = '0.00';

    #[ORM\Column(name: 'shift_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $shiftId = null;

    #[ORM\Column(name: 'is_late', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isLate = false;

    #[ORM\Column(name: 'late_minutes', type: Types::INTEGER, options: ['default' => 0])]
    private int $lateMinutes = 0;

    #[ORM\Column(name: 'overtime_hours', type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $overtimeHours = '0.00';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'recorded_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $recordedBy = null;

    public function __construct(string $employeeId, string $propertyId, \DateTimeImmutable $date, string $tenantId)
    {
        $this->generateId();
        $this->employeeId = $employeeId;
        $this->propertyId = $propertyId;
        $this->attendanceDate = $date;
        $this->setTenantId($tenantId);
    }

    public function getEmployeeId(): string { return $this->employeeId; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getAttendanceDate(): \DateTimeImmutable { return $this->attendanceDate; }
    public function getStatus(): AttendanceStatus { return $this->status; }
    public function setStatus(AttendanceStatus $v): void { $this->status = $v; }
    public function getClockIn(): ?\DateTimeImmutable { return $this->clockIn; }
    public function setClockIn(?\DateTimeImmutable $v): void { $this->clockIn = $v; }
    public function getClockOut(): ?\DateTimeImmutable { return $this->clockOut; }
    public function setClockOut(?\DateTimeImmutable $v): void { $this->clockOut = $v; }
    public function getHoursWorked(): string { return $this->hoursWorked; }
    public function setHoursWorked(string $v): void { $this->hoursWorked = $v; }
    public function getShiftId(): ?string { return $this->shiftId; }
    public function setShiftId(?string $v): void { $this->shiftId = $v; }
    public function isLate(): bool { return $this->isLate; }
    public function setIsLate(bool $v): void { $this->isLate = $v; }
    public function getLateMinutes(): int { return $this->lateMinutes; }
    public function setLateMinutes(int $v): void { $this->lateMinutes = $v; }
    public function getOvertimeHours(): string { return $this->overtimeHours; }
    public function setOvertimeHours(string $v): void { $this->overtimeHours = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getRecordedBy(): ?string { return $this->recordedBy; }
    public function setRecordedBy(?string $v): void { $this->recordedBy = $v; }

    /** Calculate hours worked from clock in/out */
    public function calculateHours(): void
    {
        if ($this->clockIn && $this->clockOut) {
            $diff = $this->clockOut->getTimestamp() - $this->clockIn->getTimestamp();
            $this->hoursWorked = number_format(max(0, $diff) / 3600, 2, '.', '');
        }
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'employee_id' => $this->employeeId,
            'property_id' => $this->propertyId,
            'attendance_date' => $this->attendanceDate->format('Y-m-d'),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'clock_in' => $this->clockIn?->format('Y-m-d H:i:s'),
            'clock_out' => $this->clockOut?->format('Y-m-d H:i:s'),
            'hours_worked' => $this->hoursWorked,
            'shift_id' => $this->shiftId,
            'is_late' => $this->isLate,
            'late_minutes' => $this->lateMinutes,
            'overtime_hours' => $this->overtimeHours,
            'notes' => $this->notes,
            'recorded_by' => $this->recordedBy,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
