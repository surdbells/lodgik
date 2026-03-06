<?php
declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Ensure guest_access_codes feature module row exists in feature_modules table.
 *
 * The tables for Guest Cards were created in Version20260306100001 but the
 * feature_module record was only present in the seed script (bin/seed-features.php).
 * Production databases that were seeded before the guest card system was built
 * will be missing this row — making it invisible in the plan/module manager.
 */
final class Version20260306200001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Upsert guest_access_codes into feature_modules (Guest Card System)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            INSERT INTO feature_modules
                (id, module_key, name, description, category, min_tier,
                 is_core, dependencies, required_by, icon, sort_order,
                 is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid()::text,
                'guest_access_codes',
                'Guest Cards & Access',
                'RFID/QR dual-interface card inventory, card scanner, scan points, and full event audit log',
                'operations',
                'professional',
                FALSE,
                '["booking_engine"]',
                '[]',
                'credit-card',
                12,
                TRUE,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (module_key) DO UPDATE SET
                name        = EXCLUDED.name,
                description = EXCLUDED.description,
                is_active   = TRUE,
                updated_at  = CURRENT_TIMESTAMP
        SQL);
    }

    public function down(Schema $schema): void
    {
        // Intentionally a no-op — removing the row would break any plans
        // that already include guest_access_codes. Remove manually if needed.
    }
}
