<?php

declare(strict_types=1);

use Lodgik\Module\Procurement\ProcurementController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {

    // ── Read access: property_admin, manager, accountant ────────────
    //
    // Accountants need visibility over PRs/POs for budget reconciliation
    // but cannot create, approve, or send anything.
    $app->group('/api/procurement', function (RouteCollectorProxy $g) {

        // ── Vendors ──────────────────────────────────────────────────
        // IMPORTANT: static routes must be registered BEFORE variable routes
        // in FastRoute or the variable route shadows the static one.
        $g->get('/vendors',              [ProcurementController::class, 'listVendors']);
        $g->get('/vendors/comparison',   [ProcurementController::class, 'getVendorComparison']);
        $g->get('/vendors/{id}',         [ProcurementController::class, 'getVendor']);

        // ── Purchase Requests ─────────────────────────────────────────
        $g->get('/requests',             [ProcurementController::class, 'listPurchaseRequests']);
        $g->get('/requests/{id}',        [ProcurementController::class, 'getPurchaseRequest']);

        // ── Purchase Orders ───────────────────────────────────────────
        $g->get('/orders',               [ProcurementController::class, 'listPurchaseOrders']);
        $g->get('/orders/{id}',          [ProcurementController::class, 'getPurchaseOrder']);

    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'accountant']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ── Write access: property_admin, manager ───────────────────────
    //
    // PR flow:   create → submit → approve/reject → (convert to PO)
    // PO flow:   create → send → (partial delivery via GRN) → delivered
    $app->group('/api/procurement', function (RouteCollectorProxy $g) {

        // ── Vendors ──────────────────────────────────────────────────
        $g->post('/vendors',             [ProcurementController::class, 'createVendor']);
        $g->put('/vendors/{id}',         [ProcurementController::class, 'updateVendor']);
        $g->delete('/vendors/{id}',      [ProcurementController::class, 'deleteVendor']);

        // ── Purchase Requests — creation & editing ───────────────────
        $g->post('/requests',            [ProcurementController::class, 'createPurchaseRequest']);
        $g->put('/requests/{id}',        [ProcurementController::class, 'updatePurchaseRequest']);
        $g->post('/requests/{id}/cancel',[ProcurementController::class, 'cancelPurchaseRequest']);

        // PR submit — any manager/admin can submit on behalf of staff
        $g->post('/requests/{id}/submit',[ProcurementController::class, 'submitPurchaseRequest']);

        // PR approval actions — property_admin + manager only
        $g->post('/requests/{id}/approve', [ProcurementController::class, 'approvePurchaseRequest']);
        $g->post('/requests/{id}/reject',  [ProcurementController::class, 'rejectPurchaseRequest']);

        // ── Purchase Orders ───────────────────────────────────────────
        $g->post('/orders',              [ProcurementController::class, 'createPurchaseOrder']);
        $g->put('/orders/{id}',          [ProcurementController::class, 'updatePurchaseOrder']);

        // Send / re-send PO email to vendor
        $g->post('/orders/{id}/send',    [ProcurementController::class, 'sendPurchaseOrder']);

        // Cancel PO
        $g->post('/orders/{id}/cancel',  [ProcurementController::class, 'cancelPurchaseOrder']);

    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
