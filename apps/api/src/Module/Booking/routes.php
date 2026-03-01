<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Booking\BookingController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/bookings', function (RouteCollectorProxy $group) {
        // ── Static GET routes MUST come before /{id} ─────────────────
        $group->get('', [BookingController::class, 'list']);
        $group->get('/today', [BookingController::class, 'today']);
        $group->get('/calendar', [BookingController::class, 'calendar']);
        $group->get('/overdue', [BookingController::class, 'overdue']);

        // ── Static POST routes MUST come before /{id} ────────────────
        $group->post('', [BookingController::class, 'create']);
        $group->post('/preview-rate', [BookingController::class, 'previewRate']);

        // ── Variable routes ───────────────────────────────────────────
        $group->get('/{id}', [BookingController::class, 'show']);
        $group->get('/{id}/status-history', [BookingController::class, 'statusHistory']);
        $group->post('/{id}/check-in', [BookingController::class, 'checkIn']);
        $group->post('/{id}/check-out', [BookingController::class, 'checkOut']);
        $group->post('/{id}/cancel', [BookingController::class, 'cancel']);
        $group->post('/{id}/no-show', [BookingController::class, 'noShow']);
        $group->post('/{id}/clear-front-desk', [BookingController::class, 'clearFrontDesk']);
        $group->post('/{id}/clear-security', [BookingController::class, 'clearSecurity']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
