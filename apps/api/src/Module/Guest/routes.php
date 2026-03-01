<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Guest\GuestController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/guests', function (RouteCollectorProxy $group) {
        $group->get('/search', [GuestController::class, 'search']);
        $group->get('/nationalities', [GuestController::class, 'nationalities']);
        $group->get('', [GuestController::class, 'list']);
        $group->post('', [GuestController::class, 'create']);
        $group->post('/merge', [GuestController::class, 'merge']);
        $group->get('/{id}', [GuestController::class, 'show']);
        $group->put('/{id}', [GuestController::class, 'update']);
        $group->delete('/{id}', [GuestController::class, 'delete']);
        $group->get('/{id}/documents', [GuestController::class, 'documents']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
