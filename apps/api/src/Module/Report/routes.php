<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Report\ReportController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/reports', function (RouteCollectorProxy $g) {
        // Front Office
        $g->get('/arrivals',            [ReportController::class, 'arrivals']);
        $g->get('/departures',          [ReportController::class, 'departures']);
        $g->get('/in-house',            [ReportController::class, 'inHouse']);
        $g->get('/no-shows',            [ReportController::class, 'noShows']);

        // Room
        $g->get('/room-status',         [ReportController::class, 'roomStatus']);
        $g->get('/room-availability',   [ReportController::class, 'roomAvailability']);
        $g->get('/occupancy',           [ReportController::class, 'occupancy']);

        // Financial
        $g->get('/daily-revenue',       [ReportController::class, 'dailyRevenue']);
        $g->get('/payment-collection',  [ReportController::class, 'paymentCollection']);
        $g->get('/outstanding-balances',[ReportController::class, 'outstandingBalances']);

        // Housekeeping
        $g->get('/housekeeping-status', [ReportController::class, 'housekeepingStatus']);

        // Cancellations & Walk-ins
        $g->get('/cancellations',        [ReportController::class, 'cancellations']);
        $g->get('/walk-ins',             [ReportController::class, 'walkIns']);

        // Financial (additional)
        $g->get('/revenue-by-room-type', [ReportController::class, 'revenueByRoomType']);
        $g->get('/tax',                  [ReportController::class, 'taxReport']);
        $g->get('/monthly-revenue',      [ReportController::class, 'monthlyRevenue']);

        // Management
        $g->get('/daily-manager',        [ReportController::class, 'dailyManager']);

        // POS
        $g->get('/pos-sales',            [ReportController::class, 'posSales']);

        // Guest
        $g->get('/guest-history',       [ReportController::class, 'guestHistory']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'accountant']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
