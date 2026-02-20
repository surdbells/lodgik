<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260220600001 extends AbstractMigration
{
    public function getDescription(): string { return 'Phase 6: Housekeeping + POS/F&B tables'; }

    public function up(Schema $schema): void
    {
        // ─── Housekeeping Tasks ─────────────────────────────────
        $this->addSql('CREATE TABLE housekeeping_tasks (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL, room_id VARCHAR(36) NOT NULL,
            room_number VARCHAR(20) NOT NULL, task_type VARCHAR(30) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT \'pending\', priority INTEGER DEFAULT 3,
            assigned_to VARCHAR(36) DEFAULT NULL, assigned_to_name VARCHAR(100) DEFAULT NULL,
            booking_id VARCHAR(36) DEFAULT NULL,
            started_at TIMESTAMP DEFAULT NULL, completed_at TIMESTAMP DEFAULT NULL,
            inspected_by VARCHAR(36) DEFAULT NULL, inspected_at TIMESTAMP DEFAULT NULL,
            inspection_passed BOOLEAN DEFAULT NULL, inspection_notes TEXT DEFAULT NULL,
            checklist TEXT DEFAULT NULL, photo_before TEXT DEFAULT NULL, photo_after TEXT DEFAULT NULL,
            notes TEXT DEFAULT NULL, estimated_minutes INTEGER DEFAULT 30,
            due_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_hkt_status ON housekeeping_tasks (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX idx_hkt_assigned ON housekeeping_tasks (tenant_id, assigned_to)');

        // ─── Lost & Found ───────────────────────────────────────
        $this->addSql('CREATE TABLE lost_and_found (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL, description VARCHAR(200) NOT NULL,
            found_location VARCHAR(100) NOT NULL, room_id VARCHAR(36) DEFAULT NULL,
            found_by VARCHAR(36) NOT NULL, found_at TIMESTAMP NOT NULL,
            photo_url TEXT DEFAULT NULL, status VARCHAR(20) DEFAULT \'stored\',
            claimed_by VARCHAR(200) DEFAULT NULL, claimed_at TIMESTAMP DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_laf_status ON lost_and_found (tenant_id, property_id, status)');

        // ─── POS Tables ─────────────────────────────────────────
        $this->addSql('CREATE TABLE pos_tables (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL, number VARCHAR(20) NOT NULL,
            seats INTEGER DEFAULT 4, section VARCHAR(30) DEFAULT \'restaurant\',
            qr_code VARCHAR(50) DEFAULT NULL, status VARCHAR(20) DEFAULT \'available\',
            current_order_id VARCHAR(36) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_pt_property ON pos_tables (tenant_id, property_id)');

        // ─── POS Categories ─────────────────────────────────────
        $this->addSql('CREATE TABLE pos_categories (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL, name VARCHAR(100) NOT NULL,
            type VARCHAR(30) DEFAULT \'food\', sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');

        // ─── POS Products ───────────────────────────────────────
        $this->addSql('CREATE TABLE pos_products (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL, category_id VARCHAR(36) NOT NULL,
            name VARCHAR(150) NOT NULL, description TEXT DEFAULT NULL,
            price BIGINT NOT NULL, is_available BOOLEAN DEFAULT true,
            prep_time_minutes INTEGER DEFAULT 15, sort_order INTEGER DEFAULT 0,
            requires_kitchen BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_pp_category ON pos_products (tenant_id, property_id, category_id)');

        // ─── POS Orders ─────────────────────────────────────────
        $this->addSql('CREATE TABLE pos_orders (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL, order_number VARCHAR(20) NOT NULL,
            table_id VARCHAR(36) DEFAULT NULL, table_number VARCHAR(20) DEFAULT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'open\', order_type VARCHAR(20) DEFAULT \'dine_in\',
            subtotal BIGINT DEFAULT 0, total_amount BIGINT DEFAULT 0,
            payment_type VARCHAR(20) DEFAULT NULL, payment_method VARCHAR(20) DEFAULT NULL,
            folio_id VARCHAR(36) DEFAULT NULL, booking_id VARCHAR(36) DEFAULT NULL,
            guest_name VARCHAR(100) DEFAULT NULL, room_number VARCHAR(20) DEFAULT NULL,
            served_by VARCHAR(36) DEFAULT NULL, served_by_name VARCHAR(100) DEFAULT NULL,
            notes TEXT DEFAULT NULL, split_from VARCHAR(36) DEFAULT NULL,
            paid_at TIMESTAMP DEFAULT NULL, item_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_po_status ON pos_orders (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX idx_po_table ON pos_orders (tenant_id, table_id)');

        // ─── POS Order Items ────────────────────────────────────
        $this->addSql('CREATE TABLE pos_order_items (
            id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL,
            order_id VARCHAR(36) NOT NULL, product_id VARCHAR(36) NOT NULL,
            product_name VARCHAR(150) NOT NULL, quantity INTEGER NOT NULL,
            unit_price BIGINT NOT NULL, line_total BIGINT NOT NULL,
            status VARCHAR(20) DEFAULT \'pending\', notes TEXT DEFAULT NULL,
            requires_kitchen BOOLEAN DEFAULT true, split_group INTEGER DEFAULT 1,
            prep_started_at TIMESTAMP DEFAULT NULL, ready_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_poi_order ON pos_order_items (tenant_id, order_id)');
    }

    public function down(Schema $schema): void
    {
        foreach (['pos_order_items','pos_orders','pos_products','pos_categories','pos_tables','lost_and_found','housekeeping_tasks'] as $t) {
            $this->addSql("DROP TABLE IF EXISTS {$t}");
        }
    }
}
