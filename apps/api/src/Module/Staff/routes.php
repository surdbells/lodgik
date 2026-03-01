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
        $group->post('', [StaffController::class, 'create']);
        $group->post('/invite', [StaffController::class, 'invite']);
        $group->get('/{id}', [StaffController::class, 'show']);
        $group->patch('/{id}', [StaffController::class, 'update']);
        $group->delete('/{id}', [StaffController::class, 'delete']);
        $group->post('/{id}/resend-invite', [StaffController::class, 'resendInvite']);
        $group->post('/{id}/avatar', [StaffController::class, 'uploadAvatar']);
        $group->get('/{id}/property-access', [StaffController::class, 'getPropertyAccess']);
        $group->post('/{id}/property-access', [StaffController::class, 'grantPropertyAccess']);
        $group->delete('/{id}/property-access/{propertyId}', [StaffController::class, 'revokePropertyAccess']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
