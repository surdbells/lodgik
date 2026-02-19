<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260219300002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 3C: Payroll & Nigeria PAYE — tax_brackets, payroll_periods, payroll_items';
    }

    public function up(Schema $schema): void
    {
        // ─── Tax Brackets (Nigeria PAYE) ────────────────────────

        $this->addSql('CREATE TABLE tax_brackets (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            lower_bound BIGINT NOT NULL,
            upper_bound BIGINT DEFAULT 0 NOT NULL,
            rate DECIMAL(5,2) NOT NULL,
            sort_order INT DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_tb_tenant ON tax_brackets (tenant_id)');

        // ─── Payroll Periods ────────────────────────────────────

        $this->addSql('CREATE TABLE payroll_periods (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            year INT NOT NULL,
            month INT NOT NULL,
            status VARCHAR(20) DEFAULT \'draft\' NOT NULL,
            total_gross BIGINT DEFAULT 0 NOT NULL,
            total_net BIGINT DEFAULT 0 NOT NULL,
            total_tax BIGINT DEFAULT 0 NOT NULL,
            total_pension BIGINT DEFAULT 0 NOT NULL,
            total_nhf BIGINT DEFAULT 0 NOT NULL,
            employee_count INT DEFAULT 0 NOT NULL,
            calculated_at TIMESTAMP DEFAULT NULL,
            approved_by VARCHAR(36) DEFAULT NULL,
            approved_at TIMESTAMP DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_payroll_period UNIQUE (tenant_id, property_id, year, month)
        )');
        $this->addSql('CREATE INDEX idx_pp_tenant ON payroll_periods (tenant_id)');

        // ─── Payroll Items (per-employee payslip) ───────────────

        $this->addSql('CREATE TABLE payroll_items (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            payroll_period_id VARCHAR(36) NOT NULL,
            employee_id VARCHAR(36) NOT NULL,
            basic_salary BIGINT DEFAULT 0 NOT NULL,
            housing_allowance BIGINT DEFAULT 0 NOT NULL,
            transport_allowance BIGINT DEFAULT 0 NOT NULL,
            other_allowances BIGINT DEFAULT 0 NOT NULL,
            overtime_pay BIGINT DEFAULT 0 NOT NULL,
            gross_pay BIGINT DEFAULT 0 NOT NULL,
            cra BIGINT DEFAULT 0 NOT NULL,
            pension_employee BIGINT DEFAULT 0 NOT NULL,
            nhf BIGINT DEFAULT 0 NOT NULL,
            taxable_income BIGINT DEFAULT 0 NOT NULL,
            paye_tax BIGINT DEFAULT 0 NOT NULL,
            other_deductions BIGINT DEFAULT 0 NOT NULL,
            total_deductions BIGINT DEFAULT 0 NOT NULL,
            net_pay BIGINT DEFAULT 0 NOT NULL,
            employee_name VARCHAR(200) NOT NULL,
            employee_staff_id VARCHAR(30) NOT NULL,
            bank_name VARCHAR(100) DEFAULT NULL,
            bank_account_number VARCHAR(20) DEFAULT NULL,
            bank_account_name VARCHAR(150) DEFAULT NULL,
            payslip_emailed_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_payroll_item UNIQUE (payroll_period_id, employee_id)
        )');
        $this->addSql('CREATE INDEX idx_pi_period ON payroll_items (payroll_period_id)');
        $this->addSql('CREATE INDEX idx_pi_employee ON payroll_items (tenant_id, employee_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS payroll_items');
        $this->addSql('DROP TABLE IF EXISTS payroll_periods');
        $this->addSql('DROP TABLE IF EXISTS tax_brackets');
    }
}
