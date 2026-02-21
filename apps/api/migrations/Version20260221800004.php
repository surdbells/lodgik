<?php
declare(strict_types=1);
namespace Lodgik\Migrations;
use Doctrine\DBAL\Schema\Schema; use Doctrine\Migrations\AbstractMigration;

final class Version20260221800004 extends AbstractMigration
{
    public function getDescription(): string { return 'Phase 8D+8E: CRM, loyalty, analytics, OTA, spa, IoT'; }
    public function up(Schema $schema): void
    {
        // 8D
        $this->addSql('CREATE TABLE loyalty_tiers (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, name VARCHAR(50) NOT NULL, min_points INT NOT NULL, discount_percentage DECIMAL(5,2) DEFAULT 0.00, benefits JSON, priority INT DEFAULT 0, color VARCHAR(20), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_lt_priority ON loyalty_tiers (tenant_id, priority)');
        $this->addSql('CREATE TABLE loyalty_points (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, guest_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, points INT NOT NULL, source VARCHAR(15) NOT NULL, transaction_type VARCHAR(10) NOT NULL, reference_id VARCHAR(36), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_lp_guest ON loyalty_points (tenant_id, guest_id)');
        $this->addSql('CREATE TABLE promotions (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, code VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, type VARCHAR(15) NOT NULL, value DECIMAL(10,2) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, usage_limit INT, usage_count INT DEFAULT 0, min_booking_amount BIGINT, applicable_room_types JSON, is_active BOOLEAN DEFAULT TRUE, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_promo_code ON promotions (tenant_id, code)');
        $this->addSql('CREATE INDEX idx_promo_active ON promotions (tenant_id, property_id, is_active)');
        $this->addSql('CREATE TABLE guest_preferences (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, guest_id VARCHAR(36) NOT NULL, room_preferences JSON, dietary_restrictions JSON, special_occasions JSON, communication_preference VARCHAR(15) DEFAULT \'whatsapp\', notes TEXT, vip_status BOOLEAN DEFAULT FALSE, preferred_language VARCHAR(5) DEFAULT \'en\', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_gp_guest ON guest_preferences (tenant_id, guest_id)');
        // 8E
        $this->addSql('CREATE TABLE ota_channels (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, channel_name VARCHAR(30) NOT NULL, display_name VARCHAR(100) NOT NULL, credentials JSON, room_type_mapping JSON, rate_plan_mapping JSON, commission_percentage DECIMAL(5,2) DEFAULT 15.00, sync_status VARCHAR(15) DEFAULT \'disconnected\', last_sync_at TIMESTAMP, is_active BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_ota_prop ON ota_channels (tenant_id, property_id)');
        $this->addSql('CREATE TABLE ota_reservations (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, channel_id VARCHAR(36) NOT NULL, channel_name VARCHAR(30) NOT NULL, external_id VARCHAR(100) NOT NULL, booking_id VARCHAR(36), guest_name VARCHAR(200) NOT NULL, check_in DATE NOT NULL, check_out DATE NOT NULL, amount BIGINT NOT NULL, commission BIGINT, sync_status VARCHAR(15) DEFAULT \'pending\', raw_data JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_otar_ch ON ota_reservations (tenant_id, channel_id)');
        $this->addSql('CREATE INDEX idx_otar_ext ON ota_reservations (tenant_id, external_id)');
        $this->addSql('CREATE TABLE spa_services (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, name VARCHAR(100) NOT NULL, description TEXT, category VARCHAR(50) NOT NULL, duration_minutes INT NOT NULL, price BIGINT NOT NULL, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_spa_prop ON spa_services (tenant_id, property_id)');
        $this->addSql('CREATE TABLE spa_bookings (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, service_id VARCHAR(36) NOT NULL, service_name VARCHAR(100) NOT NULL, guest_id VARCHAR(36) NOT NULL, guest_name VARCHAR(200) NOT NULL, therapist_name VARCHAR(150), booking_date DATE NOT NULL, start_time VARCHAR(5) NOT NULL, price BIGINT NOT NULL, status VARCHAR(15) DEFAULT \'booked\', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_spab_date ON spa_bookings (tenant_id, property_id, booking_date)');
        $this->addSql('CREATE TABLE pool_access_logs (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, guest_id VARCHAR(36) NOT NULL, guest_name VARCHAR(200) NOT NULL, area VARCHAR(50) DEFAULT \'main_pool\', access_date DATE NOT NULL, check_in_time VARCHAR(5) NOT NULL, check_out_time VARCHAR(5), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_pool_date ON pool_access_logs (tenant_id, property_id, access_date)');
        $this->addSql('CREATE TABLE iot_devices (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, room_id VARCHAR(36), room_number VARCHAR(20), device_type VARCHAR(20) NOT NULL, name VARCHAR(100) NOT NULL, mqtt_topic VARCHAR(200), current_state JSON, status VARCHAR(10) DEFAULT \'offline\', last_seen TIMESTAMP, energy_kwh DECIMAL(10,2) DEFAULT 0.00, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_iot_room ON iot_devices (tenant_id, property_id, room_id)');
        $this->addSql('CREATE TABLE iot_automations (id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, property_id VARCHAR(36) NOT NULL, name VARCHAR(100) NOT NULL, trigger_type VARCHAR(15) NOT NULL, trigger_config JSON NOT NULL, actions JSON NOT NULL, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_iota_active ON iot_automations (tenant_id, property_id, is_active)');
    }
    public function down(Schema $schema): void
    {
        foreach (['iot_automations','iot_devices','pool_access_logs','spa_bookings','spa_services','ota_reservations','ota_channels','guest_preferences','promotions','loyalty_points','loyalty_tiers'] as $t) $this->addSql("DROP TABLE IF EXISTS $t");
    }
}
