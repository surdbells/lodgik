<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Dashboard\DashboardController;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

/**
 * Dashboard routes — feature-gated per analytics tier.
 *
 * basic_analytics    (all plans)  — overview, activity-feed, snapshot,
 *                                   housekeeping-summary, service-requests-summary
 * advanced_analytics (business+) — occupancy-trends, revenue-breakdown,
 *                                   property-comparison, folio-summary
 */
return function (App $app): void {
    $c     = $app->getContainer();
    $redis = $c->get(RedisClient::class);

    $roles       = new RoleMiddleware(['property_admin', 'manager', 'accountant', 'front_desk']);
    $basicGate   = new FeatureMiddleware('basic_analytics',    'all',      $redis);
    $advancedGate= new FeatureMiddleware('advanced_analytics', 'business', $redis);

    // ── Tier 1: basic_analytics (all plans) ─────────────────────
    $app->group('/api/dashboard', function (RouteCollectorProxy $g) {
        $g->get( '/overview',                  [DashboardController::class, 'overview']);
        $g->get( '/activity-feed',             [DashboardController::class, 'activityFeed']);
        $g->post('/generate-snapshot',         [DashboardController::class, 'generateSnapshot']);
        $g->get( '/housekeeping-summary',      [DashboardController::class, 'housekeepingSummary']);
        $g->get( '/service-requests-summary',  [DashboardController::class, 'serviceRequestsSummary']);
    })
        ->add($roles)
        ->add($basicGate)
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Tier 2: advanced_analytics (business+) ───────────────────
    $app->group('/api/dashboard', function (RouteCollectorProxy $g) {
        $g->get('/occupancy-trends',    [DashboardController::class, 'occupancyTrends']);
        $g->get('/revenue-breakdown',   [DashboardController::class, 'revenueBreakdown']);
        $g->get('/property-comparison', [DashboardController::class, 'propertyComparison']);
        $g->get('/folio-summary',       [DashboardController::class, 'folioSummary']);
    })
        ->add($roles)
        ->add($advancedGate)
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
