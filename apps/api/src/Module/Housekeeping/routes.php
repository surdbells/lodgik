<?php
declare(strict_types=1);
use Lodgik\Module\Housekeeping\HousekeepingController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/housekeeping', function (RouteCollectorProxy $g) {
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
};
