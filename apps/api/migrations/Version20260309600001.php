<?php
declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260309600001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add guest_card.plate_number/gate_guest_name/gate_phone; add checkout_discrepancies table; add security_exit_at/receptionist_checkout_at to guest_cards';
    }

    public function up(Schema $schema): void
    {
        // Add gate-issue fields to guest_cards
        $this->addSql("ALTER TABLE guest_cards
            ADD COLUMN IF NOT EXISTS gate_guest_name   VARCHAR(200)  NULL,
            ADD COLUMN IF NOT EXISTS gate_phone        VARCHAR(50)   NULL,
            ADD COLUMN IF NOT EXISTS security_exit_at  TIMESTAMPTZ   NULL,
            ADD COLUMN IF NOT EXISTS receptionist_checkout_at TIMESTAMPTZ NULL
        ");

        // Rename/ensure plate_number exists (may already exist from prior migration)
        $this->addSql("ALTER TABLE guest_cards
            ADD COLUMN IF NOT EXISTS plate_number VARCHAR(30) NULL
        ");

        // Checkout discrepancy report table
        $this->addSql("CREATE TABLE IF NOT EXISTS checkout_discrepancies (
            id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id                   UUID NOT NULL,
            property_id                 UUID NOT NULL,
            guest_card_id               UUID NOT NULL,
            booking_id                  UUID NULL,
            card_number                 VARCHAR(50),
            guest_name                  VARCHAR(200),
            room_number                 VARCHAR(20),
            discrepancy_type            VARCHAR(60) NOT NULL,
            receptionist_checkout_at    TIMESTAMPTZ NULL,
            security_exit_at            TIMESTAMPTZ NULL,
            gap_minutes                 INT NULL,
            threshold_minutes           INT NOT NULL DEFAULT 30,
            severity                    VARCHAR(10) NOT NULL DEFAULT 'medium',
            resolved_at                 TIMESTAMPTZ NULL,
            resolved_by                 UUID NULL,
            notes                       TEXT NULL,
            created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
        )");

        $this->addSql("CREATE INDEX IF NOT EXISTS idx_checkout_discrepancies_property ON checkout_discrepancies (property_id, created_at DESC)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_checkout_discrepancies_type ON checkout_discrepancies (discrepancy_type)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DROP TABLE IF EXISTS checkout_discrepancies");
        $this->addSql("ALTER TABLE guest_cards
            DROP COLUMN IF EXISTS gate_guest_name,
            DROP COLUMN IF EXISTS gate_phone,
            DROP COLUMN IF EXISTS security_exit_at,
            DROP COLUMN IF EXISTS receptionist_checkout_at
        ");
    }
}
