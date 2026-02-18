<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Module\Admin\AdminController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Public: list subscription plans (for pricing page)
    $app->get('/api/plans', [AdminController::class, 'listPublicPlans']);

    // Super admin routes (no tenant context needed)
    $app->group('/api/admin', function (RouteCollectorProxy $group) {
        // Dashboard
        $group->get('/dashboard', [AdminController::class, 'dashboard']);

        // Tenant management
        $group->get('/tenants', [AdminController::class, 'listTenants']);
        $group->get('/tenants/{id}', [AdminController::class, 'showTenant']);
        $group->patch('/tenants/{id}/activate', [AdminController::class, 'activateTenant']);
        $group->patch('/tenants/{id}/suspend', [AdminController::class, 'suspendTenant']);
        $group->post('/tenants/{id}/assign-plan', [AdminController::class, 'assignPlan']);

        // Plan management
        $group->get('/plans', [AdminController::class, 'listPlans']);
        $group->get('/plans/{id}', [AdminController::class, 'showPlan']);
        $group->post('/plans', [AdminController::class, 'createPlan']);
        $group->patch('/plans/{id}', [AdminController::class, 'updatePlan']);
        $group->delete('/plans/{id}', [AdminController::class, 'deletePlan']);
    })
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);
};
