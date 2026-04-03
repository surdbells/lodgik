<?php

declare(strict_types=1);

use Lodgik\Module\Ndpr\NdprController;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {

    // ── NDPR compliance — property_admin only ────────────────────────────
    $app->group('/api/compliance', function (RouteCollectorProxy $g) {

        $g->get('/data-requests',                [NdprController::class, 'list']);
        $g->post('/data-requests',               [NdprController::class, 'create']);
        $g->post('/data-requests/{id}/process',  [NdprController::class, 'process']);
        $g->post('/data-requests/{id}/reject',   [NdprController::class, 'reject']);

        // Export file download — authenticated, served inline
        $g->get('/exports/{filename}',           [NdprController::class, 'downloadExport']);

    })
        ->add(new RoleMiddleware(['property_admin', 'super_admin']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
