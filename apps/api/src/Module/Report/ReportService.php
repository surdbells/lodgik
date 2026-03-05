<?php

declare(strict_types=1);

namespace Lodgik\Module\Report;

use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;

/**
 * ReportService
 *
 * All queries are tenant + property scoped.
 * Every method returns:
 *   ['items' => [...], 'summary' => [...], 'meta' => [...], 'generated_at' => string]
 *
 * "items" is always a flat array of associative rows — safe for JSON and CSV export.
 */
final class ReportService
{
    private Connection $conn;

    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
        $this->conn = $em->getConnection();
    }

    // ─────────────────────────────────────────────────────────────
    // 1. DAILY ARRIVALS
    // Bookings with check_in date = $date, status IN (confirmed, checked_in)
    // ─────────────────────────────────────────────────────────────

    public function getArrivals(
        string $tenantId,
        string $propertyId,
        string $date,
        int    $page  = 1,
        int    $limit = 50,
    ): array {
        $offset = ($page - 1) * $limit;

        $sql = "
            SELECT
                b.id,
                b.booking_ref,
                b.status,
                b.booking_type,
                b.check_in,
                b.check_out,
                b.adults,
                b.children,
                b.total_amount,
                b.source,
                b.checked_in_at,
                b.notes,
                CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                g.email                                 AS guest_email,
                g.phone                                 AS guest_phone,
                g.nationality                           AS guest_nationality,
                r.room_number,
                rt.name                                 AS room_type
            FROM bookings b
            JOIN guests  g  ON g.id  = b.guest_id
            LEFT JOIN rooms     r  ON r.id  = b.room_id
            LEFT JOIN room_types rt ON rt.id = r.room_type_id
            WHERE b.tenant_id   = :tid
              AND b.property_id = :pid
              AND DATE(b.check_in) = :date
              AND b.status IN ('confirmed', 'checked_in')
              AND b.deleted_at IS NULL
            ORDER BY b.check_in ASC
            LIMIT :limit OFFSET :offset
        ";

        $items = $this->conn->fetchAllAssociative($sql, [
            'tid'    => $tenantId,
            'pid'    => $propertyId,
            'date'   => $date,
            'limit'  => $limit,
            'offset' => $offset,
        ]);

        $total = (int) $this->conn->fetchOne(
            "SELECT COUNT(*) FROM bookings
             WHERE tenant_id = :tid AND property_id = :pid
               AND DATE(check_in) = :date AND status IN ('confirmed','checked_in')
               AND deleted_at IS NULL",
            ['tid' => $tenantId, 'pid' => $propertyId, 'date' => $date],
        );

        $summary = [
            'date'          => $date,
            'total'         => $total,
            'checked_in'    => count(array_filter($items, fn($r) => $r['status'] === 'checked_in')),
            'confirmed'     => count(array_filter($items, fn($r) => $r['status'] === 'confirmed')),
        ];

        return $this->paginate($items, $total, $page, $limit, $summary);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. DAILY DEPARTURES
    // Bookings with check_out date = $date, status IN (checked_in, checked_out)
    // ─────────────────────────────────────────────────────────────

    public function getDepartures(
        string $tenantId,
        string $propertyId,
        string $date,
        int    $page  = 1,
        int    $limit = 50,
    ): array {
        $offset = ($page - 1) * $limit;

        $sql = "
            SELECT
                b.id,
                b.booking_ref,
                b.status,
                b.booking_type,
                b.check_in,
                b.check_out,
                b.adults,
                b.children,
                b.total_amount,
                b.source,
                b.checked_out_at,
                CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                g.email                                 AS guest_email,
                g.phone                                 AS guest_phone,
                r.room_number,
                rt.name                                 AS room_type,
                f.balance                               AS outstanding_balance
            FROM bookings b
            JOIN guests  g  ON g.id  = b.guest_id
            LEFT JOIN rooms     r  ON r.id  = b.room_id
            LEFT JOIN room_types rt ON rt.id = r.room_type_id
            LEFT JOIN folios    f  ON f.booking_id = b.id AND f.status != 'void'
            WHERE b.tenant_id   = :tid
              AND b.property_id = :pid
              AND DATE(b.check_out) = :date
              AND b.status IN ('checked_in', 'checked_out')
              AND b.deleted_at IS NULL
            ORDER BY b.check_out ASC
            LIMIT :limit OFFSET :offset
        ";

        $items = $this->conn->fetchAllAssociative($sql, [
            'tid' => $tenantId, 'pid' => $propertyId, 'date' => $date,
            'limit' => $limit, 'offset' => $offset,
        ]);

        $total = (int) $this->conn->fetchOne(
            "SELECT COUNT(*) FROM bookings
             WHERE tenant_id = :tid AND property_id = :pid
               AND DATE(check_out) = :date AND status IN ('checked_in','checked_out')
               AND deleted_at IS NULL",
            ['tid' => $tenantId, 'pid' => $propertyId, 'date' => $date],
        );

        $summary = [
            'date'       => $date,
            'total'      => $total,
            'checked_out' => count(array_filter($items, fn($r) => $r['status'] === 'checked_out')),
            'pending_checkout' => count(array_filter($items, fn($r) => $r['status'] === 'checked_in')),
        ];

        return $this->paginate($items, $total, $page, $limit, $summary);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. IN-HOUSE GUESTS
    // All bookings currently status = checked_in
    // ─────────────────────────────────────────────────────────────

    public function getInHouseGuests(
        string  $tenantId,
        string  $propertyId,
        int     $page  = 1,
        int     $limit = 50,
    ): array {
        $offset = ($page - 1) * $limit;
        $today  = date('Y-m-d');

        $sql = "
            SELECT
                b.id,
                b.booking_ref,
                b.check_in,
                b.check_out,
                b.adults,
                b.children,
                b.total_amount,
                b.source,
                b.checked_in_at,
                CONCAT(g.first_name, ' ', g.last_name)   AS guest_name,
                g.email                                   AS guest_email,
                g.phone                                   AS guest_phone,
                g.nationality                             AS guest_nationality,
                r.room_number,
                rt.name                                   AS room_type,
                (DATE(b.check_out) - :today::date)        AS nights_remaining,
                COALESCE(f.balance, 0)                    AS outstanding_balance
            FROM bookings b
            JOIN guests  g  ON g.id  = b.guest_id
            LEFT JOIN rooms     r  ON r.id  = b.room_id
            LEFT JOIN room_types rt ON rt.id = r.room_type_id
            LEFT JOIN folios    f  ON f.booking_id = b.id AND f.status != 'void'
            WHERE b.tenant_id   = :tid
              AND b.property_id = :pid
              AND b.status = 'checked_in'
              AND b.deleted_at IS NULL
            ORDER BY b.check_out ASC
            LIMIT :limit OFFSET :offset
        ";

        $items = $this->conn->fetchAllAssociative($sql, [
            'tid' => $tenantId, 'pid' => $propertyId, 'today' => $today,
            'limit' => $limit, 'offset' => $offset,
        ]);

        $total = (int) $this->conn->fetchOne(
            "SELECT COUNT(*) FROM bookings
             WHERE tenant_id = :tid AND property_id = :pid
               AND status = 'checked_in' AND deleted_at IS NULL",
            ['tid' => $tenantId, 'pid' => $propertyId],
        );

        $totalOutstanding = array_sum(array_column($items, 'outstanding_balance'));

        $summary = [
            'date'                => $today,
            'total_in_house'      => $total,
            'total_adults'        => (int) array_sum(array_column($items, 'adults')),
            'total_children'      => (int) array_sum(array_column($items, 'children')),
            'total_outstanding'   => number_format((float) $totalOutstanding, 2, '.', ''),
        ];

        return $this->paginate($items, $total, $page, $limit, $summary);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. NO-SHOW REPORT
    // Bookings where check_in < today AND status = no_show OR
    // still 'confirmed' past check_in (auto-identified no-shows)
    // ─────────────────────────────────────────────────────────────

    public function getNoShows(
        string $tenantId,
        string $propertyId,
        string $dateFrom,
        string $dateTo,
        int    $page  = 1,
        int    $limit = 50,
    ): array {
        $offset = ($page - 1) * $limit;

        $sql = "
            SELECT
                b.id,
                b.booking_ref,
                b.status,
                b.check_in,
                b.check_out,
                b.adults,
                b.children,
                b.total_amount,
                b.source,
                b.created_at,
                CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                g.email                                 AS guest_email,
                g.phone                                 AS guest_phone,
                r.room_number,
                rt.name                                 AS room_type
            FROM bookings b
            JOIN guests  g  ON g.id  = b.guest_id
            LEFT JOIN rooms     r  ON r.id  = b.room_id
            LEFT JOIN room_types rt ON rt.id = r.room_type_id
            WHERE b.tenant_id   = :tid
              AND b.property_id = :pid
              AND DATE(b.check_in) BETWEEN :date_from AND :date_to
              AND b.status = 'no_show'
              AND b.deleted_at IS NULL
            ORDER BY b.check_in DESC
            LIMIT :limit OFFSET :offset
        ";

        $items = $this->conn->fetchAllAssociative($sql, [
            'tid' => $tenantId, 'pid' => $propertyId,
            'date_from' => $dateFrom, 'date_to' => $dateTo,
            'limit' => $limit, 'offset' => $offset,
        ]);

        $total = (int) $this->conn->fetchOne(
            "SELECT COUNT(*) FROM bookings
             WHERE tenant_id = :tid AND property_id = :pid
               AND DATE(check_in) BETWEEN :date_from AND :date_to
               AND status = 'no_show' AND deleted_at IS NULL",
            ['tid' => $tenantId, 'pid' => $propertyId,
             'date_from' => $dateFrom, 'date_to' => $dateTo],
        );

        $lostRevenue = (float) $this->conn->fetchOne(
            "SELECT COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0)
             FROM bookings
             WHERE tenant_id = :tid AND property_id = :pid
               AND DATE(check_in) BETWEEN :date_from AND :date_to
               AND status = 'no_show' AND deleted_at IS NULL",
            ['tid' => $tenantId, 'pid' => $propertyId,
             'date_from' => $dateFrom, 'date_to' => $dateTo],
        );

        $summary = [
            'period_from'  => $dateFrom,
            'period_to'    => $dateTo,
            'total'        => $total,
            'lost_revenue' => number_format($lostRevenue, 2, '.', ''),
        ];

        return $this->paginate($items, $total, $page, $limit, $summary);
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ROOM STATUS REPORT
    // Live room status with summary counts
    // ─────────────────────────────────────────────────────────────

    public function getRoomStatus(
        string $tenantId,
        string $propertyId,
    ): array {
        $items = $this->conn->fetchAllAssociative("
            SELECT
                r.id,
                r.room_number,
                r.floor,
                r.status,
                rt.name  AS room_type,
                rt.base_rate,
                r.notes
            FROM rooms r
            LEFT JOIN room_types rt ON rt.id = r.room_type_id
            WHERE r.tenant_id   = :tid
              AND r.property_id = :pid
              AND r.is_active   = true
              AND r.deleted_at IS NULL
            ORDER BY r.floor ASC NULLS LAST, r.room_number ASC
        ", ['tid' => $tenantId, 'pid' => $propertyId]);

        // Aggregate counts per status
        $counts = [];
        foreach ($items as $row) {
            $counts[$row['status']] = ($counts[$row['status']] ?? 0) + 1;
        }

        $total = count($items);
        $occupied     = $counts['occupied']     ?? 0;
        $vacantClean  = $counts['vacant_clean'] ?? 0;
        $vacantDirty  = $counts['vacant_dirty'] ?? 0;
        $reserved     = $counts['reserved']     ?? 0;
        $outOfOrder   = $counts['out_of_order'] ?? 0;
        $maintenance  = $counts['maintenance']  ?? 0;

        $summary = [
            'total_rooms'    => $total,
            'occupied'       => $occupied,
            'vacant_clean'   => $vacantClean,
            'vacant_dirty'   => $vacantDirty,
            'reserved'       => $reserved,
            'out_of_order'   => $outOfOrder,
            'maintenance'    => $maintenance,
            'occupancy_pct'  => $total > 0
                ? round(($occupied / $total) * 100, 1)
                : 0,
        ];

        return [
            'items'        => $items,
            'summary'      => $summary,
            'meta'         => ['total' => $total, 'page' => 1, 'limit' => $total, 'pages' => 1],
            'generated_at' => date('c'),
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // 6. ROOM AVAILABILITY REPORT
    // Rooms not booked (no overlap) during [dateFrom, dateTo]
    // ─────────────────────────────────────────────────────────────

    public function getRoomAvailability(
        string $tenantId,
        string $propertyId,
        string $dateFrom,
        string $dateTo,
    ): array {
        // Rooms that have an overlapping confirmed/checked_in booking
        $unavailableIds = $this->conn->fetchFirstColumn("
            SELECT DISTINCT room_id
            FROM bookings
            WHERE tenant_id   = :tid
              AND property_id = :pid
              AND room_id IS NOT NULL
              AND status IN ('confirmed','checked_in')
              AND deleted_at IS NULL
              AND check_in  < :date_to::timestamp
              AND check_out > :date_from::timestamp
        ", [
            'tid'       => $tenantId,
            'pid'       => $propertyId,
            'date_from' => $dateFrom . ' 00:00:00',
            'date_to'   => $dateTo   . ' 23:59:59',
        ]);

        $placeholders = empty($unavailableIds)
            ? "'__none__'"
            : implode(',', array_map(fn($id) => $this->conn->quote($id), $unavailableIds));

        $items = $this->conn->fetchAllAssociative("
            SELECT
                r.id,
                r.room_number,
                r.floor,
                r.status,
                rt.name      AS room_type,
                rt.base_rate AS rate_per_night,
                rt.max_occupancy
            FROM rooms r
            LEFT JOIN room_types rt ON rt.id = r.room_type_id
            WHERE r.tenant_id   = :tid
              AND r.property_id = :pid
              AND r.is_active   = true
              AND r.deleted_at IS NULL
              AND r.status NOT IN ('out_of_order','maintenance')
              AND r.id NOT IN ({$placeholders})
            ORDER BY rt.name ASC, r.room_number ASC
        ", ['tid' => $tenantId, 'pid' => $propertyId]);

        $totalRooms = (int) $this->conn->fetchOne(
            "SELECT COUNT(*) FROM rooms
             WHERE tenant_id = :tid AND property_id = :pid
               AND is_active = true AND deleted_at IS NULL
               AND status NOT IN ('out_of_order','maintenance')",
            ['tid' => $tenantId, 'pid' => $propertyId],
        );

        $available = count($items);
        $summary   = [
            'period_from'       => $dateFrom,
            'period_to'         => $dateTo,
            'total_rooms'       => $totalRooms,
            'available_rooms'   => $available,
            'unavailable_rooms' => $totalRooms - $available,
        ];

        return [
            'items'        => $items,
            'summary'      => $summary,
            'meta'         => ['total' => $available, 'page' => 1, 'limit' => $available, 'pages' => 1],
            'generated_at' => date('c'),
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // 7. OCCUPANCY REPORT
    // Daily occupancy % + ADR + RevPAR for a date range
    // ─────────────────────────────────────────────────────────────

    public function getOccupancyReport(
        string $tenantId,
        string $propertyId,
        string $dateFrom,
        string $dateTo,
    ): array {
        $totalRooms = (int) $this->conn->fetchOne(
            "SELECT COUNT(*) FROM rooms
             WHERE tenant_id = :tid AND property_id = :pid
               AND is_active = true AND deleted_at IS NULL",
            ['tid' => $tenantId, 'pid' => $propertyId],
        );

        // Bookings overlapping each day
        $rows = $this->conn->fetchAllAssociative("
            SELECT
                gs.day::date                                      AS date,
                COUNT(DISTINCT b.id)                              AS occupied_rooms,
                COALESCE(SUM(CAST(b.total_amount AS NUMERIC)), 0) AS total_revenue
            FROM generate_series(
                :date_from::date,
                :date_to::date,
                '1 day'::interval
            ) AS gs(day)
            LEFT JOIN bookings b
                ON b.tenant_id   = :tid
               AND b.property_id = :pid
               AND b.status IN ('checked_in', 'checked_out')
               AND b.deleted_at IS NULL
               AND b.check_in::date  <= gs.day
               AND b.check_out::date >  gs.day
            GROUP BY gs.day
            ORDER BY gs.day ASC
        ", [
            'tid'       => $tenantId,
            'pid'       => $propertyId,
            'date_from' => $dateFrom,
            'date_to'   => $dateTo,
        ]);

        $items = array_map(function ($row) use ($totalRooms) {
            $occupied     = (int)   $row['occupied_rooms'];
            $revenue      = (float) $row['total_revenue'];
            $occupancyPct = $totalRooms > 0 ? round($occupied / $totalRooms * 100, 1) : 0;
            $adr          = $occupied > 0   ? round($revenue / $occupied, 2) : 0;
            $revpar       = $totalRooms > 0 ? round($revenue / $totalRooms, 2) : 0;
            return [
                'date'          => $row['date'],
                'occupied_rooms'=> $occupied,
                'total_rooms'   => $totalRooms,
                'occupancy_pct' => $occupancyPct,
                'revenue'       => number_format($revenue, 2, '.', ''),
                'adr'           => number_format($adr, 2, '.', ''),
                'revpar'        => number_format($revpar, 2, '.', ''),
            ];
        }, $rows);

        $avgOccupancy = count($items) > 0
            ? round(array_sum(array_column($items, 'occupancy_pct')) / count($items), 1)
            : 0;
        $totalRevenue = array_sum(array_column($items, 'revenue'));
        $avgAdr       = count($items) > 0
            ? round(array_sum(array_column($items, 'adr')) / count($items), 2)
            : 0;

        $summary = [
            'period_from'      => $dateFrom,
            'period_to'        => $dateTo,
            'total_rooms'      => $totalRooms,
            'avg_occupancy_pct'=> $avgOccupancy,
            'total_revenue'    => number_format((float) $totalRevenue, 2, '.', ''),
            'avg_adr'          => number_format($avgAdr, 2, '.', ''),
            'avg_revpar'       => $totalRooms > 0
                ? number_format((float) $totalRevenue / $totalRooms / max(1, count($items)), 2, '.', '')
                : '0.00',
        ];

        return [
            'items'        => $items,
            'summary'      => $summary,
            'meta'         => ['total' => count($items), 'page' => 1, 'limit' => count($items), 'pages' => 1],
            'generated_at' => date('c'),
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // 8. DAILY REVENUE REPORT
    // Revenue grouped by day + breakdown by charge category
    // ─────────────────────────────────────────────────────────────

    public function getDailyRevenue(
        string $tenantId,
        string $propertyId,
        string $dateFrom,
        string $dateTo,
    ): array {
        // Revenue per day per category from folio_charges
        $chargeRows = $this->conn->fetchAllAssociative("
            SELECT
                fc.charge_date::date                               AS date,
                fc.category,
                SUM(CAST(fc.line_total AS NUMERIC))                AS amount
            FROM folio_charges fc
            JOIN folios f ON f.id = fc.folio_id
            WHERE f.tenant_id   = :tid
              AND f.property_id = :pid
              AND fc.charge_date BETWEEN :date_from AND :date_to
              AND fc.is_voided = false
            GROUP BY fc.charge_date::date, fc.category
            ORDER BY fc.charge_date::date ASC
        ", ['tid' => $tenantId, 'pid' => $propertyId,
            'date_from' => $dateFrom, 'date_to' => $dateTo]);

        // Payments received per day
        $paymentRows = $this->conn->fetchAllAssociative("
            SELECT
                fp.payment_date::date                              AS date,
                SUM(CAST(fp.amount AS NUMERIC))                    AS amount
            FROM folio_payments fp
            JOIN folios f ON f.id = fp.folio_id
            WHERE f.tenant_id   = :tid
              AND f.property_id = :pid
              AND fp.payment_date BETWEEN :date_from AND :date_to
              AND fp.status = 'confirmed'
            GROUP BY fp.payment_date::date
            ORDER BY fp.payment_date::date ASC
        ", ['tid' => $tenantId, 'pid' => $propertyId,
            'date_from' => $dateFrom, 'date_to' => $dateTo]);

        // Index payments by date
        $paymentsByDate = [];
        foreach ($paymentRows as $r) {
            $paymentsByDate[$r['date']] = (float) $r['amount'];
        }

        // Pivot charges into one row per date
        $byDate = [];
        foreach ($chargeRows as $r) {
            $d = $r['date'];
            if (!isset($byDate[$d])) {
                $byDate[$d] = [
                    'date'       => $d,
                    'room'       => 0.0,
                    'bar'        => 0.0,
                    'restaurant' => 0.0,
                    'service'    => 0.0,
                    'laundry'    => 0.0,
                    'minibar'    => 0.0,
                    'other'      => 0.0,
                    'total'      => 0.0,
                    'payments_received' => 0.0,
                ];
            }
            $cat = $r['category'];
            $amt = (float) $r['amount'];
            if (array_key_exists($cat, $byDate[$d])) {
                $byDate[$d][$cat] += $amt;
            } else {
                $byDate[$d]['other'] += $amt;
            }
            $byDate[$d]['total'] += $amt;
        }

        // Merge payments
        foreach ($byDate as $d => &$row) {
            $row['payments_received'] = $paymentsByDate[$d] ?? 0.0;
            $row['total']             = round($row['total'], 2);
            $row['payments_received'] = round($row['payments_received'], 2);
        }
        unset($row);

        $items = array_values($byDate);

        $grandTotal    = array_sum(array_column($items, 'total'));
        $totalPayments = array_sum(array_column($items, 'payments_received'));

        $summary = [
            'period_from'        => $dateFrom,
            'period_to'          => $dateTo,
            'total_revenue'      => number_format($grandTotal, 2, '.', ''),
            'total_payments'     => number_format($totalPayments, 2, '.', ''),
            'room_revenue'       => number_format((float) array_sum(array_column($items, 'room')), 2, '.', ''),
            'bar_revenue'        => number_format((float) array_sum(array_column($items, 'bar')), 2, '.', ''),
            'restaurant_revenue' => number_format((float) array_sum(array_column($items, 'restaurant')), 2, '.', ''),
            'service_revenue'    => number_format((float) array_sum(array_column($items, 'service')), 2, '.', ''),
            'laundry_revenue'    => number_format((float) array_sum(array_column($items, 'laundry')), 2, '.', ''),
        ];

        return [
            'items'        => $items,
            'summary'      => $summary,
            'meta'         => ['total' => count($items), 'page' => 1, 'limit' => count($items), 'pages' => 1],
            'generated_at' => date('c'),
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // 9. PAYMENT COLLECTION REPORT
    // Payments received grouped by method for a date range
    // ─────────────────────────────────────────────────────────────

    public function getPaymentCollection(
        string $tenantId,
        string $propertyId,
        string $dateFrom,
        string $dateTo,
        int    $page  = 1,
        int    $limit = 100,
    ): array {
        $offset = ($page - 1) * $limit;

        $items = $this->conn->fetchAllAssociative("
            SELECT
                fp.id,
                fp.payment_date,
                fp.payment_method,
                fp.amount,
                fp.status,
                fp.sender_name,
                fp.transfer_reference,
                f.folio_number,
                CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                b.booking_ref,
                r.room_number
            FROM folio_payments fp
            JOIN folios   f  ON f.id  = fp.folio_id
            JOIN bookings b  ON b.id  = f.booking_id
            JOIN guests   g  ON g.id  = f.guest_id
            LEFT JOIN rooms r ON r.id = b.room_id
            WHERE f.tenant_id   = :tid
              AND f.property_id = :pid
              AND fp.payment_date BETWEEN :date_from AND :date_to
              AND fp.status = 'confirmed'
            ORDER BY fp.payment_date DESC, fp.id DESC
            LIMIT :limit OFFSET :offset
        ", [
            'tid'       => $tenantId, 'pid' => $propertyId,
            'date_from' => $dateFrom, 'date_to' => $dateTo,
            'limit' => $limit, 'offset' => $offset,
        ]);

        $total = (int) $this->conn->fetchOne("
            SELECT COUNT(*) FROM folio_payments fp
            JOIN folios f ON f.id = fp.folio_id
            WHERE f.tenant_id = :tid AND f.property_id = :pid
              AND fp.payment_date BETWEEN :date_from AND :date_to
              AND fp.status = 'confirmed'
        ", ['tid' => $tenantId, 'pid' => $propertyId,
            'date_from' => $dateFrom, 'date_to' => $dateTo]);

        // Totals by method
        $methodTotals = $this->conn->fetchAllAssociative("
            SELECT
                fp.payment_method,
                COUNT(*)                                           AS count,
                SUM(CAST(fp.amount AS NUMERIC))                    AS total
            FROM folio_payments fp
            JOIN folios f ON f.id = fp.folio_id
            WHERE f.tenant_id = :tid AND f.property_id = :pid
              AND fp.payment_date BETWEEN :date_from AND :date_to
              AND fp.status = 'confirmed'
            GROUP BY fp.payment_method
        ", ['tid' => $tenantId, 'pid' => $propertyId,
            'date_from' => $dateFrom, 'date_to' => $dateTo]);

        $byMethod = [];
        $grandTotal = 0.0;
        foreach ($methodTotals as $m) {
            $byMethod[$m['payment_method']] = [
                'count' => (int)   $m['count'],
                'total' => number_format((float) $m['total'], 2, '.', ''),
            ];
            $grandTotal += (float) $m['total'];
        }

        $summary = [
            'period_from'  => $dateFrom,
            'period_to'    => $dateTo,
            'grand_total'  => number_format($grandTotal, 2, '.', ''),
            'cash'         => $byMethod['cash']          ?? ['count' => 0, 'total' => '0.00'],
            'bank_transfer'=> $byMethod['bank_transfer'] ?? ['count' => 0, 'total' => '0.00'],
            'pos_card'     => $byMethod['pos_card']      ?? ['count' => 0, 'total' => '0.00'],
        ];

        return $this->paginate($items, $total, $page, $limit, $summary);
    }

    // ─────────────────────────────────────────────────────────────
    // 10. OUTSTANDING BALANCE REPORT
    // Open folios where balance > 0
    // ─────────────────────────────────────────────────────────────

    public function getOutstandingBalances(
        string $tenantId,
        string $propertyId,
        int    $page  = 1,
        int    $limit = 50,
    ): array {
        $offset = ($page - 1) * $limit;

        $items = $this->conn->fetchAllAssociative("
            SELECT
                f.id,
                f.folio_number,
                f.status          AS folio_status,
                f.total_charges,
                f.total_payments,
                f.balance,
                f.closed_at,
                b.booking_ref,
                b.check_in,
                b.check_out,
                b.status          AS booking_status,
                CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                g.email           AS guest_email,
                g.phone           AS guest_phone,
                r.room_number
            FROM folios f
            JOIN bookings b ON b.id = f.booking_id
            JOIN guests   g ON g.id = f.guest_id
            LEFT JOIN rooms r ON r.id = b.room_id
            WHERE f.tenant_id   = :tid
              AND f.property_id = :pid
              AND CAST(f.balance AS NUMERIC) > 0
              AND f.status != 'void'
            ORDER BY CAST(f.balance AS NUMERIC) DESC
            LIMIT :limit OFFSET :offset
        ", ['tid' => $tenantId, 'pid' => $propertyId, 'limit' => $limit, 'offset' => $offset]);

        $total = (int) $this->conn->fetchOne("
            SELECT COUNT(*) FROM folios
            WHERE tenant_id = :tid AND property_id = :pid
              AND CAST(balance AS NUMERIC) > 0 AND status != 'void'
        ", ['tid' => $tenantId, 'pid' => $propertyId]);

        $totalOutstanding = (float) $this->conn->fetchOne("
            SELECT COALESCE(SUM(CAST(balance AS NUMERIC)), 0)
            FROM folios
            WHERE tenant_id = :tid AND property_id = :pid
              AND CAST(balance AS NUMERIC) > 0 AND status != 'void'
        ", ['tid' => $tenantId, 'pid' => $propertyId]);

        $summary = [
            'total_accounts'    => $total,
            'total_outstanding' => number_format($totalOutstanding, 2, '.', ''),
        ];

        return $this->paginate($items, $total, $page, $limit, $summary);
    }

    // ─────────────────────────────────────────────────────────────
    // 11. HOUSEKEEPING STATUS REPORT
    // Tasks with summary counts by status
    // ─────────────────────────────────────────────────────────────

    public function getHousekeepingStatus(
        string  $tenantId,
        string  $propertyId,
        ?string $date = null,
    ): array {
        $date  = $date ?? date('Y-m-d');

        $items = $this->conn->fetchAllAssociative("
            SELECT
                ht.id,
                ht.room_number,
                ht.task_type,
                ht.status,
                ht.priority,
                ht.assigned_to_name,
                ht.notes,
                ht.started_at,
                ht.completed_at,
                r.floor
            FROM housekeeping_tasks ht
            LEFT JOIN rooms r ON r.id = ht.room_id
            WHERE ht.tenant_id   = :tid
              AND ht.property_id = :pid
              AND DATE(ht.created_at) = :date
            ORDER BY ht.priority ASC, ht.room_number ASC
        ", ['tid' => $tenantId, 'pid' => $propertyId, 'date' => $date]);

        // Count by status
        $counts = [];
        foreach ($items as $row) {
            $counts[$row['status']] = ($counts[$row['status']] ?? 0) + 1;
        }

        $summary = [
            'date'       => $date,
            'total'      => count($items),
            'pending'    => $counts['pending']     ?? 0,
            'assigned'   => $counts['assigned']    ?? 0,
            'in_progress'=> $counts['in_progress'] ?? 0,
            'completed'  => $counts['completed']   ?? 0,
            'inspected'  => $counts['inspected']   ?? 0,
            'needs_rework'=> $counts['needs_rework'] ?? 0,
        ];

        return [
            'items'        => $items,
            'summary'      => $summary,
            'meta'         => ['total' => count($items), 'page' => 1, 'limit' => count($items), 'pages' => 1],
            'generated_at' => date('c'),
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // 12. GUEST HISTORY REPORT
    // Past stays with totals; optionally filtered by guest_id
    // ─────────────────────────────────────────────────────────────

    public function getGuestHistory(
        string  $tenantId,
        string  $propertyId,
        ?string $guestId = null,
        ?string $dateFrom = null,
        ?string $dateTo   = null,
        int     $page  = 1,
        int     $limit = 50,
    ): array {
        $offset     = ($page - 1) * $limit;
        $dateFrom   = $dateFrom ?? date('Y-m-d', strtotime('-1 year'));
        $dateTo     = $dateTo   ?? date('Y-m-d');

        $guestClause = $guestId ? 'AND b.guest_id = :guest_id' : '';

        $sql = "
            SELECT
                b.id,
                b.booking_ref,
                b.status,
                b.booking_type,
                b.check_in,
                b.check_out,
                b.adults,
                b.children,
                b.total_amount,
                b.source,
                b.checked_in_at,
                b.checked_out_at,
                CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
                g.email                                 AS guest_email,
                g.phone                                 AS guest_phone,
                g.nationality                           AS guest_nationality,
                r.room_number,
                rt.name                                 AS room_type,
                COALESCE(f.balance, 0)                  AS balance
            FROM bookings b
            JOIN guests  g  ON g.id  = b.guest_id
            LEFT JOIN rooms     r  ON r.id  = b.room_id
            LEFT JOIN room_types rt ON rt.id = r.room_type_id
            LEFT JOIN folios    f  ON f.booking_id = b.id AND f.status != 'void'
            WHERE b.tenant_id   = :tid
              AND b.property_id = :pid
              AND DATE(b.check_in) BETWEEN :date_from AND :date_to
              AND b.status IN ('checked_in','checked_out')
              AND b.deleted_at IS NULL
              {$guestClause}
            ORDER BY b.check_in DESC
            LIMIT :limit OFFSET :offset
        ";

        $params = [
            'tid' => $tenantId, 'pid' => $propertyId,
            'date_from' => $dateFrom, 'date_to' => $dateTo,
            'limit' => $limit, 'offset' => $offset,
        ];
        if ($guestId) {
            $params['guest_id'] = $guestId;
        }

        $items = $this->conn->fetchAllAssociative($sql, $params);

        $totalParams = [
            'tid' => $tenantId, 'pid' => $propertyId,
            'date_from' => $dateFrom, 'date_to' => $dateTo,
        ];
        if ($guestId) {
            $totalParams['guest_id'] = $guestId;
        }

        $total = (int) $this->conn->fetchOne(
            "SELECT COUNT(*) FROM bookings b
             WHERE b.tenant_id = :tid AND b.property_id = :pid
               AND DATE(b.check_in) BETWEEN :date_from AND :date_to
               AND b.status IN ('checked_in','checked_out')
               AND b.deleted_at IS NULL"
            . ($guestId ? ' AND b.guest_id = :guest_id' : ''),
            $totalParams,
        );

        $totalRevenue = (float) $this->conn->fetchOne(
            "SELECT COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0)
             FROM bookings b
             WHERE b.tenant_id = :tid AND b.property_id = :pid
               AND DATE(b.check_in) BETWEEN :date_from AND :date_to
               AND b.status IN ('checked_in','checked_out')
               AND b.deleted_at IS NULL"
            . ($guestId ? ' AND b.guest_id = :guest_id' : ''),
            $totalParams,
        );

        $summary = [
            'period_from'   => $dateFrom,
            'period_to'     => $dateTo,
            'total_stays'   => $total,
            'total_revenue' => number_format($totalRevenue, 2, '.', ''),
        ];

        return $this->paginate($items, $total, $page, $limit, $summary);
    }

    // ─── Private helpers ─────────────────────────────────────────

    private function paginate(
        array $items,
        int   $total,
        int   $page,
        int   $limit,
        array $summary = [],
    ): array {
        return [
            'items'        => $items,
            'summary'      => $summary,
            'meta'         => [
                'total' => $total,
                'page'  => $page,
                'limit' => $limit,
                'pages' => $limit > 0 ? (int) ceil($total / $limit) : 1,
            ],
            'generated_at' => date('c'),
        ];
    }
}
