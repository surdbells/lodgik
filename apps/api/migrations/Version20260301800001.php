<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Data migration: ensure inventory_management feature module exists.
 *
 * Background
 * ----------
 * feature_modules rows are inserted by bin/seed.php, not by a migration,
 * so production DBs that were migrated without re-running the seed are missing
 * 'inventory_management'. This causes:
 *   - Admin plan editor cannot show/toggle the module
 *   - Nav group gating always hides the Inventory & Food Cost group
 *   - Tenant enabled_modules checks silently fail
 *
 * Uses INSERT … ON CONFLICT DO NOTHING — safe to run on already-seeded DBs.
 */
final class Version20260301800001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Data: ensure inventory_management feature module row exists (idempotent)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            INSERT INTO feature_modules
                (id, module_key, name, description, category, min_tier,
                 is_core, dependencies, required_by, icon, sort_order,
                 is_active, created_at, updated_at)
            VALUES
                (gen_random_uuid()::text,
                 'inventory_management',
                 'Inventory Management',
                 'Stock tracking, goods received notes, purchase orders, procurement and inventory reports',
                 'operations',
                 'professional',
                 FALSE,
                 '[]',
                 '[]',
                 'inventory',
                 15,
                 TRUE,
                 CURRENT_TIMESTAMP,
                 CURRENT_TIMESTAMP)
            ON CONFLICT (module_key) DO NOTHING
        SQL);
    }

    public function down(Schema $schema): void
    {
        // Intentionally left empty — removing a feature module row in down()
        // would break any plans that already include it. Remove manually if needed.
    }
}
