<?php
declare(strict_types=1);
use Lodgik\Module\RoomControl\RoomControlController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/room-controls', function (RouteCollectorProxy $g) {
        $g->post('/dnd', [RoomControlController::class, 'toggleDnd']);
        $g->post('/make-up', [RoomControlController::class, 'toggleMakeUp']);
        $g->post('/maintenance', [RoomControlController::class, 'reportMaintenance']);
        $g->post('/maintenance/{id}/assign', [RoomControlController::class, 'assignMaintenance']);
        $g->post('/maintenance/{id}/resolve', [RoomControlController::class, 'resolveMaintenance']);
        $g->get('/status', [RoomControlController::class, 'getRoomStatus']);
        $g->get('/requests', [RoomControlController::class, 'listRequests']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'housekeeping', 'front_desk', 'maintenance', 'concierge', 'engineer']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
