<?php
declare(strict_types=1);
use Lodgik\Module\Security\SecurityController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/security', function (RouteCollectorProxy $g) {
        $g->get('/visitor-codes', [SecurityController::class, 'listVisitorCodes']);
        $g->post('/visitor-codes', [SecurityController::class, 'createVisitorCode']);
        $g->post('/visitor-codes/{id}/revoke', [SecurityController::class, 'revokeVisitorCode']);
        $g->post('/visitor-codes/validate', [SecurityController::class, 'validateVisitorCode']);
        $g->get('/gate-passes', [SecurityController::class, 'listGatePasses']);
        $g->post('/gate-passes', [SecurityController::class, 'createGatePass']);
        $g->post('/gate-passes/{id}/approve', [SecurityController::class, 'approveGatePass']);
        $g->post('/gate-passes/{id}/deny', [SecurityController::class, 'denyGatePass']);
        $g->post('/gate-passes/{id}/check-in', [SecurityController::class, 'gatePassCheckIn']);
        $g->post('/gate-passes/{id}/check-out', [SecurityController::class, 'gatePassCheckOut']);
        $g->get('/movements', [SecurityController::class, 'getMovements']);
        $g->post('/movements', [SecurityController::class, 'recordMovement']);
        $g->get('/on-premise', [SecurityController::class, 'getOnPremise']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'security', 'front_desk']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
