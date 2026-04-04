<?php declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260404200001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'OTA iCal feed: add ical_token and webhook_secret to ota_channels';
    }

    public function up(Schema $schema): void
    {
        // Per-channel secret token for iCal feed URL — unauthenticated but unguessable
        $this->addSql("ALTER TABLE ota_channels ADD COLUMN IF NOT EXISTS ical_token VARCHAR(36) UNIQUE");
        // Back-fill existing channels with a unique token
        $this->addSql("UPDATE ota_channels SET ical_token = gen_random_uuid()::text WHERE ical_token IS NULL");

        // Optional HMAC secret for verifying inbound webhooks from OTA platforms
        $this->addSql("ALTER TABLE ota_channels ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(100)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE ota_channels DROP COLUMN IF EXISTS webhook_secret");
        $this->addSql("ALTER TABLE ota_channels DROP COLUMN IF EXISTS ical_token");
    }
}
