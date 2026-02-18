<?php

declare(strict_types=1);

namespace Lodgik\Module\AppDistribution;

use Lodgik\Helper\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AppDistributionController
{
    public function __construct(
        private readonly AppDistributionService $appService,
        private readonly ResponseHelper $response,
    ) {}

    // ─── Super Admin: Release Management ───────────────────────

    /**
     * GET /api/admin/releases
     */
    public function listReleases(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $result = $this->appService->listReleases(
            $params['app_type'] ?? null,
            max(1, (int) ($params['page'] ?? 1)),
            min(50, max(1, (int) ($params['limit'] ?? 20))),
        );

        $items = array_map(fn($r) => $this->serializeRelease($r), $result['items']);
        return $this->response->paginated($response, $items, $result['total'], $result['page'], $result['limit']);
    }

    /**
     * GET /api/admin/releases/{id}
     */
    public function showRelease(Request $request, Response $response, array $args): Response
    {
        try {
            $release = $this->appService->getRelease($args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 404);
        }
        return $this->response->success($response, $this->serializeRelease($release));
    }

    /**
     * POST /api/admin/releases
     */
    public function createRelease(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $userId = $request->getAttribute('auth.user_id');

        $errors = [];
        if (empty($body['app_type'])) $errors['app_type'] = 'Required';
        if (empty($body['version'])) $errors['version'] = 'Required';
        if (!empty($errors)) return $this->response->validationError($response, $errors);

        try {
            $release = $this->appService->createRelease($body, $userId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->created($response, $this->serializeRelease($release), 'Release created');
    }

    /**
     * PATCH /api/admin/releases/{id}
     */
    public function updateRelease(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        try {
            $release = $this->appService->updateRelease($args['id'], $body);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
        return $this->response->success($response, $this->serializeRelease($release), 'Release updated');
    }

    /**
     * POST /api/admin/releases/{id}/publish
     */
    public function publishRelease(Request $request, Response $response, array $args): Response
    {
        try {
            $release = $this->appService->publishRelease($args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
        return $this->response->success($response, $this->serializeRelease($release), 'Release published');
    }

    /**
     * POST /api/admin/releases/{id}/deprecate
     */
    public function deprecateRelease(Request $request, Response $response, array $args): Response
    {
        try {
            $release = $this->appService->deprecateRelease($args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
        return $this->response->success($response, $this->serializeRelease($release), 'Release deprecated');
    }

    /**
     * DELETE /api/admin/releases/{id}
     */
    public function deleteRelease(Request $request, Response $response, array $args): Response
    {
        try {
            $this->appService->deleteRelease($args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
        return $this->response->success($response, null, 'Release deleted');
    }

    /**
     * POST /api/admin/releases/{id}/signed-url
     */
    public function signedUrl(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        try {
            $data = $this->appService->generateSignedUrl($args['id'], (int) ($body['ttl'] ?? 3600));
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
        return $this->response->success($response, $data);
    }

    /**
     * GET /api/admin/apps/analytics
     */
    public function analytics(Request $request, Response $response): Response
    {
        $days = max(1, (int) ($request->getQueryParams()['days'] ?? 30));
        $data = $this->appService->getAnalytics($days);
        return $this->response->success($response, $data);
    }

    /**
     * GET /api/admin/apps/installations
     */
    public function installations(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $result = $this->appService->listInstallations(
            $params['app_type'] ?? null,
            max(1, (int) ($params['page'] ?? 1)),
        );

        $items = array_map(fn($c) => [
            'id' => $c->getId(),
            'tenant_id' => $c->getTenantId(),
            'app_type' => $c->getAppType(),
            'installed_version' => $c->getInstalledVersion(),
            'installed_build' => $c->getInstalledBuild(),
            'auto_update' => $c->getAutoUpdate(),
            'last_heartbeat' => $c->getLastHeartbeat()?->format('c'),
            'property_id' => $c->getPropertyId(),
        ], $result['items']);

        return $this->response->paginated($response, $items, $result['total'], $result['page'], $result['limit'] ?? 20);
    }

    // ─── Public: Downloads & Version Check ─────────────────────

    /**
     * GET /api/apps/latest
     * Get all latest published releases.
     */
    public function latestReleases(Request $request, Response $response): Response
    {
        $releases = $this->appService->getLatestReleases();
        $items = array_map(fn($r) => [
            'id' => $r->getId(),
            'app_type' => $r->getAppType(),
            'version' => $r->getVersion(),
            'build_number' => $r->getBuildNumber(),
            'release_notes' => $r->getReleaseNotes(),
            'file_size' => $r->getFileSize(),
            'is_mandatory' => $r->isMandatory(),
            'min_os_version' => $r->getMinOsVersion(),
            'published_at' => $r->getPublishedAt()?->format('c'),
        ], $releases);

        return $this->response->success($response, $items);
    }

    /**
     * POST /api/apps/version-check
     * Check if update available.
     */
    public function versionCheck(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        if (empty($body['app_type']) || empty($body['current_version'])) {
            return $this->response->validationError($response, [
                'app_type' => 'Required',
                'current_version' => 'Required',
            ]);
        }

        $data = $this->appService->checkVersion(
            $body['app_type'],
            $body['current_version'],
            (int) ($body['current_build'] ?? 0),
        );

        return $this->response->success($response, $data);
    }

    /**
     * GET /api/apps/download/{id}
     * Signed download endpoint.
     */
    public function download(Request $request, Response $response, array $args): Response
    {
        $params = $request->getQueryParams();
        $expires = (int) ($params['expires'] ?? 0);
        $signature = $params['signature'] ?? '';

        try {
            $file = $this->appService->processDownload(
                $args['id'],
                $expires,
                $signature,
                $request->getAttribute('auth.tenant_id'),
                $request->getAttribute('auth.user_id'),
                $request->getServerParams()['REMOTE_ADDR'] ?? null,
                $request->getHeaderLine('User-Agent') ?: null,
            );
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 403);
        }

        $response = $response
            ->withHeader('Content-Type', $file['mime_type'])
            ->withHeader('Content-Disposition', 'attachment; filename="' . $file['filename'] . '"')
            ->withHeader('Content-Length', (string) $file['size']);

        $response->getBody()->write($file['content']);
        return $response;
    }

    /**
     * POST /api/apps/heartbeat
     * App heartbeat from tenant device.
     */
    public function heartbeat(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $body = (array) ($request->getParsedBody() ?? []);

        if (empty($body['app_type'])) {
            return $this->response->validationError($response, ['app_type' => 'Required']);
        }

        $config = $this->appService->recordHeartbeat(
            $tenantId,
            $body['app_type'],
            $body['version'] ?? null,
            isset($body['build']) ? (int) $body['build'] : null,
            $body['device_info'] ?? null,
            $body['property_id'] ?? null,
        );

        // Also check for updates
        $update = null;
        if (!empty($body['version'])) {
            $update = $this->appService->checkVersion(
                $body['app_type'],
                $body['version'],
                (int) ($body['build'] ?? 0),
            );
        }

        return $this->response->success($response, [
            'acknowledged' => true,
            'auto_update' => $config->getAutoUpdate(),
            'update' => $update,
        ]);
    }

    private function serializeRelease(object $r): array
    {
        return [
            'id' => $r->getId(),
            'app_type' => $r->getAppType(),
            'version' => $r->getVersion(),
            'build_number' => $r->getBuildNumber(),
            'status' => $r->getStatus(),
            'is_latest' => $r->isLatest(),
            'is_mandatory' => $r->isMandatory(),
            'release_notes' => $r->getReleaseNotes(),
            'min_os_version' => $r->getMinOsVersion(),
            'file_size' => $r->getFileSize(),
            'checksum' => $r->getChecksum(),
            'download_count' => $r->getDownloadCount(),
            'published_at' => $r->getPublishedAt()?->format('c'),
            'created_at' => $r->getCreatedAt()?->format('c'),
        ];
    }
}
