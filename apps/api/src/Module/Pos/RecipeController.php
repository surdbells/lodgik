<?php

declare(strict_types=1);

namespace Lodgik\Module\Pos;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Helper\JsonResponse;

final class RecipeController
{
    public function __construct(
        private readonly RecipeService $service,
    ) {}

    // GET /api/pos/recipes?property_id=
    public function listRecipes(Request $req, Response $res): Response
    {
        $tid  = $req->getAttribute('auth.tenant_id');
        $pid  = $req->getQueryParams()['property_id'] ?? null;
        $data = $this->service->listRecipes($tid, $pid ?: null);
        return JsonResponse::ok($res, $data);
    }

    // GET /api/pos/recipes/product/{product_id}
    public function getByProduct(Request $req, Response $res, array $args): Response
    {
        $tid  = $req->getAttribute('auth.tenant_id');
        $data = $this->service->getRecipeByProduct($args['product_id'], $tid);
        if (!$data) {
            return JsonResponse::notFound($res, 'No recipe found for this product');
        }
        return JsonResponse::ok($res, $data);
    }

    // GET /api/pos/recipes/{id}
    public function getRecipe(Request $req, Response $res, array $args): Response
    {
        try {
            $data = $this->service->getRecipe($args['id'], $req->getAttribute('auth.tenant_id'));
            return JsonResponse::ok($res, $data);
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        }
    }

    // POST /api/pos/recipes
    public function upsertRecipe(Request $req, Response $res): Response
    {
        $body = (array) $req->getParsedBody();
        if (empty($body['product_id'])) {
            return JsonResponse::error($res, 'product_id required', 422);
        }
        try {
            $recipe = $this->service->upsertRecipe($body['product_id'], $req->getAttribute('auth.tenant_id'), $body);
            $data   = $this->service->getRecipe($recipe->getId(), $req->getAttribute('auth.tenant_id'));
            return JsonResponse::created($res, $data, 'Recipe saved');
        } catch (\Throwable $e) {
            return JsonResponse::error($res, $e->getMessage(), 500);
        }
    }

    // DELETE /api/pos/recipes/{id}
    public function deleteRecipe(Request $req, Response $res, array $args): Response
    {
        try {
            $this->service->deleteRecipe($args['id'], $req->getAttribute('auth.tenant_id'));
            return JsonResponse::ok($res, null, 'Recipe deleted');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        }
    }

    // GET /api/pos/recipes/food-cost/{product_id}
    public function foodCostByProduct(Request $req, Response $res, array $args): Response
    {
        $data = $this->service->calculateFoodCost($args['product_id'], $req->getAttribute('auth.tenant_id'));
        return JsonResponse::ok($res, $data);
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
        return JsonResponse::ok($res, $data);
    }
}
