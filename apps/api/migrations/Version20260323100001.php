<?php declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260323100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase A — Employee contract type, contract dates, notice period, auto-link to users';
    }

    public function up(Schema $schema): void
    {
        // ── New columns on employees ──────────────────────────────────────
        $this->addSql("ALTER TABLE employees
            ADD COLUMN IF NOT EXISTS employment_type    VARCHAR(20)  DEFAULT 'permanent',
            ADD COLUMN IF NOT EXISTS contract_start     DATE         DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS contract_end       DATE         DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS notice_period_days SMALLINT     DEFAULT 30,
            ADD COLUMN IF NOT EXISTS reporting_to       VARCHAR(36)  DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS work_location      VARCHAR(100) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS work_schedule      VARCHAR(50)  DEFAULT 'full_time'
        ");

        // ── Check constraint for employment_type ─────────────────────────
        $this->addSql("ALTER TABLE employees
            DROP CONSTRAINT IF EXISTS chk_employees_type");
        $this->addSql("ALTER TABLE employees
            ADD CONSTRAINT chk_employees_type
            CHECK (employment_type IN ('permanent','contract','ad_hoc','intern','volunteer'))");

        // ── Check constraint for work_schedule ───────────────────────────
        $this->addSql("ALTER TABLE employees
            DROP CONSTRAINT IF EXISTS chk_employees_schedule");
        $this->addSql("ALTER TABLE employees
            ADD CONSTRAINT chk_employees_schedule
            CHECK (work_schedule IN ('full_time','part_time','shift','remote','hybrid'))");

        // ── Back-fill existing employees with permanent type ──────────────
        $this->addSql("UPDATE employees SET employment_type = 'permanent' WHERE employment_type IS NULL");

        // ── Index for reporting_to (manager hierarchy) ───────────────────
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_emp_reporting_to
            ON employees (tenant_id, reporting_to)");

        // ── Add employee_id column to users so UI can show HR data ────────
        // (optional lightweight link — employee stores the canonical user_id FK)
        // No column needed on users; query employees WHERE user_id = users.id
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE employees
            DROP COLUMN IF EXISTS employment_type,
            DROP COLUMN IF EXISTS contract_start,
            DROP COLUMN IF EXISTS contract_end,
            DROP COLUMN IF EXISTS notice_period_days,
            DROP COLUMN IF EXISTS reporting_to,
            DROP COLUMN IF EXISTS work_location,
            DROP COLUMN IF EXISTS work_schedule");
        $this->addSql("DROP INDEX IF EXISTS idx_emp_reporting_to");
    }
}
