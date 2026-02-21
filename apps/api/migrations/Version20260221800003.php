<?php
declare(strict_types=1);
namespace Lodgik\Migrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260221800003 extends AbstractMigration
{
    public function getDescription(): string { return 'Phase 8C: WhatsApp messages + templates'; }
    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE whatsapp_messages (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, direction VARCHAR(10) NOT NULL, recipient_phone VARCHAR(20) NOT NULL, recipient_name VARCHAR(150), message_type VARCHAR(30) NOT NULL, template_id VARCHAR(50), template_params JSON, body TEXT NOT NULL, status VARCHAR(12) DEFAULT \'pending\', provider_message_id VARCHAR(100), failure_reason TEXT, sent_at TIMESTAMP, delivered_at TIMESTAMP, cost BIGINT, booking_id VARCHAR(36), guest_id VARCHAR(36), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_wa_dir ON whatsapp_messages (tenant_id, property_id, direction)');
        $this->addSql('CREATE INDEX idx_wa_phone ON whatsapp_messages (tenant_id, recipient_phone)');

        $this->addSql('CREATE TABLE whatsapp_templates (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, name VARCHAR(50) NOT NULL, message_type VARCHAR(30) NOT NULL, body TEXT NOT NULL, param_names JSON NOT NULL, is_active BOOLEAN DEFAULT TRUE, language VARCHAR(5) DEFAULT \'en\', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_wat_type ON whatsapp_templates (tenant_id, message_type)');
    }
    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS whatsapp_templates');
        $this->addSql('DROP TABLE IF EXISTS whatsapp_messages');
    }
}
