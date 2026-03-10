<?php
declare(strict_types=1);
use Lodgik\Module\Corporate\CorporateController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/corporate-profiles', function (RouteCollectorProxy $g) {
        $g->get('',             [CorporateController::class, 'list']);
        $g->post('',            [CorporateController::class, 'create']);
        $g->get('/{id}',        [CorporateController::class, 'get']);
        $g->put('/{id}',        [CorporateController::class, 'update']);
        $g->delete('/{id}',     [CorporateController::class, 'delete']);
        $g->post('/{id}/toggle-active', [CorporateController::class, 'toggleActive']);
        $g->get('/{id}/intelligence',   [CorporateController::class, 'intelligence']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'accountant']))
      ->add(TenantMiddleware::class)
      ->add(AuthMiddleware::class);
};
