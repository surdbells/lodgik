<?php

declare(strict_types=1);

namespace Lodgik\Module\Pos;

use Doctrine\ORM\EntityManagerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class PosController
{
    public function __construct(
        private readonly PosService              $service,
        private readonly EntityManagerInterface  $em,
    ) {}

    // Tables
    public function listTables(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, array_map(fn($t) => $t->toArray(), $this->service->listTables($req->getQueryParams()['property_id'] ?? '')));
    }

    public function createTable(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['property_id']) || empty($d['number'])) return JsonResponse::error($res, 'property_id and number required', 422);
        return JsonResponse::created($res, $this->service->createTable($d['property_id'], $d['number'], $req->getAttribute('auth.tenant_id'), $d)->toArray(), 'Table created');
    }

    public function updateTable(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        try {
            return JsonResponse::ok($res, $this->service->updateTable($args['id'], $d)->toArray());
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 404);
        }
    }

    public function deleteTable(Request $req, Response $res, array $args): Response
    {
        $this->service->deleteTable($args['id']);
        return JsonResponse::ok($res, null, 'Table deleted');
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
        return JsonResponse::created($res, $this->service->createCategory($d['property_id'], $d['name'], $req->getAttribute('auth.tenant_id'), $d)->toArray(), 'Category created');
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
        return JsonResponse::created($res, $this->service->createProduct($d['property_id'], $d['category_id'], $d['name'], (string)(int)round((float)$d['price']), $req->getAttribute('auth.tenant_id'), $d)->toArray(), 'Product created');
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
        $orders = $this->service->listOrders(
            $q['property_id'] ?? '',
            $q['status'] ?? null,
            (int)($q['limit'] ?? 100),
            $q['date_from'] ?? null,
            $q['date_to']   ?? null,
        );
        return JsonResponse::ok($res, array_map(fn($o) => $o->toArray(), $orders));
    }

    public function createOrder(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['property_id'])) return JsonResponse::error($res, 'property_id required', 422);
        $d['served_by'] = $req->getAttribute('auth.user_id');
        return JsonResponse::created($res, $this->service->createOrder($d['property_id'], $req->getAttribute('auth.tenant_id'), $d)->toArray(), 'Order created');
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
            return JsonResponse::created($res, $item->toArray(), 'Item added');
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

    // ── Section Prices ──────────────────────────────────────────────────────

    public function listSectionPrices(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? '';
        if (!$pid) return JsonResponse::error($res, 'property_id required', 422);
        $prices = $this->em->getRepository(\Lodgik\Entity\PosSectionPrice::class)
            ->findBy(['propertyId' => $pid], ['section' => 'ASC']);
        return JsonResponse::ok($res, array_map(fn($p) => $p->toArray(), $prices));
    }

    public function saveSectionPrice(Request $req, Response $res, array $args = []): Response
    {
        $pid  = $req->getAttribute('auth.property_id') ?? '';
        $tid  = $req->getAttribute('auth.tenant_id');
        $body = (array) ($req->getParsedBody() ?? []);
        $id   = $args['id'] ?? null;

        if (!$body['product_id'] ?? '') return JsonResponse::validationError($res, ['product_id' => 'Required']);
        if (!$body['section']     ?? '') return JsonResponse::validationError($res, ['section'     => 'Required']);
        if (!isset($body['price']))      return JsonResponse::validationError($res, ['price'       => 'Required']);

        $propId = $body['property_id'] ?? $pid;

        if ($id) {
            $sp = $this->em->find(\Lodgik\Entity\PosSectionPrice::class, $id);
            if (!$sp) return JsonResponse::error($res, 'Not found', 404);
            $sp->setPrice((string) $body['price']);
            if (isset($body['note'])) $sp->setNote($body['note']);
        } else {
            // Check for existing (upsert)
            $sp = $this->em->getRepository(\Lodgik\Entity\PosSectionPrice::class)->findOneBy([
                'productId'  => $body['product_id'],
                'section'    => $body['section'],
                'propertyId' => $propId,
            ]);
            if ($sp) {
                $sp->setPrice((string) $body['price']);
                if (isset($body['note'])) $sp->setNote($body['note']);
            } else {
                $product = $this->em->find(\Lodgik\Entity\PosProduct::class, $body['product_id']);
                $sp = new \Lodgik\Entity\PosSectionPrice(
                    $propId, $tid, $body['product_id'],
                    $product?->getName() ?? '', $body['section'], (string) $body['price']
                );
                if (isset($body['note'])) $sp->setNote($body['note']);
                $this->em->persist($sp);
            }
        }

        $this->em->flush();
        return JsonResponse::ok($res, $sp->toArray(), 'Section price saved');
    }

    public function deleteSectionPrice(Request $req, Response $res, array $args): Response
    {
        $sp = $this->em->find(\Lodgik\Entity\PosSectionPrice::class, $args['id']);
        if (!$sp) return JsonResponse::error($res, 'Not found', 404);
        $this->em->remove($sp);
        $this->em->flush();
        return JsonResponse::ok($res, null, 'Section price deleted');
    }


    public function salesReport(Request $req, Response $res): Response
    {
        $q          = $req->getQueryParams();
        $propertyId = $q['property_id'] ?? '';
        $dateFrom   = $q['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
        $dateTo     = $q['date_to']   ?? date('Y-m-d');

        // All paid orders in range
        $orders = $this->service->listOrders($propertyId, 'paid', 500, $dateFrom, $dateTo);

        $totalRevenue = 0;
        $byType       = [];
        $byPayment    = [];
        $byDate       = [];
        $orderData    = [];

        foreach ($orders as $order) {
            $amt = (int) $order->getTotalAmount();
            $totalRevenue += $amt;

            // By order type
            $type = $order->getOrderType();
            $byType[$type] = ($byType[$type] ?? 0) + $amt;

            // By payment method
            $pay = $order->getPaymentType() ?? 'unknown';
            $byPayment[$pay] = ($byPayment[$pay] ?? 0) + $amt;

            // By date
            $day = $order->getCreatedAt()?->format('Y-m-d') ?? 'unknown';
            if (!isset($byDate[$day])) $byDate[$day] = ['date' => $day, 'revenue' => 0, 'orders' => 0];
            $byDate[$day]['revenue'] += $amt;
            $byDate[$day]['orders']  += 1;

            $orderData[] = $order->toArray();
        }

        ksort($byDate);

        // Top products
        $conn = $this->service->getConnection();
        $topProducts = $conn->fetchAllAssociative(
            "SELECT p.name, SUM(i.quantity) AS qty_sold, SUM(i.line_total) AS revenue
             FROM pos_order_items i
             JOIN pos_orders o ON o.id = i.order_id
             JOIN pos_products p ON p.id = i.product_id
             WHERE o.property_id = ? AND o.status = 'paid'
               AND o.created_at >= ? AND o.created_at <= ?
               AND i.status != 'cancelled'
             GROUP BY p.id, p.name
             ORDER BY revenue DESC
             LIMIT 10",
            [$propertyId, $dateFrom . ' 00:00:00', $dateTo . ' 23:59:59']
        );

        return JsonResponse::ok($res, [
            'period'        => ['from' => $dateFrom, 'to' => $dateTo],
            'total_revenue' => $totalRevenue,
            'order_count'   => count($orders),
            'avg_order'     => count($orders) > 0 ? (int)($totalRevenue / count($orders)) : 0,
            'by_type'       => $byType,
            'by_payment'    => $byPayment,
            'by_date'       => array_values($byDate),
            'top_products'  => $topProducts,
            'orders'        => $orderData,
        ]);
    }
}
