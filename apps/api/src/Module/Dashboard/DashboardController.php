<?php

declare(strict_types=1);

namespace Lodgik\Module\Dashboard;

use Lodgik\Helper\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class DashboardController
{
    public function __construct(
        private readonly DashboardService $dashboardService,
        private readonly ResponseHelper $response,
    ) {}

    /** GET /api/dashboard/overview */
    public function overview(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $scope = $params['scope'] ?? null;

        // Cross-property aggregated view
        if ($scope === 'all_properties') {
            $tenantId = $request->getAttribute('auth.tenant_id');
            if (!$tenantId) {
                return $this->response->error($response, 'Tenant not found', 400);
            }
            $data = $this->dashboardService->getAggregatedOverview($tenantId);
            return $this->response->success($response, $data);
        }

        // Single property view
        $propertyId = $params['property_id'] ?? null;
        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Required']);
        }

        $data = $this->dashboardService->getOverview($propertyId);
        return $this->response->success($response, $data);
    }

    /** GET /api/dashboard/property-comparison */
    public function propertyComparison(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $days = (int) ($request->getQueryParams()['days'] ?? 30);
        $data = $this->dashboardService->getPropertyComparison($tenantId, $days);
        return $this->response->success($response, $data);
    }

    /** GET /api/dashboard/occupancy-trends */
    public function occupancyTrends(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $propertyId = $params['property_id'] ?? null;
        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Required']);
        }

        $days = (int) ($params['days'] ?? 30);
        $days = max(7, min($days, 365));

        $data = $this->dashboardService->getOccupancyTrends($propertyId, $days);
        return $this->response->success($response, $data);
    }

    /** GET /api/dashboard/revenue-breakdown */
    public function revenueBreakdown(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $propertyId = $params['property_id'] ?? null;
        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Required']);
        }

        $days = (int) ($params['days'] ?? 30);
        $data = $this->dashboardService->getRevenueBreakdown($propertyId, $days);
        return $this->response->success($response, $data);
    }

    /** GET /api/dashboard/activity-feed */
    public function activityFeed(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $propertyId = $params['property_id'] ?? null;
        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Required']);
        }

        $limit = min((int) ($params['limit'] ?? 20), 50);
        $data = $this->dashboardService->getActivityFeed($propertyId, $limit);
        return $this->response->success($response, $data);
    }

    /** POST /api/dashboard/generate-snapshot */
    public function generateSnapshot(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $propertyId = $body['property_id'] ?? null;
        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Required']);
        }

        $tenantId = $request->getAttribute('auth.tenant_id');
        $date = $body['date'] ?? null;

        try {
            $snapshot = $this->dashboardService->generateSnapshot($propertyId, $tenantId, $date);
            return $this->response->success($response, [
                'id' => $snapshot->getId(),
                'property_id' => $snapshot->getPropertyId(),
                'date' => $snapshot->getSnapshotDate()->format('Y-m-d'),
                'total_rooms' => $snapshot->getTotalRooms(),
                'rooms_sold' => $snapshot->getRoomsSold(),
                'occupancy_rate' => $snapshot->getOccupancyRate(),
                'total_revenue' => $snapshot->getTotalRevenue(),
                'adr' => $snapshot->getAdr(),
                'revpar' => $snapshot->getRevpar(),
                'check_ins' => $snapshot->getCheckIns(),
                'check_outs' => $snapshot->getCheckOuts(),
                'new_bookings' => $snapshot->getNewBookings(),
                'cancellations' => $snapshot->getCancellations(),
            ], 'Snapshot generated');
        } catch (\Exception $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }
    /** GET /api/dashboard/housekeeping-summary */
    public function housekeepingSummary(Request $request, Response $response): Response
    {
        $propertyId = $request->getQueryParams()['property_id'] ?? null;
        if (!$propertyId) {
            return $this->response->validationError($response, ['property_id' => 'Required']);
        }
        $data = $this->dashboardService->getHousekeepingSummary($propertyId);
        return $this->response->success($response, $data);
    }

    /** GET /api/dashboard/service-requests-summary */
    public function serviceRequestsSummary(Request $request, Response $response): Response
    {
        $propertyId = $request->getQueryParams()['property_id'] ?? null;
        if (!$propertyId) {
            return $this->response->validationError($response, ['property_id' => 'Required']);
        }
        $data = $this->dashboardService->getServiceRequestsSummary($propertyId);
        return $this->response->success($response, $data);
    }

    /** GET /api/dashboard/folio-summary */
    public function folioSummary(Request $request, Response $response): Response
    {
        $propertyId = $request->getQueryParams()['property_id'] ?? null;
        if (!$propertyId) {
            return $this->response->validationError($response, ['property_id' => 'Required']);
        }
        $data = $this->dashboardService->getFolioSummary($propertyId);
        return $this->response->success($response, $data);
    }

}