<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260219400001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 4A: Guest Auth, Service Requests, Chat — guest_access_codes, guest_sessions, tablet_devices, service_requests, chat_messages';
    }

    public function up(Schema $schema): void
    {
        // ─── Guest Access Codes ─────────────────────────────────

        $this->addSql('CREATE TABLE guest_access_codes (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL,
            guest_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            room_id VARCHAR(36) DEFAULT NULL,
            code VARCHAR(6) NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            last_used_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_access_code_tenant UNIQUE (tenant_id, code)
        )');
        $this->addSql('CREATE INDEX idx_gac_booking ON guest_access_codes (tenant_id, booking_id)');

        // ─── Guest Sessions ─────────────────────────────────────

        $this->addSql('CREATE TABLE guest_sessions (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            guest_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            room_id VARCHAR(36) DEFAULT NULL,
            token VARCHAR(64) NOT NULL,
            auth_method VARCHAR(20) NOT NULL,
            device_type VARCHAR(20) DEFAULT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            last_activity_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_gs_token ON guest_sessions (token)');
        $this->addSql('CREATE INDEX idx_gs_guest ON guest_sessions (tenant_id, guest_id)');

        // ─── Tablet Devices ─────────────────────────────────────

        $this->addSql('CREATE TABLE tablet_devices (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            room_id VARCHAR(36) NOT NULL,
            name VARCHAR(100) NOT NULL,
            device_token VARCHAR(64) NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            last_ping_at TIMESTAMP DEFAULT NULL,
            current_booking_id VARCHAR(36) DEFAULT NULL,
            current_guest_id VARCHAR(36) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_tablet_token UNIQUE (device_token)
        )');
        $this->addSql('CREATE INDEX idx_td_room ON tablet_devices (tenant_id, room_id)');

        // ─── Service Requests ───────────────────────────────────

        $this->addSql('CREATE TABLE service_requests (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL,
            guest_id VARCHAR(36) NOT NULL,
            room_id VARCHAR(36) DEFAULT NULL,
            category VARCHAR(20) NOT NULL,
            status VARCHAR(20) DEFAULT \'pending\' NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT DEFAULT NULL,
            priority INT DEFAULT 2 NOT NULL,
            assigned_to VARCHAR(36) DEFAULT NULL,
            acknowledged_at TIMESTAMP DEFAULT NULL,
            completed_at TIMESTAMP DEFAULT NULL,
            guest_rating INT DEFAULT NULL,
            guest_feedback TEXT DEFAULT NULL,
            staff_notes TEXT DEFAULT NULL,
            photo_url VARCHAR(500) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_sr_property_status ON service_requests (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX idx_sr_booking ON service_requests (tenant_id, booking_id)');

        // ─── Chat Messages ──────────────────────────────────────

        $this->addSql('CREATE TABLE chat_messages (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            sender_type VARCHAR(10) NOT NULL,
            sender_id VARCHAR(36) NOT NULL,
            sender_name VARCHAR(150) NOT NULL,
            message TEXT NOT NULL,
            message_type VARCHAR(10) DEFAULT \'text\' NOT NULL,
            image_url VARCHAR(500) DEFAULT NULL,
            is_read BOOLEAN DEFAULT false NOT NULL,
            read_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_cm_booking ON chat_messages (tenant_id, booking_id)');
        $this->addSql('CREATE INDEX idx_cm_property ON chat_messages (tenant_id, property_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS chat_messages');
        $this->addSql('DROP TABLE IF EXISTS service_requests');
        $this->addSql('DROP TABLE IF EXISTS tablet_devices');
        $this->addSql('DROP TABLE IF EXISTS guest_sessions');
        $this->addSql('DROP TABLE IF EXISTS guest_access_codes');
    }
}
