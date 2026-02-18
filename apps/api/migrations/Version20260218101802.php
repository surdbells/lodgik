<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260218101802 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user_properties pivot table for multi-property user access';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE user_properties (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                property_id VARCHAR(36) NOT NULL,
                role_override VARCHAR(30) DEFAULT NULL,
                is_primary BOOLEAN DEFAULT false NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                tenant_id VARCHAR(36) NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);

        $this->addSql('CREATE UNIQUE INDEX uq_user_property ON user_properties (user_id, property_id)');
        $this->addSql('CREATE INDEX idx_user_properties_tenant ON user_properties (tenant_id)');
        $this->addSql('CREATE INDEX idx_user_properties_user ON user_properties (user_id)');
        $this->addSql('CREATE INDEX idx_user_properties_property ON user_properties (property_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE user_properties');
    }
}
