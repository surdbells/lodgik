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
        // Static routes MUST be before variable routes in FastRoute
        $g->get('/pending',                  [GuestCardController::class, 'listPendingCards']);
        $g->get('/lookup',                   [GuestCardController::class, 'lookupByQuery']);      // ?q=&property_id=
        $g->get('/lookup/{cardUid}',         [GuestCardController::class, 'lookup']);
        $g->get('/{id}',                     [GuestCardController::class, 'showCard']);
        $g->post('/issue',                   [GuestCardController::class, 'issueCard']);
        $g->post('/gate-issue',              [GuestCardController::class, 'gateIssueCard']);
        $g->post('/security-issue',          [GuestCardController::class, 'securityIssueCard']);
        $g->post('/security-exit',           [GuestCardController::class, 'securityExit']);
        $g->post('/scan',                    [GuestCardController::class, 'scan']);
        $g->post('/{id}/report-lost',        [GuestCardController::class, 'reportLost']);
        $g->post('/{id}/attach-booking',     [GuestCardController::class, 'attachCardToBooking']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'security', 'receptionist']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Card deactivation — management only (admin + manager) ─────
    // Reception / front-desk staff cannot deactivate cards directly.
    $app->post('/api/cards/{id}/deactivate', [GuestCardController::class, 'deactivate'])
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Security revocation: REVOKED audit event, role-restricted ─
    // revoke   → security exits a guest and revokes the card (logged as REVOKED, not DEACTIVATED)
    // reactivate → guest changed mind; restore card to ACTIVE with booking re-linked
    $app->post('/api/cards/{id}/revoke',     [GuestCardController::class, 'revoke'])
        ->add(new RoleMiddleware(['security', 'manager', 'property_admin']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    $app->post('/api/cards/{id}/reactivate', [GuestCardController::class, 'reactivate'])
        ->add(new RoleMiddleware(['security', 'manager', 'property_admin']))
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
