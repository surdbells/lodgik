<?php
declare(strict_types=1);
use Lodgik\Module\Payroll\PayrollController;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();
    $featureGate = new FeatureMiddleware('payroll', 'business', $c->get(RedisClient::class));
    $app->group('/payroll', function (RouteCollectorProxy $g) {
        $g->get('', [PayrollController::class, 'listPeriods']);
        $g->get('/tax-brackets', [PayrollController::class, 'taxBrackets']);
        $g->get('/{id}', [PayrollController::class, 'getPeriod']);
        $g->post('', [PayrollController::class, 'createPeriod']);
        $g->post('/{id}/calculate', [PayrollController::class, 'calculate']);
        $g->post('/{id}/review', [PayrollController::class, 'review']);
        $g->post('/{id}/approve', [PayrollController::class, 'approve']);
        $g->post('/{id}/paid', [PayrollController::class, 'markPaid']);
    })->add(new RoleMiddleware(['property_admin', 'hr']))->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    $app->group('/payslips', function (RouteCollectorProxy $g) {
        $g->get('/{id}', [PayrollController::class, 'getPayslip']);
    })->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
