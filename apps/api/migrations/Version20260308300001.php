<?php
declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 3 — Corporate Folio
 *
 * 1. group_bookings: add corporate columns (folio_type, credit_limit, etc.)
 * 2. folios: add folio_type, group_booking_id, allow_checkout_without_payment
 */
final class Version20260308300001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 3: Corporate Folio — extend group_bookings and folios';
    }

    public function up(Schema $schema): void
    {
        // ── group_bookings extensions ─────────────────────────────────────
        $this->addSql("
            ALTER TABLE group_bookings
                ADD COLUMN IF NOT EXISTS folio_type VARCHAR(15) NOT NULL DEFAULT 'group'
                    CHECK (folio_type IN ('group','corporate')),
                ADD COLUMN IF NOT EXISTS credit_limit_type VARCHAR(10) NOT NULL DEFAULT 'fixed'
                    CHECK (credit_limit_type IN ('fixed','unlimited')),
                ADD COLUMN IF NOT EXISTS credit_limit_kobo BIGINT NULL,
                ADD COLUMN IF NOT EXISTS corporate_contact_email VARCHAR(150) NULL,
                ADD COLUMN IF NOT EXISTS corporate_ref_number VARCHAR(50) NULL
        ");

        // ── folios extensions ─────────────────────────────────────────────
        $this->addSql("
            ALTER TABLE folios
                ADD COLUMN IF NOT EXISTS folio_type VARCHAR(10) NOT NULL DEFAULT 'personal'
                    CHECK (folio_type IN ('personal','corporate')),
                ADD COLUMN IF NOT EXISTS group_booking_id VARCHAR(36) NULL
                    REFERENCES group_bookings(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS allow_checkout_without_payment BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS corporate_credit_used_kobo BIGINT NOT NULL DEFAULT 0
        ");

        // ── indexes ───────────────────────────────────────────────────────
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_folios_group_booking
            ON folios (group_booking_id) WHERE group_booking_id IS NOT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_folios_type
            ON folios (folio_type, tenant_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_group_bookings_folio_type
            ON group_bookings (folio_type, tenant_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_folios_group_booking');
        $this->addSql('DROP INDEX IF EXISTS idx_folios_type');
        $this->addSql('DROP INDEX IF EXISTS idx_group_bookings_folio_type');

        $this->addSql("
            ALTER TABLE folios
                DROP COLUMN IF EXISTS folio_type,
                DROP COLUMN IF EXISTS group_booking_id,
                DROP COLUMN IF EXISTS allow_checkout_without_payment,
                DROP COLUMN IF EXISTS corporate_credit_used_kobo
        ");

        $this->addSql("
            ALTER TABLE group_bookings
                DROP COLUMN IF EXISTS folio_type,
                DROP COLUMN IF EXISTS credit_limit_type,
                DROP COLUMN IF EXISTS credit_limit_kobo,
                DROP COLUMN IF EXISTS corporate_contact_email,
                DROP COLUMN IF EXISTS corporate_ref_number
        ");
    }
}
