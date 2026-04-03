<?php

declare(strict_types=1);

use Lodgik\Module\Docs\DocsController;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // JWT-authenticated docs endpoints for tenants.
    // The static /docs/ path (served by Nginx) remains available for dev use.
    $app->group('/api/docs', function (RouteCollectorProxy $g) {
        $g->get('',              [DocsController::class, 'ui']);
        $g->get('/openapi.yaml', [DocsController::class, 'spec']);
    })
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
