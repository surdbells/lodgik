<?php

declare(strict_types=1);

namespace Lodgik\Module\Attendance;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\AttendanceRecord;
use Lodgik\Entity\Shift;
use Lodgik\Entity\ShiftAssignment;
use Lodgik\Enum\AttendanceStatus;
use Lodgik\Repository\AttendanceRecordRepository;
use Lodgik\Repository\ShiftRepository;
use Lodgik\Repository\ShiftAssignmentRepository;
use Psr\Log\LoggerInterface;

final class AttendanceService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AttendanceRecordRepository $attRepo,
        private readonly ShiftRepository $shiftRepo,
        private readonly ShiftAssignmentRepository $assignRepo,
        private readonly LoggerInterface $logger,
    ) {}

    // ─── Shift CRUD ─────────────────────────────────────────────

    /** @return Shift[] */
    public function listShifts(): array { return $this->shiftRepo->findActive(); }

    public function createShift(string $name, string $startTime, string $endTime, string $tenantId, int $graceMinutes = 15): Shift
    {
        $shift = new Shift($name, $startTime, $endTime, $tenantId);
        $shift->setGraceMinutes($graceMinutes);
        $this->em->persist($shift);
        $this->em->flush();
        return $shift;
    }

    public function updateShift(string $id, array $data): Shift
    {
        $shift = $this->shiftRepo->find($id);
        if (!$shift) throw new \RuntimeException('Shift not found');
        if (isset($data['name'])) $shift->setName($data['name']);
        if (isset($data['start_time'])) $shift->setStartTime($data['start_time']);
        if (isset($data['end_time'])) $shift->setEndTime($data['end_time']);
        if (isset($data['grace_minutes'])) $shift->setGraceMinutes((int) $data['grace_minutes']);
        if (isset($data['is_active'])) $shift->setIsActive((bool) $data['is_active']);
        $this->em->flush();
        return $shift;
    }

    // ─── Shift Assignment ───────────────────────────────────────

    public function assignShift(string $employeeId, string $shiftId, string $date, string $tenantId): ShiftAssignment
    {
        $existing = $this->assignRepo->findForEmployeeOnDate($employeeId, $date);
        if ($existing) throw new \RuntimeException('Employee already has a shift on this date');

        $sa = new ShiftAssignment($employeeId, $shiftId, new \DateTimeImmutable($date), $tenantId);
        $this->em->persist($sa);
        $this->em->flush();
        return $sa;
    }

    /** Bulk assign shifts for a week */
    public function bulkAssignShifts(array $assignments, string $tenantId): int
    {
        $count = 0;
        foreach ($assignments as $a) {
            $existing = $this->assignRepo->findForEmployeeOnDate($a['employee_id'], $a['date']);
            if ($existing) continue;
            $sa = new ShiftAssignment($a['employee_id'], $a['shift_id'], new \DateTimeImmutable($a['date']), $tenantId);
            if (isset($a['notes'])) $sa->setNotes($a['notes']);
            $this->em->persist($sa);
            $count++;
        }
        $this->em->flush();
        return $count;
    }

    /** @return ShiftAssignment[] */
    public function getSchedule(string $from, string $to, ?string $employeeId = null): array
    {
        return $this->assignRepo->findByDateRange($from, $to, $employeeId);
    }

    public function removeAssignment(string $id): void
    {
        $sa = $this->assignRepo->find($id);
        if ($sa) { $this->em->remove($sa); $this->em->flush(); }
    }

    // ─── Clock In / Out ─────────────────────────────────────────

    public function clockIn(string $employeeId, string $propertyId, string $tenantId, ?string $recordedBy = null): AttendanceRecord
    {
        $today = new \DateTimeImmutable('today');
        $now = new \DateTimeImmutable();

        $existing = $this->attRepo->findForEmployeeOnDate($employeeId, $today->format('Y-m-d'));
        if ($existing && $existing->getClockIn()) {
            throw new \RuntimeException('Employee already clocked in today');
        }

        $record = $existing ?? new AttendanceRecord($employeeId, $propertyId, $today, $tenantId);
        $record->setClockIn($now);
        $record->setStatus(AttendanceStatus::PRESENT);
        if ($recordedBy) $record->setRecordedBy($recordedBy);

        // Check if late based on assigned shift
        $assignment = $this->assignRepo->findForEmployeeOnDate($employeeId, $today->format('Y-m-d'));
        if ($assignment) {
            $shift = $this->shiftRepo->find($assignment->getShiftId());
            if ($shift) {
                $record->setShiftId($shift->getId());
                $shiftStart = new \DateTimeImmutable($today->format('Y-m-d') . ' ' . $shift->getStartTime());
                $graceEnd = $shiftStart->modify('+' . $shift->getGraceMinutes() . ' minutes');
                if ($now > $graceEnd) {
                    $record->setStatus(AttendanceStatus::LATE);
                    $record->setIsLate(true);
                    $lateMinutes = (int) (($now->getTimestamp() - $shiftStart->getTimestamp()) / 60);
                    $record->setLateMinutes(max(0, $lateMinutes));
                }
            }
        }

        if (!$existing) $this->em->persist($record);
        $this->em->flush();

        $this->logger->info("Clock in: employee=$employeeId, status={$record->getStatus()->value}");
        return $record;
    }

    public function clockOut(string $employeeId): AttendanceRecord
    {
        $today = new \DateTimeImmutable('today');
        $record = $this->attRepo->findForEmployeeOnDate($employeeId, $today->format('Y-m-d'));

        if (!$record || !$record->getClockIn()) {
            throw new \RuntimeException('No clock-in record found for today');
        }
        if ($record->getClockOut()) {
            throw new \RuntimeException('Employee already clocked out today');
        }

        $now = new \DateTimeImmutable();
        $record->setClockOut($now);
        $record->calculateHours();

        // Calculate overtime (anything over 8 hours)
        $hours = (float) $record->getHoursWorked();
        if ($hours > 8.0) {
            $record->setOvertimeHours(number_format($hours - 8.0, 2, '.', ''));
        }

        $this->em->flush();
        $this->logger->info("Clock out: employee=$employeeId, hours={$record->getHoursWorked()}");
        return $record;
    }

    /** Manual attendance entry (e.g., absent, half day) */
    public function recordAttendance(string $employeeId, string $propertyId, string $date, AttendanceStatus $status, string $tenantId, ?string $notes = null, ?string $recordedBy = null): AttendanceRecord
    {
        $existing = $this->attRepo->findForEmployeeOnDate($employeeId, $date);
        $record = $existing ?? new AttendanceRecord($employeeId, $propertyId, new \DateTimeImmutable($date), $tenantId);
        $record->setStatus($status);
        if ($notes) $record->setNotes($notes);
        if ($recordedBy) $record->setRecordedBy($recordedBy);
        if (!$existing) $this->em->persist($record);
        $this->em->flush();
        return $record;
    }

    // ─── Queries ────────────────────────────────────────────────

    /** @return AttendanceRecord[] */
    public function getDailyAttendance(string $date, ?string $propertyId = null): array
    {
        return $this->attRepo->findByDate($date, $propertyId);
    }

    /** @return AttendanceRecord[] */
    public function getEmployeeAttendance(string $employeeId, string $from, string $to): array
    {
        return $this->attRepo->findByEmployeeDateRange($employeeId, $from, $to);
    }

    public function getDailySummary(string $date, ?string $propertyId = null): array
    {
        return $this->attRepo->summarizeByDate($date, $propertyId);
    }
}
