<?php

declare(strict_types=1);

namespace Lodgik\Module\Usage;

use Lodgik\Helper\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class UsageController
{
    public function __construct(
        private readonly UsageService $usageService,
        private readonly ResponseHelper $response,
    ) {}

    /**
     * GET /api/usage/current
     */
    public function current(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $usage = $this->usageService->getCurrentUsage($tenantId);
        return $this->response->success($response, $usage);
    }

    /**
     * GET /api/usage/history?days=30
     */
    public function history(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $params = $request->getQueryParams();
        $days = max(1, min(365, (int) ($params['days'] ?? 30)));

        $history = $this->usageService->getHistory($tenantId, $days);
        return $this->response->success($response, $history);
    }

    /**
     * GET /api/usage/limits
     */
    public function limits(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $limits = $this->usageService->getLimits($tenantId);
        return $this->response->success($response, $limits);
    }

    /**
     * POST /api/usage/snapshot (super admin or cron)
     * Record a daily usage snapshot for a tenant.
     */
    public function recordSnapshot(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $tenantId = $body['tenant_id'] ?? null;

        if (empty($tenantId)) {
            return $this->response->validationError($response, ['tenant_id' => 'Required']);
        }

        try {
            $metric = $this->usageService->recordDailySnapshot($tenantId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, [
            'date' => $metric->getRecordedDate()->format('Y-m-d'),
            'rooms' => ['used' => $metric->getRoomsUsed(), 'limit' => $metric->getRoomsLimit()],
            'staff' => ['used' => $metric->getStaffUsed(), 'limit' => $metric->getStaffLimit()],
            'properties' => ['used' => $metric->getPropertiesUsed(), 'limit' => $metric->getPropertiesLimit()],
        ], 'Snapshot recorded');
    }
}
