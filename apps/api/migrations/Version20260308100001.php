<?php
declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 1 — Guest Card Security-First Issuance
 *
 * Changes:
 *  1. Add `plate_number` (nullable) to guest_cards
 *  2. Add `issued_by_security` (bool) to guest_cards  — true when card issued at gate
 *  3. Add `security_issued_at` (nullable timestamp) to guest_cards
 *  4. Add `card_enforcement_enabled` to property.settings (no schema change needed —
 *     settings is already JSONB; the migration documents the key convention only)
 *
 * Status flow addition:
 *  AVAILABLE → PENDING_CHECKIN (issued by security, not yet attached to a booking)
 *  PENDING_CHECKIN → ACTIVE     (attached to booking at reception check-in)
 *
 * No new table required — all changes are additive columns on guest_cards.
 */
final class Version20260308100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Guest card: add plate_number, issued_by_security, security_issued_at columns; add pending_checkin status value';
    }

    public function up(Schema $schema): void
    {
        // 1. Add plate number (vehicle plate captured at gate)
        $this->addSql("ALTER TABLE guest_cards ADD COLUMN IF NOT EXISTS plate_number VARCHAR(20) DEFAULT NULL");

        // 2. Flag: was this card issued at the security gate (not reception)?
        $this->addSql("ALTER TABLE guest_cards ADD COLUMN IF NOT EXISTS issued_by_security BOOLEAN NOT NULL DEFAULT FALSE");

        // 3. Timestamp of security issuance
        $this->addSql("ALTER TABLE guest_cards ADD COLUMN IF NOT EXISTS security_issued_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL");

        // 4. Extend the status CHECK constraint to include 'pending_checkin'
        //    Doctrine maps this enum to a VARCHAR(20); no native ENUM in PG used.
        //    The existing CHECK constraint needs to be dropped and re-added.
        $this->addSql("ALTER TABLE guest_cards DROP CONSTRAINT IF EXISTS guest_cards_status_check");
        $this->addSql("
            ALTER TABLE guest_cards
            ADD CONSTRAINT guest_cards_status_check
            CHECK (status IN ('available','issued','pending_checkin','active','deactivated','lost','replaced'))
        ");

        // 5. Index: security quickly lists all pending_checkin cards per property
        $this->addSql("
            CREATE INDEX IF NOT EXISTS idx_guest_cards_pending
            ON guest_cards (tenant_id, property_id, status)
            WHERE status = 'pending_checkin'
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE guest_cards DROP COLUMN IF EXISTS plate_number");
        $this->addSql("ALTER TABLE guest_cards DROP COLUMN IF EXISTS issued_by_security");
        $this->addSql("ALTER TABLE guest_cards DROP COLUMN IF EXISTS security_issued_at");
        $this->addSql("DROP INDEX IF EXISTS idx_guest_cards_pending");

        $this->addSql("ALTER TABLE guest_cards DROP CONSTRAINT IF EXISTS guest_cards_status_check");
        $this->addSql("
            ALTER TABLE guest_cards
            ADD CONSTRAINT guest_cards_status_check
            CHECK (status IN ('available','issued','active','deactivated','lost','replaced'))
        ");
    }
}
