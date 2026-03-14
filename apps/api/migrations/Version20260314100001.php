<?php

declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * VAT control columns:
 *  - room_types.price_includes_vat  — price already has VAT baked in (default TRUE for Nigerian hotels)
 *  - properties.settings JSONB key  — charge_vat_on_booking (master on/off per property)
 */
final class Version20260314100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add price_includes_vat to room_types; property VAT settings stored in existing JSONB settings column';
    }

    public function up(Schema $schema): void
    {
        // Add price_includes_vat to room_types (default TRUE — Nigerian hotels price VAT-inclusive)
        $this->addSql("ALTER TABLE room_types ADD COLUMN IF NOT EXISTS price_includes_vat BOOLEAN NOT NULL DEFAULT TRUE");

        // Ensure existing TaxConfiguration rows have is_inclusive defaulting properly
        // (column already exists from earlier migration — just set existing VAT configs to inclusive by default)
        $this->addSql("UPDATE tax_configurations SET is_inclusive = TRUE WHERE tax_key = 'vat' AND is_inclusive = FALSE");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE room_types DROP COLUMN IF EXISTS price_includes_vat");
        $this->addSql("UPDATE tax_configurations SET is_inclusive = FALSE WHERE tax_key = 'vat'");
    }
}
