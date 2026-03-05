<?php

declare(strict_types=1);

namespace Lodgik\Module\Report;

use Lodgik\Helper\JsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * ReportController
 *
 * All endpoints require:
 *   ?property_id=<uuid>   (required — all reports are property-scoped)
 *
 * Optional on all endpoints:
 *   ?format=csv           — streams a CSV download instead of JSON
 *
 * Date params default to today / sensible ranges when omitted.
 */
final class ReportController
{
    public function __construct(
        private readonly ReportService $reportService,
    ) {}

    // ─────────────────────────────────────────────────────────────
    // 1. GET /api/reports/arrivals
    //    ?property_id= &date= (default today) &page= &limit=
    // ─────────────────────────────────────────────────────────────

    public function arrivals(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $date  = $q['date'] ?? date('Y-m-d');
        $page  = max(1, (int) ($q['page']  ?? 1));
        $limit = min(200, max(10, (int) ($q['limit'] ?? 50)));

        $data = $this->reportService->getArrivals($tid, $pid, $date, $page, $limit);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'booking_ref', 'guest_name', 'guest_phone', 'guest_nationality',
                'room_number', 'room_type', 'check_in', 'check_out',
                'adults', 'children', 'total_amount', 'status', 'source',
            ], "arrivals-{$date}");
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. GET /api/reports/departures
    //    ?property_id= &date= (default today) &page= &limit=
    // ─────────────────────────────────────────────────────────────

    public function departures(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $date  = $q['date'] ?? date('Y-m-d');
        $page  = max(1, (int) ($q['page']  ?? 1));
        $limit = min(200, max(10, (int) ($q['limit'] ?? 50)));

        $data = $this->reportService->getDepartures($tid, $pid, $date, $page, $limit);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'booking_ref', 'guest_name', 'guest_phone',
                'room_number', 'room_type', 'check_in', 'check_out',
                'adults', 'children', 'total_amount', 'outstanding_balance', 'status',
            ], "departures-{$date}");
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. GET /api/reports/in-house
    //    ?property_id= &page= &limit=
    // ─────────────────────────────────────────────────────────────

    public function inHouse(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $page  = max(1, (int) ($q['page']  ?? 1));
        $limit = min(200, max(10, (int) ($q['limit'] ?? 50)));

        $data = $this->reportService->getInHouseGuests($tid, $pid, $page, $limit);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'booking_ref', 'guest_name', 'guest_email', 'guest_phone', 'guest_nationality',
                'room_number', 'room_type', 'check_in', 'check_out',
                'nights_remaining', 'adults', 'children', 'outstanding_balance',
            ], 'in-house-' . date('Y-m-d'));
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. GET /api/reports/no-shows
    //    ?property_id= &date_from= &date_to= &page= &limit=
    // ─────────────────────────────────────────────────────────────

    public function noShows(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $dateFrom = $q['date_from'] ?? date('Y-m-01');       // first of this month
        $dateTo   = $q['date_to']   ?? date('Y-m-d');
        $page     = max(1, (int) ($q['page']  ?? 1));
        $limit    = min(200, max(10, (int) ($q['limit'] ?? 50)));

        $data = $this->reportService->getNoShows($tid, $pid, $dateFrom, $dateTo, $page, $limit);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'booking_ref', 'guest_name', 'guest_email', 'guest_phone',
                'room_number', 'room_type', 'check_in', 'check_out',
                'total_amount', 'source', 'created_at',
            ], "no-shows-{$dateFrom}-{$dateTo}");
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 5. GET /api/reports/room-status
    //    ?property_id=
    // ─────────────────────────────────────────────────────────────

    public function roomStatus(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $data = $this->reportService->getRoomStatus($tid, $pid);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'room_number', 'floor', 'room_type', 'status', 'base_rate', 'notes',
            ], 'room-status-' . date('Y-m-d'));
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. GET /api/reports/room-availability
    //    ?property_id= &date_from= &date_to=
    // ─────────────────────────────────────────────────────────────

    public function roomAvailability(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $dateFrom = $q['date_from'] ?? date('Y-m-d');
        $dateTo   = $q['date_to']   ?? date('Y-m-d', strtotime('+7 days'));

        $data = $this->reportService->getRoomAvailability($tid, $pid, $dateFrom, $dateTo);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'room_number', 'floor', 'room_type', 'status', 'rate_per_night', 'max_occupancy',
            ], "room-availability-{$dateFrom}");
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 7. GET /api/reports/occupancy
    //    ?property_id= &date_from= &date_to=
    // ─────────────────────────────────────────────────────────────

    public function occupancy(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $dateFrom = $q['date_from'] ?? date('Y-m-01');
        $dateTo   = $q['date_to']   ?? date('Y-m-t');

        $data = $this->reportService->getOccupancyReport($tid, $pid, $dateFrom, $dateTo);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'date', 'occupied_rooms', 'total_rooms', 'occupancy_pct', 'revenue', 'adr', 'revpar',
            ], "occupancy-{$dateFrom}-{$dateTo}");
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 8. GET /api/reports/daily-revenue
    //    ?property_id= &date_from= &date_to=
    // ─────────────────────────────────────────────────────────────

    public function dailyRevenue(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $dateFrom = $q['date_from'] ?? date('Y-m-01');
        $dateTo   = $q['date_to']   ?? date('Y-m-d');

        $data = $this->reportService->getDailyRevenue($tid, $pid, $dateFrom, $dateTo);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'date', 'room', 'bar', 'restaurant', 'service',
                'laundry', 'minibar', 'other', 'total', 'payments_received',
            ], "daily-revenue-{$dateFrom}-{$dateTo}");
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 9. GET /api/reports/payment-collection
    //    ?property_id= &date_from= &date_to= &page= &limit=
    // ─────────────────────────────────────────────────────────────

    public function paymentCollection(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $dateFrom = $q['date_from'] ?? date('Y-m-d');
        $dateTo   = $q['date_to']   ?? date('Y-m-d');
        $page     = max(1, (int) ($q['page']  ?? 1));
        $limit    = min(500, max(10, (int) ($q['limit'] ?? 100)));

        $data = $this->reportService->getPaymentCollection($tid, $pid, $dateFrom, $dateTo, $page, $limit);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'payment_date', 'booking_ref', 'folio_number', 'guest_name',
                'room_number', 'payment_method', 'amount',
                'sender_name', 'transfer_reference',
            ], "payment-collection-{$dateFrom}-{$dateTo}");
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 10. GET /api/reports/outstanding-balances
    //     ?property_id= &page= &limit=
    // ─────────────────────────────────────────────────────────────

    public function outstandingBalances(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $page  = max(1, (int) ($q['page']  ?? 1));
        $limit = min(200, max(10, (int) ($q['limit'] ?? 50)));

        $data = $this->reportService->getOutstandingBalances($tid, $pid, $page, $limit);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'folio_number', 'booking_ref', 'guest_name', 'guest_email', 'guest_phone',
                'room_number', 'check_in', 'check_out', 'booking_status',
                'total_charges', 'total_payments', 'balance',
            ], 'outstanding-balances-' . date('Y-m-d'));
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 11. GET /api/reports/housekeeping-status
    //     ?property_id= &date= (default today)
    // ─────────────────────────────────────────────────────────────

    public function housekeepingStatus(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $date = $q['date'] ?? null;      // null → service defaults to today
        $data = $this->reportService->getHousekeepingStatus($tid, $pid, $date);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'room_number', 'floor', 'task_type', 'status', 'priority',
                'assigned_to_name', 'started_at', 'completed_at', 'notes',
            ], 'housekeeping-' . ($date ?? date('Y-m-d')));
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // 12. GET /api/reports/guest-history
    //     ?property_id= &guest_id= &date_from= &date_to= &page= &limit=
    // ─────────────────────────────────────────────────────────────

    public function guestHistory(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $q['property_id'] ?? null;

        if (!$pid) {
            return JsonResponse::error($res, 'property_id is required', 400);
        }

        $guestId  = $q['guest_id']   ?? null;
        $dateFrom = $q['date_from']  ?? null;
        $dateTo   = $q['date_to']    ?? null;
        $page     = max(1, (int) ($q['page']  ?? 1));
        $limit    = min(200, max(10, (int) ($q['limit'] ?? 50)));

        $data = $this->reportService->getGuestHistory(
            $tid, $pid, $guestId, $dateFrom, $dateTo, $page, $limit,
        );

        if (($q['format'] ?? '') === 'csv') {
            return $this->csv($res, $data['items'], [
                'booking_ref', 'guest_name', 'guest_email', 'guest_phone', 'guest_nationality',
                'room_number', 'room_type', 'check_in', 'check_out',
                'adults', 'children', 'total_amount', 'balance', 'source', 'status',
            ], 'guest-history-' . date('Y-m-d'));
        }

        return JsonResponse::ok($res, $data);
    }

    // ─────────────────────────────────────────────────────────────
    // Private: CSV stream helper
    // ─────────────────────────────────────────────────────────────

    private function csv(Response $res, array $rows, array $columns, string $filename): Response
    {
        $output = implode(',', array_map(
            fn($c) => ucwords(str_replace('_', ' ', $c)),
            $columns,
        )) . "\n";

        foreach ($rows as $row) {
            $cells = array_map(function (string $col) use ($row): string {
                $val = (string) ($row[$col] ?? '');
                if (
                    str_contains($val, ',') ||
                    str_contains($val, '"') ||
                    str_contains($val, "\n")
                ) {
                    $val = '"' . str_replace('"', '""', $val) . '"';
                }
                return $val;
            }, $columns);
            $output .= implode(',', $cells) . "\n";
        }

        $res->getBody()->write($output);

        return $res
            ->withHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->withHeader('Content-Disposition', "attachment; filename=\"{$filename}.csv\"")
            ->withHeader('Cache-Control', 'no-cache, no-store');
    }
}
