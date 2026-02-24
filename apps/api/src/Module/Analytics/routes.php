<?php
declare(strict_types=1);
use Lodgik\Module\Analytics\AnalyticsController; use Lodgik\Middleware\{RoleMiddleware, AuthMiddleware, TenantMiddleware};
use Slim\App; use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/analytics', function (RouteCollectorProxy $g) {
        $g->get('/revpar', [AnalyticsController::class, 'revparTrend']); $g->get('/adr-by-day', [AnalyticsController::class, 'adrByDay']);
        $g->get('/occupancy', [AnalyticsController::class, 'occupancyTrend']); $g->get('/revenue', [AnalyticsController::class, 'revenueBreakdown']);
        $g->get('/booking-sources', [AnalyticsController::class, 'bookingSources']); $g->get('/top-rooms', [AnalyticsController::class, 'topRooms']);
        $g->get('/profit-loss', [AnalyticsController::class, 'profitLoss']); $g->get('/demographics', [AnalyticsController::class, 'guestDemographics']);
        $g->get('/monthly-summary', [AnalyticsController::class, 'monthlySummary']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'accountant']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
