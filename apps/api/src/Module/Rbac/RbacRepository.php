<?php
declare(strict_types=1);
namespace Lodgik\Module\Rbac;

use Doctrine\DBAL\Connection;

final class RbacRepository
{
    public function __construct(private readonly Connection $conn) {}

    /**
     * Full permission catalogue grouped by module_key.
     * Returns: [ module_key => [ ['id','action','label','description','sort_order'], … ] ]
     */
    public function getAllGrouped(): array
    {
        $rows = $this->conn->fetchAllAssociative(
            "SELECT id, module_key, action, label, description, sort_order
             FROM permissions
             ORDER BY module_key, sort_order"
        );

        $grouped = [];
        foreach ($rows as $row) {
            $grouped[$row['module_key']][] = $row;
        }
        return $grouped;
    }

    /**
     * Merged role→permission matrix for a property.
     *
     * Logic: property override wins; if no override exists for a (role, permission),
     * fall back to role_permission_defaults; if no default either, deny.
     *
     * Returns: [ role => [ 'module.action' => bool, … ] ]
     */
    public function getMatrix(string $propertyId): array
    {
        // All defaults
        $defaults = $this->conn->fetchAllAssociative(
            "SELECT rpd.role, p.module_key, p.action, rpd.granted
             FROM role_permission_defaults rpd
             JOIN permissions p ON p.id = rpd.permission_id
             ORDER BY rpd.role, p.module_key, p.sort_order"
        );

        // All property overrides
        $overrides = $this->conn->fetchAllAssociative(
            "SELECT prp.role, p.module_key, p.action, prp.granted
             FROM property_role_permissions prp
             JOIN permissions p ON p.id = prp.permission_id
             WHERE prp.property_id = :pid",
            ['pid' => $propertyId]
        );

        // Build: matrix[role][module.action] = granted (default first, then override)
        $matrix = [];
        foreach ($defaults as $row) {
            $matrix[$row['role']][$row['module_key'] . '.' . $row['action']] = (bool)$row['granted'];
        }
        foreach ($overrides as $row) {
            $matrix[$row['role']][$row['module_key'] . '.' . $row['action']] = (bool)$row['granted'];
        }

        return $matrix;
    }

    /**
     * Effective permissions for a specific role on a specific property.
     * Returns flat list of permission keys that are granted.
     * e.g. ['bookings.view', 'bookings.check_in', …]
     */
    public function getGrantedForRole(string $propertyId, string $role): array
    {
        // Start with defaults for this role
        $defaults = $this->conn->fetchAllAssociative(
            "SELECT p.module_key, p.action, rpd.granted
             FROM role_permission_defaults rpd
             JOIN permissions p ON p.id = rpd.permission_id
             WHERE rpd.role = :role",
            ['role' => $role]
        );

        // Merge with overrides
        $overrides = $this->conn->fetchAllAssociative(
            "SELECT p.module_key, p.action, prp.granted
             FROM property_role_permissions prp
             JOIN permissions p ON p.id = prp.permission_id
             WHERE prp.property_id = :pid AND prp.role = :role",
            ['pid' => $propertyId, 'role' => $role]
        );

        $resolved = [];
        foreach ($defaults as $row) {
            $resolved[$row['module_key'] . '.' . $row['action']] = (bool)$row['granted'];
        }
        foreach ($overrides as $row) {
            $resolved[$row['module_key'] . '.' . $row['action']] = (bool)$row['granted'];
        }

        return array_keys(array_filter($resolved));
    }

    /**
     * Bulk upsert property-level overrides for one role.
     * $permissions = [ 'bookings.view' => true, 'bookings.cancel' => false, … ]
     */
    public function upsertRoleOverrides(
        string $propertyId,
        string $tenantId,
        string $role,
        array $permissions,
        string $updatedBy,
    ): void {
        foreach ($permissions as $key => $granted) {
            [$moduleKey, $action] = explode('.', $key, 2);
            $this->conn->executeStatement(
                "INSERT INTO property_role_permissions
                     (property_id, tenant_id, role, permission_id, granted, updated_by, updated_at)
                 SELECT :pid, :tid, :role, p.id, :granted, :by, NOW()
                 FROM permissions p
                 WHERE p.module_key = :m AND p.action = :a
                 ON CONFLICT (property_id, role, permission_id)
                 DO UPDATE SET granted = EXCLUDED.granted,
                               updated_by = EXCLUDED.updated_by,
                               updated_at = EXCLUDED.updated_at",
                [
                    'pid'     => $propertyId,
                    'tid'     => $tenantId,
                    'role'    => $role,
                    'granted' => $granted ? 1 : 0,
                    'by'      => $updatedBy,
                    'm'       => $moduleKey,
                    'a'       => $action,
                ]
            );
        }
    }

    /**
     * Delete all property overrides for a role, reverting to system defaults.
     */
    public function resetRole(string $propertyId, string $role): void
    {
        $this->conn->executeStatement(
            "DELETE FROM property_role_permissions WHERE property_id = :pid AND role = :role",
            ['pid' => $propertyId, 'role' => $role]
        );
    }
}
