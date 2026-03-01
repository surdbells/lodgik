<?php

declare(strict_types=1);

namespace Lodgik\Module\Pos;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\PosTable;
use Lodgik\Entity\PosCategory;
use Lodgik\Entity\PosProduct;
use Lodgik\Entity\PosOrder;
use Lodgik\Entity\PosOrderItem;
use Lodgik\Enum\PosOrderStatus;
use Lodgik\Module\Folio\FolioService;
use Psr\Log\LoggerInterface;

final class PosService
{
    private static int $orderCounter = 0;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
        private readonly ?FolioService $folioService = null,
    ) {}

    // ─── Tables ─────────────────────────────────────────────────

    public function createTable(string $propertyId, string $number, string $tenantId, array $extra = []): PosTable
    {
        $t = new PosTable($propertyId, $number, $tenantId);
        if (isset($extra['seats'])) $t->setSeats($extra['seats']);
        if (isset($extra['section'])) $t->setSection($extra['section']);
        $this->em->persist($t); $this->em->flush(); return $t;
    }

    /** @return PosTable[] */

    public function updateTable(string $id, array $data): PosTable
    {
        $t = $this->em->find(PosTable::class, $id) ?? throw new \RuntimeException('Table not found');
        if (isset($data['number'])) $t->setNumber($data['number']);
        if (isset($data['seats'])) $t->setSeats((int)$data['seats']);
        if (isset($data['section'])) $t->setSection($data['section']);
        if (isset($data['status'])) $t->setStatus($data['status']);
        $this->em->flush();
        return $t;
    }

    public function deleteTable(string $id): void
    {
        $t = $this->em->find(PosTable::class, $id);
        if ($t) { $this->em->remove($t); $this->em->flush(); }
    }

    public function listTables(string $propertyId): array
    {
        return $this->em->createQueryBuilder()->select('t')->from(PosTable::class, 't')
            ->where('t.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('t.section', 'ASC')->addOrderBy('t.number', 'ASC')
            ->getQuery()->getResult();
    }

    // ─── Categories & Products ──────────────────────────────────

    public function createCategory(string $propertyId, string $name, string $tenantId, array $extra = []): PosCategory
    {
        $c = new PosCategory($propertyId, $name, $tenantId);
        if (isset($extra['type'])) $c->setType($extra['type']);
        if (isset($extra['sort_order'])) $c->setSortOrder($extra['sort_order']);
        $this->em->persist($c); $this->em->flush(); return $c;
    }

    /** @return PosCategory[] */
    public function listCategories(string $propertyId): array
    {
        return $this->em->createQueryBuilder()->select('c')->from(PosCategory::class, 'c')
            ->where('c.propertyId = :pid')->andWhere('c.isActive = true')
            ->setParameter('pid', $propertyId)->orderBy('c.sortOrder', 'ASC')
            ->getQuery()->getResult();
    }

    public function createProduct(string $propertyId, string $categoryId, string $name, string $price, string $tenantId, array $extra = []): PosProduct
    {
        $p = new PosProduct($propertyId, $categoryId, $name, $price, $tenantId);
        if (isset($extra['description'])) $p->setDescription($extra['description']);
        if (isset($extra['prep_time_minutes'])) $p->setPrepTimeMinutes($extra['prep_time_minutes']);
        if (isset($extra['requires_kitchen'])) $p->setRequiresKitchen($extra['requires_kitchen']);
        if (isset($extra['sort_order'])) $p->setSortOrder($extra['sort_order']);
        $this->em->persist($p); $this->em->flush(); return $p;
    }

    public function updateProduct(string $id, array $data): PosProduct
    {
        $p = $this->em->find(PosProduct::class, $id) ?? throw new \RuntimeException('Product not found');
        if (isset($data['name'])) $p->setName($data['name']);
        if (isset($data['description'])) $p->setDescription($data['description']);
        if (isset($data['price'])) $p->setPrice((string) $data['price']);
        if (isset($data['is_available'])) $p->setIsAvailable($data['is_available']);
        if (isset($data['prep_time_minutes'])) $p->setPrepTimeMinutes($data['prep_time_minutes']);
        if (isset($data['requires_kitchen'])) $p->setRequiresKitchen($data['requires_kitchen']);
        $this->em->flush(); return $p;
    }

    /** @return PosProduct[] */
    public function listProducts(string $propertyId, ?string $categoryId = null): array
    {
        $qb = $this->em->createQueryBuilder()->select('p')->from(PosProduct::class, 'p')
            ->where('p.propertyId = :pid')->andWhere('p.isAvailable = true')
            ->setParameter('pid', $propertyId)->orderBy('p.sortOrder', 'ASC');
        if ($categoryId) $qb->andWhere('p.categoryId = :cid')->setParameter('cid', $categoryId);
        return $qb->getQuery()->getResult();
    }

    // ─── Orders ─────────────────────────────────────────────────

    public function createOrder(string $propertyId, string $tenantId, array $extra = []): PosOrder
    {
        $num = 'ORD-' . date('ymd') . '-' . str_pad((string)(++self::$orderCounter), 4, '0', STR_PAD_LEFT);
        $o = new PosOrder($propertyId, $num, $tenantId);
        if (isset($extra['table_id'])) {
            $o->setTableId($extra['table_id']);
            $table = $this->em->find(PosTable::class, $extra['table_id']);
            if ($table) { $o->setTableNumber($table->getNumber()); $table->occupy($o->getId()); }
        }
        if (isset($extra['order_type'])) $o->setOrderType($extra['order_type']);
        if (isset($extra['guest_name'])) $o->setGuestName($extra['guest_name']);
        if (isset($extra['room_number'])) $o->setRoomNumber($extra['room_number']);
        if (isset($extra['booking_id'])) $o->setBookingId($extra['booking_id']);
        if (isset($extra['served_by'])) $o->setServedBy($extra['served_by']);
        if (isset($extra['served_by_name'])) $o->setServedByName($extra['served_by_name']);
        if (isset($extra['notes'])) $o->setNotes($extra['notes']);
        $this->em->persist($o); $this->em->flush(); return $o;
    }

    public function addItem(string $orderId, string $productId, int $quantity, string $tenantId, ?string $notes = null, int $splitGroup = 1): PosOrderItem
    {
        $order = $this->em->find(PosOrder::class, $orderId) ?? throw new \RuntimeException('Order not found');
        $product = $this->em->find(PosProduct::class, $productId) ?? throw new \RuntimeException('Product not found');

        $item = new PosOrderItem($orderId, $productId, $product->getName(), $quantity, $product->getPrice(), $tenantId);
        $item->setRequiresKitchen($product->getRequiresKitchen());
        if ($notes) $item->setNotes($notes);
        $item->setSplitGroup($splitGroup);
        $this->em->persist($item);

        $this->recalculateOrder($order);
        $this->em->flush();
        return $item;
    }

    public function removeItem(string $itemId): void
    {
        $item = $this->em->find(PosOrderItem::class, $itemId) ?? throw new \RuntimeException('Item not found');
        $order = $this->em->find(PosOrder::class, $item->getOrderId());
        $item->cancel();
        if ($order) $this->recalculateOrder($order);
        $this->em->flush();
    }

    private function recalculateOrder(PosOrder $order): void
    {
        $items = $this->getOrderItems($order->getId());
        $subtotal = 0; $count = 0;
        foreach ($items as $i) {
            if ($i->getStatus() !== 'cancelled') { $subtotal += intval($i->getLineTotal()); $count += $i->getQuantity(); }
        }
        $order->setSubtotal((string)$subtotal);
        $order->setTotalAmount((string)$subtotal);
        $order->setItemCount($count);
    }

    public function sendToKitchen(string $orderId): PosOrder
    {
        $order = $this->em->find(PosOrder::class, $orderId) ?? throw new \RuntimeException('Order not found');
        $order->send();
        $this->em->flush();
        $this->logger->info("Order {$order->getOrderNumber()} sent to kitchen");
        return $order;
    }

    public function markItemPreparing(string $itemId): PosOrderItem
    {
        $item = $this->em->find(PosOrderItem::class, $itemId) ?? throw new \RuntimeException('Item not found');
        $item->startPrep();
        // Update order status
        $order = $this->em->find(PosOrder::class, $item->getOrderId());
        if ($order && $order->getStatus() === PosOrderStatus::SENT) $order->preparing();
        $this->em->flush(); return $item;
    }

    public function markItemReady(string $itemId): PosOrderItem
    {
        $item = $this->em->find(PosOrderItem::class, $itemId) ?? throw new \RuntimeException('Item not found');
        $item->markReady();
        // Check if all kitchen items are ready
        $order = $this->em->find(PosOrder::class, $item->getOrderId());
        if ($order) {
            $items = $this->getOrderItems($order->getId());
            $allReady = true;
            foreach ($items as $i) {
                if ($i->getRequiresKitchen() && $i->getStatus() !== 'ready' && $i->getStatus() !== 'served' && $i->getStatus() !== 'cancelled') {
                    $allReady = false; break;
                }
            }
            if ($allReady) $order->ready();
        }
        $this->em->flush(); return $item;
    }

    public function serveOrder(string $orderId): PosOrder
    {
        $order = $this->em->find(PosOrder::class, $orderId) ?? throw new \RuntimeException('Order not found');
        $order->serve();
        $this->em->flush(); return $order;
    }

    public function payOrder(string $orderId, string $paymentType, ?string $paymentMethod = null, ?string $folioId = null): PosOrder
    {
        $order = $this->em->find(PosOrder::class, $orderId) ?? throw new \RuntimeException('Order not found');
        $order->pay($paymentType, $paymentMethod);

        // If room charge, post to folio
        if ($paymentType === 'room_charge' && $folioId && $this->folioService) {
            $order->setFolioId($folioId);
            $category = $order->getOrderType() === 'room_service' ? 'restaurant' : 'bar';
            $desc = "POS #{$order->getOrderNumber()} — {$order->getItemCount()} items";
            $this->folioService->addCharge($folioId, $category, $desc, $order->getTotalAmount());
            $this->logger->info("Room charge posted: order={$order->getOrderNumber()}, folio={$folioId}");
        }

        // Release table
        if ($order->getTableId()) {
            $table = $this->em->find(PosTable::class, $order->getTableId());
            if ($table) $table->release();
        }

        $this->em->flush(); return $order;
    }

    /** @return PosOrderItem[] */
    public function getOrderItems(string $orderId): array
    {
        return $this->em->createQueryBuilder()->select('i')->from(PosOrderItem::class, 'i')
            ->where('i.orderId = :oid')->setParameter('oid', $orderId)
            ->orderBy('i.createdAt', 'ASC')->getQuery()->getResult();
    }

    /** @return PosOrder[] */
    public function listOrders(string $propertyId, ?string $status = null, int $limit = 50): array
    {
        $qb = $this->em->createQueryBuilder()->select('o')->from(PosOrder::class, 'o')
            ->where('o.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('o.createdAt', 'DESC')->setMaxResults($limit);
        if ($status) $qb->andWhere('o.status = :s')->setParameter('s', $status);
        return $qb->getQuery()->getResult();
    }

    /** Kitchen display: orders with items needing preparation */
    public function getKitchenQueue(string $propertyId): array
    {
        $orders = $this->em->createQueryBuilder()->select('o')->from(PosOrder::class, 'o')
            ->where('o.propertyId = :pid')
            ->andWhere('o.status IN (:statuses)')
            ->setParameter('pid', $propertyId)
            ->setParameter('statuses', ['sent', 'preparing'])
            ->orderBy('o.createdAt', 'ASC')
            ->getQuery()->getResult();

        $result = [];
        foreach ($orders as $o) {
            $items = $this->getOrderItems($o->getId());
            $kitchenItems = array_filter($items, fn($i) => $i->getRequiresKitchen() && $i->getStatus() !== 'cancelled' && $i->getStatus() !== 'served');
            if (count($kitchenItems) > 0) {
                $result[] = ['order' => $o->toArray(), 'items' => array_map(fn($i) => $i->toArray(), array_values($kitchenItems))];
            }
        }
        return $result;
    }

    /** Delete a category (only if no products exist under it) */
    public function deleteCategory(string $id): void
    {
        $cat = $this->em->find(PosCategory::class, $id) ?? throw new \RuntimeException('Category not found');
        $productCount = $this->em->createQueryBuilder()
            ->select('COUNT(p.id)')->from(PosProduct::class, 'p')
            ->where('p.categoryId = :cid')->setParameter('cid', $id)
            ->getQuery()->getSingleScalarResult();
        if ($productCount > 0) throw new \RuntimeException('Cannot delete category with existing products. Remove all products first.');
        $this->em->remove($cat);
        $this->em->flush();
    }

    /** Delete a product */
    public function deleteProduct(string $id): void
    {
        $product = $this->em->find(PosProduct::class, $id) ?? throw new \RuntimeException('Product not found');
        $this->em->remove($product);
        $this->em->flush();
    }

    /** Update a category */
    public function updateCategory(string $id, array $data): PosCategory
    {
        $cat = $this->em->find(PosCategory::class, $id) ?? throw new \RuntimeException('Category not found');
        if (isset($data['name'])) $cat->setName($data['name']);
        if (isset($data['type'])) $cat->setType($data['type']);
        if (isset($data['sort_order'])) $cat->setSortOrder((int)$data['sort_order']);
        if (isset($data['is_active'])) $cat->setIsActive((bool)$data['is_active']);
        $this->em->flush();
        return $cat;
    }

    /** Split an order into groups */
    public function splitOrder(string $orderId): array
    {
        $order = $this->em->find(PosOrder::class, $orderId) ?? throw new \RuntimeException('Order not found');
        $items = $this->getOrderItems($orderId);

        $groups = [];
        foreach ($items as $item) {
            if ($item->getStatus() === 'cancelled') continue;
            $g = $item->getSplitGroup();
            if (!isset($groups[$g])) $groups[$g] = ['items' => [], 'total' => 0];
            $groups[$g]['items'][] = $item->toArray();
            $groups[$g]['total'] += intval($item->getLineTotal());
        }
        return $groups;
    }
}
