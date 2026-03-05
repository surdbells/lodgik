<?php
declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Guest Card System — Phase A–D
 *
 * Tables created:
 *   1. guest_cards       — physical card inventory (RFID/QR dual-interface)
 *   2. guest_card_events — immutable audit log of every scan
 *   3. card_scan_points  — configurable scan terminals (reception, security, facility, POS)
 */
final class Version20260306100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Guest Card System: guest_cards, guest_card_events, card_scan_points';
    }

    public function up(Schema $schema): void
    {
        // ── 1. guest_cards ──────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS guest_cards (
                id              VARCHAR(36)     NOT NULL,
                tenant_id       VARCHAR(36)     NOT NULL,
                property_id     VARCHAR(36)     NOT NULL,
                card_uid        VARCHAR(100)    NOT NULL,
                card_number     VARCHAR(30)     NOT NULL,
                status          VARCHAR(20)     NOT NULL DEFAULT 'available',
                booking_id      VARCHAR(36)     DEFAULT NULL,
                guest_id        VARCHAR(36)     DEFAULT NULL,
                issued_by       VARCHAR(36)     DEFAULT NULL,
                issued_at       TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                deactivated_at  TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                replaced_by     VARCHAR(36)     DEFAULT NULL,
                notes           TEXT            DEFAULT NULL,
                created_at      TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                updated_at      TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                PRIMARY KEY (id)
            )
        ");

        $this->addSql("CREATE UNIQUE INDEX IF NOT EXISTS uq_guest_cards_uid      ON guest_cards (card_uid)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_guest_cards_property       ON guest_cards (tenant_id, property_id)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_guest_cards_booking        ON guest_cards (tenant_id, booking_id)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_guest_cards_status         ON guest_cards (tenant_id, status)");

        // ── 2. guest_card_events ────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS guest_card_events (
                id               VARCHAR(36)     NOT NULL,
                tenant_id        VARCHAR(36)     NOT NULL,
                property_id      VARCHAR(36)     NOT NULL,
                card_id          VARCHAR(36)     NOT NULL,
                booking_id       VARCHAR(36)     DEFAULT NULL,
                guest_id         VARCHAR(36)     DEFAULT NULL,
                event_type       VARCHAR(30)     NOT NULL,
                scan_point       VARCHAR(100)    DEFAULT NULL,
                scan_point_type  VARCHAR(20)     DEFAULT NULL,
                scan_point_id    VARCHAR(36)     DEFAULT NULL,
                scan_device_id   VARCHAR(100)    DEFAULT NULL,
                folio_id         VARCHAR(36)     DEFAULT NULL,
                charge_amount    NUMERIC(12, 2)  DEFAULT NULL,
                metadata         JSONB           NOT NULL DEFAULT '{}',
                scanned_by       VARCHAR(36)     DEFAULT NULL,
                scanned_at       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                PRIMARY KEY (id)
            )
        ");

        $this->addSql("CREATE INDEX IF NOT EXISTS idx_gce_card          ON guest_card_events (tenant_id, card_id)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_gce_booking        ON guest_card_events (tenant_id, booking_id)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_gce_guest          ON guest_card_events (tenant_id, guest_id)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_gce_property_time  ON guest_card_events (tenant_id, property_id, scanned_at DESC)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_gce_event_type     ON guest_card_events (tenant_id, event_type)");

        // ── 3. card_scan_points ─────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS card_scan_points (
                id               VARCHAR(36)     NOT NULL,
                tenant_id        VARCHAR(36)     NOT NULL,
                property_id      VARCHAR(36)     NOT NULL,
                name             VARCHAR(100)    NOT NULL,
                scan_point_type  VARCHAR(20)     NOT NULL,
                location_desc    VARCHAR(200)    DEFAULT NULL,
                is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
                device_key       VARCHAR(100)    DEFAULT NULL,
                created_at       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                updated_at       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                PRIMARY KEY (id)
            )
        ");

        $this->addSql("CREATE UNIQUE INDEX IF NOT EXISTS uq_csp_device_key ON card_scan_points (device_key) WHERE device_key IS NOT NULL");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_csp_property         ON card_scan_points (tenant_id, property_id)");

        // ── 4. Add card_id to bookings for quick reverse lookup ─────
        $this->addSql("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS active_card_id VARCHAR(36) DEFAULT NULL");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_bookings_card ON bookings (active_card_id) WHERE active_card_id IS NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE bookings DROP COLUMN IF EXISTS active_card_id");
        $this->addSql("DROP TABLE IF EXISTS card_scan_points");
        $this->addSql("DROP TABLE IF EXISTS guest_card_events");
        $this->addSql("DROP TABLE IF EXISTS guest_cards");
    }
}
