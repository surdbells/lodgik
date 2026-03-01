<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\AppDistribution\AppDistributionController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Public: latest releases, version check, signed downloads
    $app->get('/api/apps/latest', [AppDistributionController::class, 'latestReleases']);
    $app->post('/api/apps/version-check', [AppDistributionController::class, 'versionCheck']);
    $app->get('/api/apps/download/{id}', [AppDistributionController::class, 'download']);

    // Tenant: heartbeat (authenticated)
    $app->post('/api/apps/heartbeat', [AppDistributionController::class, 'heartbeat'])
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // Super Admin: release management
    $app->group('/api/admin/releases', function (RouteCollectorProxy $group) {
        $group->get('', [AppDistributionController::class, 'listReleases']);
        $group->post('', [AppDistributionController::class, 'createRelease']);
        $group->get('/{id}', [AppDistributionController::class, 'showRelease']);
        $group->patch('/{id}', [AppDistributionController::class, 'updateRelease']);
        $group->delete('/{id}', [AppDistributionController::class, 'deleteRelease']);
        $group->post('/{id}/publish', [AppDistributionController::class, 'publishRelease']);
        $group->post('/{id}/deprecate', [AppDistributionController::class, 'deprecateRelease']);
        $group->post('/{id}/signed-url', [AppDistributionController::class, 'signedUrl']);
    })
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);

    // Super Admin: analytics & installations
    $app->get('/api/admin/apps/analytics', [AppDistributionController::class, 'analytics'])
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);

    $app->get('/api/admin/apps/installations', [AppDistributionController::class, 'installations'])
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);
};
