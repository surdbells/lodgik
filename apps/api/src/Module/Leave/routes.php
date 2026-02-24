<?php
declare(strict_types=1);
use Lodgik\Module\Leave\LeaveController;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();
    $featureGate = new FeatureMiddleware('leave_management', 'professional', $c->get(RedisClient::class));

    // Admin: manage types
    $app->group('/api/leave-types', function (RouteCollectorProxy $g) {
        $g->get('', [LeaveController::class, 'listTypes']);
        $g->post('', [LeaveController::class, 'createType']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'hr']))->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // All authenticated staff: submit/view/cancel own requests
    // Approve/reject: managers/hr only (enforced in controller via role check)
    $app->group('/api/leave-requests', function (RouteCollectorProxy $g) {
        $g->get('/pending', [LeaveController::class, 'pendingRequests']);
        $g->get('/{id}', [LeaveController::class, 'getRequest']);
        $g->post('', [LeaveController::class, 'submitRequest']);
        $g->post('/{id}/approve', [LeaveController::class, 'approveRequest']);
        $g->post('/{id}/reject', [LeaveController::class, 'rejectRequest']);
        $g->post('/{id}/cancel', [LeaveController::class, 'cancelRequest']);
    })->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    $app->group('/api/leave-balances', function (RouteCollectorProxy $g) {
        $g->get('', [LeaveController::class, 'getBalances']);
        $g->post('/init/{employeeId}', [LeaveController::class, 'initBalances']);
    })->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
