<?php

declare(strict_types=1);

use Lodgik\Module\Inventory\InventoryController;
use Lodgik\Module\Inventory\InventoryReportController;
use Lodgik\Module\Inventory\MovementController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {

    // ── Read access: property_admin, manager, accountant ────────────
    $app->group('/api/inventory', function (RouteCollectorProxy $g) {

        // Dashboard summary
        $g->get('/summary', [InventoryController::class, 'getSummary']);

        // Categories
        $g->get('/categories', [InventoryController::class, 'listCategories']);

        // Units of measure
        $g->get('/uoms', [InventoryController::class, 'listUoms']);

        // Locations
        $g->get('/locations', [InventoryController::class, 'listLocations']);
        $g->get('/locations/{id}/stock', [InventoryController::class, 'getLocationStock']);

        // Stock items
        $g->get('/items', [InventoryController::class, 'listItems']);
        $g->get('/items/{id}', [InventoryController::class, 'getItem']);
        $g->get('/items/{id}/balances', [InventoryController::class, 'getItemBalances']);

        // Movement ledger (read)
        $g->get('/movements', [MovementController::class, 'listMovements']);
        $g->get('/movements/{id}', [MovementController::class, 'getMovement']);

    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'accountant']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Write access: property_admin, manager ───────────────────────
    $app->group('/api/inventory', function (RouteCollectorProxy $g) {

        // Categories
        $g->post('/categories', [InventoryController::class, 'createCategory']);
        $g->put('/categories/{id}', [InventoryController::class, 'updateCategory']);
        $g->delete('/categories/{id}', [InventoryController::class, 'deleteCategory']);

        // Units of measure
        $g->post('/uoms', [InventoryController::class, 'createUom']);
        $g->put('/uoms/{id}', [InventoryController::class, 'updateUom']);
        $g->delete('/uoms/{id}', [InventoryController::class, 'deleteUom']);

        // Locations
        $g->post('/locations', [InventoryController::class, 'createLocation']);
        $g->put('/locations/{id}', [InventoryController::class, 'updateLocation']);
        $g->delete('/locations/{id}', [InventoryController::class, 'deleteLocation']);

        // Stock items
        $g->post('/items', [InventoryController::class, 'createItem']);
        $g->put('/items/{id}', [InventoryController::class, 'updateItem']);
        $g->delete('/items/{id}', [InventoryController::class, 'deleteItem']);

        // Movements — all writes through MovementController
        $g->post('/movements/opening',    [MovementController::class, 'createOpening']);
        $g->post('/movements/grn',        [MovementController::class, 'createGrn']);
        $g->post('/movements/issue',      [MovementController::class, 'createIssue']);
        $g->post('/movements/transfer',   [MovementController::class, 'createTransfer']);
        $g->post('/movements/adjustment', [MovementController::class, 'createAdjustment']);

    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Inventory Reports — read (property_admin, manager, accountant) ──
    $app->group('/api/inventory/reports', function (RouteCollectorProxy $g) {
        $g->get('/valuation',          [InventoryReportController::class, 'valuation']);
        $g->get('/slow-moving',        [InventoryReportController::class, 'slowMoving']);
        $g->get('/expiry',             [InventoryReportController::class, 'expiryAlerts']);
        $g->get('/shrinkage',          [InventoryReportController::class, 'shrinkage']);
        $g->get('/usage',              [InventoryReportController::class, 'departmentUsage']);
        $g->get('/property-comparison',[InventoryReportController::class, 'propertyComparison']);
        $g->get('/low-stock',          [InventoryReportController::class, 'lowStock']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'accountant']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Inventory Reports — notify trigger (property_admin, manager) ──
    $app->group('/api/inventory/reports', function (RouteCollectorProxy $g) {
        $g->post('/low-stock/notify',  [InventoryReportController::class, 'triggerLowStockNotify']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
