<?php
declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 4 — Housekeeping Consumables
 *
 * Tables:
 *   housekeeping_consumables       — catalogue of items (soap, towels, etc.)
 *   housekeeping_consumable_stock  — current stock level per property
 *   housekeeping_store_requests    — request header (storekeeper approval)
 *   housekeeping_store_request_items — line items on a request
 *   housekeeping_consumable_discrepancies — flagged over/under use
 */
final class Version20260308400001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 4: Housekeeping Consumables — catalogue, stock, requests, discrepancy tracking';
    }

    public function up(Schema $schema): void
    {
        // ── Catalogue ────────────────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS housekeeping_consumables (
                id                  VARCHAR(36) PRIMARY KEY,
                tenant_id           VARCHAR(36) NOT NULL,
                property_id         VARCHAR(36) NOT NULL,
                name                VARCHAR(150) NOT NULL,
                unit                VARCHAR(30) NOT NULL DEFAULT 'piece',
                expected_per_room   NUMERIC(8,2) NOT NULL DEFAULT 1,
                reorder_threshold   NUMERIC(8,2) NOT NULL DEFAULT 10,
                notes               TEXT,
                is_active           BOOLEAN NOT NULL DEFAULT TRUE,
                created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_hk_consumables_prop ON housekeeping_consumables (tenant_id, property_id)');

        // ── Stock levels ─────────────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS housekeeping_consumable_stock (
                id              VARCHAR(36) PRIMARY KEY,
                consumable_id   VARCHAR(36) NOT NULL REFERENCES housekeeping_consumables(id) ON DELETE CASCADE,
                tenant_id       VARCHAR(36) NOT NULL,
                property_id     VARCHAR(36) NOT NULL,
                quantity        NUMERIC(10,2) NOT NULL DEFAULT 0,
                last_updated_by VARCHAR(36),
                updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE (consumable_id, property_id)
            )
        ");

        // ── Store requests ───────────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS housekeeping_store_requests (
                id                  VARCHAR(36) PRIMARY KEY,
                tenant_id           VARCHAR(36) NOT NULL,
                property_id         VARCHAR(36) NOT NULL,
                requested_by        VARCHAR(36) NOT NULL,
                requested_by_name   VARCHAR(150) NOT NULL,
                status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','storekeeper_approved','admin_approved','rejected','fulfilled')),
                storekeeper_id      VARCHAR(36),
                storekeeper_name    VARCHAR(150),
                storekeeper_approved_at TIMESTAMP,
                admin_id            VARCHAR(36),
                admin_name          VARCHAR(150),
                admin_approved_at   TIMESTAMP,
                rejection_reason    TEXT,
                notes               TEXT,
                fulfilled_at        TIMESTAMP,
                created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_hk_requests_prop ON housekeeping_store_requests (tenant_id, property_id, status)');

        // ── Request line items ───────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS housekeeping_store_request_items (
                id              VARCHAR(36) PRIMARY KEY,
                request_id      VARCHAR(36) NOT NULL REFERENCES housekeeping_store_requests(id) ON DELETE CASCADE,
                consumable_id   VARCHAR(36) NOT NULL REFERENCES housekeeping_consumables(id),
                consumable_name VARCHAR(150) NOT NULL,
                quantity_req    NUMERIC(10,2) NOT NULL,
                quantity_issued NUMERIC(10,2),
                unit            VARCHAR(30) NOT NULL DEFAULT 'piece'
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_hk_req_items_req ON housekeeping_store_request_items (request_id)');

        // ── Discrepancies ────────────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS housekeeping_consumable_discrepancies (
                id                  VARCHAR(36) PRIMARY KEY,
                tenant_id           VARCHAR(36) NOT NULL,
                property_id         VARCHAR(36) NOT NULL,
                consumable_id       VARCHAR(36) NOT NULL REFERENCES housekeeping_consumables(id),
                consumable_name     VARCHAR(150) NOT NULL,
                period_start        DATE NOT NULL,
                period_end          DATE NOT NULL,
                rooms_serviced      INT NOT NULL DEFAULT 0,
                expected_usage      NUMERIC(10,2) NOT NULL,
                actual_usage        NUMERIC(10,2) NOT NULL,
                variance            NUMERIC(10,2) NOT NULL,
                variance_pct        NUMERIC(6,2) NOT NULL,
                flagged             BOOLEAN NOT NULL DEFAULT TRUE,
                resolved            BOOLEAN NOT NULL DEFAULT FALSE,
                resolved_by         VARCHAR(36),
                resolved_at         TIMESTAMP,
                notes               TEXT,
                created_at          TIMESTAMP NOT NULL DEFAULT NOW()
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_hk_disc_prop ON housekeeping_consumable_discrepancies (tenant_id, property_id, flagged)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS housekeeping_consumable_discrepancies');
        $this->addSql('DROP TABLE IF EXISTS housekeeping_store_request_items');
        $this->addSql('DROP TABLE IF EXISTS housekeeping_store_requests');
        $this->addSql('DROP TABLE IF EXISTS housekeeping_consumable_stock');
        $this->addSql('DROP TABLE IF EXISTS housekeeping_consumables');
    }
}
