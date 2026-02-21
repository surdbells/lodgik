<?php
declare(strict_types=1);
namespace Lodgik\Migrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260221800001 extends AbstractMigration
{
    public function getDescription(): string { return 'Phase 8A: Financial, compliance, HR, pricing, group bookings'; }
    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE expense_categories (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, name VARCHAR(100) NOT NULL, parent_id VARCHAR(36), description TEXT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_expc_tenant ON expense_categories (tenant_id)');
        $this->addSql('CREATE TABLE expenses (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, category_id VARCHAR(36) NOT NULL, category_name VARCHAR(100) NOT NULL, description VARCHAR(200) NOT NULL, vendor VARCHAR(150), amount BIGINT NOT NULL, expense_date DATE NOT NULL, receipt_url VARCHAR(500), status VARCHAR(15) DEFAULT \'draft\', submitted_by VARCHAR(36) NOT NULL, submitted_by_name VARCHAR(100) NOT NULL, approved_by VARCHAR(36), approved_by_name VARCHAR(100), rejection_reason TEXT, notes TEXT, payment_method VARCHAR(30), reference_number VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_exp_status ON expenses (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX idx_exp_date ON expenses (tenant_id, property_id, expense_date)');
        $this->addSql('CREATE TABLE night_audits (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, audit_date DATE NOT NULL, rooms_occupied INT DEFAULT 0, rooms_available INT DEFAULT 0, total_rooms INT DEFAULT 0, check_ins INT DEFAULT 0, check_outs INT DEFAULT 0, no_shows INT DEFAULT 0, room_revenue BIGINT DEFAULT 0, fnb_revenue BIGINT DEFAULT 0, other_revenue BIGINT DEFAULT 0, total_revenue BIGINT DEFAULT 0, total_expenses BIGINT DEFAULT 0, outstanding_balance BIGINT DEFAULT 0, cash_collected BIGINT DEFAULT 0, card_collected BIGINT DEFAULT 0, transfer_collected BIGINT DEFAULT 0, occupancy_rate DECIMAL(5,2) DEFAULT 0.00, adr DECIMAL(12,2) DEFAULT 0.00, revpar DECIMAL(12,2) DEFAULT 0.00, discrepancies JSON, notes TEXT, status VARCHAR(10) DEFAULT \'open\', closed_by VARCHAR(36), closed_by_name VARCHAR(100), closed_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), CONSTRAINT uq_na_date UNIQUE (tenant_id, property_id, audit_date))');
        $this->addSql('CREATE TABLE police_reports (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, booking_id VARCHAR(36) NOT NULL, guest_id VARCHAR(36) NOT NULL, guest_name VARCHAR(200) NOT NULL, nationality VARCHAR(50), id_type VARCHAR(30), id_number VARCHAR(50), address TEXT, phone VARCHAR(20), email VARCHAR(100), purpose_of_visit VARCHAR(100), arrival_date DATE NOT NULL, departure_date DATE, room_number VARCHAR(10), accompanying_persons INT DEFAULT 0, vehicle_plate VARCHAR(20), remarks TEXT, submitted_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_pr_arrival ON police_reports (tenant_id, property_id, arrival_date)');
        $this->addSql('CREATE INDEX idx_pr_booking ON police_reports (tenant_id, booking_id)');
        $this->addSql('CREATE TABLE performance_reviews (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, employee_id VARCHAR(36) NOT NULL, employee_name VARCHAR(150) NOT NULL, reviewer_id VARCHAR(36) NOT NULL, reviewer_name VARCHAR(150) NOT NULL, period VARCHAR(10) NOT NULL, year INT NOT NULL, overall_rating INT NOT NULL, ratings JSON, strengths TEXT, improvements TEXT, action_items TEXT, goals JSON, status VARCHAR(15) DEFAULT \'draft\', submitted_at TIMESTAMP, acknowledged_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_perf_emp ON performance_reviews (tenant_id, employee_id)');
        $this->addSql('CREATE TABLE pricing_rules (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, room_type_id VARCHAR(36), name VARCHAR(100) NOT NULL, rule_type VARCHAR(20) NOT NULL, adjustment_type VARCHAR(15) NOT NULL, adjustment_value DECIMAL(10,2) NOT NULL, start_date DATE, end_date DATE, days_of_week JSON, min_occupancy INT, max_occupancy INT, min_nights INT, advance_days INT, priority INT DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_prul_active ON pricing_rules (tenant_id, property_id, is_active)');
        $this->addSql('CREATE TABLE group_bookings (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, name VARCHAR(200) NOT NULL, booking_type VARCHAR(20) NOT NULL, contact_name VARCHAR(150) NOT NULL, contact_email VARCHAR(150), contact_phone VARCHAR(20), company_name VARCHAR(200), discount_percentage DECIMAL(5,2) DEFAULT 0.00, total_rooms INT DEFAULT 1, check_in DATE NOT NULL, check_out DATE NOT NULL, master_folio_id VARCHAR(36), status VARCHAR(15) DEFAULT \'tentative\', notes TEXT, special_requirements TEXT, created_by VARCHAR(36), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_gb_prop ON group_bookings (tenant_id, property_id)');
        $this->addSql('ALTER TABLE bookings ADD COLUMN group_booking_id VARCHAR(36)');
        $this->addSql('ALTER TABLE bookings ADD COLUMN corporate_name VARCHAR(200)');
    }
    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE bookings DROP COLUMN IF EXISTS group_booking_id');
        $this->addSql('ALTER TABLE bookings DROP COLUMN IF EXISTS corporate_name');
        $this->addSql('DROP TABLE IF EXISTS group_bookings');
        $this->addSql('DROP TABLE IF EXISTS pricing_rules');
        $this->addSql('DROP TABLE IF EXISTS performance_reviews');
        $this->addSql('DROP TABLE IF EXISTS police_reports');
        $this->addSql('DROP TABLE IF EXISTS night_audits');
        $this->addSql('DROP TABLE IF EXISTS expenses');
        $this->addSql('DROP TABLE IF EXISTS expense_categories');
    }
}
