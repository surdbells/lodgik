<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260220600002 extends AbstractMigration
{
    public function getDescription(): string { return 'Add department column to chat_messages for multi-department chat'; }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE chat_messages ADD COLUMN department VARCHAR(20) DEFAULT 'reception'");
        $this->addSql("CREATE INDEX idx_cm_dept ON chat_messages (tenant_id, booking_id, department)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DROP INDEX IF EXISTS idx_cm_dept");
        $this->addSql("ALTER TABLE chat_messages DROP COLUMN IF EXISTS department");
    }
}
