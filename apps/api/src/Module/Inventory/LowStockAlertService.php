<?php

declare(strict_types=1);

namespace Lodgik\Module\Inventory;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Module\Notification\NotificationService;
use Psr\Log\LoggerInterface;

/**
 * LowStockAlertService
 *
 * Checks all active stock items against their reorder_point and fires
 * in-app notifications via the existing NotificationService.
 *
 * Usage patterns:
 *   - Called from InventoryController (on-demand check)
 *   - Can be scheduled via a cron job that calls checkAndNotify()
 *   - Also fires after every GRN posting when balances are updated
 *
 * Deduplication: alerts are suppressed if a notification for the same
 * item+property was already sent today (checked by scanning today's
 * notifications by channel 'low_stock' and data.item_id).
 */
final class LowStockAlertService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface        $logger,
        private readonly NotificationService    $notificationService,
    ) {}

    /**
     * Scan all active stock items for the given tenant (optionally filtered
     * to a single property) and send notifications for items below reorder point.
     *
     * @return array{notified: int, skipped: int, items: array[]}
     */
    public function checkAndNotify(string $tenantId, ?string $propertyId = null): array
    {
        $conn = $this->em->getConnection();

        // Fetch items below reorder_point with on-hand > 0 OR quantity = 0
        $sql = <<<'SQL'
            SELECT
                si.id             AS item_id,
                si.sku,
                si.name           AS item_name,
                si.reorder_point,
                sl.property_id,
                sl.name           AS location_name,
                sb.quantity_on_hand AS current_qty
            FROM stock_balances sb
            JOIN stock_items    si ON si.id = sb.item_id    AND si.tenant_id = sb.tenant_id
            JOIN stock_locations sl ON sl.id = sb.location_id AND sl.tenant_id = sb.tenant_id
            WHERE sb.tenant_id    = :tid
              AND si.is_active    = 1
              AND sl.is_active    = 1
              AND si.reorder_point > 0
              AND sb.quantity_on_hand <= si.reorder_point
        SQL;

        $params = ['tid' => $tenantId];
        if ($propertyId) {
            $sql .= ' AND sl.property_id = :pid';
            $params['pid'] = $propertyId;
        }
        $sql .= ' ORDER BY (sb.quantity_on_hand / si.reorder_point) ASC';

        $items = $conn->fetchAllAssociative($sql, $params);

        if (empty($items)) {
            return ['notified' => 0, 'skipped' => 0, 'items' => []];
        }

        // Today's already-sent item IDs to avoid duplicate notifications
        $sentToday = $this->getAlreadySentToday($tenantId);

        $notified   = 0;
        $skipped    = 0;
        $alertItems = [];

        foreach ($items as $item) {
            $key = $item['property_id'] . '_' . $item['item_id'];

            if (isset($sentToday[$key])) {
                $skipped++;
                continue;
            }

            $pct      = $item['reorder_point'] > 0
                ? round(((float)$item['current_qty'] / (float)$item['reorder_point']) * 100)
                : 0;
            $urgency  = $item['current_qty'] <= 0 ? '🔴' : ($pct <= 25 ? '🟠' : '🟡');
            $title    = "{$urgency} Low stock: {$item['item_name']} ({$item['sku']})";
            $body     = "Location: {$item['location_name']} · On hand: {$item['current_qty']} (reorder at {$item['reorder_point']})";

            try {
                $this->notificationService->create(
                    propertyId:   $item['property_id'],
                    recipientType:'staff',
                    recipientId:  'all',
                    channel:      'low_stock',
                    title:        $title,
                    tenantId:     $tenantId,
                    body:         $body,
                    data:         [
                        'item_id'       => $item['item_id'],
                        'sku'           => $item['sku'],
                        'current_qty'   => (float) $item['current_qty'],
                        'reorder_point' => (float) $item['reorder_point'],
                        'property_id'   => $item['property_id'],
                        'location_name' => $item['location_name'],
                        'pct_of_reorder'=> $pct,
                    ]
                );

                $notified++;
                $alertItems[] = array_merge($item, ['urgency' => $urgency, 'pct_of_reorder' => $pct]);
                $this->logger->info("[LowStockAlert] Notified: {$item['sku']} @ {$item['location_name']} qty={$item['current_qty']}");

            } catch (\Throwable $e) {
                $this->logger->error("[LowStockAlert] Notification failed for {$item['sku']}: " . $e->getMessage());
            }
        }

        return [
            'notified' => $notified,
            'skipped'  => $skipped,
            'items'    => $alertItems,
        ];
    }

    /**
     * Retrieve the full list of low-stock items without sending notifications.
     * Used by the dashboard widget.
     */
    public function getLowStockItems(string $tenantId, ?string $propertyId = null): array
    {
        $conn = $this->em->getConnection();

        $sql = <<<'SQL'
            SELECT
                si.id             AS item_id,
                si.sku,
                si.name           AS item_name,
                sc.name           AS category_name,
                si.reorder_point,
                si.par_level,
                sl.property_id,
                sl.name           AS location_name,
                sb.quantity_on_hand,
                CASE
                    WHEN sb.quantity_on_hand <= 0 THEN 'out_of_stock'
                    WHEN sb.quantity_on_hand <= (si.reorder_point * 0.25) THEN 'critical'
                    WHEN sb.quantity_on_hand <= (si.reorder_point * 0.5)  THEN 'very_low'
                    ELSE 'low'
                END AS urgency_level
            FROM stock_balances sb
            JOIN stock_items    si ON si.id = sb.item_id    AND si.tenant_id = sb.tenant_id
            JOIN stock_locations sl ON sl.id = sb.location_id AND sl.tenant_id = sb.tenant_id
            LEFT JOIN stock_categories sc ON sc.id = si.category_id
            WHERE sb.tenant_id    = :tid
              AND si.is_active    = 1
              AND sl.is_active    = 1
              AND si.reorder_point > 0
              AND sb.quantity_on_hand <= si.reorder_point
        SQL;

        $params = ['tid' => $tenantId];
        if ($propertyId) { $sql .= ' AND sl.property_id = :pid'; $params['pid'] = $propertyId; }
        $sql .= ' ORDER BY sb.quantity_on_hand ASC, si.name ASC';

        $rows = $conn->fetchAllAssociative($sql, $params);

        foreach ($rows as &$row) {
            $row['quantity_on_hand'] = (float) $row['quantity_on_hand'];
            $row['reorder_point']    = (float) $row['reorder_point'];
            $row['par_level']        = (float) $row['par_level'];
        }
        unset($row);

        return $rows;
    }

    // ──────────────────────────────────────────────────────────────────
    // Internals
    // ──────────────────────────────────────────────────────────────────

    /**
     * Returns a map of "property_id_item_id" => true for low_stock
     * notifications already sent today. Prevents duplicate alerts within
     * a 24-hour window.
     */
    private function getAlreadySentToday(string $tenantId): array
    {
        $today = (new \DateTimeImmutable())->format('Y-m-d');

        $sql = <<<'SQL'
            SELECT data FROM notifications
            WHERE tenant_id = :tid
              AND channel   = 'low_stock'
              AND created_at >= :today
        SQL;

        $rows = $this->em->getConnection()->fetchAllAssociative(
            $sql, ['tid' => $tenantId, 'today' => $today . ' 00:00:00']
        );

        $sent = [];
        foreach ($rows as $row) {
            $data = json_decode($row['data'] ?? '{}', true);
            if (!empty($data['property_id']) && !empty($data['item_id'])) {
                $sent[$data['property_id'] . '_' . $data['item_id']] = true;
            }
        }

        return $sent;
    }
}
