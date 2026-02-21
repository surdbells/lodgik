<?php
declare(strict_types=1);
namespace Lodgik\Migrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260221800002 extends AbstractMigration
{
    public function getDescription(): string { return 'Phase 8B: Asset Management — categories, assets, engineers, incidents, PM, logs'; }
    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE asset_categories (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, name VARCHAR(100) NOT NULL, parent_id VARCHAR(36), icon VARCHAR(50), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_acat_tenant ON asset_categories (tenant_id)');

        $this->addSql('CREATE TABLE assets (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, category_id VARCHAR(36) NOT NULL, category_name VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL, brand VARCHAR(100), model VARCHAR(100), serial_number VARCHAR(100), purchase_date DATE, warranty_expiry DATE, purchase_cost BIGINT, qr_code VARCHAR(50), status VARCHAR(15) DEFAULT \'active\', criticality VARCHAR(10) DEFAULT \'medium\', location_block VARCHAR(50), location_floor VARCHAR(20), location_room VARCHAR(50), custodian_dept VARCHAR(50), custodian_staff_id VARCHAR(36), custodian_staff_name VARCHAR(100), primary_engineer_id VARCHAR(36), backup_engineer_id VARCHAR(36), notes TEXT, photo_url VARCHAR(500), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_asset_status ON assets (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX idx_asset_qr ON assets (tenant_id, qr_code)');

        $this->addSql('CREATE TABLE service_engineers (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, name VARCHAR(150) NOT NULL, company VARCHAR(150), engineer_type VARCHAR(10) NOT NULL, specialization VARCHAR(30) NOT NULL, phone VARCHAR(20) NOT NULL, emergency_phone VARCHAR(20), email VARCHAR(150), whatsapp VARCHAR(20), sla_response_minutes INT DEFAULT 60, sla_resolution_minutes INT DEFAULT 240, availability VARCHAR(15) DEFAULT \'business_hours\', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_eng_prop ON service_engineers (tenant_id, property_id)');

        $this->addSql('CREATE TABLE asset_incidents (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, asset_id VARCHAR(36) NOT NULL, asset_name VARCHAR(200) NOT NULL, location_description VARCHAR(200), incident_type VARCHAR(20) NOT NULL, priority VARCHAR(10) NOT NULL, description TEXT NOT NULL, photo_urls JSON, reporter_id VARCHAR(36) NOT NULL, reporter_name VARCHAR(100) NOT NULL, assigned_engineer_id VARCHAR(36), assigned_engineer_name VARCHAR(100), backup_engineer_id VARCHAR(36), status VARCHAR(15) DEFAULT \'new\', escalation_level INT DEFAULT 0, resolution_notes TEXT, downtime_minutes INT, repair_cost BIGINT, assigned_at TIMESTAMP, resolved_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_ai_status ON asset_incidents (tenant_id, property_id, status)');
        $this->addSql('CREATE INDEX idx_ai_asset ON asset_incidents (tenant_id, asset_id)');

        $this->addSql('CREATE TABLE preventive_maintenance (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, asset_id VARCHAR(36) NOT NULL, asset_name VARCHAR(200) NOT NULL, schedule_type VARCHAR(15) NOT NULL, last_performed DATE, next_due DATE NOT NULL, assigned_engineer_id VARCHAR(36), assigned_engineer_name VARCHAR(100), checklist JSON, status VARCHAR(12) DEFAULT \'scheduled\', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_pm_due ON preventive_maintenance (tenant_id, property_id, next_due)');

        $this->addSql('CREATE TABLE maintenance_logs (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, asset_id VARCHAR(36) NOT NULL, incident_id VARCHAR(36), pm_id VARCHAR(36), engineer_id VARCHAR(36) NOT NULL, engineer_name VARCHAR(100) NOT NULL, action_taken TEXT NOT NULL, parts_replaced TEXT, cost BIGINT, downtime_minutes INT, log_date DATE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_ml_asset ON maintenance_logs (tenant_id, asset_id)');
    }
    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS maintenance_logs');
        $this->addSql('DROP TABLE IF EXISTS preventive_maintenance');
        $this->addSql('DROP TABLE IF EXISTS asset_incidents');
        $this->addSql('DROP TABLE IF EXISTS service_engineers');
        $this->addSql('DROP TABLE IF EXISTS assets');
        $this->addSql('DROP TABLE IF EXISTS asset_categories');
    }
}
