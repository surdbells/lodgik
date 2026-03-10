<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260310100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add metadata JSONB column to service_requests';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE service_requests DROP COLUMN IF EXISTS metadata");
    }
}
