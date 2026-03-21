<?php
declare(strict_types=1);
namespace Lodgik\Migrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260321100001 extends AbstractMigration
{
    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE pos_section_prices (
                id           VARCHAR(36)    NOT NULL PRIMARY KEY,
                property_id  VARCHAR(36)    NOT NULL,
                tenant_id    VARCHAR(36)    NOT NULL,
                product_id   VARCHAR(36)    NOT NULL,
                product_name VARCHAR(200)   NOT NULL,
                section      VARCHAR(100)   NOT NULL,
                price        NUMERIC(12,2)  NOT NULL,
                note         VARCHAR(255)   DEFAULT NULL,
                created_at   TIMESTAMP(0)   DEFAULT NULL,
                updated_at   TIMESTAMP(0)   DEFAULT NULL,
                CONSTRAINT uq_psp_product_section UNIQUE (product_id, section, property_id)
            )
        ");
        $this->addSql("CREATE INDEX idx_psp_product ON pos_section_prices (property_id, product_id)");
        $this->addSql("CREATE INDEX idx_psp_section ON pos_section_prices (property_id, section)");

        $this->addSql("
            CREATE TABLE guest_stay_notifications (
                id                    VARCHAR(36)   NOT NULL PRIMARY KEY,
                booking_id            VARCHAR(36)   NOT NULL,
                guest_id              VARCHAR(36)   NOT NULL,
                tenant_id             VARCHAR(36)   NOT NULL,
                property_id           VARCHAR(36)   NOT NULL,
                contact_name          VARCHAR(150)  NOT NULL,
                contact_email         VARCHAR(255)  DEFAULT NULL,
                contact_phone         VARCHAR(50)   DEFAULT NULL,
                notify_on_checkin     BOOLEAN       NOT NULL DEFAULT FALSE,
                share_booking_details BOOLEAN       NOT NULL DEFAULT TRUE,
                share_guest_details   BOOLEAN       NOT NULL DEFAULT FALSE,
                last_sent_at          TIMESTAMP(0)  DEFAULT NULL,
                last_sent_channel     VARCHAR(20)   DEFAULT NULL,
                status                VARCHAR(20)   NOT NULL DEFAULT 'pending',
                created_at            TIMESTAMP(0)  DEFAULT NULL,
                updated_at            TIMESTAMP(0)  DEFAULT NULL
            )
        ");
        $this->addSql("CREATE INDEX idx_gsn_booking ON guest_stay_notifications (booking_id)");
        $this->addSql("CREATE INDEX idx_gsn_guest   ON guest_stay_notifications (guest_id, tenant_id)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DROP TABLE IF EXISTS pos_section_prices");
        $this->addSql("DROP TABLE IF EXISTS guest_stay_notifications");
    }
}
