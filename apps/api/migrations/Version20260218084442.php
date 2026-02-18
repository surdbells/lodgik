<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260218084442 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE audit_logs (tenant_id VARCHAR(36) DEFAULT NULL, user_id VARCHAR(36) DEFAULT NULL, user_name VARCHAR(200) DEFAULT NULL, action VARCHAR(50) NOT NULL, entity_type VARCHAR(100) NOT NULL, entity_id VARCHAR(36) DEFAULT NULL, description TEXT DEFAULT NULL, old_values JSON DEFAULT NULL, new_values JSON DEFAULT NULL, ip_address VARCHAR(45) DEFAULT NULL, user_agent VARCHAR(500) DEFAULT NULL, request_id VARCHAR(36) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_audit_tenant ON audit_logs (tenant_id)');
        $this->addSql('CREATE INDEX idx_audit_user ON audit_logs (user_id)');
        $this->addSql('CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id)');
        $this->addSql('CREATE INDEX idx_audit_action ON audit_logs (action)');
        $this->addSql('CREATE INDEX idx_audit_created ON audit_logs (created_at)');
        $this->addSql('CREATE TABLE properties (name VARCHAR(255) NOT NULL, slug VARCHAR(100) DEFAULT NULL, email VARCHAR(320) DEFAULT NULL, phone VARCHAR(30) DEFAULT NULL, address TEXT DEFAULT NULL, city VARCHAR(100) DEFAULT NULL, state VARCHAR(100) DEFAULT NULL, country VARCHAR(3) DEFAULT \'NG\' NOT NULL, star_rating SMALLINT DEFAULT NULL, check_in_time VARCHAR(5) DEFAULT \'14:00\' NOT NULL, check_out_time VARCHAR(5) DEFAULT \'12:00\' NOT NULL, timezone VARCHAR(50) DEFAULT \'Africa/Lagos\' NOT NULL, currency VARCHAR(3) DEFAULT \'NGN\' NOT NULL, logo_url VARCHAR(500) DEFAULT NULL, cover_image_url VARCHAR(500) DEFAULT NULL, is_active BOOLEAN DEFAULT true NOT NULL, settings JSON DEFAULT NULL, id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_properties_tenant ON properties (tenant_id)');
        $this->addSql('CREATE TABLE property_bank_accounts (property_id VARCHAR(36) NOT NULL, bank_name VARCHAR(255) NOT NULL, account_number VARCHAR(20) NOT NULL, account_name VARCHAR(255) NOT NULL, bank_code VARCHAR(10) DEFAULT NULL, is_primary BOOLEAN DEFAULT false NOT NULL, is_active BOOLEAN DEFAULT true NOT NULL, id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_pba_tenant ON property_bank_accounts (tenant_id)');
        $this->addSql('CREATE INDEX idx_pba_property ON property_bank_accounts (property_id)');
        $this->addSql('CREATE TABLE refresh_tokens (user_id VARCHAR(36) NOT NULL, token_hash VARCHAR(64) NOT NULL, device_info VARCHAR(500) DEFAULT NULL, ip_address VARCHAR(45) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, revoked_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, id VARCHAR(36) NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9BACE7E1B3BC57DA ON refresh_tokens (token_hash)');
        $this->addSql('CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id)');
        $this->addSql('CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash)');
        $this->addSql('CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at)');
        $this->addSql('CREATE TABLE subscription_plans (name VARCHAR(100) NOT NULL, tier VARCHAR(50) NOT NULL, description TEXT DEFAULT NULL, monthly_price BIGINT NOT NULL, annual_price BIGINT NOT NULL, currency VARCHAR(3) DEFAULT \'NGN\' NOT NULL, max_rooms INT NOT NULL, max_staff INT NOT NULL, max_properties INT DEFAULT 1 NOT NULL, included_modules JSON NOT NULL, feature_flags JSON DEFAULT NULL, is_public BOOLEAN DEFAULT true NOT NULL, for_tenant_id VARCHAR(36) DEFAULT NULL, is_active BOOLEAN DEFAULT true NOT NULL, sort_order INT DEFAULT 0 NOT NULL, paystack_plan_code_monthly VARCHAR(100) DEFAULT NULL, paystack_plan_code_annual VARCHAR(100) DEFAULT NULL, trial_days INT DEFAULT 14 NOT NULL, id VARCHAR(36) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_CF5F99A2249E978A ON subscription_plans (tier)');
        $this->addSql('CREATE TABLE tenants (name VARCHAR(255) NOT NULL, slug VARCHAR(100) NOT NULL, email VARCHAR(320) DEFAULT NULL, phone VARCHAR(30) DEFAULT NULL, subscription_plan_id VARCHAR(36) DEFAULT NULL, subscription_status VARCHAR(20) NOT NULL, trial_ends_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, subscription_ends_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, paystack_customer_code VARCHAR(100) DEFAULT NULL, paystack_subscription_code VARCHAR(100) DEFAULT NULL, max_rooms INT DEFAULT 10 NOT NULL, max_staff INT DEFAULT 5 NOT NULL, max_properties INT DEFAULT 1 NOT NULL, enabled_modules JSON NOT NULL, primary_color VARCHAR(7) DEFAULT NULL, secondary_color VARCHAR(7) DEFAULT NULL, logo_url VARCHAR(500) DEFAULT NULL, is_active BOOLEAN DEFAULT true NOT NULL, locale VARCHAR(10) DEFAULT \'en\' NOT NULL, timezone VARCHAR(50) DEFAULT \'Africa/Lagos\' NOT NULL, currency VARCHAR(3) DEFAULT \'NGN\' NOT NULL, id VARCHAR(36) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_B8FC96BB989D9B62 ON tenants (slug)');
        $this->addSql('CREATE INDEX idx_tenants_slug ON tenants (slug)');
        $this->addSql('CREATE TABLE users (firstName VARCHAR(100) NOT NULL, lastName VARCHAR(100) NOT NULL, email VARCHAR(320) NOT NULL, phone VARCHAR(30) DEFAULT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(30) NOT NULL, property_id VARCHAR(36) DEFAULT NULL, is_active BOOLEAN DEFAULT true NOT NULL, email_verified_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, last_login_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, avatar_url VARCHAR(500) DEFAULT NULL, password_reset_token VARCHAR(100) DEFAULT NULL, password_reset_expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, invitation_token VARCHAR(100) DEFAULT NULL, invited_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_users_tenant ON users (tenant_id)');
        $this->addSql('CREATE INDEX idx_users_email ON users (email)');
        $this->addSql('CREATE UNIQUE INDEX uq_users_email_tenant ON users (email, tenant_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE audit_logs');
        $this->addSql('DROP TABLE properties');
        $this->addSql('DROP TABLE property_bank_accounts');
        $this->addSql('DROP TABLE refresh_tokens');
        $this->addSql('DROP TABLE subscription_plans');
        $this->addSql('DROP TABLE tenants');
        $this->addSql('DROP TABLE users');
    }
}
