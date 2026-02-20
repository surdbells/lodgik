<?php

declare(strict_types=1);

use Lodgik\Module\Security\SecurityController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/security', function (RouteCollectorProxy $g) {
        // Visitor codes
        $g->get('/visitor-codes', [SecurityController::class, 'listVisitorCodes']);
        $g->post('/visitor-codes', [SecurityController::class, 'createVisitorCode']);
        $g->post('/visitor-codes/{id}/revoke', [SecurityController::class, 'revokeVisitorCode']);
        $g->post('/visitor-codes/validate', [SecurityController::class, 'validateVisitorCode']);

        // Gate passes
        $g->get('/gate-passes', [SecurityController::class, 'listGatePasses']);
        $g->post('/gate-passes', [SecurityController::class, 'createGatePass']);
        $g->post('/gate-passes/{id}/approve', [SecurityController::class, 'approveGatePass']);
        $g->post('/gate-passes/{id}/deny', [SecurityController::class, 'denyGatePass']);
        $g->post('/gate-passes/{id}/check-in', [SecurityController::class, 'gatePassCheckIn']);
        $g->post('/gate-passes/{id}/check-out', [SecurityController::class, 'gatePassCheckOut']);

        // Guest movements
        $g->get('/movements', [SecurityController::class, 'getMovements']);
        $g->post('/movements', [SecurityController::class, 'recordMovement']);
        $g->get('/on-premise', [SecurityController::class, 'getOnPremise']);
    });
};
