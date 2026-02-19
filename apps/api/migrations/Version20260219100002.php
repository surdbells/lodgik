<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260219100002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 1B: guests and guest_documents tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE guests (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(320) DEFAULT NULL,
            phone VARCHAR(30) DEFAULT NULL,
            nationality VARCHAR(80) DEFAULT NULL,
            id_type VARCHAR(50) DEFAULT NULL,
            id_number VARCHAR(50) DEFAULT NULL,
            date_of_birth DATE DEFAULT NULL,
            gender VARCHAR(20) DEFAULT NULL,
            address TEXT DEFAULT NULL,
            city VARCHAR(100) DEFAULT NULL,
            state VARCHAR(100) DEFAULT NULL,
            country VARCHAR(3) NOT NULL DEFAULT \'NG\',
            vip_status VARCHAR(20) NOT NULL DEFAULT \'regular\',
            notes TEXT DEFAULT NULL,
            total_stays INTEGER NOT NULL DEFAULT 0,
            total_spent NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
            last_visit_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            preferences JSON DEFAULT NULL,
            company_name VARCHAR(200) DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            deleted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_guests_tenant ON guests (tenant_id)');
        $this->addSql('CREATE INDEX idx_guests_tenant_email ON guests (tenant_id, email)');
        $this->addSql('CREATE INDEX idx_guests_tenant_phone ON guests (tenant_id, phone)');

        $this->addSql('CREATE TABLE guest_documents (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            guest_id VARCHAR(36) NOT NULL,
            document_type VARCHAR(50) NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            file_name VARCHAR(255) DEFAULT NULL,
            uploaded_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_guest_docs_guest ON guest_documents (tenant_id, guest_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS guest_documents');
        $this->addSql('DROP TABLE IF EXISTS guests');
    }
}
