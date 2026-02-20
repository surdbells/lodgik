<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260220500001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 5A: Gym Membership Management tables';
    }

    public function up(Schema $schema): void
    {
        // ─── Membership Plans ───────────────────────────────────
        $this->addSql('CREATE TABLE gym_membership_plans (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT DEFAULT NULL,
            duration_days INTEGER NOT NULL,
            price BIGINT NOT NULL,
            max_classes INTEGER DEFAULT NULL,
            includes_pool BOOLEAN DEFAULT false NOT NULL,
            includes_classes BOOLEAN DEFAULT true NOT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            sort_order INTEGER DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_gmp_property ON gym_membership_plans (tenant_id, property_id)');

        // ─── Members ────────────────────────────────────────────
        $this->addSql('CREATE TABLE gym_members (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(150) DEFAULT NULL,
            phone VARCHAR(20) NOT NULL,
            member_type VARCHAR(20) DEFAULT \'external\' NOT NULL,
            guest_id VARCHAR(36) DEFAULT NULL,
            booking_id VARCHAR(36) DEFAULT NULL,
            date_of_birth DATE DEFAULT NULL,
            gender VARCHAR(10) DEFAULT NULL,
            emergency_contact VARCHAR(200) DEFAULT NULL,
            photo_url TEXT DEFAULT NULL,
            qr_code VARCHAR(50) DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            is_active BOOLEAN DEFAULT true NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_gm_property ON gym_members (tenant_id, property_id)');
        $this->addSql('CREATE INDEX idx_gm_email ON gym_members (tenant_id, email)');
        $this->addSql('CREATE INDEX idx_gm_phone ON gym_members (tenant_id, phone)');

        // ─── Memberships ────────────────────────────────────────
        $this->addSql('CREATE TABLE gym_memberships (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            member_id VARCHAR(36) NOT NULL,
            plan_id VARCHAR(36) NOT NULL,
            plan_name VARCHAR(100) NOT NULL,
            price_paid BIGINT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'active\',
            starts_at TIMESTAMP NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            suspended_at TIMESTAMP DEFAULT NULL,
            cancelled_at TIMESTAMP DEFAULT NULL,
            freeze_days_used INTEGER DEFAULT 0 NOT NULL,
            notes TEXT DEFAULT NULL,
            expiry_alert_sent BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_gms_member ON gym_memberships (tenant_id, member_id)');
        $this->addSql('CREATE INDEX idx_gms_status ON gym_memberships (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX idx_gms_expiry ON gym_memberships (tenant_id, expires_at)');

        // ─── Membership Payments ────────────────────────────────
        $this->addSql('CREATE TABLE gym_membership_payments (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            membership_id VARCHAR(36) NOT NULL,
            member_id VARCHAR(36) NOT NULL,
            amount BIGINT NOT NULL,
            payment_method VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'confirmed\',
            payment_date TIMESTAMP NOT NULL,
            transfer_reference VARCHAR(100) DEFAULT NULL,
            recorded_by VARCHAR(36) DEFAULT NULL,
            confirmed_by VARCHAR(36) DEFAULT NULL,
            confirmed_at TIMESTAMP DEFAULT NULL,
            payment_type VARCHAR(20) DEFAULT \'new\' NOT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_gmpay_membership ON gym_membership_payments (tenant_id, membership_id)');
        $this->addSql('CREATE INDEX idx_gmpay_property ON gym_membership_payments (tenant_id, property_id)');

        // ─── Visit Logs ─────────────────────────────────────────
        $this->addSql('CREATE TABLE gym_visit_logs (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            member_id VARCHAR(36) NOT NULL,
            membership_id VARCHAR(36) DEFAULT NULL,
            check_in_method VARCHAR(20) NOT NULL,
            checked_in_at TIMESTAMP NOT NULL,
            checked_out_at TIMESTAMP DEFAULT NULL,
            checked_in_by VARCHAR(36) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_gvl_date ON gym_visit_logs (tenant_id, property_id, checked_in_at)');
        $this->addSql('CREATE INDEX idx_gvl_member ON gym_visit_logs (tenant_id, member_id)');

        // ─── Classes ────────────────────────────────────────────
        $this->addSql('CREATE TABLE gym_classes (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT DEFAULT NULL,
            instructor_name VARCHAR(100) DEFAULT NULL,
            scheduled_at TIMESTAMP NOT NULL,
            duration_minutes INTEGER DEFAULT 60 NOT NULL,
            max_capacity INTEGER DEFAULT 20 NOT NULL,
            current_bookings INTEGER DEFAULT 0 NOT NULL,
            category VARCHAR(30) DEFAULT \'other\' NOT NULL,
            location VARCHAR(50) DEFAULT NULL,
            recurrence VARCHAR(20) DEFAULT \'none\' NOT NULL,
            is_cancelled BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_gc_schedule ON gym_classes (tenant_id, property_id, scheduled_at)');

        // ─── Class Bookings ─────────────────────────────────────
        $this->addSql('CREATE TABLE gym_class_bookings (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            class_id VARCHAR(36) NOT NULL,
            member_id VARCHAR(36) NOT NULL,
            status VARCHAR(20) DEFAULT \'booked\' NOT NULL,
            cancelled_at TIMESTAMP DEFAULT NULL,
            attended_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_gcb_class ON gym_class_bookings (tenant_id, class_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS gym_class_bookings');
        $this->addSql('DROP TABLE IF EXISTS gym_classes');
        $this->addSql('DROP TABLE IF EXISTS gym_visit_logs');
        $this->addSql('DROP TABLE IF EXISTS gym_membership_payments');
        $this->addSql('DROP TABLE IF EXISTS gym_memberships');
        $this->addSql('DROP TABLE IF EXISTS gym_members');
        $this->addSql('DROP TABLE IF EXISTS gym_membership_plans');
    }
}
