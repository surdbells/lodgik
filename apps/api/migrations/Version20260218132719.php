<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260218132719 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add app_releases, app_download_logs, tenant_app_configs tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE app_releases (
                id VARCHAR(36) NOT NULL,
                app_type VARCHAR(30) NOT NULL,
                version VARCHAR(30) NOT NULL,
                build_number INT NOT NULL,
                file_path VARCHAR(500) DEFAULT NULL,
                file_size BIGINT DEFAULT NULL,
                checksum VARCHAR(64) DEFAULT NULL,
                mime_type VARCHAR(100) DEFAULT NULL,
                release_notes TEXT DEFAULT NULL,
                min_os_version VARCHAR(30) DEFAULT NULL,
                is_latest BOOLEAN DEFAULT false NOT NULL,
                is_mandatory BOOLEAN DEFAULT false NOT NULL,
                status VARCHAR(20) DEFAULT 'draft' NOT NULL,
                published_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                download_count INT DEFAULT 0 NOT NULL,
                uploaded_by VARCHAR(36) DEFAULT NULL,
                deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX uq_ar_type_version ON app_releases (app_type, version)');
        $this->addSql('CREATE INDEX idx_ar_type ON app_releases (app_type)');
        $this->addSql('CREATE INDEX idx_ar_latest ON app_releases (is_latest)');

        $this->addSql(<<<'SQL'
            CREATE TABLE app_download_logs (
                id VARCHAR(36) NOT NULL,
                release_id VARCHAR(36) NOT NULL,
                tenant_id VARCHAR(36) DEFAULT NULL,
                user_id VARCHAR(36) DEFAULT NULL,
                app_type VARCHAR(30) NOT NULL,
                version VARCHAR(30) NOT NULL,
                ip_address VARCHAR(45) DEFAULT NULL,
                user_agent VARCHAR(500) DEFAULT NULL,
                downloaded_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_adl_release ON app_download_logs (release_id)');
        $this->addSql('CREATE INDEX idx_adl_tenant ON app_download_logs (tenant_id)');
        $this->addSql('CREATE INDEX idx_adl_date ON app_download_logs (downloaded_at)');

        $this->addSql(<<<'SQL'
            CREATE TABLE tenant_app_configs (
                id VARCHAR(36) NOT NULL,
                tenant_id VARCHAR(36) NOT NULL,
                app_type VARCHAR(30) NOT NULL,
                installed_version VARCHAR(30) DEFAULT NULL,
                installed_build INT DEFAULT NULL,
                auto_update BOOLEAN DEFAULT true NOT NULL,
                last_heartbeat TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                device_info JSON DEFAULT NULL,
                property_id VARCHAR(36) DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX uq_tac_tenant_type ON tenant_app_configs (tenant_id, app_type)');
        $this->addSql('CREATE INDEX idx_tac_tenant ON tenant_app_configs (tenant_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE tenant_app_configs');
        $this->addSql('DROP TABLE app_download_logs');
        $this->addSql('DROP TABLE app_releases');
    }
}
