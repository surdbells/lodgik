<?php declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260403200001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Widen PII columns (phone, id_number, bank_account_number) to TEXT for AES-256-GCM ciphertext storage';
    }

    public function up(Schema $schema): void
    {
        // guests: phone (VARCHAR 30 → TEXT), id_number (VARCHAR 50 → TEXT)
        $this->addSql("ALTER TABLE guests ALTER COLUMN phone TYPE TEXT");
        $this->addSql("ALTER TABLE guests ALTER COLUMN id_number TYPE TEXT");

        // employees: phone (VARCHAR 30 → TEXT), bank_account_number (VARCHAR 20 → TEXT)
        $this->addSql("ALTER TABLE employees ALTER COLUMN phone TYPE TEXT");
        $this->addSql("ALTER TABLE employees ALTER COLUMN bank_account_number TYPE TEXT");

        // payroll_items: bank_account_number (VARCHAR 20 → TEXT)
        $this->addSql("ALTER TABLE payroll_items ALTER COLUMN bank_account_number TYPE TEXT");
    }

    public function down(Schema $schema): void
    {
        // Truncation risk on rollback if ciphertext is stored — acceptable for dev rollback
        $this->addSql("ALTER TABLE guests ALTER COLUMN phone TYPE VARCHAR(500)");
        $this->addSql("ALTER TABLE guests ALTER COLUMN id_number TYPE VARCHAR(500)");
        $this->addSql("ALTER TABLE employees ALTER COLUMN phone TYPE VARCHAR(500)");
        $this->addSql("ALTER TABLE employees ALTER COLUMN bank_account_number TYPE VARCHAR(500)");
        $this->addSql("ALTER TABLE payroll_items ALTER COLUMN bank_account_number TYPE VARCHAR(500)");
    }
}
