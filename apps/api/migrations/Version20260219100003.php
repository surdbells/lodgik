<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260219100003 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 1C: bookings, booking_addons, booking_status_logs tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE bookings (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            guest_id VARCHAR(36) NOT NULL,
            room_id VARCHAR(36) DEFAULT NULL,
            booking_ref VARCHAR(20) NOT NULL,
            booking_type VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'pending\',
            check_in TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            check_out TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            duration_hours SMALLINT DEFAULT NULL,
            adults SMALLINT NOT NULL DEFAULT 1,
            children SMALLINT NOT NULL DEFAULT 0,
            rate_per_night NUMERIC(12, 2) NOT NULL,
            total_amount NUMERIC(12, 2) NOT NULL,
            discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            notes TEXT DEFAULT NULL,
            source VARCHAR(50) DEFAULT NULL,
            special_requests TEXT DEFAULT NULL,
            created_by VARCHAR(36) DEFAULT NULL,
            checked_in_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            checked_out_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_bookings_tenant ON bookings (tenant_id)');
        $this->addSql('CREATE INDEX idx_bookings_tenant_property ON bookings (tenant_id, property_id)');
        $this->addSql('CREATE INDEX idx_bookings_tenant_status ON bookings (tenant_id, status)');
        $this->addSql('CREATE INDEX idx_bookings_room_dates ON bookings (tenant_id, room_id, check_in, check_out)');
        $this->addSql('CREATE INDEX idx_bookings_guest ON bookings (tenant_id, guest_id)');
        $this->addSql('CREATE UNIQUE INDEX uq_bookings_ref ON bookings (tenant_id, booking_ref)');

        $this->addSql('CREATE TABLE booking_addons (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL,
            name VARCHAR(150) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            quantity SMALLINT NOT NULL DEFAULT 1,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_booking_addons_booking ON booking_addons (tenant_id, booking_id)');

        $this->addSql('CREATE TABLE booking_status_logs (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL,
            old_status VARCHAR(20) NOT NULL,
            new_status VARCHAR(20) NOT NULL,
            changed_by VARCHAR(36) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_booking_status_logs_booking ON booking_status_logs (tenant_id, booking_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS booking_status_logs');
        $this->addSql('DROP TABLE IF EXISTS booking_addons');
        $this->addSql('DROP TABLE IF EXISTS bookings');
    }
}
