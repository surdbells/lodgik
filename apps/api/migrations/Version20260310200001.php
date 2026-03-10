<?php
declare(strict_types=1);
namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 3 & 4 — Commercial Competitive Gap Closure
 *
 * 1. corporate_profiles — standalone company accounts with negotiated rates
 * 2. event_spaces       — bookable venues / conference rooms
 * 3. event_bookings     — full event / banquet booking with catering line items
 */
final class Version20260310200001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add corporate_profiles, event_spaces, and event_bookings tables';
    }

    public function up(Schema $schema): void
    {
        // ── Corporate Profiles ────────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS corporate_profiles (
                id                       VARCHAR(36)     NOT NULL,
                tenant_id                VARCHAR(36)     NOT NULL,
                property_id              VARCHAR(36)     NOT NULL,
                company_name             VARCHAR(200)    NOT NULL,
                contact_name             VARCHAR(200)    NOT NULL,
                contact_email            VARCHAR(150),
                contact_phone            VARCHAR(50),
                billing_address          TEXT,
                tax_id                   VARCHAR(50),
                credit_limit_type        VARCHAR(10)     NOT NULL DEFAULT 'fixed',
                credit_limit_kobo        BIGINT,
                negotiated_rate_discount DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
                payment_terms            VARCHAR(50),
                is_active                BOOLEAN         NOT NULL DEFAULT TRUE,
                notes                    TEXT,
                created_at               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_corp_tenant_prop   ON corporate_profiles (tenant_id, property_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_corp_tenant_active ON corporate_profiles (tenant_id, is_active)');

        // ── Event Spaces ──────────────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS event_spaces (
                id                  VARCHAR(36)     NOT NULL,
                tenant_id           VARCHAR(36)     NOT NULL,
                property_id         VARCHAR(36)     NOT NULL,
                name                VARCHAR(150)    NOT NULL,
                description         TEXT,
                capacity            INT             NOT NULL DEFAULT 0,
                layouts             JSON,
                amenities           JSON,
                half_day_rate_kobo  BIGINT,
                full_day_rate_kobo  BIGINT,
                hourly_rate_kobo    BIGINT,
                is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
                notes               TEXT,
                created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_espace_prop ON event_spaces (tenant_id, property_id)');

        // ── Event Bookings ────────────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS event_bookings (
                id                    VARCHAR(36)     NOT NULL,
                tenant_id             VARCHAR(36)     NOT NULL,
                property_id           VARCHAR(36)     NOT NULL,
                event_space_id        VARCHAR(36),
                group_booking_id      VARCHAR(36),
                reference             VARCHAR(30)     NOT NULL,
                event_name            VARCHAR(200)    NOT NULL,
                event_type            VARCHAR(30)     NOT NULL,
                event_date            DATE            NOT NULL,
                start_time            VARCHAR(8),
                end_time              VARCHAR(8),
                duration_type         VARCHAR(15)     NOT NULL DEFAULT 'full_day',
                expected_guests       INT             NOT NULL DEFAULT 0,
                layout                VARCHAR(30),
                client_name           VARCHAR(200)    NOT NULL,
                client_email          VARCHAR(150),
                client_phone          VARCHAR(50),
                company_name          VARCHAR(200),
                status                VARCHAR(20)     NOT NULL DEFAULT 'tentative',
                venue_rate_kobo       BIGINT          NOT NULL DEFAULT 0,
                catering_total_kobo   BIGINT          NOT NULL DEFAULT 0,
                extras_total_kobo     BIGINT          NOT NULL DEFAULT 0,
                deposit_paid_kobo     BIGINT          NOT NULL DEFAULT 0,
                catering_items        JSON,
                extra_items           JSON,
                special_requirements  TEXT,
                notes                 TEXT,
                folio_id              VARCHAR(36),
                created_by            VARCHAR(36),
                created_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_evtbk_prop ON event_bookings (tenant_id, property_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_evtbk_date ON event_bookings (tenant_id, event_date)');
        $this->addSql("ALTER TABLE event_bookings ADD CONSTRAINT chk_evtbk_status CHECK (status IN ('tentative','confirmed','in_progress','completed','cancelled'))");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS event_bookings');
        $this->addSql('DROP TABLE IF EXISTS event_spaces');
        $this->addSql('DROP TABLE IF EXISTS corporate_profiles');
    }
}
