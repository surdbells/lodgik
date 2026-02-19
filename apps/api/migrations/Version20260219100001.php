<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260219100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 1A: room_types, rooms, room_status_logs, amenities tables';
    }

    public function up(Schema $schema): void
    {
        // ─── room_types ────────────────────────────────────
        $this->addSql('CREATE TABLE room_types (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT DEFAULT NULL,
            base_rate NUMERIC(12, 2) NOT NULL,
            hourly_rate NUMERIC(12, 2) DEFAULT NULL,
            max_occupancy SMALLINT NOT NULL DEFAULT 2,
            amenities JSON DEFAULT NULL,
            photos JSON DEFAULT NULL,
            sort_order SMALLINT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_room_types_tenant ON room_types (tenant_id)');
        $this->addSql('CREATE INDEX idx_room_types_tenant_property ON room_types (tenant_id, property_id)');

        // ─── rooms ─────────────────────────────────────────
        $this->addSql('CREATE TABLE rooms (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            room_type_id VARCHAR(36) NOT NULL,
            room_number VARCHAR(20) NOT NULL,
            floor SMALLINT DEFAULT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'vacant_clean\',
            notes TEXT DEFAULT NULL,
            amenities JSON DEFAULT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_rooms_tenant ON rooms (tenant_id)');
        $this->addSql('CREATE INDEX idx_rooms_tenant_property ON rooms (tenant_id, property_id)');
        $this->addSql('CREATE INDEX idx_rooms_tenant_property_status ON rooms (tenant_id, property_id, status)');
        $this->addSql('CREATE UNIQUE INDEX uq_rooms_property_number ON rooms (tenant_id, property_id, room_number)');

        // ─── room_status_logs ──────────────────────────────
        $this->addSql('CREATE TABLE room_status_logs (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            room_id VARCHAR(36) NOT NULL,
            old_status VARCHAR(20) NOT NULL,
            new_status VARCHAR(20) NOT NULL,
            changed_by VARCHAR(36) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_room_status_logs_room ON room_status_logs (tenant_id, room_id)');

        // ─── amenities ─────────────────────────────────────
        $this->addSql('CREATE TABLE amenities (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) DEFAULT NULL,
            icon VARCHAR(50) DEFAULT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_amenities_tenant ON amenities (tenant_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS amenities');
        $this->addSql('DROP TABLE IF EXISTS room_status_logs');
        $this->addSql('DROP TABLE IF EXISTS rooms');
        $this->addSql('DROP TABLE IF EXISTS room_types');
    }
}
