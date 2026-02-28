<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260228300001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Widen lost_and_found.found_by from VARCHAR(36) to VARCHAR(150) to store staff names';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE lost_and_found ALTER COLUMN found_by TYPE VARCHAR(150)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE lost_and_found ALTER COLUMN found_by TYPE VARCHAR(36)');
    }
}
