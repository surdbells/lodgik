<?php
declare(strict_types=1);
namespace Lodgik\Module\Rbac;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response as SlimResponse;

final class RbacController
{
    public function __construct(private readonly RbacService $service) {}

    // GET /api/rbac/permissions
    // Full permission catalogue grouped by module — used to render the RBAC UI.
    public function catalogue(Request $request, Response $response): Response
    {
        $catalogue = $this->service->getCatalogue();

        // Build structured response: array of { moduleKey, permissions[] }
        $modules = [];
        foreach ($catalogue as $moduleKey => $perms) {
            $modules[] = [
                'moduleKey'   => $moduleKey,
                'permissions' => array_map(fn($p) => [
                    'id'          => $p['id'],
                    'key'         => $moduleKey . '.' . $p['action'],
                    'action'      => $p['action'],
                    'label'       => $p['label'],
                    'description' => $p['description'],
                    'sortOrder'   => (int)$p['sort_order'],
                ], $perms),
            ];
        }

        return $this->json($response, ['success' => true, 'data' => $modules]);
    }

    // GET /api/rbac/matrix?property_id=
    // Merged matrix (defaults + overrides) for all configurable roles.
    public function matrix(Request $request, Response $response): Response
    {
        $params     = $request->getQueryParams();
        $propertyId = $params['property_id'] ?? $request->getAttribute('auth.property_id');

        if (!$propertyId) {
            return $this->error($response, 'MISSING_PROPERTY', 'property_id is required', 400);
        }

        $matrix = $this->service->getMatrix($propertyId);

        // Format: [ { role, permissions: { 'bookings.view': true, … } } ]
        $formatted = [];
        foreach (RbacService::CONFIGURABLE_ROLES as $role) {
            $formatted[] = [
                'role'        => $role,
                'permissions' => $matrix[$role] ?? [],
            ];
        }

        return $this->json($response, ['success' => true, 'data' => $formatted]);
    }

    // PUT /api/rbac/matrix
    // Bulk-save overrides for one or more roles.
    // Body: { property_id, matrix: [ { role, permissions: { 'bookings.cancel': false, … } } ] }
    public function saveMatrix(Request $request, Response $response): Response
    {
        $body       = (array)$request->getParsedBody();
        $propertyId = $body['property_id'] ?? $request->getAttribute('auth.property_id');
        $tenantId   = $request->getAttribute('auth.tenant_id');
        $updatedBy  = $request->getAttribute('auth.user_id');

        if (!$propertyId) {
            return $this->error($response, 'MISSING_PROPERTY', 'property_id is required', 400);
        }

        $matrixInput = $body['matrix'] ?? [];
        if (!is_array($matrixInput) || empty($matrixInput)) {
            return $this->error($response, 'INVALID_PAYLOAD', 'matrix must be a non-empty array', 422);
        }

        // Transform array of { role, permissions } into keyed map
        $payload = [];
        foreach ($matrixInput as $entry) {
            $role  = $entry['role'] ?? null;
            $perms = $entry['permissions'] ?? [];
            if ($role && is_array($perms)) {
                $payload[$role] = $perms;
            }
        }

        $this->service->saveMatrix($propertyId, $tenantId, $payload, $updatedBy);

        return $this->json($response, ['success' => true, 'message' => 'Permissions saved successfully.']);
    }

    // POST /api/rbac/reset
    // Reset one role to system defaults by deleting all property overrides.
    // Body: { property_id, role }
    public function resetRole(Request $request, Response $response): Response
    {
        $body       = (array)$request->getParsedBody();
        $propertyId = $body['property_id'] ?? $request->getAttribute('auth.property_id');
        $role       = $body['role'] ?? null;
        $updatedBy  = $request->getAttribute('auth.user_id');

        if (!$propertyId || !$role) {
            return $this->error($response, 'MISSING_FIELDS', 'property_id and role are required', 400);
        }

        try {
            $this->service->resetRole($propertyId, $role, $updatedBy);
        } catch (\InvalidArgumentException $e) {
            return $this->error($response, 'INVALID_ROLE', $e->getMessage(), 422);
        }

        return $this->json($response, ['success' => true, 'message' => "Role '$role' reset to system defaults."]);
    }

    // GET /api/rbac/my-permissions?property_id=
    // Returns the flat list of granted permission keys for the current user.
    // Called by the frontend after login to populate PermissionService.
    public function myPermissions(Request $request, Response $response): Response
    {
        $propertyId = $request->getQueryParams()['property_id']
            ?? $request->getAttribute('auth.property_id');
        $role       = $request->getAttribute('auth.role');

        if (!$propertyId || !$role) {
            return $this->error($response, 'MISSING_CONTEXT', 'property_id and authenticated role are required', 400);
        }

        $permissions = $this->service->getMyPermissions($propertyId, $role);

        return $this->json($response, ['success' => true, 'data' => ['permissions' => $permissions]]);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private function json(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(
            json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private function error(Response $response, string $code, string $message, int $status): Response
    {
        return $this->json($response, [
            'success' => false,
            'error'   => ['code' => $code, 'message' => $message],
        ], $status);
    }
}
