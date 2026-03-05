<?php
declare(strict_types=1);

use Lodgik\Module\GuestCard\GuestCardController;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {

    // ── Card operations (reception + security + management) ───────
    $app->group('/api/cards', function (RouteCollectorProxy $g) {
        $g->get('',                          [GuestCardController::class, 'listCards']);
        $g->get('/{id}',                     [GuestCardController::class, 'showCard']);
        $g->post('/issue',                   [GuestCardController::class, 'issueCard']);
        $g->post('/scan',                    [GuestCardController::class, 'scan']);
        $g->get('/lookup/{cardUid}',         [GuestCardController::class, 'lookup']);
        $g->post('/{id}/report-lost',        [GuestCardController::class, 'reportLost']);
        $g->post('/{id}/deactivate',         [GuestCardController::class, 'deactivate']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'security', 'receptionist']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Card inventory management (admin + manager only) ──────────
    $app->group('/api/card-inventory', function (RouteCollectorProxy $g) {
        $g->post('/register',                [GuestCardController::class, 'registerCard']);
        $g->post('/register-bulk',           [GuestCardController::class, 'registerBulk']);
        $g->get('/report',                   [GuestCardController::class, 'inventoryReport']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Card event log + movement reports ─────────────────────────
    $app->group('/api/card-events', function (RouteCollectorProxy $g) {
        $g->get('',                          [GuestCardController::class, 'listEvents']);
        $g->get('/live',                     [GuestCardController::class, 'liveEvents']);
        $g->get('/booking/{bookingId}',      [GuestCardController::class, 'eventsByBooking']);
        $g->get('/guest/{guestId}',          [GuestCardController::class, 'guestMovementTimeline']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'security', 'receptionist']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Scan point configuration ───────────────────────────────────
    $app->group('/api/scan-points', function (RouteCollectorProxy $g) {
        $g->get('',                          [GuestCardController::class, 'listScanPoints']);
        $g->post('',                         [GuestCardController::class, 'createScanPoint']);
        $g->put('/{id}',                     [GuestCardController::class, 'updateScanPoint']);
        $g->post('/{id}/regenerate-key',     [GuestCardController::class, 'regenerateKey']);
        $g->delete('/{id}',                  [GuestCardController::class, 'deleteScanPoint']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
