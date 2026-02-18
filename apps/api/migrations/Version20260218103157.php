<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260218103157 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add feature_modules and tenant_feature_modules tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE feature_modules (
                id VARCHAR(36) NOT NULL,
                module_key VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT DEFAULT NULL,
                category VARCHAR(50) NOT NULL,
                min_tier VARCHAR(20) DEFAULT 'all' NOT NULL,
                is_core BOOLEAN DEFAULT false NOT NULL,
                dependencies JSON NOT NULL DEFAULT '[]',
                required_by JSON NOT NULL DEFAULT '[]',
                sort_order INT DEFAULT 0 NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                icon VARCHAR(50) DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX uq_feature_module_key ON feature_modules (module_key)');

        $this->addSql(<<<'SQL'
            CREATE TABLE tenant_feature_modules (
                id VARCHAR(36) NOT NULL,
                tenant_id VARCHAR(36) NOT NULL,
                module_key VARCHAR(50) NOT NULL,
                is_enabled BOOLEAN NOT NULL,
                changed_by VARCHAR(36) DEFAULT NULL,
                reason TEXT DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX uq_tenant_module ON tenant_feature_modules (tenant_id, module_key)');
        $this->addSql('CREATE INDEX idx_tfm_tenant ON tenant_feature_modules (tenant_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE tenant_feature_modules');
        $this->addSql('DROP TABLE feature_modules');
    }
}
