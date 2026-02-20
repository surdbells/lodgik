<?php

declare(strict_types=1);

use Lodgik\Module\Pos\PosController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/pos', function (RouteCollectorProxy $g) {
        // Tables
        $g->get('/tables', [PosController::class, 'listTables']);
        $g->post('/tables', [PosController::class, 'createTable']);

        // Categories & Products
        $g->get('/categories', [PosController::class, 'listCategories']);
        $g->post('/categories', [PosController::class, 'createCategory']);
        $g->get('/products', [PosController::class, 'listProducts']);
        $g->post('/products', [PosController::class, 'createProduct']);
        $g->put('/products/{id}', [PosController::class, 'updateProduct']);

        // Orders
        $g->get('/orders', [PosController::class, 'listOrders']);
        $g->post('/orders', [PosController::class, 'createOrder']);
        $g->get('/orders/{id}/items', [PosController::class, 'getOrder']);
        $g->post('/orders/{id}/items', [PosController::class, 'addItem']);
        $g->post('/orders/{id}/items/{item_id}/remove', [PosController::class, 'removeItem']);
        $g->post('/orders/{id}/send', [PosController::class, 'sendToKitchen']);
        $g->post('/orders/{id}/serve', [PosController::class, 'serveOrder']);
        $g->post('/orders/{id}/pay', [PosController::class, 'payOrder']);
        $g->get('/orders/{id}/split', [PosController::class, 'splitOrder']);

        // Kitchen
        $g->get('/kitchen/queue', [PosController::class, 'kitchenQueue']);
        $g->post('/kitchen/items/{item_id}/preparing', [PosController::class, 'markItemPreparing']);
        $g->post('/kitchen/items/{item_id}/ready', [PosController::class, 'markItemReady']);
    });
};
