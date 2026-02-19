<?php

declare(strict_types=1);

use Lodgik\Module\Leave\LeaveController;
use Lodgik\Middleware\FeatureMiddleware;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();
    $featureGate = new FeatureMiddleware('leave_management', 'professional', $c->get(RedisClient::class));

    $app->group('/leave-types', function (RouteCollectorProxy $g) {
        $g->get('', [LeaveController::class, 'listTypes']);
        $g->post('', [LeaveController::class, 'createType']);
    })->add($featureGate);

    $app->group('/leave-requests', function (RouteCollectorProxy $g) {
        $g->get('/pending', [LeaveController::class, 'pendingRequests']);
        $g->get('/{id}', [LeaveController::class, 'getRequest']);
        $g->post('', [LeaveController::class, 'submitRequest']);
        $g->post('/{id}/approve', [LeaveController::class, 'approveRequest']);
        $g->post('/{id}/reject', [LeaveController::class, 'rejectRequest']);
        $g->post('/{id}/cancel', [LeaveController::class, 'cancelRequest']);
    })->add($featureGate);

    $app->group('/leave-balances', function (RouteCollectorProxy $g) {
        $g->get('/{employee_id}', [LeaveController::class, 'getBalances']);
        $g->post('/{employee_id}/initialize', [LeaveController::class, 'initBalances']);
    })->add($featureGate);

    $app->group('/leave-history', function (RouteCollectorProxy $g) {
        $g->get('/{employee_id}', [LeaveController::class, 'employeeRequests']);
    })->add($featureGate);
};
