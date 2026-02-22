<?php
declare(strict_types=1);
namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260222900001 extends AbstractMigration
{
    public function getDescription(): string { return 'Phase 9: Merchant module — 14 tables'; }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE merchants (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(20) NOT NULL, legal_name VARCHAR(255) NOT NULL,
            business_name VARCHAR(255) NOT NULL, email VARCHAR(320) NOT NULL, phone VARCHAR(20) DEFAULT NULL,
            address TEXT DEFAULT NULL, operating_region VARCHAR(100) DEFAULT NULL,
            category VARCHAR(20) NOT NULL DEFAULT 'sales_agent', type VARCHAR(20) NOT NULL DEFAULT 'individual',
            commission_tier_id VARCHAR(36) DEFAULT NULL, settlement_currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
            status VARCHAR(30) NOT NULL DEFAULT 'pending_approval', user_id VARCHAR(36) DEFAULT NULL,
            logo_url VARCHAR(255) DEFAULT NULL, suspension_reason TEXT DEFAULT NULL,
            approved_at TIMESTAMP NULL DEFAULT NULL, suspended_at TIMESTAMP NULL DEFAULT NULL,
            terminated_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), UNIQUE KEY uq_merchants_mid (merchant_id),
            INDEX idx_merchants_status (status), INDEX idx_merchants_merchant_id (merchant_id), INDEX idx_merchants_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_kyc (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL, kyc_type VARCHAR(20) NOT NULL DEFAULT 'individual',
            government_id_type VARCHAR(30) DEFAULT NULL, government_id_number VARCHAR(50) DEFAULT NULL,
            government_id_url VARCHAR(500) DEFAULT NULL, selfie_url VARCHAR(500) DEFAULT NULL,
            liveness_verified TINYINT(1) NOT NULL DEFAULT 0, proof_of_address_url VARCHAR(500) DEFAULT NULL,
            cac_certificate_url VARCHAR(500) DEFAULT NULL, director_ids JSON DEFAULT NULL,
            business_address_verification_url VARCHAR(500) DEFAULT NULL, company_bank_verified TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'not_submitted', rejection_reason TEXT DEFAULT NULL,
            reviewed_by VARCHAR(36) DEFAULT NULL, reviewed_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_mkyc_merchant (merchant_id), INDEX idx_mkyc_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_bank_accounts (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL, bank_name VARCHAR(100) NOT NULL,
            account_name VARCHAR(100) NOT NULL, account_number VARCHAR(20) NOT NULL,
            settlement_currency VARCHAR(3) NOT NULL DEFAULT 'NGN', payment_method VARCHAR(20) NOT NULL DEFAULT 'bank_transfer',
            tin VARCHAR(20) DEFAULT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending_approval',
            change_requires_approval TINYINT(1) NOT NULL DEFAULT 1,
            approved_by VARCHAR(36) DEFAULT NULL, approved_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_mba_merchant (merchant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_hotels (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL, tenant_id VARCHAR(36) DEFAULT NULL,
            property_id VARCHAR(36) DEFAULT NULL, hotel_name VARCHAR(255) NOT NULL,
            location VARCHAR(255) DEFAULT NULL, contact_person VARCHAR(100) DEFAULT NULL,
            contact_phone VARCHAR(20) DEFAULT NULL, contact_email VARCHAR(320) DEFAULT NULL,
            rooms_count INT NOT NULL DEFAULT 0, hotel_category VARCHAR(20) NOT NULL DEFAULT 'budget',
            subscription_plan VARCHAR(36) DEFAULT NULL, onboarding_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            bound_at TIMESTAMP NULL DEFAULT NULL, is_permanent_bind TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_mh_merchant (merchant_id), INDEX idx_mh_tenant (tenant_id), INDEX idx_mh_status (onboarding_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE commission_tiers (
            id VARCHAR(36) NOT NULL, name VARCHAR(100) NOT NULL, description TEXT DEFAULT NULL,
            type VARCHAR(20) NOT NULL DEFAULT 'percentage',
            new_subscription_rate DECIMAL(10,2) NOT NULL DEFAULT 10.00,
            renewal_rate DECIMAL(10,2) NOT NULL DEFAULT 5.00,
            upgrade_rate DECIMAL(10,2) NOT NULL DEFAULT 8.00,
            plan_overrides JSON DEFAULT NULL, is_default TINYINT(1) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE commissions (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL, hotel_id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL, subscription_id VARCHAR(36) DEFAULT NULL,
            commission_tier_id VARCHAR(36) DEFAULT NULL, scope VARCHAR(20) NOT NULL,
            plan_name VARCHAR(50) DEFAULT NULL, billing_cycle VARCHAR(10) DEFAULT NULL,
            subscription_amount DECIMAL(12,2) NOT NULL, commission_rate DECIMAL(10,2) NOT NULL,
            commission_amount DECIMAL(12,2) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending',
            cooling_period_ends TIMESTAMP NULL DEFAULT NULL, approved_at TIMESTAMP NULL DEFAULT NULL,
            paid_at TIMESTAMP NULL DEFAULT NULL, payment_reference VARCHAR(100) DEFAULT NULL,
            reversed_at TIMESTAMP NULL DEFAULT NULL, reversal_reason TEXT DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_comm_merchant (merchant_id), INDEX idx_comm_status (status), INDEX idx_comm_tenant (tenant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE commission_payouts (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL, payout_period VARCHAR(20) NOT NULL,
            total_amount DECIMAL(12,2) NOT NULL, commission_ids JSON NOT NULL,
            bank_account_id VARCHAR(36) DEFAULT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending',
            payment_reference VARCHAR(100) DEFAULT NULL, processing_started_at TIMESTAMP NULL DEFAULT NULL,
            paid_at TIMESTAMP NULL DEFAULT NULL, failure_reason TEXT DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_cpay_merchant (merchant_id), INDEX idx_cpay_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_resources (
            id VARCHAR(36) NOT NULL, title VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL,
            category VARCHAR(30) NOT NULL DEFAULT 'user_manual', sub_category VARCHAR(50) DEFAULT NULL,
            file_type VARCHAR(10) NOT NULL DEFAULT 'pdf', file_url VARCHAR(500) NOT NULL,
            file_size INT NOT NULL DEFAULT 0, version VARCHAR(10) NOT NULL DEFAULT 'v1.0',
            visibility VARCHAR(10) NOT NULL DEFAULT 'merchant', status VARCHAR(10) NOT NULL DEFAULT 'active',
            uploaded_by VARCHAR(36) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_mres_cat (category), INDEX idx_mres_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_resource_downloads (
            id VARCHAR(36) NOT NULL, resource_id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL,
            downloaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45) DEFAULT NULL, user_agent VARCHAR(500) DEFAULT NULL,
            PRIMARY KEY (id), INDEX idx_mrd_res (resource_id), INDEX idx_mrd_merch (merchant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_support_tickets (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL, hotel_id VARCHAR(36) DEFAULT NULL,
            subject VARCHAR(255) NOT NULL, description TEXT NOT NULL,
            priority_tag VARCHAR(20) NOT NULL DEFAULT 'sales', status VARCHAR(20) NOT NULL DEFAULT 'open',
            assigned_to VARCHAR(36) DEFAULT NULL, sla_due_at TIMESTAMP NULL DEFAULT NULL,
            resolved_at TIMESTAMP NULL DEFAULT NULL, resolution_notes TEXT DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_mst_merch (merchant_id), INDEX idx_mst_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_audit_logs (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL, actor_id VARCHAR(36) NOT NULL,
            actor_type VARCHAR(10) NOT NULL DEFAULT 'merchant', action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50) DEFAULT NULL, entity_id VARCHAR(36) DEFAULT NULL,
            old_value JSON DEFAULT NULL, new_value JSON DEFAULT NULL,
            ip_address VARCHAR(45) DEFAULT NULL, user_agent VARCHAR(500) DEFAULT NULL,
            timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_mal_merch (merchant_id), INDEX idx_mal_action (action)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_notifications (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL, type VARCHAR(30) NOT NULL,
            title VARCHAR(255) NOT NULL, body TEXT NOT NULL, data JSON DEFAULT NULL,
            channel VARCHAR(10) NOT NULL DEFAULT 'in_app', is_read TINYINT(1) NOT NULL DEFAULT 0,
            sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_mn_merch_read (merchant_id, is_read)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_leads (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL, hotel_name VARCHAR(255) NOT NULL,
            contact_name VARCHAR(100) DEFAULT NULL, contact_phone VARCHAR(20) DEFAULT NULL,
            contact_email VARCHAR(320) DEFAULT NULL, location VARCHAR(255) DEFAULT NULL,
            rooms_estimate INT NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'lead',
            notes TEXT DEFAULT NULL, converted_hotel_id VARCHAR(36) DEFAULT NULL,
            follow_up_date DATE DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id), INDEX idx_ml_merch (merchant_id), INDEX idx_ml_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $this->addSql("CREATE TABLE merchant_statements (
            id VARCHAR(36) NOT NULL, merchant_id VARCHAR(36) NOT NULL,
            period_start DATE NOT NULL, period_end DATE NOT NULL,
            opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            total_earned DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            total_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            closing_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            file_url VARCHAR(500) DEFAULT NULL,
            PRIMARY KEY (id), INDEX idx_ms_merch (merchant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }

    public function down(Schema $schema): void
    {
        foreach (['merchant_statements','merchant_leads','merchant_notifications','merchant_audit_logs',
            'merchant_support_tickets','merchant_resource_downloads','merchant_resources','commission_payouts',
            'commissions','commission_tiers','merchant_hotels','merchant_bank_accounts','merchant_kyc','merchants'] as $t) {
            $this->addSql("DROP TABLE IF EXISTS $t");
        }
    }
}
