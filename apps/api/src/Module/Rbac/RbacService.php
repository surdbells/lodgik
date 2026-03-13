<?php
declare(strict_types=1);
namespace Lodgik\Module\Rbac;

use Psr\Log\LoggerInterface;

final class RbacService
{
    // Roles that bypass all permission checks — always full access
    public const BYPASS_ROLES = ['super_admin', 'property_admin'];

    // All configurable roles (shown in RBAC UI)
    public const CONFIGURABLE_ROLES = [
        'manager', 'front_desk', 'accountant', 'concierge',
        'housekeeping', 'security', 'bar', 'kitchen', 'restaurant', 'maintenance',
    ];

    public function __construct(
        private readonly RbacRepository $repo,
        private readonly LoggerInterface $logger,
    ) {}

    /** Full permission catalogue grouped by module for RBAC UI. */
    public function getCatalogue(): array
    {
        return $this->repo->getAllGrouped();
    }

    /**
     * Full matrix for a property: all configurable roles mapped to their
     * merged (defaults + overrides) permission booleans.
     */
    public function getMatrix(string $propertyId): array
    {
        return $this->repo->getMatrix($propertyId);
    }

    /**
     * Bulk save overrides for multiple roles simultaneously.
     * $payload = [ 'manager' => ['bookings.check_in' => true, …], … ]
     */
    public function saveMatrix(
        string $propertyId,
        string $tenantId,
        array $payload,
        string $updatedBy,
    ): void {
        foreach ($payload as $role => $permissions) {
            if (!in_array($role, self::CONFIGURABLE_ROLES, true)) {
                continue; // Silently skip bypass/unknown roles
            }
            $this->repo->upsertRoleOverrides($propertyId, $tenantId, $role, $permissions, $updatedBy);
        }

        $this->logger->info('RBAC matrix updated', [
            'property_id' => $propertyId,
            'roles'       => array_keys($payload),
            'updated_by'  => $updatedBy,
        ]);
    }

    /** Reset one role back to system defaults. */
    public function resetRole(string $propertyId, string $role, string $updatedBy): void
    {
        if (!in_array($role, self::CONFIGURABLE_ROLES, true)) {
            throw new \InvalidArgumentException("Role '$role' cannot be reset via RBAC UI.");
        }

        $this->repo->resetRole($propertyId, $role);

        $this->logger->info('RBAC role reset to defaults', [
            'property_id' => $propertyId,
            'role'        => $role,
            'reset_by'    => $updatedBy,
        ]);
    }

    /**
     * Returns the granted permission keys for the current user.
     * Called at login and cached in the JWT or client-side.
     * Returns ALL keys (no filtering) if role is a bypass role.
     */
    public function getMyPermissions(string $propertyId, string $role): array
    {
        if (in_array($role, self::BYPASS_ROLES, true)) {
            // Return every known permission key — bypass roles get everything
            $catalogue = $this->repo->getAllGrouped();
            $all = [];
            foreach ($catalogue as $module => $perms) {
                foreach ($perms as $p) {
                    $all[] = $module . '.' . $p['action'];
                }
            }
            return $all;
        }

        return $this->repo->getGrantedForRole($propertyId, $role);
    }

    /**
     * Check whether a specific role has a specific permission on a property.
     * Used by PermissionMiddleware for each request.
     */
    public function can(string $propertyId, string $role, string $permissionKey): bool
    {
        if (in_array($role, self::BYPASS_ROLES, true)) {
            return true;
        }

        $granted = $this->repo->getGrantedForRole($propertyId, $role);
        return in_array($permissionKey, $granted, true);
    }
}
