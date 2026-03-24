<?php declare(strict_types=1);
namespace Lodgik\Migrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
final class Version20260324100001 extends AbstractMigration
{
    public function getDescription(): string { return 'Add training_enrollments table'; }
    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE IF NOT EXISTS training_enrollments (
            id              VARCHAR(36)  PRIMARY KEY,
            program_id      VARCHAR(36)  NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
            employee_id     VARCHAR(36)  NOT NULL,
            employee_name   VARCHAR(150) NOT NULL,
            enrolled_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
            completed_at    TIMESTAMP,
            completion_pct  SMALLINT     NOT NULL DEFAULT 0,
            score           DECIMAL(5,2),
            certificate_url VARCHAR(500),
            status          VARCHAR(20)  NOT NULL DEFAULT 'enrolled',
            notes           TEXT,
            UNIQUE(program_id, employee_id)
        )");
    }
    public function down(Schema $schema): void
    {
        $this->addSql("DROP TABLE IF EXISTS training_enrollments");
    }
}
