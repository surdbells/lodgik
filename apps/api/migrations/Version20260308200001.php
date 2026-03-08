<?php
declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 2 — Shadow Booking (Invoice Rate Override)
 *
 * Adds three columns to `bookings`:
 *   shadow_rate_per_night  — override rate shown on invoice (decimal, nullable)
 *   shadow_total_amount    — override total shown on invoice (decimal, nullable)
 *   shadow_rate_set_by     — UUID of the property_admin who set it (nullable)
 *
 * Revenue reports MUST query rate_per_night / total_amount only.
 * shadow_rate_per_night / shadow_total_amount are invoice-display only.
 */
final class Version20260308200001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Shadow booking: add shadow_rate_per_night, shadow_total_amount, shadow_rate_set_by to bookings';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shadow_rate_per_night  NUMERIC(12,2) DEFAULT NULL');
        $this->addSql('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shadow_total_amount    NUMERIC(12,2) DEFAULT NULL');
        $this->addSql('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shadow_rate_set_by     VARCHAR(36)   DEFAULT NULL');
        $this->addSql('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shadow_rate_set_at     TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE bookings DROP COLUMN IF EXISTS shadow_rate_per_night');
        $this->addSql('ALTER TABLE bookings DROP COLUMN IF EXISTS shadow_total_amount');
        $this->addSql('ALTER TABLE bookings DROP COLUMN IF EXISTS shadow_rate_set_by');
        $this->addSql('ALTER TABLE bookings DROP COLUMN IF EXISTS shadow_rate_set_at');
    }
}
