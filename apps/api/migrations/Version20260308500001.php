<?php
declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 5 — Walk-in / Market Purchases
 *
 * Extends the expenses table with:
 *   - vendor_type: registered (existing vendor) | market | petty_cash
 *   - market_vendor_name: free-text vendor for walk-in/market purchases
 *   - signed_note_url: URL of uploaded signed note (substitute for receipt)
 *   - second_approver_id / name / at: dual-approval trail
 *   - second_approval_required: flag set from property settings at submission time
 *   - spending_limit_breach: true if amount exceeded limit at submission
 */
final class Version20260308500001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 5: Walk-in/Market Purchases — extend expenses table with vendor_type, dual-approval, signed note, limit flag';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            ALTER TABLE expenses
                ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(15) NOT NULL DEFAULT 'registered'
                    CHECK (vendor_type IN ('registered','market','petty_cash')),
                ADD COLUMN IF NOT EXISTS market_vendor_name VARCHAR(200) NULL,
                ADD COLUMN IF NOT EXISTS signed_note_url VARCHAR(500) NULL,
                ADD COLUMN IF NOT EXISTS second_approver_id VARCHAR(36) NULL,
                ADD COLUMN IF NOT EXISTS second_approver_name VARCHAR(150) NULL,
                ADD COLUMN IF NOT EXISTS second_approved_at TIMESTAMP NULL,
                ADD COLUMN IF NOT EXISTS second_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS spending_limit_breach BOOLEAN NOT NULL DEFAULT FALSE
        ");

        $this->addSql('CREATE INDEX IF NOT EXISTS idx_expenses_vendor_type ON expenses (tenant_id, property_id, vendor_type)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_expenses_dual_pending ON expenses (property_id, status, second_approval_required) WHERE second_approval_required = TRUE AND status = \'approved\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_expenses_dual_pending');
        $this->addSql('DROP INDEX IF EXISTS idx_expenses_vendor_type');
        $this->addSql("
            ALTER TABLE expenses
                DROP COLUMN IF EXISTS vendor_type,
                DROP COLUMN IF EXISTS market_vendor_name,
                DROP COLUMN IF EXISTS signed_note_url,
                DROP COLUMN IF EXISTS second_approver_id,
                DROP COLUMN IF EXISTS second_approver_name,
                DROP COLUMN IF EXISTS second_approved_at,
                DROP COLUMN IF EXISTS second_approval_required,
                DROP COLUMN IF EXISTS spending_limit_breach
        ");
    }
}
