<?php

declare(strict_types=1);

namespace Lodgik\Module\Pos;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Helper\ResponseHelper;

final class RecipeController
{
    public function __construct(
        private readonly RecipeService $service,
    ) {}

    // GET /api/pos/recipes?property_id=
    public function listRecipes(Request $req, Response $res): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $req->getQueryParams()['property_id'] ?? null;
        $data = $this->service->listRecipes($tid, $pid ?: null);
        return ResponseHelper::json($res, ['success' => true, 'data' => $data]);
    }

    // GET /api/pos/recipes/product/{product_id}
    public function getByProduct(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $data = $this->service->getRecipeByProduct($args['product_id'], $tid);
        if (!$data) {
            return ResponseHelper::json($res, ['success' => false, 'message' => 'No recipe for this product'], 404);
        }
        return ResponseHelper::json($res, ['success' => true, 'data' => $data]);
    }

    // GET /api/pos/recipes/{id}
    public function getRecipe(Request $req, Response $res, array $args): Response
    {
        try {
            $data = $this->service->getRecipe($args['id'], $req->getAttribute('auth.tenant_id'));
            return ResponseHelper::json($res, ['success' => true, 'data' => $data]);
        } catch (\RuntimeException $e) {
            return ResponseHelper::json($res, ['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    // POST /api/pos/recipes  { product_id, yield_quantity, yield_uom, notes, ingredients:[...] }
    public function upsertRecipe(Request $req, Response $res): Response
    {
        $body = (array) $req->getParsedBody();
        if (empty($body['product_id'])) {
            return ResponseHelper::json($res, ['success' => false, 'message' => 'product_id required'], 422);
        }
        try {
            $recipe = $this->service->upsertRecipe($body['product_id'], $req->getAttribute('auth.tenant_id'), $body);
            $data   = $this->service->getRecipe($recipe->getId(), $req->getAttribute('auth.tenant_id'));
            return ResponseHelper::json($res, ['success' => true, 'data' => $data], 201);
        } catch (\Throwable $e) {
            return ResponseHelper::json($res, ['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // DELETE /api/pos/recipes/{id}
    public function deleteRecipe(Request $req, Response $res, array $args): Response
    {
        try {
            $this->service->deleteRecipe($args['id'], $req->getAttribute('auth.tenant_id'));
            return ResponseHelper::json($res, ['success' => true, 'message' => 'Recipe deleted']);
        } catch (\RuntimeException $e) {
            return ResponseHelper::json($res, ['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    // GET /api/pos/recipes/food-cost/{product_id}
    public function foodCostByProduct(Request $req, Response $res, array $args): Response
    {
        $data = $this->service->calculateFoodCost($args['product_id'], $req->getAttribute('auth.tenant_id'));
        return ResponseHelper::json($res, ['success' => true, 'data' => $data]);
    }

    // GET /api/pos/food-cost-report?property_id=&date_from=&date_to=
    public function foodCostReport(Request $req, Response $res): Response
    {
        $q    = $req->getQueryParams();
        $tid  = $req->getAttribute('auth.tenant_id');
        $from = $q['date_from'] ?? date('Y-m-01');
        $to   = $q['date_to']   ?? date('Y-m-d');
        $pid  = $q['property_id'] ?? null;

        $data = $this->service->getFoodCostReport($tid, $pid ?: null, $from, $to);
        return ResponseHelper::json($res, ['success' => true, 'data' => $data]);
    }
}
