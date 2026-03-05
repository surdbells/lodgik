<?php
declare(strict_types=1);
use Lodgik\Module\Asset\AssetController;
use Lodgik\Middleware\{RoleMiddleware, AuthMiddleware, TenantMiddleware, FeatureMiddleware};
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();
    $assetGate = new FeatureMiddleware('asset_management', 'professional', $c->get(RedisClient::class));

    // Asset categories + registry
    $app->group('/api/assets', function (RouteCollectorProxy $g) {
        $g->get('/categories', [AssetController::class, 'listCategories']);
        $g->post('/categories', [AssetController::class, 'createCategory']);
        $g->get('', [AssetController::class, 'listAssets']);
        $g->get('/qr-lookup', [AssetController::class, 'getByQr']);
        $g->get('/status-counts', [AssetController::class, 'statusCounts']);
        $g->get('/{id}', [AssetController::class, 'getAsset']);
        $g->post('', [AssetController::class, 'createAsset']);
        $g->put('/{id}', [AssetController::class, 'updateAsset']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'engineer', 'maintenance', 'housekeeping']))
      ->add($assetGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Engineers directory
    $app->group('/api/engineers', function (RouteCollectorProxy $g) {
        $g->get('', [AssetController::class, 'listEngineers']);
        $g->post('', [AssetController::class, 'createEngineer']);
        $g->put('/{id}', [AssetController::class, 'updateEngineer']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'engineer']))
      ->add($assetGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Asset incidents
    $app->group('/api/asset-incidents', function (RouteCollectorProxy $g) {
        $g->get('', [AssetController::class, 'listIncidents']);
        $g->get('/stats', [AssetController::class, 'incidentStats']);
        $g->post('', [AssetController::class, 'reportIncident']);
        $g->post('/{id}/assign', [AssetController::class, 'assignIncident']);
        $g->post('/{id}/start', [AssetController::class, 'startIncident']);
        $g->post('/{id}/resolve', [AssetController::class, 'resolveIncident']);
        $g->post('/{id}/close', [AssetController::class, 'closeIncident']);
        $g->post('/{id}/escalate', [AssetController::class, 'escalateIncident']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'engineer', 'maintenance', 'security', 'housekeeping', 'front_desk']))
      ->add($assetGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Preventive maintenance
    $app->group('/api/preventive-maintenance', function (RouteCollectorProxy $g) {
        $g->get('', [AssetController::class, 'listPM']);
        $g->get('/overdue', [AssetController::class, 'overduePM']);
        $g->post('', [AssetController::class, 'createPM']);
        $g->post('/{id}/complete', [AssetController::class, 'completePM']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'engineer', 'maintenance']))
      ->add($assetGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Maintenance logs + reports
    $app->group('/api/maintenance-logs', function (RouteCollectorProxy $g) {
        $g->get('', [AssetController::class, 'listLogs']);
        $g->post('', [AssetController::class, 'createLog']);
        $g->get('/cost-report', [AssetController::class, 'costReport']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'engineer', 'maintenance', 'accountant']))
      ->add($assetGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
