<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Dashboard\DashboardController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/dashboard', function (RouteCollectorProxy $group) {
        $group->get('/overview', [DashboardController::class, 'overview']);
        $group->get('/property-comparison', [DashboardController::class, 'propertyComparison']);
        $group->get('/occupancy-trends', [DashboardController::class, 'occupancyTrends']);
        $group->get('/revenue-breakdown', [DashboardController::class, 'revenueBreakdown']);
        $group->get('/activity-feed', [DashboardController::class, 'activityFeed']);
        $group->post('/generate-snapshot', [DashboardController::class, 'generateSnapshot']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
