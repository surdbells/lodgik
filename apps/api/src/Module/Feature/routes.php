<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Feature\FeatureController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Public: list all feature modules (for pricing page comparison)
    $app->get('/api/features/modules', [FeatureController::class, 'listModules']);

    // Dependency resolver (super admin tool for plan creation)
    $app->post('/api/features/resolve-dependencies', [FeatureController::class, 'resolveDependencies'])
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);

    // Tenant feature management (property admin)
    $app->group('/api/features/tenant', function (RouteCollectorProxy $group) {
        $group->get('', [FeatureController::class, 'tenantFeatures']);
        $group->post('/enable/{moduleKey}', [FeatureController::class, 'enableModule']);
        $group->post('/disable/{moduleKey}', [FeatureController::class, 'disableModule']);
    })
        ->add(new RoleMiddleware(['property_admin']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // Plan duplicate (super admin) — add to existing admin routes
    $app->post('/api/admin/plans/{id}/duplicate', [FeatureController::class, 'duplicatePlan'])
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);
};
