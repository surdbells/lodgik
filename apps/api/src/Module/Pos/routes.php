<?php
declare(strict_types=1);
use Lodgik\Module\Pos\PosController;
use Lodgik\Module\Pos\RecipeController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/pos', function (RouteCollectorProxy $g) {
        $g->get('/tables', [PosController::class, 'listTables']);
        $g->post('/tables', [PosController::class, 'createTable']);
        $g->put('/tables/{id}', [PosController::class, 'updateTable']);
        $g->delete('/tables/{id}', [PosController::class, 'deleteTable']);
        $g->get('/categories', [PosController::class, 'listCategories']);
        $g->post('/categories', [PosController::class, 'createCategory']);
        $g->put('/categories/{id}', [PosController::class, 'updateCategory']);
        $g->delete('/categories/{id}', [PosController::class, 'deleteCategory']);
        $g->get('/products', [PosController::class, 'listProducts']);
        $g->post('/products', [PosController::class, 'createProduct']);
        $g->put('/products/{id}', [PosController::class, 'updateProduct']);
        $g->delete('/products/{id}', [PosController::class, 'deleteProduct']);
        $g->get('/orders', [PosController::class, 'listOrders']);
        $g->post('/orders', [PosController::class, 'createOrder']);
        $g->get('/orders/{id}/items', [PosController::class, 'getOrder']);
        $g->post('/orders/{id}/items', [PosController::class, 'addItem']);
        $g->post('/orders/{id}/items/{item_id}/remove', [PosController::class, 'removeItem']);
        $g->post('/orders/{id}/items/{item_id}/status', [PosController::class, 'updateItemStatus']);
        $g->post('/orders/{id}/close', [PosController::class, 'closeOrder']);
        $g->post('/orders/{id}/cancel', [PosController::class, 'cancelOrder']);
        $g->post('/orders/{id}/post-to-folio', [PosController::class, 'postToFolio']);
        $g->get('/kitchen/queue', [PosController::class, 'kitchenQueue']);
        $g->get('/section-prices',        [PosController::class, 'listSectionPrices']);
        $g->post('/section-prices',       [PosController::class, 'saveSectionPrice']);
        $g->put('/section-prices/{id}',   [PosController::class, 'saveSectionPrice']);
        $g->delete('/section-prices/{id}',[PosController::class, 'deleteSectionPrice']);

        // ── Recipes & Food Cost ──────────────────────────────────────
        // Static routes before variable routes (FastRoute rule)
        $g->get('/recipes',                           [RecipeController::class, 'listRecipes']);
        $g->post('/recipes',                          [RecipeController::class, 'upsertRecipe']);
        $g->get('/recipes/product/{product_id}',      [RecipeController::class, 'getByProduct']);
        $g->get('/food-cost-report',                  [RecipeController::class, 'foodCostReport']);
        $g->get('/recipes/{id}',                      [RecipeController::class, 'getRecipe']);
        $g->delete('/recipes/{id}',                   [RecipeController::class, 'deleteRecipe']);
        $g->get('/recipes/food-cost/{product_id}',    [RecipeController::class, 'foodCostByProduct']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'bar', 'kitchen', 'front_desk']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
