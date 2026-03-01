<?php

declare(strict_types=1);

namespace Lodgik\Module\Inventory;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Helper\JsonResponse;

final class InventoryController
{
    public function __construct(private readonly InventoryService $service) {}

    // ═══════════════════════════════════════════════════════════════
    // CATEGORIES
    // ═══════════════════════════════════════════════════════════════

    public function listCategories(Request $req, Response $res): Response
    {
        $tid  = $req->getAttribute('auth.tenant_id');
        $q    = $req->getQueryParams();
        $cats = $this->service->listCategories($tid, isset($q['active_only']));
        return JsonResponse::ok($res, array_map(fn($c) => $c->toArray(), $cats));
    }

    public function createCategory(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');

        if (empty($d['name'])) {
            return JsonResponse::error($res, 'name is required', 422);
        }

        try {
            $cat = $this->service->createCategory($tid, $d);
            return JsonResponse::created($res, $cat->toArray(), 'Category created');
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function updateCategory(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $d   = (array) $req->getParsedBody();

        try {
            $cat = $this->service->updateCategory($args['id'], $tid, $d);
            return JsonResponse::ok($res, $cat->toArray(), 'Category updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function deleteCategory(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $this->service->deleteCategory($args['id'], $tid);
            return JsonResponse::ok($res, null, 'Category deleted');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UNITS OF MEASURE
    // ═══════════════════════════════════════════════════════════════

    public function listUoms(Request $req, Response $res): Response
    {
        $tid  = $req->getAttribute('auth.tenant_id');
        $q    = $req->getQueryParams();
        $uoms = $this->service->listUoms($tid, isset($q['active_only']));
        return JsonResponse::ok($res, array_map(fn($u) => $u->toArray(), $uoms));
    }

    public function createUom(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');

        foreach (['name', 'symbol'] as $f) {
            if (empty($d[$f])) {
                return JsonResponse::error($res, "$f is required", 422);
            }
        }

        try {
            $uom = $this->service->createUom($tid, $d);
            return JsonResponse::created($res, $uom->toArray(), 'Unit of measure created');
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function updateUom(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $d   = (array) $req->getParsedBody();

        try {
            $uom = $this->service->updateUom($args['id'], $tid, $d);
            return JsonResponse::ok($res, $uom->toArray(), 'Unit of measure updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function deleteUom(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $this->service->deleteUom($args['id'], $tid);
            return JsonResponse::ok($res, null, 'Unit of measure deleted');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LOCATIONS
    // ═══════════════════════════════════════════════════════════════

    public function listLocations(Request $req, Response $res): Response
    {
        $tid   = $req->getAttribute('auth.tenant_id');
        $q     = $req->getQueryParams();
        $locs  = $this->service->listLocations(
            $tid,
            $q['property_id'] ?? null,
            isset($q['active_only'])
        );
        return JsonResponse::ok($res, array_map(fn($l) => $l->toArray(), $locs));
    }

    public function createLocation(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');

        foreach (['name', 'type'] as $f) {
            if (empty($d[$f])) {
                return JsonResponse::error($res, "$f is required", 422);
            }
        }

        $allowedTypes = ['warehouse', 'store', 'department'];
        if (!in_array($d['type'], $allowedTypes, true)) {
            return JsonResponse::error($res, 'type must be one of: ' . implode(', ', $allowedTypes), 422);
        }

        try {
            $loc = $this->service->createLocation($tid, $d);
            return JsonResponse::created($res, $loc->toArray(), 'Location created');
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function updateLocation(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $d   = (array) $req->getParsedBody();

        try {
            $loc = $this->service->updateLocation($args['id'], $tid, $d);
            return JsonResponse::ok($res, $loc->toArray(), 'Location updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function deleteLocation(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $this->service->deleteLocation($args['id'], $tid);
            return JsonResponse::ok($res, null, 'Location deleted');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STOCK ITEMS
    // ═══════════════════════════════════════════════════════════════

    public function listItems(Request $req, Response $res): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $q   = $req->getQueryParams();

        $page    = max(1, (int) ($q['page']     ?? 1));
        $perPage = min(100, max(1, (int) ($q['per_page'] ?? 30)));

        $result = $this->service->listItems(
            $tid,
            $page,
            $perPage,
            $q['category_id'] ?? null,
            $q['search']      ?? null,
            !isset($q['include_inactive']),
        );

        $items = array_map(fn($i) => $i->toArray(), $result['items']);
        $total = $result['total'];

        return JsonResponse::ok($res, $items, '', [
            'total'     => $total,
            'page'      => $page,
            'per_page'  => $perPage,
            'last_page' => (int) ceil($total / $perPage),
        ]);
    }

    public function getItem(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $item = $this->service->getItem($args['id'], $tid);
            return JsonResponse::ok($res, $item->toArray());
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        }
    }

    public function createItem(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');

        $required = ['sku', 'name', 'category_id', 'purchase_uom_id', 'issue_uom_id'];
        foreach ($required as $f) {
            if (empty($d[$f])) {
                return JsonResponse::error($res, "$f is required", 422);
            }
        }

        try {
            $item = $this->service->createItem($tid, $d);
            return JsonResponse::created($res, $item->toArray(), 'Stock item created');
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 404);
        }
    }

    public function updateItem(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $d   = (array) $req->getParsedBody();

        try {
            $item = $this->service->updateItem($args['id'], $tid, $d);
            return JsonResponse::ok($res, $item->toArray(), 'Stock item updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function deleteItem(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $this->service->deleteItem($args['id'], $tid);
            return JsonResponse::ok($res, null, 'Stock item deleted');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STOCK BALANCES
    // ═══════════════════════════════════════════════════════════════

    public function getItemBalances(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $q   = $req->getQueryParams();

        try {
            $balances = $this->service->getBalances($tid, $args['id'], $q['location_id'] ?? null);
            return JsonResponse::ok($res, array_map(fn($b) => $b->toArray(), $balances));
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        }
    }

    public function getLocationStock(Request $req, Response $res, array $args): Response
    {
        $tid      = $req->getAttribute('auth.tenant_id');
        $q        = $req->getQueryParams();
        $balances = $this->service->getLocationStock($tid, $args['id'], $q['search'] ?? null);
        return JsonResponse::ok($res, array_map(fn($b) => $b->toArray(), $balances));
    }

    public function setOpeningBalance(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');

        $required = ['item_id', 'location_id', 'quantity', 'unit_cost'];
        foreach ($required as $f) {
            if (!isset($d[$f])) {
                return JsonResponse::error($res, "$f is required", 422);
            }
        }

        if ((float) $d['quantity'] < 0) {
            return JsonResponse::error($res, 'quantity must be >= 0', 422);
        }

        if ((int) $d['unit_cost'] < 0) {
            return JsonResponse::error($res, 'unit_cost must be >= 0', 422);
        }

        try {
            $balance = $this->service->setOpeningBalance(
                $tid,
                $d['item_id'],
                $d['location_id'],
                (string) $d['quantity'],
                (string) $d['unit_cost'],
                $d['property_id'] ?? null
            );
            return JsonResponse::ok($res, $balance->toArray(), 'Opening balance set');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════════

    public function getSummary(Request $req, Response $res): Response
    {
        $tid        = $req->getAttribute('auth.tenant_id');
        $propertyId = $req->getQueryParams()['property_id'] ?? null;
        $summary    = $this->service->getSummary($tid, $propertyId);
        return JsonResponse::ok($res, $summary);
    }
}
