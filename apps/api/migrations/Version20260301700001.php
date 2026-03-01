<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase D1 — POS Recipe entities (PostgreSQL-compatible rewrite)
 *
 * Creates:
 *   - recipes              (one active recipe per POS product)
 *   - recipe_ingredients   (ingredient lines per recipe)
 *
 * Notes:
 *   - Uses TIMESTAMP(0) WITHOUT TIME ZONE — consistent with all other Lodgik migrations
 *   - No ON UPDATE triggers — updated_at is managed by HasTimestamps trait at app layer
 *   - BOOLEAN instead of TINYINT(1) — PostgreSQL native boolean
 *   - NUMERIC instead of DECIMAL — PostgreSQL preferred synonym
 *   - No ENGINE/CHARSET clauses — PostgreSQL does not support them
 *   - IF NOT EXISTS on CREATE TABLE so re-runs are safe
 */
final class Version20260301700001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase D1: Recipe + RecipeIngredient tables for POS food-cost integration';
    }

    public function up(Schema $schema): void
    {
        // ── recipes ─────────────────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS recipes (
                id              VARCHAR(36)                             NOT NULL,
                tenant_id       VARCHAR(36)                             NOT NULL,
                product_id      VARCHAR(36)                             NOT NULL,
                product_name    VARCHAR(150)                            NOT NULL,
                property_id     VARCHAR(36)                             DEFAULT NULL,
                yield_quantity  NUMERIC(10,4)                           NOT NULL DEFAULT 1.0000,
                yield_uom       VARCHAR(50)                             NOT NULL DEFAULT 'serving',
                notes           TEXT                                    DEFAULT NULL,
                is_active       BOOLEAN                                 NOT NULL DEFAULT TRUE,
                created_at      TIMESTAMP(0) WITHOUT TIME ZONE          NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP(0) WITHOUT TIME ZONE          NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        SQL);

        $this->addSql('CREATE UNIQUE INDEX IF NOT EXISTS uq_recipe_product ON recipes (tenant_id, product_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS rec_property ON recipes (tenant_id, property_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS rec_active   ON recipes (tenant_id, is_active)');

        // ── recipe_ingredients ───────────────────────────────────────────────
        $this->addSql(<<<'SQL'
            CREATE TABLE IF NOT EXISTS recipe_ingredients (
                id                  VARCHAR(36)                         NOT NULL,
                tenant_id           VARCHAR(36)                         NOT NULL,
                recipe_id           VARCHAR(36)                         NOT NULL,
                stock_item_id       VARCHAR(36)                         NOT NULL,
                item_sku            VARCHAR(50)                         NOT NULL,
                item_name           VARCHAR(150)                        NOT NULL,
                quantity_per_yield  NUMERIC(15,6)                       NOT NULL,
                uom_symbol          VARCHAR(20)                         NOT NULL DEFAULT 'unit',
                notes               VARCHAR(200)                        DEFAULT NULL,
                sort_order          INTEGER                             NOT NULL DEFAULT 0,
                created_at          TIMESTAMP(0) WITHOUT TIME ZONE      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at          TIMESTAMP(0) WITHOUT TIME ZONE      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        SQL);

        $this->addSql('CREATE INDEX IF NOT EXISTS ri_recipe ON recipe_ingredients (tenant_id, recipe_id)');
        $this->addSql('CREATE INDEX IF NOT EXISTS ri_item   ON recipe_ingredients (tenant_id, stock_item_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS recipe_ingredients');
        $this->addSql('DROP TABLE IF EXISTS recipes');
    }
}
