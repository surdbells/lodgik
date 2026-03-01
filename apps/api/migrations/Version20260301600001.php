<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase C1 — Procurement entities
 *
 * Creates:
 *   - vendors
 *   - purchase_requests
 *   - purchase_request_lines
 *   - purchase_orders
 *   - purchase_order_lines
 *
 * Index naming (≥5-char prefix, table-scoped to avoid DB-global collision):
 *   vnd_*     → vendors
 *   pur_req_* → purchase_requests
 *   pur_rql_* → purchase_request_lines
 *   pur_ord_* → purchase_orders
 *   pur_orl_* → purchase_order_lines
 *
 * All CREATE TABLE/INDEX statements use IF NOT EXISTS — safe to re-run
 * on a partially-applied database.
 */
final class Version20260301600001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase C1: Procurement — Vendor, PurchaseRequest, PurchaseRequestLine, PurchaseOrder, PurchaseOrderLine';
    }

    public function up(Schema $schema): void
    {
        // ── vendors ─────────────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS vendors (
                id                  VARCHAR(36)     NOT NULL,
                tenant_id           VARCHAR(36)     NOT NULL,
                name                VARCHAR(150)    NOT NULL,
                email               VARCHAR(150)    DEFAULT NULL,
                phone               VARCHAR(30)     DEFAULT NULL,
                contact_person      VARCHAR(100)    DEFAULT NULL,
                address             VARCHAR(250)    DEFAULT NULL,
                city                VARCHAR(80)     DEFAULT NULL,
                country             VARCHAR(80)     DEFAULT NULL,
                payment_terms       VARCHAR(10)     NOT NULL DEFAULT 'net30',
                bank_name           VARCHAR(100)    DEFAULT NULL,
                bank_account_number VARCHAR(30)     DEFAULT NULL,
                bank_sort_code      VARCHAR(20)     DEFAULT NULL,
                tax_id              VARCHAR(50)     DEFAULT NULL,
                notes               TEXT            DEFAULT NULL,
                is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
                preferred_items     JSONB           DEFAULT NULL,
                created_at          TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at          TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        SQL);

        $this->addSql('CREATE INDEX IF NOT EXISTS vnd_tenant ON vendors (tenant_id, is_active)');
        $this->addSql('CREATE INDEX IF NOT EXISTS vnd_name   ON vendors (tenant_id, name)');

        // ── purchase_requests ────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS purchase_requests (
                id                      VARCHAR(36)     NOT NULL,
                tenant_id               VARCHAR(36)     NOT NULL,
                property_id             VARCHAR(36)     NOT NULL,
                reference_number        VARCHAR(30)     NOT NULL,
                title                   VARCHAR(200)    NOT NULL,
                status                  VARCHAR(15)     NOT NULL DEFAULT 'draft',
                priority                VARCHAR(10)     NOT NULL DEFAULT 'normal',
                required_by_date        DATE            DEFAULT NULL,
                notes                   TEXT            DEFAULT NULL,
                requested_by            VARCHAR(36)     NOT NULL,
                requested_by_name       VARCHAR(100)    NOT NULL,
                approved_by             VARCHAR(36)     DEFAULT NULL,
                approved_by_name        VARCHAR(100)    DEFAULT NULL,
                approved_at             TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                rejection_reason        TEXT            DEFAULT NULL,
                total_estimated_value   BIGINT          NOT NULL DEFAULT 0,
                line_count              INTEGER         NOT NULL DEFAULT 0,
                po_id                   VARCHAR(36)     DEFAULT NULL,
                created_at              TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at              TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        SQL);

        $this->addSql('CREATE INDEX IF NOT EXISTS pur_req_status    ON purchase_requests (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX IF NOT EXISTS pur_req_date      ON purchase_requests (tenant_id, property_id, created_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS pur_req_requester ON purchase_requests (tenant_id, requested_by)');

        // ── purchase_request_lines ───────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS purchase_request_lines (
                id                      VARCHAR(36)     NOT NULL,
                tenant_id               VARCHAR(36)     NOT NULL,
                request_id              VARCHAR(36)     NOT NULL,
                item_id                 VARCHAR(36)     NOT NULL,
                item_sku                VARCHAR(50)     NOT NULL,
                item_name               VARCHAR(200)    NOT NULL,
                quantity                NUMERIC(15, 4)  NOT NULL,
                unit_of_measure         VARCHAR(20)     DEFAULT NULL,
                estimated_unit_cost     BIGINT          NOT NULL DEFAULT 0,
                estimated_line_value    BIGINT          NOT NULL DEFAULT 0,
                notes                   TEXT            DEFAULT NULL,
                created_at              TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at              TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        SQL);

        $this->addSql('CREATE INDEX IF NOT EXISTS pur_rql_req  ON purchase_request_lines (tenant_id, request_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS pur_rql_item ON purchase_request_lines (tenant_id, item_id)');

        // ── purchase_orders ──────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id                      VARCHAR(36)     NOT NULL,
                tenant_id               VARCHAR(36)     NOT NULL,
                property_id             VARCHAR(36)     NOT NULL,
                reference_number        VARCHAR(30)     NOT NULL,
                status                  VARCHAR(25)     NOT NULL DEFAULT 'draft',
                vendor_id               VARCHAR(36)     NOT NULL,
                vendor_name             VARCHAR(150)    NOT NULL,
                vendor_email            VARCHAR(150)    DEFAULT NULL,
                vendor_contact_person   VARCHAR(100)    DEFAULT NULL,
                request_id              VARCHAR(36)     DEFAULT NULL,
                created_by              VARCHAR(36)     NOT NULL,
                created_by_name         VARCHAR(100)    NOT NULL,
                sent_at                 TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                sent_by                 VARCHAR(36)     DEFAULT NULL,
                sent_by_name            VARCHAR(100)    DEFAULT NULL,
                emailed_count           INTEGER         NOT NULL DEFAULT 0,
                expected_delivery_date  DATE            DEFAULT NULL,
                delivery_address        TEXT            DEFAULT NULL,
                delivery_notes          TEXT            DEFAULT NULL,
                payment_terms           VARCHAR(10)     NOT NULL DEFAULT 'net30',
                subtotal_value          BIGINT          NOT NULL DEFAULT 0,
                tax_value               BIGINT          NOT NULL DEFAULT 0,
                total_value             BIGINT          NOT NULL DEFAULT 0,
                notes                   TEXT            DEFAULT NULL,
                line_count              INTEGER         NOT NULL DEFAULT 0,
                created_at              TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at              TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        SQL);

        $this->addSql('CREATE INDEX IF NOT EXISTS pur_ord_status ON purchase_orders (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX IF NOT EXISTS pur_ord_vendor ON purchase_orders (tenant_id, vendor_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS pur_ord_req    ON purchase_orders (tenant_id, request_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS pur_ord_date   ON purchase_orders (tenant_id, property_id, created_at)');

        // ── purchase_order_lines ─────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS purchase_order_lines (
                id                  VARCHAR(36)     NOT NULL,
                tenant_id           VARCHAR(36)     NOT NULL,
                order_id            VARCHAR(36)     NOT NULL,
                item_id             VARCHAR(36)     NOT NULL,
                item_sku            VARCHAR(50)     NOT NULL,
                item_name           VARCHAR(200)    NOT NULL,
                location_id         VARCHAR(36)     DEFAULT NULL,
                location_name       VARCHAR(150)    DEFAULT NULL,
                ordered_quantity    NUMERIC(15, 4)  NOT NULL,
                received_quantity   NUMERIC(15, 4)  NOT NULL DEFAULT 0,
                unit_cost           BIGINT          NOT NULL,
                line_total          BIGINT          NOT NULL DEFAULT 0,
                status              VARCHAR(12)     NOT NULL DEFAULT 'pending',
                notes               TEXT            DEFAULT NULL,
                created_at          TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at          TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        SQL);

        $this->addSql('CREATE INDEX IF NOT EXISTS pur_orl_order  ON purchase_order_lines (tenant_id, order_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS pur_orl_item   ON purchase_order_lines (tenant_id, item_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS pur_orl_status ON purchase_order_lines (tenant_id, status)');
    }

    public function down(Schema $schema): void
    {
        // Reverse dependency order
        $this->addSql('DROP TABLE IF EXISTS purchase_order_lines');
        $this->addSql('DROP TABLE IF EXISTS purchase_orders');
        $this->addSql('DROP TABLE IF EXISTS purchase_request_lines');
        $this->addSql('DROP TABLE IF EXISTS purchase_requests');
        $this->addSql('DROP TABLE IF EXISTS vendors');
    }
}
