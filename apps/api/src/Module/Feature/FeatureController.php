<?php

declare(strict_types=1);

namespace Lodgik\Module\Feature;

use Lodgik\Helper\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class FeatureController
{
    public function __construct(
        private readonly FeatureService $featureService,
        private readonly ResponseHelper $response,
    ) {}

    /**
     * GET /api/features/modules
     * List all platform feature modules (public reference).
     */
    public function listModules(Request $request, Response $response): Response
    {
        $modules = $this->featureService->listModules();
        $items = array_map(fn($m) => $this->serializeModule($m), $modules);

        return $this->response->success($response, $items);
    }

    /**
     * GET /api/features/tenant
     * Get effective features for the authenticated tenant.
     */
    public function tenantFeatures(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $features = $this->featureService->getTenantFeatures($tenantId);

        // Enrich with module details
        $allModules = $this->featureService->listModules();
        $moduleMap = [];
        foreach ($allModules as $m) {
            $moduleMap[$m->getModuleKey()] = $m;
        }

        $enriched = [];
        foreach ($allModules as $m) {
            $key = $m->getModuleKey();
            $enriched[] = [
                'module_key' => $key,
                'name' => $m->getName(),
                'category' => $m->getCategory(),
                'is_core' => $m->isCore(),
                'is_enabled' => in_array($key, $features['modules'], true),
                'min_tier' => $m->getMinTier(),
                'dependencies' => $m->getDependencies(),
                'icon' => $m->getIcon(),
            ];
        }

        return $this->response->success($response, [
            'enabled_modules' => $features['modules'],
            'enabled_count' => count($features['modules']),
            'total_modules' => count($allModules),
            'overrides' => $features['overrides'],
            'modules' => $enriched,
        ]);
    }

    /**
     * POST /api/features/tenant/enable/{moduleKey}
     * Enable a module for the tenant (with dependency auto-resolution).
     */
    public function enableModule(Request $request, Response $response, array $args): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $actorId = $request->getAttribute('auth.user_id');
        $moduleKey = $args['moduleKey'];

        try {
            $added = $this->featureService->enableModule($tenantId, $moduleKey, $actorId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, [
            'enabled' => $moduleKey,
            'also_enabled' => array_values(array_filter($added, fn($k) => $k !== $moduleKey)),
        ], "Module '{$moduleKey}' enabled" . (count($added) > 1 ? ' (with dependencies)' : ''));
    }

    /**
     * POST /api/features/tenant/disable/{moduleKey}
     * Disable a module for the tenant (cascades to dependents).
     */
    public function disableModule(Request $request, Response $response, array $args): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $actorId = $request->getAttribute('auth.user_id');
        $moduleKey = $args['moduleKey'];

        try {
            $removed = $this->featureService->disableModule($tenantId, $moduleKey, $actorId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, [
            'disabled' => $moduleKey,
            'also_disabled' => array_values(array_filter($removed, fn($k) => $k !== $moduleKey)),
        ], "Module '{$moduleKey}' disabled" . (count($removed) > 1 ? ' (with dependents)' : ''));
    }

    /**
     * POST /api/features/resolve-dependencies
     * Given a list of module keys, return the full resolved set. Used by plan creation UI.
     */
    public function resolveDependencies(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $moduleKeys = $body['modules'] ?? [];

        if (!is_array($moduleKeys) || empty($moduleKeys)) {
            return $this->response->validationError($response, ['modules' => 'Provide an array of module keys']);
        }

        $resolved = $this->featureService->resolveAllDependencies($moduleKeys);
        $added = array_values(array_diff($resolved, $moduleKeys));

        return $this->response->success($response, [
            'requested' => $moduleKeys,
            'resolved' => $resolved,
            'auto_added' => $added,
            'total' => count($resolved),
        ]);
    }

    /**
     * POST /api/admin/plans/{id}/duplicate
     * Clone a subscription plan.
     */
    public function duplicatePlan(Request $request, Response $response, array $args): Response
    {
        try {
            $plan = $this->featureService->duplicatePlan($args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->created($response, [
            'id' => $plan->getId(),
            'name' => $plan->getName(),
            'tier' => $plan->getTier(),
            'is_public' => $plan->isPublic(),
        ], 'Plan duplicated');
    }

    private function serializeModule(object $m): array
    {
        return [
            'id' => $m->getId(),
            'module_key' => $m->getModuleKey(),
            'name' => $m->getName(),
            'description' => $m->getDescription(),
            'category' => $m->getCategory(),
            'min_tier' => $m->getMinTier(),
            'is_core' => $m->isCore(),
            'dependencies' => $m->getDependencies(),
            'required_by' => $m->getRequiredBy(),
            'icon' => $m->getIcon(),
            'sort_order' => $m->getSortOrder(),
        ];
    }
}
