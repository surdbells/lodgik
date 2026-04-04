<?php
declare(strict_types=1);
use Lodgik\Module\Ota\OtaController; use Lodgik\Middleware\{RoleMiddleware, AuthMiddleware, TenantMiddleware};
use Slim\App; use Slim\Routing\RouteCollectorProxy;
return function (App $app): void {

    // ── Public routes — no auth (token in URL acts as the secret) ──────────
    // iCal feed: hotels paste this URL into Booking.com / Expedia extranet
    $app->get('/api/ota/feed/{token}', [OtaController::class, 'icalFeed']);

    // Inbound webhook from OTA platforms (Booking.com, Airbnb, etc.)
    $app->post('/api/ota/webhook/{channelId}', [OtaController::class, 'webhook']);

    // ── Authenticated routes ────────────────────────────────────────────────
    $app->group('/api/ota', function (RouteCollectorProxy $g) {
        $g->get('/channels', [OtaController::class, 'listChannels']); $g->post('/channels', [OtaController::class, 'createChannel']);
        $g->put('/channels/{id}', [OtaController::class, 'updateChannel']);
        $g->post('/channels/{id}/activate', [OtaController::class, 'activateChannel']); $g->post('/channels/{id}/pause', [OtaController::class, 'pauseChannel']);
        $g->post('/channels/{id}/disconnect', [OtaController::class, 'disconnectChannel']); $g->post('/channels/{id}/sync', [OtaController::class, 'syncChannel']);
        $g->post('/channels/{id}/rotate-ical-token', [OtaController::class, 'rotateIcalToken']);
        $g->get('/reservations', [OtaController::class, 'listReservations']); $g->post('/reservations', [OtaController::class, 'ingestReservation']);
        $g->post('/reservations/{id}/confirm', [OtaController::class, 'confirmReservation']); $g->post('/reservations/{id}/cancel', [OtaController::class, 'cancelReservation']);
        $g->get('/revenue', [OtaController::class, 'channelRevenue']);
    })->add(new RoleMiddleware(['property_admin', 'manager']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
