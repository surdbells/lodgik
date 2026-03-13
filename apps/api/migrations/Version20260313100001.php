<?php
declare(strict_types=1);
namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * RBAC System
 *
 * 1. permissions               — master catalogue of all permission actions per module
 * 2. role_permission_defaults  — seeded system defaults (role → permission → granted)
 * 3. property_role_permissions — per-property overrides (tenant-level customisation)
 */
final class Version20260313100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'RBAC: permissions catalogue, role defaults, property-level overrides';
    }

    public function up(Schema $schema): void
    {
        // ── 1. Master permission catalogue ────────────────────────────────────
        $this->addSql("
            CREATE TABLE permissions (
                id           UUID         NOT NULL DEFAULT gen_random_uuid(),
                module_key   VARCHAR(60)  NOT NULL,
                action       VARCHAR(60)  NOT NULL,
                label        VARCHAR(150) NOT NULL,
                description  TEXT,
                sort_order   INT          NOT NULL DEFAULT 0,
                created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                PRIMARY KEY (id),
                UNIQUE (module_key, action)
            )
        ");
        $this->addSql("CREATE INDEX idx_permissions_module ON permissions(module_key)");

        // ── 2. System-level defaults per role ─────────────────────────────────
        $this->addSql("
            CREATE TABLE role_permission_defaults (
                id            UUID        NOT NULL DEFAULT gen_random_uuid(),
                role          VARCHAR(40) NOT NULL,
                permission_id UUID        NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                granted       BOOLEAN     NOT NULL DEFAULT FALSE,
                PRIMARY KEY (id),
                UNIQUE (role, permission_id)
            )
        ");
        $this->addSql("CREATE INDEX idx_rpd_role ON role_permission_defaults(role)");

        // ── 3. Per-property overrides ──────────────────────────────────────────
        $this->addSql("
            CREATE TABLE property_role_permissions (
                id            UUID        NOT NULL DEFAULT gen_random_uuid(),
                property_id   UUID        NOT NULL,
                tenant_id     UUID        NOT NULL,
                role          VARCHAR(40) NOT NULL,
                permission_id UUID        NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                granted       BOOLEAN     NOT NULL DEFAULT FALSE,
                updated_by    UUID,
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (id),
                UNIQUE (property_id, role, permission_id)
            )
        ");
        $this->addSql("CREATE INDEX idx_prp_property_role ON property_role_permissions(property_id, role)");
        $this->addSql("CREATE INDEX idx_prp_tenant ON property_role_permissions(tenant_id)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DROP TABLE IF EXISTS property_role_permissions");
        $this->addSql("DROP TABLE IF EXISTS role_permission_defaults");
        $this->addSql("DROP TABLE IF EXISTS permissions");
    }
}
