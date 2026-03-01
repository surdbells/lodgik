<?php

declare(strict_types=1);

namespace Lodgik\Module\Inventory;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Helper\JsonResponse;

/**
 * InventoryReportController
 *
 * All endpoints return JSON by default.
 * Add ?format=csv to stream a CSV download for applicable reports.
 */
final class InventoryReportController
{
    public function __construct(
        private readonly InventoryReportService $reportService,
        private readonly LowStockAlertService   $alertService,
    ) {}

    // GET /api/inventory/reports/valuation
    public function valuation(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $data = $this->reportService->getStockValuation(
            $tid,
            $q['property_id'] ?? null,
            $q['category_id'] ?? null,
        );

        if (($q['format'] ?? '') === 'csv') {
            return $this->csvResponse($res, $data['items'],
                ['sku', 'item_name', 'category_name', 'location_name', 'quantity_on_hand', 'wac_kobo', 'total_value_kobo', 'is_low_stock'],
                'stock-valuation'
            );
        }

        return JsonResponse::ok($res, $data);
    }

    // GET /api/inventory/reports/slow-moving?days=30
    public function slowMoving(Request $req, Response $res): Response
    {
        $q    = $req->getQueryParams();
        $tid  = $req->getAttribute('auth.tenant_id');
        $days = (int) ($q['days'] ?? 30);
        $data = $this->reportService->getSlowMoving($tid, $q['property_id'] ?? null, $days);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csvResponse($res, $data['items'],
                ['sku', 'item_name', 'category_name', 'location_name', 'quantity_on_hand', 'stock_value_kobo', 'last_issue_date'],
                'slow-moving'
            );
        }

        return JsonResponse::ok($res, $data);
    }

    // GET /api/inventory/reports/expiry?days=30
    public function expiryAlerts(Request $req, Response $res): Response
    {
        $q    = $req->getQueryParams();
        $tid  = $req->getAttribute('auth.tenant_id');
        $days = (int) ($q['days'] ?? 30);
        $data = $this->reportService->getExpiryAlerts($tid, $q['property_id'] ?? null, $days);

        if (($q['format'] ?? '') === 'csv') {
            return $this->csvResponse($res, $data['items'],
                ['sku', 'item_name', 'location_name', 'batch_number', 'expiry_date', 'batch_qty', 'days_until_expiry', 'urgency'],
                'expiry-alerts'
            );
        }

        return JsonResponse::ok($res, $data);
    }

    // GET /api/inventory/reports/shrinkage?date_from=&date_to=
    public function shrinkage(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $data = $this->reportService->getShrinkageReport(
            $tid,
            $q['property_id'] ?? null,
            $q['date_from'] ?? '',
            $q['date_to']   ?? '',
        );

        if (($q['format'] ?? '') === 'csv') {
            return $this->csvResponse($res, $data['items'],
                ['sku', 'item_name', 'category_name', 'movement_date', 'reference_number', 'shrinkage_qty', 'shrinkage_value_kobo'],
                'shrinkage'
            );
        }

        return JsonResponse::ok($res, $data);
    }

    // GET /api/inventory/reports/usage?date_from=&date_to=
    public function departmentUsage(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $data = $this->reportService->getDepartmentUsage(
            $tid,
            $q['property_id'] ?? null,
            $q['date_from'] ?? '',
            $q['date_to']   ?? '',
        );

        if (($q['format'] ?? '') === 'csv') {
            // Flatten departments for CSV
            $flat = [];
            foreach ($data['departments'] as $dept) {
                foreach ($dept['items'] as $item) $flat[] = $item;
            }
            return $this->csvResponse($res, $flat,
                ['department', 'sku', 'item_name', 'category_name', 'total_qty', 'total_value_kobo', 'movement_count'],
                'department-usage'
            );
        }

        return JsonResponse::ok($res, $data);
    }

    // GET /api/inventory/reports/property-comparison?date_from=&date_to=
    public function propertyComparison(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $data = $this->reportService->getPropertyComparison($tid, $q['date_from'] ?? '', $q['date_to'] ?? '');
        return JsonResponse::ok($res, $data);
    }

    // GET /api/inventory/reports/low-stock?property_id=
    public function lowStock(Request $req, Response $res): Response
    {
        $q   = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $items = $this->alertService->getLowStockItems($tid, $q['property_id'] ?? null);
        return JsonResponse::ok($res, $items, '', ['count' => count($items)]);
    }

    // POST /api/inventory/reports/low-stock/notify?property_id=
    public function triggerLowStockNotify(Request $req, Response $res): Response
    {
        $q      = $req->getQueryParams();
        $tid    = $req->getAttribute('auth.tenant_id');
        $result = $this->alertService->checkAndNotify($tid, $q['property_id'] ?? null);
        return JsonResponse::ok($res, $result);
    }

    // ─────────────────────────────────────────────────────────────────
    // CSV helper
    // ─────────────────────────────────────────────────────────────────

    private function csvResponse(Response $res, array $rows, array $columns, string $filename): Response
    {
        $output = implode(',', $columns) . "\n";
        foreach ($rows as $row) {
            $cells = array_map(function ($col) use ($row) {
                $val = $row[$col] ?? '';
                // Escape values containing comma/quotes/newlines
                if (str_contains((string) $val, ',') || str_contains((string) $val, '"') || str_contains((string) $val, "\n")) {
                    $val = '"' . str_replace('"', '""', (string) $val) . '"';
                }
                return $val;
            }, $columns);
            $output .= implode(',', $cells) . "\n";
        }

        $date = (new \DateTimeImmutable())->format('Ymd');
        $res->getBody()->write($output);

        return $res
            ->withHeader('Content-Type', 'text/csv')
            ->withHeader('Content-Disposition', "attachment; filename=\"{$filename}-{$date}.csv\"")
            ->withHeader('Cache-Control', 'no-cache');
    }
}
