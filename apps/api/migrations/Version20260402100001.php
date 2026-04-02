<?php declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260402100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Open-market purchases: make vendor_id nullable, add open_market columns and second-approval columns to purchase_orders';
    }

    public function up(Schema $schema): void
    {
        // Make vendor_id nullable — open-market POs have no registered vendor
        $this->addSql("ALTER TABLE purchase_orders ALTER COLUMN vendor_id DROP NOT NULL");

        // Open-market flag and supporting fields
        $this->addSql("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS is_open_market BOOLEAN NOT NULL DEFAULT FALSE");
        $this->addSql("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS open_market_vendor_name VARCHAR(150)");
        $this->addSql("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS open_market_reason TEXT");

        // Dual-approval for fraud prevention
        $this->addSql("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS second_approval_required BOOLEAN NOT NULL DEFAULT FALSE");
        $this->addSql("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS second_approved_by VARCHAR(36)");
        $this->addSql("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS second_approved_by_name VARCHAR(100)");
        $this->addSql("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS second_approved_at TIMESTAMP");

        // Index for pending second-approval queue
        $this->addSql("CREATE INDEX IF NOT EXISTS pur_ord_second_approval ON purchase_orders (tenant_id, second_approval_required, second_approved_at)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DROP INDEX IF EXISTS pur_ord_second_approval");
        $this->addSql("ALTER TABLE purchase_orders DROP COLUMN IF EXISTS second_approved_at");
        $this->addSql("ALTER TABLE purchase_orders DROP COLUMN IF EXISTS second_approved_by_name");
        $this->addSql("ALTER TABLE purchase_orders DROP COLUMN IF EXISTS second_approved_by");
        $this->addSql("ALTER TABLE purchase_orders DROP COLUMN IF EXISTS second_approval_required");
        $this->addSql("ALTER TABLE purchase_orders DROP COLUMN IF EXISTS open_market_reason");
        $this->addSql("ALTER TABLE purchase_orders DROP COLUMN IF EXISTS open_market_vendor_name");
        $this->addSql("ALTER TABLE purchase_orders DROP COLUMN IF EXISTS is_open_market");
        $this->addSql("ALTER TABLE purchase_orders ALTER COLUMN vendor_id SET NOT NULL");
    }
}
