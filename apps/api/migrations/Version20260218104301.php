<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260218104301 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add subscriptions, subscription_invoices, tenant_usage_metrics tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE subscriptions (
                id VARCHAR(36) NOT NULL,
                tenant_id VARCHAR(36) NOT NULL,
                plan_id VARCHAR(36) NOT NULL,
                billing_cycle VARCHAR(10) NOT NULL,
                status VARCHAR(20) DEFAULT 'trial' NOT NULL,
                amount BIGINT NOT NULL,
                currency VARCHAR(3) DEFAULT 'NGN' NOT NULL,
                current_period_start TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                current_period_end TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                trial_end TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                cancelled_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
                paystack_subscription_code VARCHAR(100) DEFAULT NULL,
                paystack_customer_code VARCHAR(100) DEFAULT NULL,
                paystack_email_token VARCHAR(200) DEFAULT NULL,
                paystack_authorization_code VARCHAR(200) DEFAULT NULL,
                next_payment_date TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                metadata JSON DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_subscriptions_tenant ON subscriptions (tenant_id)');
        $this->addSql('CREATE INDEX idx_subscriptions_status ON subscriptions (status)');

        $this->addSql(<<<'SQL'
            CREATE TABLE subscription_invoices (
                id VARCHAR(36) NOT NULL,
                tenant_id VARCHAR(36) NOT NULL,
                subscription_id VARCHAR(36) NOT NULL,
                plan_id VARCHAR(36) NOT NULL,
                invoice_number VARCHAR(50) NOT NULL,
                amount BIGINT NOT NULL,
                currency VARCHAR(3) DEFAULT 'NGN' NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' NOT NULL,
                billing_cycle VARCHAR(10) NOT NULL,
                period_start TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                period_end TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                paid_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                paystack_reference VARCHAR(100) DEFAULT NULL,
                paystack_transaction_id VARCHAR(50) DEFAULT NULL,
                paystack_channel VARCHAR(30) DEFAULT NULL,
                payment_data JSON DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_si_tenant ON subscription_invoices (tenant_id)');
        $this->addSql('CREATE INDEX idx_si_subscription ON subscription_invoices (subscription_id)');
        $this->addSql('CREATE INDEX idx_si_status ON subscription_invoices (status)');

        $this->addSql(<<<'SQL'
            CREATE TABLE tenant_usage_metrics (
                id VARCHAR(36) NOT NULL,
                tenant_id VARCHAR(36) NOT NULL,
                recorded_date DATE NOT NULL,
                recorded_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                rooms_used INT DEFAULT 0 NOT NULL,
                rooms_limit INT NOT NULL,
                staff_used INT DEFAULT 0 NOT NULL,
                staff_limit INT NOT NULL,
                properties_used INT DEFAULT 0 NOT NULL,
                properties_limit INT NOT NULL,
                bookings_count INT DEFAULT 0 NOT NULL,
                guests_count INT DEFAULT 0 NOT NULL,
                active_modules_count INT DEFAULT 0 NOT NULL,
                api_calls_count INT DEFAULT 0 NOT NULL,
                storage_bytes BIGINT DEFAULT 0 NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_tum_tenant ON tenant_usage_metrics (tenant_id)');
        $this->addSql('CREATE INDEX idx_tum_recorded ON tenant_usage_metrics (recorded_at)');
        $this->addSql('CREATE UNIQUE INDEX uq_tum_tenant_date ON tenant_usage_metrics (tenant_id, recorded_date)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE tenant_usage_metrics');
        $this->addSql('DROP TABLE subscription_invoices');
        $this->addSql('DROP TABLE subscriptions');
    }
}
