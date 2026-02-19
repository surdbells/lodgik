<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260219200001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 2: Finance — folios, charges, payments, adjustments, invoices, invoice_items, tax_configurations';
    }

    public function up(Schema $schema): void
    {
        // ─── Folios ───────────────────────────────────────────
        $this->addSql('CREATE TABLE folios (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL,
            guest_id VARCHAR(36) NOT NULL,
            folio_number VARCHAR(30) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'open\',
            total_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            total_payments DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            total_adjustments DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            closed_at TIMESTAMP NULL,
            closed_by VARCHAR(36) NULL,
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_folio_tenant ON folios (tenant_id)');
        $this->addSql('CREATE INDEX idx_folio_booking ON folios (tenant_id, booking_id)');
        $this->addSql('CREATE INDEX idx_folio_property ON folios (tenant_id, property_id)');
        $this->addSql('CREATE UNIQUE INDEX uq_folio_ref ON folios (tenant_id, folio_number)');

        // ─── Folio Charges ────────────────────────────────────
        $this->addSql('CREATE TABLE folio_charges (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            folio_id VARCHAR(36) NOT NULL,
            category VARCHAR(20) NOT NULL,
            description VARCHAR(255) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            line_total DECIMAL(12,2) NOT NULL,
            charge_date DATE NOT NULL,
            posted_by VARCHAR(36) NULL,
            is_voided BOOLEAN NOT NULL DEFAULT FALSE,
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_charge_folio ON folio_charges (tenant_id, folio_id)');

        // ─── Folio Payments ───────────────────────────────────
        $this->addSql('CREATE TABLE folio_payments (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            folio_id VARCHAR(36) NOT NULL,
            payment_method VARCHAR(20) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'pending\',
            payment_date DATE NOT NULL,
            sender_name VARCHAR(255) NULL,
            transfer_reference VARCHAR(100) NULL,
            proof_image_url VARCHAR(500) NULL,
            recorded_by VARCHAR(36) NULL,
            confirmed_by VARCHAR(36) NULL,
            confirmed_at TIMESTAMP NULL,
            rejection_reason TEXT NULL,
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_payment_folio ON folio_payments (tenant_id, folio_id)');
        $this->addSql('CREATE INDEX idx_payment_status ON folio_payments (tenant_id, status)');

        // ─── Folio Adjustments ────────────────────────────────
        $this->addSql('CREATE TABLE folio_adjustments (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            folio_id VARCHAR(36) NOT NULL,
            type VARCHAR(20) NOT NULL,
            description VARCHAR(255) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            adjusted_by VARCHAR(36) NULL,
            reason TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_adjustment_folio ON folio_adjustments (tenant_id, folio_id)');

        // ─── Tax Configurations ───────────────────────────────
        $this->addSql('CREATE TABLE tax_configurations (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            tax_key VARCHAR(30) NOT NULL,
            name VARCHAR(100) NOT NULL,
            rate DECIMAL(5,2) NOT NULL,
            is_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            applies_to VARCHAR(50) NOT NULL DEFAULT \'all\',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE UNIQUE INDEX uq_tax_tenant_key ON tax_configurations (tenant_id, tax_key)');

        // ─── Invoices ─────────────────────────────────────────
        $this->addSql('CREATE TABLE invoices (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            folio_id VARCHAR(36) NOT NULL,
            booking_id VARCHAR(36) NOT NULL,
            guest_id VARCHAR(36) NOT NULL,
            invoice_number VARCHAR(30) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT \'issued\',
            invoice_date DATE NOT NULL,
            due_date DATE NULL,
            subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            tax_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            currency VARCHAR(3) NOT NULL DEFAULT \'NGN\',
            guest_name VARCHAR(255) NOT NULL,
            guest_email VARCHAR(255) NULL,
            guest_phone VARCHAR(50) NULL,
            guest_address TEXT NULL,
            bank_name VARCHAR(100) NULL,
            bank_account_number VARCHAR(20) NULL,
            bank_account_name VARCHAR(255) NULL,
            emailed_at TIMESTAMP NULL,
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_invoice_tenant ON invoices (tenant_id)');
        $this->addSql('CREATE INDEX idx_invoice_folio ON invoices (tenant_id, folio_id)');
        $this->addSql('CREATE INDEX idx_invoice_booking ON invoices (tenant_id, booking_id)');
        $this->addSql('CREATE UNIQUE INDEX uq_invoice_number ON invoices (tenant_id, invoice_number)');

        // ─── Invoice Items ────────────────────────────────────
        $this->addSql('CREATE TABLE invoice_items (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            invoice_id VARCHAR(36) NOT NULL,
            description VARCHAR(255) NOT NULL,
            category VARCHAR(30) NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price DECIMAL(12,2) NOT NULL,
            line_total DECIMAL(12,2) NOT NULL,
            tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            sort_order INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_inv_item_invoice ON invoice_items (tenant_id, invoice_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS invoice_items');
        $this->addSql('DROP TABLE IF EXISTS invoices');
        $this->addSql('DROP TABLE IF EXISTS tax_configurations');
        $this->addSql('DROP TABLE IF EXISTS folio_adjustments');
        $this->addSql('DROP TABLE IF EXISTS folio_payments');
        $this->addSql('DROP TABLE IF EXISTS folio_charges');
        $this->addSql('DROP TABLE IF EXISTS folios');
    }
}
