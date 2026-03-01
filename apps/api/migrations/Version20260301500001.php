<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260301500001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase B1 — Stock Movements ledger: stock_movements, stock_movement_lines, pos_products.stock_item_id';
    }

    public function up(Schema $schema): void
    {
        // Index naming convention:
        //   stock_movements      → stk_mvt_*
        //   stock_movement_lines → stk_mvl_*

        // ─── Stock Movements (header) ─────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS stock_movements (
                id                        VARCHAR(36)   NOT NULL,
                tenant_id                 VARCHAR(36)   NOT NULL,
                property_id               VARCHAR(36)   DEFAULT NULL,
                type                      VARCHAR(20)   NOT NULL,
                status                    VARCHAR(15)   NOT NULL DEFAULT 'posted',
                reference_number          VARCHAR(80)   NOT NULL,
                reference_id              VARCHAR(36)   DEFAULT NULL,
                reference_type            VARCHAR(30)   DEFAULT NULL,
                source_location_id        VARCHAR(36)   DEFAULT NULL,
                source_location_name      VARCHAR(100)  DEFAULT NULL,
                destination_location_id   VARCHAR(36)   DEFAULT NULL,
                destination_location_name VARCHAR(100)  DEFAULT NULL,
                movement_date             DATE          NOT NULL,
                supplier_name             VARCHAR(150)  DEFAULT NULL,
                supplier_invoice          VARCHAR(80)   DEFAULT NULL,
                notes                     TEXT          DEFAULT NULL,
                created_by                VARCHAR(36)   NOT NULL,
                created_by_name           VARCHAR(100)  NOT NULL,
                total_value               BIGINT        NOT NULL DEFAULT 0,
                line_count                INTEGER       NOT NULL DEFAULT 0,
                created_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at                TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvt_tenant ON stock_movements (tenant_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvt_type   ON stock_movements (tenant_id, property_id, type)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvt_date   ON stock_movements (tenant_id, property_id, movement_date)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvt_src    ON stock_movements (tenant_id, source_location_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvt_dst    ON stock_movements (tenant_id, destination_location_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvt_ref    ON stock_movements (tenant_id, reference_id)');

        // ─── Stock Movement Lines ─────────────────────────────────────
        $this->addSql("
            CREATE TABLE IF NOT EXISTS stock_movement_lines (
                id                VARCHAR(36)    NOT NULL,
                tenant_id         VARCHAR(36)    NOT NULL,
                movement_id       VARCHAR(36)    NOT NULL,
                item_id           VARCHAR(36)    NOT NULL,
                item_sku          VARCHAR(50)    NOT NULL,
                item_name         VARCHAR(150)   NOT NULL,
                location_id       VARCHAR(36)    NOT NULL,
                location_name     VARCHAR(100)   NOT NULL,
                quantity          DECIMAL(15, 4) NOT NULL,
                unit_cost         BIGINT         NOT NULL DEFAULT 0,
                line_value        BIGINT         NOT NULL DEFAULT 0,
                before_quantity   DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
                after_quantity    DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
                purchase_quantity DECIMAL(15, 4) DEFAULT NULL,
                batch_number      VARCHAR(80)    DEFAULT NULL,
                expiry_date       DATE           DEFAULT NULL,
                notes             TEXT           DEFAULT NULL,
                created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvl_tenant   ON stock_movement_lines (tenant_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvl_movement ON stock_movement_lines (tenant_id, movement_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvl_item     ON stock_movement_lines (tenant_id, item_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS stk_mvl_location ON stock_movement_lines (tenant_id, location_id)');

        // ─── POS Products — add stock_item_id link ────────────────────
        $this->addSql("
            ALTER TABLE pos_products
            ADD COLUMN IF NOT EXISTS stock_item_id VARCHAR(36) DEFAULT NULL
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS pos_prod_stock ON pos_products (tenant_id, stock_item_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS pos_prod_stock');
        $this->addSql('ALTER TABLE pos_products DROP COLUMN IF EXISTS stock_item_id');
        $this->addSql('DROP TABLE IF EXISTS stock_movement_lines');
        $this->addSql('DROP TABLE IF EXISTS stock_movements');
    }
}
