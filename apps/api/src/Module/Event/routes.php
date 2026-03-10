<?php
declare(strict_types=1);
use Lodgik\Module\Event\EventController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $eventRoles = new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'accountant']);

    $app->group('/api/events', function (RouteCollectorProxy $g) {
        // Dashboard
        $g->get('/dashboard',   [EventController::class, 'dashboard']);
        $g->get('/calendar',    [EventController::class, 'calendar']);

        // Event Spaces
        $g->get('/spaces',              [EventController::class, 'listSpaces']);
        $g->post('/spaces',             [EventController::class, 'createSpace']);
        $g->put('/spaces/{id}',         [EventController::class, 'updateSpace']);
        $g->delete('/spaces/{id}',      [EventController::class, 'deleteSpace']);

        // Event Bookings
        $g->get('',                     [EventController::class, 'list']);
        $g->post('',                    [EventController::class, 'create']);
        $g->get('/{id}',                [EventController::class, 'get']);
        $g->put('/{id}',                [EventController::class, 'update']);
        $g->post('/{id}/confirm',       [EventController::class, 'confirm']);
        $g->post('/{id}/cancel',        [EventController::class, 'cancel']);
        $g->post('/{id}/complete',      [EventController::class, 'complete']);
        $g->post('/{id}/record-deposit',[EventController::class, 'recordDeposit']);
    })->add($eventRoles)->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
