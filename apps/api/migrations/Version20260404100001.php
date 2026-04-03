<?php declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260404100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'NDPR compliance: data_requests table, gdpr_erased flag on guests and employees';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE IF NOT EXISTS data_requests (
            id                  VARCHAR(36)  PRIMARY KEY,
            tenant_id           VARCHAR(36)  NOT NULL,
            property_id         VARCHAR(36),
            type                VARCHAR(20)  NOT NULL CHECK (type IN ('export','erasure')),
            subject_type        VARCHAR(20)  NOT NULL CHECK (subject_type IN ('guest','employee')),
            subject_id          VARCHAR(36)  NOT NULL,
            subject_name        VARCHAR(200) NOT NULL,
            status              VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','processing','complete','rejected')),
            rejection_reason    TEXT,
            download_url        TEXT,
            requested_by_id     VARCHAR(36)  NOT NULL,
            requested_by_name   VARCHAR(200) NOT NULL,
            completed_at        TIMESTAMP,
            created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
        )");

        $this->addSql("CREATE INDEX IF NOT EXISTS idx_dr_tenant   ON data_requests (tenant_id, status)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_dr_subject  ON data_requests (subject_type, subject_id)");

        // Flag erased subjects — their PII has been anonymised
        $this->addSql("ALTER TABLE guests    ADD COLUMN IF NOT EXISTS gdpr_erased BOOLEAN NOT NULL DEFAULT FALSE");
        $this->addSql("ALTER TABLE employees ADD COLUMN IF NOT EXISTS gdpr_erased BOOLEAN NOT NULL DEFAULT FALSE");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE employees DROP COLUMN IF EXISTS gdpr_erased");
        $this->addSql("ALTER TABLE guests    DROP COLUMN IF EXISTS gdpr_erased");
        $this->addSql("DROP TABLE IF EXISTS data_requests");
    }
}
