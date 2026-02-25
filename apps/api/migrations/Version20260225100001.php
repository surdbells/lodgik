<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260225100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create platform_settings table for admin configuration';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE platform_settings (
            setting_key VARCHAR(100) NOT NULL,
            setting_value TEXT DEFAULT NULL,
            is_secret BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (setting_key)
        )');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS platform_settings');
    }
}
