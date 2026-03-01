<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase R1 — Automation infrastructure
 *
 * 1. Adds front_desk_cleared + security_cleared columns to bookings
 *    (with cleared_by / cleared_at audit timestamps).
 * 2. Creates auto_checkout_log table for the fraud-prevention audit trail.
 */
final class Version20260302000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'R1: booking clearance flags + auto_checkout_log table';
    }

    public function up(Schema $schema): void
    {
        // ── 1. Booking clearance columns ────────────────────────────────────
        $this->addSql('ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS front_desk_cleared     BOOLEAN      NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS security_cleared       BOOLEAN      NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS front_desk_cleared_by  VARCHAR(36)           DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS security_cleared_by    VARCHAR(36)           DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS front_desk_cleared_at  TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS security_cleared_at    TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
        ');

        // Partial index — only rows where both flags are true (fraud detection query)
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_bookings_both_cleared
            ON bookings (tenant_id, property_id)
            WHERE front_desk_cleared = TRUE AND security_cleared = TRUE');

        // ── 2. auto_checkout_log ─────────────────────────────────────────────
        $this->addSql('CREATE TABLE IF NOT EXISTS auto_checkout_log (
            id                      VARCHAR(36)  NOT NULL,
            tenant_id               VARCHAR(36)  NOT NULL,
            booking_id              VARCHAR(36)  NOT NULL,
            property_id             VARCHAR(36)  NOT NULL,
            guest_id                VARCHAR(36)           DEFAULT NULL,
            guest_name              VARCHAR(200)          DEFAULT NULL,
            room_number             VARCHAR(20)           DEFAULT NULL,
            booking_ref             VARCHAR(20)           DEFAULT NULL,
            reason                  VARCHAR(30)  NOT NULL,
            original_checkout_date  DATE                  DEFAULT NULL,
            auto_checked_out_at     TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            hours_overdue           INTEGER      NOT NULL DEFAULT 0,
            metadata                JSON                  DEFAULT NULL,
            created_at              TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at              TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )');

        $this->addSql('CREATE INDEX IF NOT EXISTS idx_acl_tenant_property
            ON auto_checkout_log (tenant_id, property_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_acl_booking
            ON auto_checkout_log (booking_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS auto_checkout_log');

        $this->addSql('DROP INDEX IF EXISTS idx_bookings_both_cleared');
        $this->addSql('ALTER TABLE bookings
            DROP COLUMN IF EXISTS front_desk_cleared,
            DROP COLUMN IF EXISTS security_cleared,
            DROP COLUMN IF EXISTS front_desk_cleared_by,
            DROP COLUMN IF EXISTS security_cleared_by,
            DROP COLUMN IF EXISTS front_desk_cleared_at,
            DROP COLUMN IF EXISTS security_cleared_at
        ');
    }
}
