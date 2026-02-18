<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260218131015 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add tenant_invitations table for onboarding invitations';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE tenant_invitations (
                id VARCHAR(36) NOT NULL,
                email VARCHAR(320) NOT NULL,
                hotel_name VARCHAR(255) NOT NULL,
                contact_name VARCHAR(200) DEFAULT NULL,
                phone VARCHAR(30) DEFAULT NULL,
                token VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' NOT NULL,
                expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                tenant_id VARCHAR(36) DEFAULT NULL,
                suggested_plan_id VARCHAR(36) DEFAULT NULL,
                invited_by VARCHAR(36) DEFAULT NULL,
                accepted_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                metadata JSON DEFAULT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX uq_ti_token ON tenant_invitations (token)');
        $this->addSql('CREATE INDEX idx_ti_email ON tenant_invitations (email)');
        $this->addSql('CREATE INDEX idx_ti_token ON tenant_invitations (token)');
        $this->addSql('CREATE INDEX idx_ti_status ON tenant_invitations (status)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE tenant_invitations');
    }
}
