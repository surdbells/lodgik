<?php declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260403100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add Paystack transfer tracking columns to payroll_items';
    }

    public function up(Schema $schema): void
    {
        // Nigerian bank code (CBN code, e.g. "058" for GTBank)
        $this->addSql("ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10)");

        // Paystack transfer recipient code — created once per employee bank account
        $this->addSql("ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS transfer_recipient_code VARCHAR(50)");

        // Paystack transfer reference returned after initiating a transfer
        $this->addSql("ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS transfer_reference VARCHAR(100)");

        // pending | success | failed | reversed
        $this->addSql("ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS transfer_status VARCHAR(20)");

        $this->addSql("ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS transfer_initiated_at TIMESTAMP");
        $this->addSql("ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS transfer_completed_at TIMESTAMP");
        $this->addSql("ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS transfer_failure_reason TEXT");

        $this->addSql("CREATE INDEX IF NOT EXISTS pay_item_transfer ON payroll_items (transfer_status, transfer_initiated_at)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DROP INDEX IF EXISTS pay_item_transfer");
        $this->addSql("ALTER TABLE payroll_items DROP COLUMN IF EXISTS transfer_failure_reason");
        $this->addSql("ALTER TABLE payroll_items DROP COLUMN IF EXISTS transfer_completed_at");
        $this->addSql("ALTER TABLE payroll_items DROP COLUMN IF EXISTS transfer_initiated_at");
        $this->addSql("ALTER TABLE payroll_items DROP COLUMN IF EXISTS transfer_status");
        $this->addSql("ALTER TABLE payroll_items DROP COLUMN IF EXISTS transfer_reference");
        $this->addSql("ALTER TABLE payroll_items DROP COLUMN IF EXISTS transfer_recipient_code");
        $this->addSql("ALTER TABLE payroll_items DROP COLUMN IF EXISTS bank_code");
    }
}
