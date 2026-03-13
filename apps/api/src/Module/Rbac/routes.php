<?php
declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\PermissionMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Module\Rbac\RbacController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/rbac', function (RouteCollectorProxy $group) {
        // Permission catalogue (all authenticated users can read — used for UI rendering)
        $group->get('/permissions', [RbacController::class, 'catalogue'])
            ->add(new RoleMiddleware(['manager', 'property_admin', 'super_admin']));

        // Matrix read & write — property_admin only
        $group->get('/matrix', [RbacController::class, 'matrix'])
            ->add(new PermissionMiddleware('settings.manage_rbac'));

        $group->put('/matrix', [RbacController::class, 'saveMatrix'])
            ->add(new PermissionMiddleware('settings.manage_rbac'));

        $group->post('/reset', [RbacController::class, 'resetRole'])
            ->add(new PermissionMiddleware('settings.manage_rbac'));

        // My permissions — any authenticated user fetches their own permissions
        $group->get('/my-permissions', [RbacController::class, 'myPermissions']);
    })->add(AuthMiddleware::class);
};
