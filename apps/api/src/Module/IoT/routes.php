<?php
declare(strict_types=1);
use Lodgik\Module\IoT\IoTController; use Lodgik\Middleware\{RoleMiddleware, AuthMiddleware, TenantMiddleware};
use Slim\App; use Slim\Routing\RouteCollectorProxy;
return function (App $app): void {
    $app->group('/api/iot', function (RouteCollectorProxy $g) {
        $g->get('/devices', [IoTController::class, 'listDevices']); $g->post('/devices', [IoTController::class, 'registerDevice']);
        $g->post('/devices/{id}/state', [IoTController::class, 'updateState']); $g->post('/devices/{id}/control', [IoTController::class, 'control']);
        $g->get('/room-devices', [IoTController::class, 'roomDevices']); $g->get('/energy', [IoTController::class, 'energyReport']); $g->get('/status-summary', [IoTController::class, 'statusSummary']);
        $g->get('/automations', [IoTController::class, 'listAutomations']); $g->post('/automations', [IoTController::class, 'createAutomation']);
        $g->post('/automations/{id}/toggle', [IoTController::class, 'toggleAutomation']); $g->post('/trigger', [IoTController::class, 'triggerEvent']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'engineer']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
