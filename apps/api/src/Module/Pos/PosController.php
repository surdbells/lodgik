<?php

declare(strict_types=1);

namespace Lodgik\Module\Pos;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class PosController
{
    public function __construct(private readonly PosService $service) {}

    // Tables
    public function listTables(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, array_map(fn($t) => $t->toArray(), $this->service->listTables($req->getQueryParams()['property_id'] ?? '')));
    }

    public function createTable(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['property_id']) || empty($d['number'])) return JsonResponse::error($res, 'property_id and number required', 422);
        return JsonResponse::ok($res, $this->service->createTable($d['property_id'], $d['number'], $req->getAttribute('auth.tenant_id'), $d)->toArray(), 'Table created', 201);
    }

    // Categories
    public function listCategories(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, array_map(fn($c) => $c->toArray(), $this->service->listCategories($req->getQueryParams()['property_id'] ?? '')));
    }

    public function createCategory(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['property_id']) || empty($d['name'])) return JsonResponse::error($res, 'property_id and name required', 422);
        return JsonResponse::ok($res, $this->service->createCategory($d['property_id'], $d['name'], $req->getAttribute('auth.tenant_id'), $d)->toArray(), 'Category created', 201);
    }

    // Products
    public function listProducts(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, array_map(fn($p) => $p->toArray(), $this->service->listProducts($q['property_id'] ?? '', $q['category_id'] ?? null)));
    }

    public function createProduct(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'category_id', 'name', 'price'] as $f) {
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        }
        return JsonResponse::ok($res, $this->service->createProduct($d['property_id'], $d['category_id'], $d['name'], (string)$d['price'], $req->getAttribute('auth.tenant_id'), $d)->toArray(), 'Product created', 201);
    }

    public function updateProduct(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->updateProduct($args['id'], (array) $req->getParsedBody())->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    // Orders
    public function listOrders(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $orders = $this->service->listOrders($q['property_id'] ?? '', $q['status'] ?? null, (int)($q['limit'] ?? 50));
        return JsonResponse::ok($res, array_map(fn($o) => $o->toArray(), $orders));
    }

    public function createOrder(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['property_id'])) return JsonResponse::error($res, 'property_id required', 422);
        $d['served_by'] = $req->getAttribute('auth.user_id');
        return JsonResponse::ok($res, $this->service->createOrder($d['property_id'], $req->getAttribute('auth.tenant_id'), $d)->toArray(), 'Order created', 201);
    }

    public function getOrder(Request $req, Response $res, array $args): Response
    {
        $order = $this->service->listOrders('', null, 1); // We need a direct find
        $items = $this->service->getOrderItems($args['id']);
        return JsonResponse::ok($res, ['items' => array_map(fn($i) => $i->toArray(), $items)]);
    }

    public function addItem(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['product_id'])) return JsonResponse::error($res, 'product_id required', 422);
        try {
            $item = $this->service->addItem($args['id'], $d['product_id'], (int)($d['quantity'] ?? 1), $req->getAttribute('auth.tenant_id'), $d['notes'] ?? null, (int)($d['split_group'] ?? 1));
            return JsonResponse::ok($res, $item->toArray(), 'Item added', 201);
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function removeItem(Request $req, Response $res, array $args): Response
    {
        try { $this->service->removeItem($args['item_id']); return JsonResponse::ok($res, null, 'Item removed'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function sendToKitchen(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->sendToKitchen($args['id'])->toArray(), 'Sent to kitchen'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function serveOrder(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->serveOrder($args['id'])->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function payOrder(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['payment_type'])) return JsonResponse::error($res, 'payment_type required (direct or room_charge)', 422);
        try {
            return JsonResponse::ok($res, $this->service->payOrder($args['id'], $d['payment_type'], $d['payment_method'] ?? null, $d['folio_id'] ?? null)->toArray());
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function splitOrder(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->splitOrder($args['id'])); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    // Kitchen
    public function kitchenQueue(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, $this->service->getKitchenQueue($req->getQueryParams()['property_id'] ?? ''));
    }

    public function markItemPreparing(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->markItemPreparing($args['item_id'])->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function markItemReady(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->markItemReady($args['item_id'])->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function updateItemStatus(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $status = $body['status'] ?? '';
        try {
            $item = match ($status) {
                'preparing' => $this->service->markItemPreparing($args['item_id']),
                'ready' => $this->service->markItemReady($args['item_id']),
                default => throw new \RuntimeException("Invalid status: $status"),
            };
            return JsonResponse::ok($res, $item->toArray());
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 400); }
    }

    public function closeOrder(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->serveOrder($args['id'])->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 400); }
    }

    public function cancelOrder(Request $req, Response $res, array $args): Response
    {
        try {
            $order = $this->service->payOrder($args['id'], 'cancelled');
            return JsonResponse::ok($res, $order->toArray());
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 400); }
    }

    public function postToFolio(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $folioId = $body['folio_id'] ?? '';
        try {
            $order = $this->service->payOrder($args['id'], 'room_charge', 'room_charge', $folioId);
            return JsonResponse::ok($res, $order->toArray());
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 400); }
    }

    public function updateCategory(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->updateCategory($args['id'], (array) $req->getParsedBody())->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function deleteCategory(Request $req, Response $res, array $args): Response
    {
        try { $this->service->deleteCategory($args['id']); return JsonResponse::ok($res, null, 'Category deleted'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 400); }
    }

    public function deleteProduct(Request $req, Response $res, array $args): Response
    {
        try { $this->service->deleteProduct($args['id']); return JsonResponse::ok($res, null, 'Product deleted'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 400); }
    }
}
