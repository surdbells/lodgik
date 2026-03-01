<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\System\SystemJobController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/system', function (RouteCollectorProxy $group) {
        $group->get('/jobs',           [SystemJobController::class, 'list']);
        $group->post('/jobs/{job}/run',[SystemJobController::class, 'run']);
    })
        ->add(new RoleMiddleware(['super_admin']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
