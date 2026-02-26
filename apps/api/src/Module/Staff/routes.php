<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Staff\StaffController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/staff', function (RouteCollectorProxy $group) {
        $group->get('', [StaffController::class, 'list']);
        $group->get('/{id}', [StaffController::class, 'show']);
        $group->post('', [StaffController::class, 'create']);
        $group->post('/invite', [StaffController::class, 'invite']);
        $group->patch('/{id}', [StaffController::class, 'update']);
        $group->delete('/{id}', [StaffController::class, 'delete']);
        $group->post('/{id}/resend-invite', [StaffController::class, 'resendInvite']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
