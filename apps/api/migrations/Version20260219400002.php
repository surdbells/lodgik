<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260219400002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 4A supplement: Notifications and Device Tokens tables';
    }

    public function up(Schema $schema): void
    {
        // ─── Notifications ──────────────────────────────────────

        $this->addSql('CREATE TABLE notifications (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            recipient_type VARCHAR(10) NOT NULL,
            recipient_id VARCHAR(36) NOT NULL,
            channel VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            body TEXT DEFAULT NULL,
            data JSON DEFAULT NULL,
            is_read BOOLEAN DEFAULT false NOT NULL,
            read_at TIMESTAMP DEFAULT NULL,
            push_sent BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_notif_recipient ON notifications (tenant_id, recipient_id, is_read)');
        $this->addSql('CREATE INDEX idx_notif_property ON notifications (tenant_id, property_id)');

        // ─── Device Tokens (FCM) ────────────────────────────────

        $this->addSql('CREATE TABLE device_tokens (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            owner_type VARCHAR(10) NOT NULL,
            owner_id VARCHAR(36) NOT NULL,
            token TEXT NOT NULL,
            platform VARCHAR(20) NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            last_used_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_dt_owner ON device_tokens (tenant_id, owner_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS device_tokens');
        $this->addSql('DROP TABLE IF EXISTS notifications');
    }
}
