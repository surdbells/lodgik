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
        $group->get('/{id}/guest-access',   [BookingController::class, 'guestAccess']);
        $group->get('/{id}/status-history', [BookingController::class, 'statusHistory']);
        $group->post('/{id}/check-in', [BookingController::class, 'checkIn']);
        $group->post('/{id}/check-out', [BookingController::class, 'checkOut']);
        $group->post('/{id}/extend-checkout', [BookingController::class, 'extendCheckout']);
        $group->post('/{id}/cancel', [BookingController::class, 'cancel']);
        $group->post('/{id}/confirm', [BookingController::class, 'confirm']);
        $group->post('/{id}/no-show', [BookingController::class, 'noShow']);
        $group->post('/{id}/clear-front-desk', [BookingController::class, 'clearFrontDesk']);
        $group->post('/{id}/clear-security', [BookingController::class, 'clearSecurity']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Shadow rate — property_admin only ────────────────────────────
    // Separate group so the role restriction is narrower than general booking ops.
    $app->group('/api/bookings', function (RouteCollectorProxy $group) {
        $group->patch('/{id}/shadow-rate', [BookingController::class, 'setShadowRate']);
    })
        ->add(new RoleMiddleware(['property_admin']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
