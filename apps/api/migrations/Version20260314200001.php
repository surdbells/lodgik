<?php
declare(strict_types=1);
namespace Lodgik\Migrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260314200001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add payment_method, payment_reference, receipt_url to invoices';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method    VARCHAR(30)  DEFAULT NULL");
        $this->addSql("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100) DEFAULT NULL");
        $this->addSql("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receipt_url       TEXT         DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE invoices DROP COLUMN IF EXISTS payment_method");
        $this->addSql("ALTER TABLE invoices DROP COLUMN IF EXISTS payment_reference");
        $this->addSql("ALTER TABLE invoices DROP COLUMN IF EXISTS receipt_url");
    }
}
