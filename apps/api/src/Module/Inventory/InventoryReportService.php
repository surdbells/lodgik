<?php

declare(strict_types=1);

namespace Lodgik\Module\Inventory;

use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * InventoryReportService
 *
 * All reporting queries for the inventory module.
 * Runs raw SQL via DBAL for performance on large datasets.
 *
 * Reports:
 *   1. Stock Valuation      — on-hand qty × WAC per item / location / category
 *   2. Slow-Moving          — items with no ISSUE movements in N days
 *   3. Expiry Alerts        — batch lines expiring within N days
 *   4. Shrinkage            — adjustment_out movements in period
 *   5. Department Usage     — ISSUE movements grouped by destination
 *   6. Property Comparison  — multi-property on-hand values + turnover
 */
final class InventoryReportService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface        $logger,
    ) {}

    // ─────────────────────────────────────────────────────────────────
    // 1. Stock Valuation Report
    // ─────────────────────────────────────────────────────────────────

    /**
     * @return array{items: array[], totals: array, generated_at: string}
     */
    public function getStockValuation(string $tenantId, ?string $propertyId = null, ?string $categoryId = null): array
    {
        $conn = $this->em->getConnection();

        $sql = <<<'SQL'
            SELECT
                si.id             AS item_id,
                si.sku,
                si.name           AS item_name,
                sc.name           AS category_name,
                sl.id             AS location_id,
                sl.name           AS location_name,
                sl.property_id,
                sb.quantity_on_hand,
                si.average_cost   AS wac_kobo,
                (sb.quantity_on_hand * si.average_cost) AS total_value_kobo,
                si.reorder_point,
                CASE WHEN sb.quantity_on_hand <= si.reorder_point THEN 1 ELSE 0 END AS is_low_stock
            FROM stock_balances sb
            JOIN stock_items    si ON si.id = sb.item_id    AND si.tenant_id = sb.tenant_id
            JOIN stock_locations sl ON sl.id = sb.location_id AND sl.tenant_id = sb.tenant_id
            LEFT JOIN stock_categories sc ON sc.id = si.category_id
            WHERE sb.tenant_id = :tid
              AND si.is_active  = 1
              AND sl.is_active  = 1
        SQL;

        $params = ['tid' => $tenantId];
        if ($propertyId) { $sql .= ' AND sl.property_id = :pid'; $params['pid'] = $propertyId; }
        if ($categoryId) { $sql .= ' AND si.category_id = :cid'; $params['cid'] = $categoryId; }

        $sql .= ' ORDER BY sc.name, si.name, sl.name';

        $rows = $conn->fetchAllAssociative($sql, $params);

        $totalValue    = 0;
        $totalItems    = 0;
        $lowStockCount = 0;

        foreach ($rows as &$row) {
            $row['total_value_kobo'] = (float) $row['total_value_kobo'];
            $row['quantity_on_hand'] = (float) $row['quantity_on_hand'];
            $row['wac_kobo']         = (int) $row['wac_kobo'];
            $row['is_low_stock']     = (bool) $row['is_low_stock'];
            $totalValue += $row['total_value_kobo'];
            if ($row['quantity_on_hand'] > 0) $totalItems++;
            if ($row['is_low_stock']) $lowStockCount++;
        }
        unset($row);

        return [
            'items'        => $rows,
            'totals'       => [
                'total_value_kobo' => $totalValue,
                'item_count'       => count($rows),
                'stocked_count'    => $totalItems,
                'low_stock_count'  => $lowStockCount,
            ],
            'generated_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. Slow-Moving Report
    // ─────────────────────────────────────────────────────────────────

    /**
     * Items with quantity > 0 but no ISSUE movement in $days days.
     * @return array{items: array[], threshold_days: int, generated_at: string}
     */
    public function getSlowMoving(string $tenantId, ?string $propertyId = null, int $days = 30): array
    {
        $conn     = $this->em->getConnection();
        $cutoff   = (new \DateTimeImmutable("-{$days} days"))->format('Y-m-d 00:00:00');

        $sql = <<<'SQL'
            SELECT
                si.id          AS item_id,
                si.sku,
                si.name        AS item_name,
                sc.name        AS category_name,
                sl.property_id,
                sl.name        AS location_name,
                sb.quantity_on_hand,
                si.average_cost AS wac_kobo,
                (sb.quantity_on_hand * si.average_cost) AS stock_value_kobo,
                MAX(sm.movement_date) AS last_issue_date
            FROM stock_balances sb
            JOIN stock_items    si ON si.id = sb.item_id     AND si.tenant_id = sb.tenant_id
            JOIN stock_locations sl ON sl.id = sb.location_id AND sl.tenant_id = sb.tenant_id
            LEFT JOIN stock_categories sc ON sc.id = si.category_id
            LEFT JOIN stock_movement_lines ml ON ml.item_id = si.id AND ml.tenant_id = si.tenant_id
            LEFT JOIN stock_movements sm ON sm.id = ml.movement_id
                AND sm.type = 'issue'
                AND sm.movement_date >= :cutoff
            WHERE sb.tenant_id = :tid
              AND si.is_active = 1
              AND sb.quantity_on_hand > 0
        SQL;

        $params = ['tid' => $tenantId, 'cutoff' => $cutoff];
        if ($propertyId) { $sql .= ' AND sl.property_id = :pid'; $params['pid'] = $propertyId; }

        $sql .= <<<'SQL'
            GROUP BY si.id, si.sku, si.name, sc.name, sl.property_id, sl.name, sb.quantity_on_hand, si.average_cost
            HAVING MAX(sm.movement_date) IS NULL
            ORDER BY (sb.quantity_on_hand * si.average_cost) DESC
        SQL;

        $rows = $conn->fetchAllAssociative($sql, $params);

        foreach ($rows as &$row) {
            $row['quantity_on_hand'] = (float) $row['quantity_on_hand'];
            $row['wac_kobo']         = (int)   $row['wac_kobo'];
            $row['stock_value_kobo'] = (float) $row['stock_value_kobo'];
        }
        unset($row);

        return [
            'items'          => $rows,
            'threshold_days' => $days,
            'total_value_kobo' => array_sum(array_column($rows, 'stock_value_kobo')),
            'generated_at'   => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. Expiry Alerts
    // ─────────────────────────────────────────────────────────────────

    /**
     * Batch lines from GRN movements with expiry_date within $days.
     * @return array{items: array[], days_ahead: int, generated_at: string}
     */
    public function getExpiryAlerts(string $tenantId, ?string $propertyId = null, int $days = 30): array
    {
        $conn   = $this->em->getConnection();
        $today  = (new \DateTimeImmutable())->format('Y-m-d');
        $cutoff = (new \DateTimeImmutable("+{$days} days"))->format('Y-m-d');

        $sql = <<<'SQL'
            SELECT
                ml.item_id,
                ml.item_sku         AS sku,
                ml.item_name,
                ml.location_name,
                sm.property_id,
                ml.batch_number,
                ml.expiry_date,
                ml.quantity         AS batch_qty,
                DATEDIFF(ml.expiry_date, :today) AS days_until_expiry,
                CASE
                    WHEN ml.expiry_date < :today THEN 'expired'
                    WHEN DATEDIFF(ml.expiry_date, :today) <= 7 THEN 'critical'
                    WHEN DATEDIFF(ml.expiry_date, :today) <= 14 THEN 'warning'
                    ELSE 'notice'
                END AS urgency
            FROM stock_movement_lines ml
            JOIN stock_movements sm ON sm.id = ml.movement_id
            WHERE ml.tenant_id     = :tid
              AND ml.expiry_date  IS NOT NULL
              AND ml.expiry_date  <= :cutoff
              AND sm.type          = 'grn'
        SQL;

        $params = ['tid' => $tenantId, 'today' => $today, 'cutoff' => $cutoff];
        if ($propertyId) { $sql .= ' AND sm.property_id = :pid'; $params['pid'] = $propertyId; }

        $sql .= ' ORDER BY ml.expiry_date ASC';

        $rows = $conn->fetchAllAssociative($sql, $params);
        foreach ($rows as &$row) {
            $row['batch_qty']          = (float) $row['batch_qty'];
            $row['days_until_expiry']  = (int)   $row['days_until_expiry'];
        }
        unset($row);

        return [
            'items'       => $rows,
            'days_ahead'  => $days,
            'expired_count'  => count(array_filter($rows, fn($r) => $r['urgency'] === 'expired')),
            'critical_count' => count(array_filter($rows, fn($r) => $r['urgency'] === 'critical')),
            'generated_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    // 4. Shrinkage Report
    // ─────────────────────────────────────────────────────────────────

    /**
     * All negative adjustment movements (stock-take write-downs) in period.
     */
    public function getShrinkageReport(string $tenantId, ?string $propertyId = null, string $dateFrom = '', string $dateTo = ''): array
    {
        $conn = $this->em->getConnection();
        $from = $dateFrom ?: date('Y-m-01');
        $to   = $dateTo   ?: date('Y-m-d');

        $sql = <<<'SQL'
            SELECT
                ml.item_id,
                ml.item_sku         AS sku,
                ml.item_name,
                sc.name             AS category_name,
                sm.property_id,
                sm.movement_date,
                sm.reference_number,
                sm.notes,
                ABS(ml.quantity)    AS shrinkage_qty,
                ABS(ml.line_value)  AS shrinkage_value_kobo
            FROM stock_movement_lines ml
            JOIN stock_movements sm ON sm.id = ml.movement_id
            JOIN stock_items     si ON si.id = ml.item_id
            LEFT JOIN stock_categories sc ON sc.id = si.category_id
            WHERE ml.tenant_id   = :tid
              AND sm.type        = 'adjustment'
              AND ml.quantity    < 0
              AND sm.movement_date >= :from
              AND sm.movement_date <= :to
        SQL;

        $params = ['tid' => $tenantId, 'from' => $from . ' 00:00:00', 'to' => $to . ' 23:59:59'];
        if ($propertyId) { $sql .= ' AND sm.property_id = :pid'; $params['pid'] = $propertyId; }
        $sql .= ' ORDER BY sm.movement_date DESC';

        $rows = $conn->fetchAllAssociative($sql, $params);
        foreach ($rows as &$row) {
            $row['shrinkage_qty']         = (float) $row['shrinkage_qty'];
            $row['shrinkage_value_kobo']  = (int)   $row['shrinkage_value_kobo'];
        }
        unset($row);

        return [
            'items'              => $rows,
            'date_from'          => $from,
            'date_to'            => $to,
            'total_shrinkage_kobo' => array_sum(array_column($rows, 'shrinkage_value_kobo')),
            'generated_at'       => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    // 5. Department Usage Report
    // ─────────────────────────────────────────────────────────────────

    /**
     * ISSUE movements grouped by destination location (department).
     */
    public function getDepartmentUsage(string $tenantId, ?string $propertyId = null, string $dateFrom = '', string $dateTo = ''): array
    {
        $conn = $this->em->getConnection();
        $from = $dateFrom ?: date('Y-m-01');
        $to   = $dateTo   ?: date('Y-m-d');

        $sql = <<<'SQL'
            SELECT
                ml.location_name    AS department,
                ml.item_id,
                ml.item_sku         AS sku,
                ml.item_name,
                sc.name             AS category_name,
                SUM(ml.quantity)    AS total_qty,
                SUM(ml.line_value)  AS total_value_kobo,
                COUNT(*)            AS movement_count
            FROM stock_movement_lines ml
            JOIN stock_movements sm ON sm.id = ml.movement_id
            JOIN stock_items     si ON si.id = ml.item_id
            LEFT JOIN stock_categories sc ON sc.id = si.category_id
            WHERE ml.tenant_id   = :tid
              AND sm.type        = 'issue'
              AND sm.movement_date >= :from
              AND sm.movement_date <= :to
        SQL;

        $params = ['tid' => $tenantId, 'from' => $from . ' 00:00:00', 'to' => $to . ' 23:59:59'];
        if ($propertyId) { $sql .= ' AND sm.property_id = :pid'; $params['pid'] = $propertyId; }
        $sql .= ' GROUP BY ml.location_name, ml.item_id, ml.item_sku, ml.item_name, sc.name ORDER BY ml.location_name, total_value_kobo DESC';

        $rows = $conn->fetchAllAssociative($sql, $params);
        foreach ($rows as &$row) {
            $row['total_qty']         = (float) $row['total_qty'];
            $row['total_value_kobo']  = (int)   $row['total_value_kobo'];
            $row['movement_count']    = (int)   $row['movement_count'];
        }
        unset($row);

        // Group by department
        $byDept = [];
        foreach ($rows as $row) {
            $dept = $row['department'];
            if (!isset($byDept[$dept])) {
                $byDept[$dept] = ['department' => $dept, 'total_value_kobo' => 0, 'items' => []];
            }
            $byDept[$dept]['total_value_kobo'] += $row['total_value_kobo'];
            $byDept[$dept]['items'][] = $row;
        }

        return [
            'departments'  => array_values($byDept),
            'date_from'    => $from,
            'date_to'      => $to,
            'total_value_kobo' => array_sum(array_column(array_values($byDept), 'total_value_kobo')),
            'generated_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
        ];
    }

    // ─────────────────────────────────────────────────────────────────
    // 6. Property Comparison Dashboard
    // ─────────────────────────────────────────────────────────────────

    /**
     * Multi-property on-hand value, item count, and turnover ratio.
     * Only meaningful for tenants with multiple properties.
     */
    public function getPropertyComparison(string $tenantId, string $dateFrom = '', string $dateTo = ''): array
    {
        $conn = $this->em->getConnection();
        $from = $dateFrom ?: date('Y-m-01');
        $to   = $dateTo   ?: date('Y-m-d');

        // On-hand values per property
        $valSql = <<<'SQL'
            SELECT
                sl.property_id,
                COUNT(DISTINCT sb.item_id)                    AS item_count,
                SUM(sb.quantity_on_hand * si.average_cost)   AS stock_value_kobo,
                SUM(CASE WHEN sb.quantity_on_hand <= si.reorder_point THEN 1 ELSE 0 END) AS low_stock_count
            FROM stock_balances sb
            JOIN stock_items    si ON si.id = sb.item_id    AND si.tenant_id = sb.tenant_id
            JOIN stock_locations sl ON sl.id = sb.location_id AND sl.tenant_id = sb.tenant_id
            WHERE sb.tenant_id = :tid AND si.is_active = 1
            GROUP BY sl.property_id
        SQL;
        $valRows = $conn->fetchAllAssociative($valSql, ['tid' => $tenantId]);

        // Issue (usage) value per property in period
        $issueSql = <<<'SQL'
            SELECT
                sm.property_id,
                SUM(ABS(ml.line_value)) AS issued_value_kobo
            FROM stock_movements sm
            JOIN stock_movement_lines ml ON ml.movement_id = sm.id
            WHERE sm.tenant_id    = :tid
              AND sm.type         = 'issue'
              AND sm.movement_date >= :from
              AND sm.movement_date <= :to
            GROUP BY sm.property_id
        SQL;
        $issueRows = $conn->fetchAllAssociative($issueSql, ['tid' => $tenantId, 'from' => $from . ' 00:00:00', 'to' => $to . ' 23:59:59']);
        $issueMap  = array_column($issueRows, 'issued_value_kobo', 'property_id');

        $properties = [];
        foreach ($valRows as $row) {
            $pid           = $row['property_id'];
            $stockVal      = (float) $row['stock_value_kobo'];
            $issuedVal     = (float) ($issueMap[$pid] ?? 0);
            $turnoverRatio = ($stockVal > 0) ? round($issuedVal / $stockVal, 4) : null;

            $properties[] = [
                'property_id'         => $pid,
                'item_count'          => (int) $row['item_count'],
                'stock_value_kobo'    => $stockVal,
                'low_stock_count'     => (int) $row['low_stock_count'],
                'issued_value_kobo'   => $issuedVal,
                'turnover_ratio'      => $turnoverRatio,
            ];
        }

        usort($properties, fn($a, $b) => $b['stock_value_kobo'] <=> $a['stock_value_kobo']);

        return [
            'properties'   => $properties,
            'date_from'    => $from,
            'date_to'      => $to,
            'generated_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
        ];
    }
}
