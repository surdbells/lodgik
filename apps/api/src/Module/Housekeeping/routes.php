<?php
declare(strict_types=1);
use Lodgik\Module\Housekeeping\HousekeepingController;
use Lodgik\Module\Housekeeping\ConsumableController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/housekeeping', function (RouteCollectorProxy $g) {
        $g->get('/tasks', [HousekeepingController::class, 'listTasks']);
        $g->post('/tasks', [HousekeepingController::class, 'createTask']);
        $g->post('/tasks/{id}/assign', [HousekeepingController::class, 'assignTask']);
        $g->post('/tasks/{id}/start', [HousekeepingController::class, 'startTask']);
        $g->post('/tasks/{id}/complete', [HousekeepingController::class, 'completeTask']);
        $g->post('/tasks/{id}/inspect', [HousekeepingController::class, 'inspectTask']);
        $g->post('/tasks/{id}/photos', [HousekeepingController::class, 'uploadPhoto']);
        $g->get('/stats/today', [HousekeepingController::class, 'todayStats']);
        $g->get('/lost-and-found', [HousekeepingController::class, 'listLostAndFound']);
        $g->post('/lost-and-found', [HousekeepingController::class, 'reportLostItem']);
        $g->post('/lost-and-found/{id}/claim', [HousekeepingController::class, 'claimItem']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'housekeeping', 'front_desk']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // Phase 4: Housekeeping Consumables
    $app->group('/api/housekeeping/consumables', function (RouteCollectorProxy $g) {
        $g->get('',        [ConsumableController::class, 'listConsumables']);
        $g->post('',       [ConsumableController::class, 'createConsumable']);
        $g->patch('/{id}', [ConsumableController::class, 'updateConsumable']);
        $g->delete('/{id}',[ConsumableController::class, 'deleteConsumable']);
        // Stock management
        $g->get('/{id}/stock',   [ConsumableController::class, 'getStock']);
        $g->post('/{id}/stock',  [ConsumableController::class, 'adjustStock']);
    })->add(new RoleMiddleware(['property_admin', 'manager']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    $app->group('/api/housekeeping/store-requests', function (RouteCollectorProxy $g) {
        $g->get('',                            [ConsumableController::class, 'listRequests']);
        $g->post('',                           [ConsumableController::class, 'createRequest']);
        $g->post('/{id}/storekeeper-approve',  [ConsumableController::class, 'storekeeperApprove']);
        $g->post('/{id}/admin-approve',        [ConsumableController::class, 'adminApprove']);
        $g->post('/{id}/reject',               [ConsumableController::class, 'reject']);
        $g->post('/{id}/fulfill',              [ConsumableController::class, 'fulfill']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'housekeeping']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    $app->group('/api/housekeeping/discrepancies', function (RouteCollectorProxy $g) {
        $g->get('',              [ConsumableController::class, 'listDiscrepancies']);
        $g->post('/run-check',   [ConsumableController::class, 'runDiscrepancyCheck']);
        $g->post('/{id}/resolve',[ConsumableController::class, 'resolveDiscrepancy']);
    })->add(new RoleMiddleware(['property_admin', 'manager']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
