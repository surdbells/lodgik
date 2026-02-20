<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260221700001 extends AbstractMigration
{
    public function getDescription(): string { return 'Phase 7: Smart Guest Services — visitor codes, amenity vouchers, gate passes, movements, room controls, waitlist, charge transfers'; }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE visitor_access_codes (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, booking_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL, created_by_guest_id VARCHAR(36) NOT NULL,
            visitor_name VARCHAR(150) NOT NULL, visitor_phone VARCHAR(20), purpose VARCHAR(200),
            code VARCHAR(8) NOT NULL, room_number VARCHAR(10),
            valid_from TIMESTAMP NOT NULL, valid_until TIMESTAMP NOT NULL,
            status VARCHAR(10) DEFAULT \'active\',
            checked_in_at TIMESTAMP, checked_out_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_vac_booking ON visitor_access_codes (tenant_id, booking_id)');
        $this->addSql('CREATE INDEX idx_vac_code ON visitor_access_codes (tenant_id, property_id, code)');

        $this->addSql('CREATE TABLE amenity_vouchers (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, booking_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL, guest_id VARCHAR(36) NOT NULL,
            amenity_type VARCHAR(20) NOT NULL, amenity_name VARCHAR(100) NOT NULL,
            code VARCHAR(10) NOT NULL, valid_date DATE NOT NULL,
            max_uses INT DEFAULT 1, use_count INT DEFAULT 0,
            status VARCHAR(10) DEFAULT \'active\', redeemed_at TIMESTAMP, notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_av_booking ON amenity_vouchers (tenant_id, booking_id)');
        $this->addSql('CREATE INDEX idx_av_code ON amenity_vouchers (tenant_id, code)');

        $this->addSql('CREATE TABLE gate_passes (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL, pass_type VARCHAR(20) NOT NULL,
            person_name VARCHAR(150) NOT NULL, person_phone VARCHAR(20), room_number VARCHAR(10),
            guest_name VARCHAR(150) NOT NULL, visitor_code_id VARCHAR(36),
            purpose TEXT, expected_at TIMESTAMP,
            status VARCHAR(15) DEFAULT \'pending\', approved_by VARCHAR(36), security_notes TEXT,
            checked_in_at TIMESTAMP, checked_out_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_gp_status ON gate_passes (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX idx_gp_booking ON gate_passes (tenant_id, booking_id)');

        $this->addSql('CREATE TABLE guest_movements (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL, guest_id VARCHAR(36) NOT NULL,
            guest_name VARCHAR(150) NOT NULL, room_number VARCHAR(10),
            direction VARCHAR(10) NOT NULL, recorded_by VARCHAR(20) DEFAULT \'guest_app\',
            recorded_by_id VARCHAR(36), notes TEXT, location VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_gm_direction ON guest_movements (tenant_id, property_id, direction)');
        $this->addSql('CREATE INDEX idx_gm_booking ON guest_movements (tenant_id, booking_id)');

        $this->addSql('CREATE TABLE room_control_requests (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL, guest_id VARCHAR(36) NOT NULL,
            room_id VARCHAR(36) NOT NULL, room_number VARCHAR(10) NOT NULL,
            request_type VARCHAR(20) NOT NULL, is_active BOOLEAN DEFAULT TRUE,
            status VARCHAR(15) DEFAULT \'pending\', description TEXT, photo_url VARCHAR(500),
            assigned_to VARCHAR(36), assigned_to_name VARCHAR(100), staff_notes TEXT,
            resolved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_rcr_room ON room_control_requests (tenant_id, property_id, room_id)');
        $this->addSql('CREATE INDEX idx_rcr_booking ON room_control_requests (tenant_id, booking_id)');

        $this->addSql('CREATE TABLE waitlist_entries (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL, guest_id VARCHAR(36) NOT NULL,
            guest_name VARCHAR(150) NOT NULL, waitlist_type VARCHAR(20) NOT NULL,
            requested_item VARCHAR(200) NOT NULL, target_id VARCHAR(36),
            preferred_date DATE, position INT DEFAULT 0,
            status VARCHAR(15) DEFAULT \'waiting\', notified_at TIMESTAMP, fulfilled_at TIMESTAMP, notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_wl_status ON waitlist_entries (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX idx_wl_booking ON waitlist_entries (tenant_id, booking_id)');

        $this->addSql('CREATE TABLE charge_transfers (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL,
            from_booking_id VARCHAR(36) NOT NULL, from_room_number VARCHAR(10) NOT NULL, from_folio_id VARCHAR(36),
            to_booking_id VARCHAR(36) NOT NULL, to_room_number VARCHAR(10) NOT NULL, to_folio_id VARCHAR(36),
            requested_by VARCHAR(36) NOT NULL, requested_by_name VARCHAR(150) NOT NULL,
            description VARCHAR(200) NOT NULL, amount DECIMAL(12,0) NOT NULL, charge_id VARCHAR(36),
            status VARCHAR(15) DEFAULT \'pending\',
            approved_by VARCHAR(36), approved_by_name VARCHAR(100), reason TEXT, rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_ct_status ON charge_transfers (tenant_id, property_id, status)');
    }

    public function down(Schema $schema): void
    {
        foreach (['charge_transfers', 'waitlist_entries', 'room_control_requests', 'guest_movements', 'gate_passes', 'amenity_vouchers', 'visitor_access_codes'] as $t) {
            $this->addSql("DROP TABLE IF EXISTS $t");
        }
    }
}
