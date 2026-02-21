<?php
declare(strict_types=1);
use Lodgik\Module\Spa\SpaController; use Lodgik\Middleware\{RoleMiddleware, AuthMiddleware, TenantMiddleware};
use Slim\App; use Slim\Routing\RouteCollectorProxy;
return function (App $app): void {
    $app->group('/spa', function (RouteCollectorProxy $g) {
        $g->get('/services', [SpaController::class, 'listServices']); $g->post('/services', [SpaController::class, 'createService']); $g->put('/services/{id}', [SpaController::class, 'updateService']);
        $g->get('/bookings', [SpaController::class, 'listBookings']); $g->post('/bookings', [SpaController::class, 'createBooking']);
        $g->post('/bookings/{id}/start', [SpaController::class, 'startBooking']); $g->post('/bookings/{id}/complete', [SpaController::class, 'completeBooking']); $g->post('/bookings/{id}/cancel', [SpaController::class, 'cancelBooking']);
        $g->get('/pool', [SpaController::class, 'listPoolAccess']); $g->post('/pool/check-in', [SpaController::class, 'poolCheckIn']); $g->post('/pool/{id}/check-out', [SpaController::class, 'poolCheckOut']); $g->get('/pool/occupancy', [SpaController::class, 'poolOccupancy']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'concierge', 'front_desk']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
