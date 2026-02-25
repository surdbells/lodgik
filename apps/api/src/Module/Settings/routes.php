<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Module\Settings\SettingsController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/admin/settings', function (RouteCollectorProxy $g) {
        $g->get('', [SettingsController::class, 'index']);
        $g->patch('', [SettingsController::class, 'update']);
        $g->post('/test-email', [SettingsController::class, 'testEmail']);
        $g->post('/test-sms', [SettingsController::class, 'testSms']);
    })
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);
};
