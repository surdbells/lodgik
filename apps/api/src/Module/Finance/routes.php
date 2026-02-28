<?php
declare(strict_types=1);
use Lodgik\Module\Finance\FinanceController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Expenses: accountant, manager, admin
    $app->group('/api/expenses', function (RouteCollectorProxy $g) {
        $g->get('/categories', [FinanceController::class, 'listCategories']);
        $g->post('/categories', [FinanceController::class, 'createCategory']);
        $g->get('', [FinanceController::class, 'listExpenses']);
        $g->post('', [FinanceController::class, 'createExpense']);
        $g->post('/{id}/submit', [FinanceController::class, 'submitExpense']);
        $g->post('/{id}/approve', [FinanceController::class, 'approveExpense']);
        $g->post('/{id}/reject', [FinanceController::class, 'rejectExpense']);
        $g->post('/{id}/paid', [FinanceController::class, 'markExpensePaid']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'accountant']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Night Audit: manager, admin
    $app->group('/api/night-audit', function (RouteCollectorProxy $g) {
        $g->get('', [FinanceController::class, 'listAudits']);
        $g->post('/generate', [FinanceController::class, 'generateAudit']);
        $g->post('/{id}/close', [FinanceController::class, 'closeAudit']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'accountant', 'front_desk']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Police Reports: front desk, manager, admin, security
    $app->group('/api/police-reports', function (RouteCollectorProxy $g) {
        $g->get('', [FinanceController::class, 'listReports']);
        $g->post('', [FinanceController::class, 'createReport']);
        $g->post('/{id}/submit', [FinanceController::class, 'submitReport']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'security']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Performance Reviews: manager, hr, admin
    $app->group('/api/performance-reviews', function (RouteCollectorProxy $g) {
        $g->get('', [FinanceController::class, 'listReviews']);
        $g->post('', [FinanceController::class, 'createReview']);
        $g->post('/{id}/submit', [FinanceController::class, 'submitReview']);
        $g->post('/{id}/acknowledge', [FinanceController::class, 'acknowledgeReview']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'hr']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Pricing Rules: manager, admin
    $app->group('/api/pricing-rules', function (RouteCollectorProxy $g) {
        $g->get('', [FinanceController::class, 'listPricingRules']);
        $g->post('', [FinanceController::class, 'createPricingRule']);
        $g->put('/{id}', [FinanceController::class, 'updatePricingRule']);
        $g->get('/calculate', [FinanceController::class, 'calculateRate']);
    })->add(new RoleMiddleware(['property_admin', 'manager']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Group Bookings: front desk, manager, admin
    $app->group('/api/group-bookings', function (RouteCollectorProxy $g) {
        $g->get('', [FinanceController::class, 'listGroups']);
        $g->post('', [FinanceController::class, 'createGroup']);
        $g->post('/{id}/confirm', [FinanceController::class, 'confirmGroup']);
        $g->post('/{id}/cancel', [FinanceController::class, 'cancelGroup']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
