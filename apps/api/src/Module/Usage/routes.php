<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Usage\UsageController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Tenant: usage endpoints
    $app->group('/api/usage', function (RouteCollectorProxy $group) {
        $group->get('/current', [UsageController::class, 'current']);
        $group->get('/history', [UsageController::class, 'history']);
        $group->get('/limits', [UsageController::class, 'limits']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // Super admin: record usage snapshot (for cron)
    $app->post('/api/admin/usage/snapshot', [UsageController::class, 'recordSnapshot'])
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);
};
