<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260219300001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 3A+3B: Employee Management, Attendance & Shifts, Leave Management';
    }

    public function up(Schema $schema): void
    {
        // ─── Departments ────────────────────────────────────────

        $this->addSql('CREATE TABLE departments (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT DEFAULT NULL,
            head_employee_id VARCHAR(36) DEFAULT NULL,
            property_id VARCHAR(36) DEFAULT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_dept_tenant_name UNIQUE (tenant_id, name)
        )');
        $this->addSql('CREATE INDEX idx_dept_tenant ON departments (tenant_id)');

        // ─── Employees ──────────────────────────────────────────

        $this->addSql('CREATE TABLE employees (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) DEFAULT NULL,
            property_id VARCHAR(36) NOT NULL,
            department_id VARCHAR(36) DEFAULT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(320) DEFAULT NULL,
            phone VARCHAR(30) DEFAULT NULL,
            staff_id VARCHAR(30) NOT NULL,
            job_title VARCHAR(100) NOT NULL,
            employment_status VARCHAR(20) DEFAULT \'active\' NOT NULL,
            hire_date DATE NOT NULL,
            termination_date DATE DEFAULT NULL,
            gross_salary BIGINT DEFAULT 0 NOT NULL,
            bank_name VARCHAR(100) DEFAULT NULL,
            bank_account_number VARCHAR(20) DEFAULT NULL,
            bank_account_name VARCHAR(150) DEFAULT NULL,
            date_of_birth DATE DEFAULT NULL,
            gender VARCHAR(10) DEFAULT NULL,
            address TEXT DEFAULT NULL,
            emergency_contact_name VARCHAR(150) DEFAULT NULL,
            emergency_contact_phone VARCHAR(30) DEFAULT NULL,
            nin VARCHAR(20) DEFAULT NULL,
            tax_id VARCHAR(30) DEFAULT NULL,
            pension_pin VARCHAR(30) DEFAULT NULL,
            nhf_id VARCHAR(30) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            deleted_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_emp_tenant_staff_id UNIQUE (tenant_id, staff_id)
        )');
        $this->addSql('CREATE INDEX idx_emp_tenant ON employees (tenant_id)');
        $this->addSql('CREATE INDEX idx_emp_dept ON employees (tenant_id, department_id)');
        $this->addSql('CREATE INDEX idx_emp_property ON employees (tenant_id, property_id)');
        $this->addSql('CREATE INDEX idx_emp_user ON employees (user_id)');

        // ─── Shifts ─────────────────────────────────────────────

        $this->addSql('CREATE TABLE shifts (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            name VARCHAR(50) NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            grace_minutes INT DEFAULT 15 NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_shift_tenant_name UNIQUE (tenant_id, name)
        )');
        $this->addSql('CREATE INDEX idx_shift_tenant ON shifts (tenant_id)');

        // ─── Shift Assignments ──────────────────────────────────

        $this->addSql('CREATE TABLE shift_assignments (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            employee_id VARCHAR(36) NOT NULL,
            shift_id VARCHAR(36) NOT NULL,
            shift_date DATE NOT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_shift_assign UNIQUE (tenant_id, employee_id, shift_date)
        )');
        $this->addSql('CREATE INDEX idx_sa_date ON shift_assignments (tenant_id, shift_date)');
        $this->addSql('CREATE INDEX idx_sa_employee ON shift_assignments (tenant_id, employee_id)');

        // ─── Attendance Records ─────────────────────────────────

        $this->addSql('CREATE TABLE attendance_records (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            employee_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            attendance_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT \'absent\' NOT NULL,
            clock_in TIMESTAMP DEFAULT NULL,
            clock_out TIMESTAMP DEFAULT NULL,
            hours_worked DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
            shift_id VARCHAR(36) DEFAULT NULL,
            is_late BOOLEAN DEFAULT false NOT NULL,
            late_minutes INT DEFAULT 0 NOT NULL,
            overtime_hours DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
            notes TEXT DEFAULT NULL,
            recorded_by VARCHAR(36) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_attendance_emp_date UNIQUE (tenant_id, employee_id, attendance_date)
        )');
        $this->addSql('CREATE INDEX idx_att_date ON attendance_records (tenant_id, attendance_date)');
        $this->addSql('CREATE INDEX idx_att_employee ON attendance_records (tenant_id, employee_id)');

        // ─── Leave Types ────────────────────────────────────────

        $this->addSql('CREATE TABLE leave_types (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            type_key VARCHAR(30) NOT NULL,
            name VARCHAR(50) NOT NULL,
            default_days INT NOT NULL,
            is_paid BOOLEAN DEFAULT true NOT NULL,
            requires_approval BOOLEAN DEFAULT true NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            color VARCHAR(7) DEFAULT \'#3b82f6\' NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_leave_type_tenant_key UNIQUE (tenant_id, type_key)
        )');
        $this->addSql('CREATE INDEX idx_lt_tenant ON leave_types (tenant_id)');

        // ─── Leave Balances ─────────────────────────────────────

        $this->addSql('CREATE TABLE leave_balances (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            employee_id VARCHAR(36) NOT NULL,
            leave_type_id VARCHAR(36) NOT NULL,
            year INT NOT NULL,
            entitled_days DECIMAL(5,1) NOT NULL,
            used_days DECIMAL(5,1) DEFAULT 0.0 NOT NULL,
            carried_over DECIMAL(5,1) DEFAULT 0.0 NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_leave_bal UNIQUE (tenant_id, employee_id, leave_type_id, year)
        )');
        $this->addSql('CREATE INDEX idx_lb_employee ON leave_balances (tenant_id, employee_id)');

        // ─── Leave Requests ─────────────────────────────────────

        $this->addSql('CREATE TABLE leave_requests (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            employee_id VARCHAR(36) NOT NULL,
            leave_type_id VARCHAR(36) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days_requested DECIMAL(5,1) NOT NULL,
            reason TEXT DEFAULT NULL,
            status VARCHAR(20) DEFAULT \'pending\' NOT NULL,
            reviewed_by VARCHAR(36) DEFAULT NULL,
            reviewed_at TIMESTAMP DEFAULT NULL,
            review_notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_lr_employee ON leave_requests (tenant_id, employee_id)');
        $this->addSql('CREATE INDEX idx_lr_status ON leave_requests (tenant_id, status)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS leave_requests');
        $this->addSql('DROP TABLE IF EXISTS leave_balances');
        $this->addSql('DROP TABLE IF EXISTS leave_types');
        $this->addSql('DROP TABLE IF EXISTS attendance_records');
        $this->addSql('DROP TABLE IF EXISTS shift_assignments');
        $this->addSql('DROP TABLE IF EXISTS shifts');
        $this->addSql('DROP TABLE IF EXISTS employees');
        $this->addSql('DROP TABLE IF EXISTS departments');
    }
}
