<?php
declare(strict_types=1);
use Lodgik\Module\Ota\OtaController; use Lodgik\Middleware\{RoleMiddleware, AuthMiddleware, TenantMiddleware};
use Slim\App; use Slim\Routing\RouteCollectorProxy;
return function (App $app): void {
    $app->group('/api/ota', function (RouteCollectorProxy $g) {
        $g->get('/channels', [OtaController::class, 'listChannels']); $g->post('/channels', [OtaController::class, 'createChannel']);
        $g->put('/channels/{id}', [OtaController::class, 'updateChannel']);
        $g->post('/channels/{id}/activate', [OtaController::class, 'activateChannel']); $g->post('/channels/{id}/pause', [OtaController::class, 'pauseChannel']);
        $g->post('/channels/{id}/disconnect', [OtaController::class, 'disconnectChannel']); $g->post('/channels/{id}/sync', [OtaController::class, 'syncChannel']);
        $g->get('/reservations', [OtaController::class, 'listReservations']); $g->post('/reservations', [OtaController::class, 'ingestReservation']);
        $g->post('/reservations/{id}/confirm', [OtaController::class, 'confirmReservation']); $g->post('/reservations/{id}/cancel', [OtaController::class, 'cancelReservation']);
        $g->get('/revenue', [OtaController::class, 'channelRevenue']);
    })->add(new RoleMiddleware(['property_admin', 'manager']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
