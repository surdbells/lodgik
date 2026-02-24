<?php
declare(strict_types=1);
use Lodgik\Module\Pos\PosController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/pos', function (RouteCollectorProxy $g) {
        $g->get('/tables', [PosController::class, 'listTables']);
        $g->post('/tables', [PosController::class, 'createTable']);
        $g->get('/categories', [PosController::class, 'listCategories']);
        $g->post('/categories', [PosController::class, 'createCategory']);
        $g->get('/products', [PosController::class, 'listProducts']);
        $g->post('/products', [PosController::class, 'createProduct']);
        $g->put('/products/{id}', [PosController::class, 'updateProduct']);
        $g->get('/orders', [PosController::class, 'listOrders']);
        $g->post('/orders', [PosController::class, 'createOrder']);
        $g->get('/orders/{id}/items', [PosController::class, 'getOrder']);
        $g->post('/orders/{id}/items', [PosController::class, 'addItem']);
        $g->post('/orders/{id}/items/{item_id}/remove', [PosController::class, 'removeItem']);
        $g->post('/orders/{id}/items/{item_id}/status', [PosController::class, 'updateItemStatus']);
        $g->post('/orders/{id}/close', [PosController::class, 'closeOrder']);
        $g->post('/orders/{id}/cancel', [PosController::class, 'cancelOrder']);
        $g->post('/orders/{id}/post-to-folio', [PosController::class, 'postToFolio']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'bar', 'kitchen', 'front_desk']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
