<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260226200001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create user_property_access table for multi-property support';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE IF NOT EXISTS user_property_access (
                id UUID NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR(36) NOT NULL,
                property_id VARCHAR(36) NOT NULL,
                tenant_id VARCHAR(36) NOT NULL,
                role VARCHAR(50) DEFAULT NULL,
                is_default BOOLEAN NOT NULL DEFAULT false,
                granted_by VARCHAR(36) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                PRIMARY KEY (id),
                UNIQUE (user_id, property_id)
            )
        ');

        $this->addSql('CREATE INDEX idx_upa_user ON user_property_access (user_id)');
        $this->addSql('CREATE INDEX idx_upa_property ON user_property_access (property_id)');
        $this->addSql('CREATE INDEX idx_upa_tenant ON user_property_access (tenant_id)');

        // Backfill: grant every existing user access to their current property
        $this->addSql('
            INSERT INTO user_property_access (user_id, property_id, tenant_id, is_default)
            SELECT id, property_id, tenant_id, true
            FROM users
            WHERE property_id IS NOT NULL AND tenant_id IS NOT NULL
            ON CONFLICT (user_id, property_id) DO NOTHING
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS user_property_access');
    }
}
