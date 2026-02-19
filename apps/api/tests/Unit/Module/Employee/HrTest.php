<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Employee;

use Lodgik\Entity\Department;
use Lodgik\Entity\Employee;
use Lodgik\Entity\Shift;
use Lodgik\Entity\ShiftAssignment;
use Lodgik\Entity\AttendanceRecord;
use Lodgik\Entity\LeaveType;
use Lodgik\Entity\LeaveBalance;
use Lodgik\Entity\LeaveRequest;
use Lodgik\Enum\EmploymentStatus;
use Lodgik\Enum\AttendanceStatus;
use Lodgik\Enum\LeaveRequestStatus;
use PHPUnit\Framework\TestCase;

final class HrTest extends TestCase
{
    // ─── Department ─────────────────────────────────────────────

    public function testDepartmentCreation(): void
    {
        $dept = new Department('Front Desk', 't1', 'p1');
        $this->assertEquals('Front Desk', $dept->getName());
        $this->assertTrue($dept->isActive());
        $this->assertEquals('p1', $dept->getPropertyId());
    }

    public function testDepartmentToArray(): void
    {
        $dept = new Department('Housekeeping', 't1');
        $dept->setDescription('Cleaning and maintenance');
        $dept->onPrePersist();
        $arr = $dept->toArray();
        $this->assertEquals('Housekeeping', $arr['name']);
        $this->assertEquals('Cleaning and maintenance', $arr['description']);
        $this->assertNotEmpty($arr['id']);
    }

    // ─── Employee ───────────────────────────────────────────────

    public function testEmployeeCreation(): void
    {
        $emp = new Employee('p1', 'Adebayo', 'Ogunlesi', 'EMP-0001', 'Front Desk Agent', new \DateTimeImmutable('2024-01-15'), 't1');
        $this->assertEquals('Adebayo Ogunlesi', $emp->getFullName());
        $this->assertEquals('EMP-0001', $emp->getStaffId());
        $this->assertEquals(EmploymentStatus::ACTIVE, $emp->getEmploymentStatus());
        $this->assertEquals('0', $emp->getGrossSalary());
    }

    public function testEmployeeSalaryAndBank(): void
    {
        $emp = new Employee('p1', 'Chioma', 'Eze', 'EMP-0002', 'Manager', new \DateTimeImmutable(), 't1');
        $emp->setGrossSalary('35000000'); // 350,000 NGN in kobo
        $emp->setBankName('GTBank');
        $emp->setBankAccountNumber('0123456789');
        $emp->setBankAccountName('Chioma Eze');
        $this->assertEquals('35000000', $emp->getGrossSalary());
        $this->assertEquals('GTBank', $emp->getBankName());
    }

    public function testEmployeeTaxIds(): void
    {
        $emp = new Employee('p1', 'Test', 'User', 'EMP-0003', 'Cook', new \DateTimeImmutable(), 't1');
        $emp->setNin('12345678901');
        $emp->setTaxId('TIN-1234567');
        $emp->setPensionPin('PEN-1234');
        $emp->setNhfId('NHF-5678');
        $this->assertEquals('12345678901', $emp->getNin());
        $this->assertEquals('TIN-1234567', $emp->getTaxId());
    }

    public function testEmployeeTermination(): void
    {
        $emp = new Employee('p1', 'Test', 'User', 'EMP-0004', 'Porter', new \DateTimeImmutable('2024-06-01'), 't1');
        $emp->setEmploymentStatus(EmploymentStatus::TERMINATED);
        $emp->setTerminationDate(new \DateTimeImmutable('2025-01-15'));
        $this->assertEquals(EmploymentStatus::TERMINATED, $emp->getEmploymentStatus());
        $this->assertFalse($emp->getEmploymentStatus()->isEmployed());
    }

    public function testEmployeeToArray(): void
    {
        $emp = new Employee('p1', 'Ngozi', 'Adeyemi', 'EMP-0005', 'Receptionist', new \DateTimeImmutable('2024-03-01'), 't1');
        $emp->onPrePersist();
        $arr = $emp->toArray();
        $this->assertArrayHasKey('staff_id', $arr);
        $this->assertArrayHasKey('employment_status', $arr);
        $this->assertEquals('active', $arr['employment_status']);
        $this->assertEquals('Active', $arr['employment_status_label']);
        $this->assertEquals('#22c55e', $arr['employment_status_color']);
        $this->assertNotEmpty($arr['id']);
    }

    // ─── EmploymentStatus Enum ──────────────────────────────────

    public function testEmploymentStatusEnum(): void
    {
        $this->assertCount(5, EmploymentStatus::values());
        $this->assertTrue(EmploymentStatus::ACTIVE->isEmployed());
        $this->assertTrue(EmploymentStatus::PROBATION->isEmployed());
        $this->assertFalse(EmploymentStatus::SUSPENDED->isEmployed());
        $this->assertFalse(EmploymentStatus::TERMINATED->isEmployed());
        $this->assertFalse(EmploymentStatus::RESIGNED->isEmployed());
    }

    // ─── Shift ──────────────────────────────────────────────────

    public function testShiftCreation(): void
    {
        $shift = new Shift('Morning', '06:00', '14:00', 't1');
        $this->assertEquals('Morning', $shift->getName());
        $this->assertEquals('06:00', $shift->getStartTime());
        $this->assertEquals('14:00', $shift->getEndTime());
        $this->assertEquals(15, $shift->getGraceMinutes());
    }

    public function testShiftToArray(): void
    {
        $shift = new Shift('Night', '22:00', '06:00', 't1');
        $shift->setGraceMinutes(10);
        $shift->onPrePersist();
        $arr = $shift->toArray();
        $this->assertEquals('Night', $arr['name']);
        $this->assertEquals(10, $arr['grace_minutes']);
    }

    // ─── ShiftAssignment ────────────────────────────────────────

    public function testShiftAssignment(): void
    {
        $sa = new ShiftAssignment('emp-1', 'shift-1', new \DateTimeImmutable('2026-02-20'), 't1');
        $this->assertEquals('emp-1', $sa->getEmployeeId());
        $this->assertEquals('shift-1', $sa->getShiftId());
        $this->assertEquals('2026-02-20', $sa->getShiftDate()->format('Y-m-d'));
    }

    // ─── AttendanceRecord ───────────────────────────────────────

    public function testAttendanceRecord(): void
    {
        $att = new AttendanceRecord('emp-1', 'p1', new \DateTimeImmutable('2026-02-19'), 't1');
        $this->assertEquals(AttendanceStatus::ABSENT, $att->getStatus());
        $this->assertNull($att->getClockIn());
    }

    public function testClockInOut(): void
    {
        $att = new AttendanceRecord('emp-1', 'p1', new \DateTimeImmutable('2026-02-19'), 't1');
        $att->setClockIn(new \DateTimeImmutable('2026-02-19 08:00:00'));
        $att->setClockOut(new \DateTimeImmutable('2026-02-19 17:00:00'));
        $att->calculateHours();
        $this->assertEquals('9.00', $att->getHoursWorked());
    }

    public function testLateDetection(): void
    {
        $att = new AttendanceRecord('emp-1', 'p1', new \DateTimeImmutable('2026-02-19'), 't1');
        $att->setIsLate(true);
        $att->setLateMinutes(25);
        $att->setStatus(AttendanceStatus::LATE);
        $this->assertTrue($att->isLate());
        $this->assertEquals(25, $att->getLateMinutes());
        $this->assertEquals('Late', $att->getStatus()->label());
    }

    public function testOvertimeCalculation(): void
    {
        $att = new AttendanceRecord('emp-1', 'p1', new \DateTimeImmutable('2026-02-19'), 't1');
        $att->setClockIn(new \DateTimeImmutable('2026-02-19 07:00:00'));
        $att->setClockOut(new \DateTimeImmutable('2026-02-19 19:00:00'));
        $att->calculateHours();
        $this->assertEquals('12.00', $att->getHoursWorked());
        $att->setOvertimeHours(number_format(12.0 - 8.0, 2, '.', ''));
        $this->assertEquals('4.00', $att->getOvertimeHours());
    }

    public function testAttendanceToArray(): void
    {
        $att = new AttendanceRecord('emp-1', 'p1', new \DateTimeImmutable('2026-02-19'), 't1');
        $att->setStatus(AttendanceStatus::PRESENT);
        $att->onPrePersist();
        $arr = $att->toArray();
        $this->assertEquals('present', $arr['status']);
        $this->assertEquals('Present', $arr['status_label']);
        $this->assertEquals('#22c55e', $arr['status_color']);
    }

    // ─── AttendanceStatus Enum ──────────────────────────────────

    public function testAttendanceStatusEnum(): void
    {
        $this->assertCount(5, AttendanceStatus::values());
        $this->assertEquals('Present', AttendanceStatus::PRESENT->label());
        $this->assertEquals('#ef4444', AttendanceStatus::ABSENT->color());
    }

    // ─── LeaveType ──────────────────────────────────────────────

    public function testLeaveType(): void
    {
        $lt = new LeaveType('annual', 'Annual Leave', 21, 't1');
        $this->assertEquals('annual', $lt->getTypeKey());
        $this->assertEquals(21, $lt->getDefaultDays());
        $this->assertTrue($lt->isPaid());
        $this->assertTrue($lt->requiresApproval());
    }

    // ─── LeaveBalance ───────────────────────────────────────────

    public function testLeaveBalance(): void
    {
        $bal = new LeaveBalance('emp-1', 'lt-1', 2026, '21.0', 't1');
        $this->assertEquals('21.0', $bal->getEntitledDays());
        $this->assertEquals('0.0', $bal->getUsedDays());
        $this->assertEquals('21.0', $bal->getRemainingDays());
    }

    public function testLeaveDeduction(): void
    {
        $bal = new LeaveBalance('emp-1', 'lt-1', 2026, '21.0', 't1');
        $bal->deduct(5);
        $this->assertEquals('5.0', $bal->getUsedDays());
        $this->assertEquals('16.0', $bal->getRemainingDays());
    }

    public function testLeaveRestore(): void
    {
        $bal = new LeaveBalance('emp-1', 'lt-1', 2026, '21.0', 't1');
        $bal->deduct(5);
        $bal->restore(3);
        $this->assertEquals('2.0', $bal->getUsedDays());
        $this->assertEquals('19.0', $bal->getRemainingDays());
    }

    public function testLeaveCarryOver(): void
    {
        $bal = new LeaveBalance('emp-1', 'lt-1', 2026, '21.0', 't1');
        $bal->setCarriedOver('3.0');
        $this->assertEquals('24.0', $bal->getRemainingDays()); // 21 + 3 - 0
    }

    // ─── LeaveRequest ───────────────────────────────────────────

    public function testLeaveRequest(): void
    {
        $req = new LeaveRequest('emp-1', 'lt-1', new \DateTimeImmutable('2026-03-01'), new \DateTimeImmutable('2026-03-05'), '5.0', 't1');
        $this->assertEquals(LeaveRequestStatus::PENDING, $req->getStatus());
        $this->assertEquals('5.0', $req->getDaysRequested());
    }

    public function testLeaveApproval(): void
    {
        $req = new LeaveRequest('emp-1', 'lt-1', new \DateTimeImmutable('2026-03-01'), new \DateTimeImmutable('2026-03-05'), '5.0', 't1');
        $req->setStatus(LeaveRequestStatus::APPROVED);
        $req->setReviewedBy('mgr-1');
        $req->setReviewedAt(new \DateTimeImmutable());
        $this->assertEquals(LeaveRequestStatus::APPROVED, $req->getStatus());
        $this->assertNotNull($req->getReviewedAt());
    }

    public function testLeaveRejection(): void
    {
        $req = new LeaveRequest('emp-1', 'lt-1', new \DateTimeImmutable('2026-03-01'), new \DateTimeImmutable('2026-03-05'), '5.0', 't1');
        $req->setStatus(LeaveRequestStatus::REJECTED);
        $req->setReviewNotes('Insufficient staffing');
        $this->assertEquals(LeaveRequestStatus::REJECTED, $req->getStatus());
        $this->assertEquals('Insufficient staffing', $req->getReviewNotes());
    }

    public function testLeaveRequestToArray(): void
    {
        $req = new LeaveRequest('emp-1', 'lt-1', new \DateTimeImmutable('2026-03-01'), new \DateTimeImmutable('2026-03-05'), '5.0', 't1');
        $req->onPrePersist();
        $arr = $req->toArray();
        $this->assertEquals('pending', $arr['status']);
        $this->assertEquals('Pending', $arr['status_label']);
        $this->assertEquals('#f59e0b', $arr['status_color']);
    }

    // ─── LeaveRequestStatus Enum ────────────────────────────────

    public function testLeaveRequestStatusEnum(): void
    {
        $this->assertCount(4, LeaveRequestStatus::values());
        $this->assertEquals('Approved', LeaveRequestStatus::APPROVED->label());
        $this->assertEquals('#22c55e', LeaveRequestStatus::APPROVED->color());
    }
}
