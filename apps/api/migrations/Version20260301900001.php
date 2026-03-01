<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Data migration: add inventory_management to Professional+ subscription plan rows.
 *
 * Context
 * -------
 * FeatureService.getTenantFeatures() now merges the live subscription plan's
 * included_modules with the tenant's own enabled_modules. This means any module
 * in the plan row is automatically effective for all tenants on that plan.
 *
 * However, existing plan rows in the DB may predate the inventory_management
 * feature (added in Phase A-E). This migration ensures the Professional,
 * Business, and Enterprise plan rows include inventory_management so that
 * all tenants on those plans immediately see the Inventory & Food Cost nav group.
 *
 * Uses PostgreSQL jsonb operators — safe to run multiple times.
 */
final class Version20260301900001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Data: add inventory_management to Professional/Business/Enterprise plan included_modules';
    }

    public function up(Schema $schema): void
    {
        // Add inventory_management to any Professional/Business/Enterprise plan
        // that doesn't already include it.
        // jsonb @> checks containment; || appends to array; cast back to ::json for storage.
        $this->addSql(<<<'SQL'
            UPDATE subscription_plans
            SET    included_modules = (
                       included_modules::jsonb || '["inventory_management"]'::jsonb
                   )::json
            WHERE  tier IN ('professional', 'business', 'enterprise')
              AND  NOT (included_modules::jsonb @> '["inventory_management"]'::jsonb)
        SQL);
    }

    public function down(Schema $schema): void
    {
        // Remove inventory_management from plan rows (reverse of up)
        // Uses jsonb - operator to remove an element from an array
        $this->addSql(<<<'SQL'
            UPDATE subscription_plans
            SET    included_modules = (
                       included_modules::jsonb - 'inventory_management'
                   )::json
            WHERE  tier IN ('professional', 'business', 'enterprise')
              AND  included_modules::jsonb @> '["inventory_management"]'::jsonb
        SQL);
    }
}
