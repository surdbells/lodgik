<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260219100004 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Phase 1D: daily_snapshots table for dashboard historical data';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE daily_snapshots (
            id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            property_id VARCHAR(36) NOT NULL,
            snapshot_date DATE NOT NULL,
            total_rooms INTEGER NOT NULL DEFAULT 0,
            rooms_sold INTEGER NOT NULL DEFAULT 0,
            occupancy_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
            total_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
            adr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            revpar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            check_ins INTEGER NOT NULL DEFAULT 0,
            check_outs INTEGER NOT NULL DEFAULT 0,
            new_bookings INTEGER NOT NULL DEFAULT 0,
            cancellations INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE UNIQUE INDEX uq_snapshot_property_date ON daily_snapshots (tenant_id, property_id, snapshot_date)');
        $this->addSql('CREATE INDEX idx_snapshots_tenant_property ON daily_snapshots (tenant_id, property_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS daily_snapshots');
    }
}
