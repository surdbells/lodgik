<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Report\ReportController;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

/**
 * Report routes — split across three feature tiers:
 *
 *  basic_analytics    (all plans)   — daily ops: arrivals, departures, in-house, no-shows,
 *                                     room-status, room-availability
 *  advanced_analytics (business+)  — revenue & performance: occupancy, daily-revenue,
 *                                     payment-collection, outstanding-balances,
 *                                     revenue-by-room-type, monthly-revenue, daily-manager
 *  custom_reports     (enterprise) — deeper analysis: tax, guest-history, cancellations,
 *                                     walk-ins, pos-sales, housekeeping-status
 */
return function (App $app): void {
    $c     = $app->getContainer();
    $redis = $c->get(RedisClient::class);

    // Roles that can access any report endpoint
    $roles = new RoleMiddleware([
        'property_admin', 'manager', 'front_desk', 'accountant', 'housekeeping', 'bar',
    ]);

    // ── Tier 1: basic_analytics (all plans) ──────────────────────
    $basicGate = new FeatureMiddleware('basic_analytics', 'all', $redis);

    $app->group('/api/reports', function (RouteCollectorProxy $g) {
        $g->get('/arrivals',          [ReportController::class, 'arrivals']);
        $g->get('/departures',        [ReportController::class, 'departures']);
        $g->get('/in-house',          [ReportController::class, 'inHouse']);
        $g->get('/no-shows',          [ReportController::class, 'noShows']);
        $g->get('/room-status',       [ReportController::class, 'roomStatus']);
        $g->get('/room-availability', [ReportController::class, 'roomAvailability']);
    })
        ->add($roles)
        ->add($basicGate)
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Tier 2: advanced_analytics (business+) ───────────────────
    $advancedGate = new FeatureMiddleware('advanced_analytics', 'business', $redis);

    $app->group('/api/reports', function (RouteCollectorProxy $g) {
        $g->get('/occupancy',            [ReportController::class, 'occupancy']);
        $g->get('/daily-revenue',        [ReportController::class, 'dailyRevenue']);
        $g->get('/payment-collection',   [ReportController::class, 'paymentCollection']);
        $g->get('/outstanding-balances', [ReportController::class, 'outstandingBalances']);
        $g->get('/revenue-by-room-type', [ReportController::class, 'revenueByRoomType']);
        $g->get('/monthly-revenue',      [ReportController::class, 'monthlyRevenue']);
        $g->get('/daily-manager',        [ReportController::class, 'dailyManager']);
    })
        ->add($roles)
        ->add($advancedGate)
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Tier 3: custom_reports (enterprise) ──────────────────────
    $customGate = new FeatureMiddleware('custom_reports', 'enterprise', $redis);

    $app->group('/api/reports', function (RouteCollectorProxy $g) {
        $g->get('/tax',               [ReportController::class, 'taxReport']);
        $g->get('/guest-history',     [ReportController::class, 'guestHistory']);
        $g->get('/cancellations',     [ReportController::class, 'cancellations']);
        $g->get('/walk-ins',          [ReportController::class, 'walkIns']);
        $g->get('/pos-sales',         [ReportController::class, 'posSales']);
        $g->get('/housekeeping-status', [ReportController::class, 'housekeepingStatus']);
    })
        ->add($roles)
        ->add($customGate)
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
