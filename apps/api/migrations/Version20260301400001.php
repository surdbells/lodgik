<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260301400001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase A — Stock & Inventory Foundation: stock_categories, units_of_measure, stock_locations, stock_items, stock_balances';
    }

    public function up(Schema $schema): void
    {
        // All statements use IF NOT EXISTS so this migration is safe to re-run
        // after a partial failure (e.g. if a prior index name collided).
        //
        // Index naming convention — full table abbreviation to avoid global collisions:
        //   stock_categories  → stk_cat_*
        //   units_of_measure  → stk_uom_*
        //   stock_locations   → stk_loc_*
        //   stock_items       → stk_itm_*
        //   stock_balances    → stk_bal_*

        // ─── Stock Categories ─────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS stock_categories (
                id          VARCHAR(36)  NOT NULL,
                tenant_id   VARCHAR(36)  NOT NULL,
                name        VARCHAR(100) NOT NULL,
                description TEXT         DEFAULT NULL,
                department  VARCHAR(30)  NOT NULL DEFAULT 'general',
                parent_id   VARCHAR(36)  DEFAULT NULL,
                sort_order  INTEGER      NOT NULL DEFAULT 0,
                is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
                created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_cat_tenant  ON stock_categories (tenant_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_cat_parent  ON stock_categories (tenant_id, parent_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_cat_dept    ON stock_categories (tenant_id, department)');

        // ─── Units of Measure ─────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS units_of_measure (
                id                VARCHAR(36)     NOT NULL,
                tenant_id         VARCHAR(36)     NOT NULL,
                name              VARCHAR(80)     NOT NULL,
                symbol            VARCHAR(20)     NOT NULL,
                type              VARCHAR(20)     NOT NULL DEFAULT 'count',
                base_unit_id      VARCHAR(36)     DEFAULT NULL,
                conversion_factor DECIMAL(15, 6)  NOT NULL DEFAULT 1.000000,
                is_active         BOOLEAN         NOT NULL DEFAULT TRUE,
                created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                CONSTRAINT uq_uom_name UNIQUE (tenant_id, name)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_uom_tenant  ON units_of_measure (tenant_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_uom_base    ON units_of_measure (tenant_id, base_unit_id)');

        // ─── Stock Locations ──────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS stock_locations (
                id           VARCHAR(36)  NOT NULL,
                tenant_id    VARCHAR(36)  NOT NULL,
                property_id  VARCHAR(36)  DEFAULT NULL,
                name         VARCHAR(100) NOT NULL,
                description  TEXT         DEFAULT NULL,
                type         VARCHAR(20)  NOT NULL DEFAULT 'store',
                parent_id    VARCHAR(36)  DEFAULT NULL,
                department   VARCHAR(30)  DEFAULT NULL,
                manager_name VARCHAR(100) DEFAULT NULL,
                is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
                created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_loc_tenant   ON stock_locations (tenant_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_loc_property ON stock_locations (tenant_id, property_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_loc_type     ON stock_locations (tenant_id, type)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_loc_parent   ON stock_locations (tenant_id, parent_id)');

        // ─── Stock Items (Item Master) ────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS stock_items (
                id                        VARCHAR(36)    NOT NULL,
                tenant_id                 VARCHAR(36)    NOT NULL,
                sku                       VARCHAR(50)    NOT NULL,
                name                      VARCHAR(150)   NOT NULL,
                description               TEXT           DEFAULT NULL,
                category_id               VARCHAR(36)    NOT NULL,
                purchase_uom_id           VARCHAR(36)    NOT NULL,
                issue_uom_id              VARCHAR(36)    NOT NULL,
                purchase_to_issue_factor  DECIMAL(15, 6) NOT NULL DEFAULT 1.000000,
                last_purchase_cost        BIGINT         NOT NULL DEFAULT 0,
                average_cost              BIGINT         NOT NULL DEFAULT 0,
                reorder_point             DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
                par_level                 DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
                max_level                 DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
                is_perishable             BOOLEAN        NOT NULL DEFAULT FALSE,
                expiry_alert_days         INTEGER        NOT NULL DEFAULT 0,
                barcode                   VARCHAR(100)   DEFAULT NULL,
                image_url                 VARCHAR(500)   DEFAULT NULL,
                preferred_vendor          VARCHAR(150)   DEFAULT NULL,
                is_active                 BOOLEAN        NOT NULL DEFAULT TRUE,
                created_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                CONSTRAINT uq_si_sku UNIQUE (tenant_id, sku)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_itm_tenant   ON stock_items (tenant_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_itm_category ON stock_items (tenant_id, category_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_itm_active   ON stock_items (tenant_id, is_active)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_itm_barcode  ON stock_items (tenant_id, barcode)');

        // ─── Stock Balances ───────────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS stock_balances (
                id                VARCHAR(36)    NOT NULL,
                tenant_id         VARCHAR(36)    NOT NULL,
                item_id           VARCHAR(36)    NOT NULL,
                location_id       VARCHAR(36)    NOT NULL,
                property_id       VARCHAR(36)    DEFAULT NULL,
                quantity_on_hand  DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
                quantity_reserved DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
                value_on_hand     BIGINT         NOT NULL DEFAULT 0,
                last_movement_at  TIMESTAMP      DEFAULT NULL,
                created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                CONSTRAINT uq_sb_item_location UNIQUE (tenant_id, item_id, location_id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_bal_tenant   ON stock_balances (tenant_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_bal_location ON stock_balances (tenant_id, location_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_bal_item     ON stock_balances (tenant_id, item_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_bal_property ON stock_balances (tenant_id, property_id)');

        // ─── Drop old stale idx_s*_ indexes from partial Phase A run ─
        // These were created by the first (failed) attempt before the collision.
        // IF EXISTS prevents errors on a fresh DB that never had them.
        $this->addSql('DROP INDEX IF EXISTS idx_sc_tenant');
        $this->addSql('DROP INDEX IF EXISTS idx_sc_parent');
        $this->addSql('DROP INDEX IF EXISTS idx_sc_dept');
        $this->addSql('DROP INDEX IF EXISTS idx_uom_tenant');
        $this->addSql('DROP INDEX IF EXISTS idx_uom_base');
        $this->addSql('DROP INDEX IF EXISTS idx_sl_tenant');
        $this->addSql('DROP INDEX IF EXISTS idx_sl_property');
        $this->addSql('DROP INDEX IF EXISTS idx_sl_type');
        $this->addSql('DROP INDEX IF EXISTS idx_sl_parent');
        $this->addSql('DROP INDEX IF EXISTS idx_si_active');
        $this->addSql('DROP INDEX IF EXISTS idx_si_barcode');
        $this->addSql('DROP INDEX IF EXISTS idx_si_category');
        $this->addSql('DROP INDEX IF EXISTS idx_sb_tenant');
        $this->addSql('DROP INDEX IF EXISTS idx_sb_location');
        $this->addSql('DROP INDEX IF EXISTS idx_sb_item');
        $this->addSql('DROP INDEX IF EXISTS idx_sb_property');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS stock_balances');
        $this->addSql('DROP TABLE IF EXISTS stock_items');
        $this->addSql('DROP TABLE IF EXISTS stock_locations');
        $this->addSql('DROP TABLE IF EXISTS units_of_measure');
        $this->addSql('DROP TABLE IF EXISTS stock_categories');
    }
}
