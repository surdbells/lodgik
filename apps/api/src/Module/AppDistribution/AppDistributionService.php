<?php

declare(strict_types=1);

namespace Lodgik\Module\AppDistribution;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\AppDownloadLog;
use Lodgik\Entity\AppRelease;
use Lodgik\Entity\TenantAppConfig;
use Lodgik\Service\FileStorageService;

final class AppDistributionService
{
    /** HMAC key for signed URLs (from env or fallback). */
    private string $signingKey;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly FileStorageService $fileStorage,
    ) {
        $this->signingKey = $_ENV['DOWNLOAD_SIGNING_KEY'] ?? 'lodgik-download-secret-2026';
    }

    // ─── Release Management (Super Admin) ──────────────────────

    /**
     * Create a new app release.
     */
    public function createRelease(array $data, ?string $uploadedBy = null): AppRelease
    {
        $appType = $data['app_type'];
        if (!in_array($appType, AppRelease::validAppTypes(), true)) {
            throw new \RuntimeException("Invalid app type: {$appType}");
        }

        // Check version uniqueness for this app type
        $existing = $this->em->getRepository(AppRelease::class)
            ->findOneBy(['appType' => $appType, 'version' => $data['version']]);
        if ($existing) {
            throw new \RuntimeException("Version {$data['version']} already exists for {$appType}");
        }

        $release = new AppRelease($appType, $data['version'], (int) ($data['build_number'] ?? 1));
        $release->setReleaseNotes($data['release_notes'] ?? null);
        $release->setMinOsVersion($data['min_os_version'] ?? null);
        $release->setIsMandatory((bool) ($data['is_mandatory'] ?? false));
        $release->setUploadedBy($uploadedBy);

        // Handle file upload (base64)
        if (!empty($data['file_base64'])) {
            $ext = AppRelease::extensionForType($appType);
            $filename = "{$appType}_v{$data['version']}.{$ext}";
            $result = $this->fileStorage->storeBase64(
                $data['file_base64'],
                "releases/{$appType}",
                $filename,
            );
            $release->setFilePath($result['path']);
            $release->setFileSize($result['size']);
            $release->setMimeType($data['mime_type'] ?? $this->guessMimeType($appType));

            // Compute checksum
            $content = $this->fileStorage->read($result['path']);
            $release->setChecksum(hash('sha256', $content));
        }

        $this->em->persist($release);
        $this->em->flush();

        return $release;
    }

    /**
     * Update a release.
     */
    public function updateRelease(string $id, array $data): AppRelease
    {
        $release = $this->em->find(AppRelease::class, $id);
        if (!$release) throw new \RuntimeException('Release not found');

        if (isset($data['release_notes'])) $release->setReleaseNotes($data['release_notes']);
        if (isset($data['min_os_version'])) $release->setMinOsVersion($data['min_os_version']);
        if (isset($data['is_mandatory'])) $release->setIsMandatory((bool) $data['is_mandatory']);

        $this->em->flush();
        return $release;
    }

    /**
     * Publish a release (set as latest for its app type).
     */
    public function publishRelease(string $id): AppRelease
    {
        $release = $this->em->find(AppRelease::class, $id);
        if (!$release) throw new \RuntimeException('Release not found');

        // Unset previous latest for this type
        $previousLatest = $this->em->getRepository(AppRelease::class)
            ->findBy(['appType' => $release->getAppType(), 'isLatest' => true]);
        foreach ($previousLatest as $prev) {
            $prev->setIsLatest(false);
        }

        $release->publish();
        $release->setIsLatest(true);
        $this->em->flush();

        return $release;
    }

    /**
     * Deprecate a release.
     */
    public function deprecateRelease(string $id): AppRelease
    {
        $release = $this->em->find(AppRelease::class, $id);
        if (!$release) throw new \RuntimeException('Release not found');
        $release->deprecate();
        $this->em->flush();
        return $release;
    }

    /**
     * Delete a release.
     */
    public function deleteRelease(string $id): void
    {
        $release = $this->em->find(AppRelease::class, $id);
        if (!$release) throw new \RuntimeException('Release not found');

        if ($release->getFilePath()) {
            $this->fileStorage->delete($release->getFilePath());
        }

        $release->softDelete();
        $release->setIsLatest(false);
        $this->em->flush();
    }

    /**
     * List releases, optionally filtered by app type.
     */
    public function listReleases(?string $appType = null, int $page = 1, int $limit = 20): array
    {
        $qb = $this->em->getRepository(AppRelease::class)->createQueryBuilder('r')
            ->where('r.deletedAt IS NULL');

        if ($appType) {
            $qb->andWhere('r.appType = :type')->setParameter('type', $appType);
        }

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(r.id)')->getQuery()->getSingleScalarResult();

        $items = $qb->orderBy('r.appType', 'ASC')
            ->addOrderBy('r.buildNumber', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()->getResult();

        return ['items' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit];
    }

    /**
     * Get a single release.
     */
    public function getRelease(string $id): AppRelease
    {
        $release = $this->em->find(AppRelease::class, $id);
        if (!$release || $release->getDeletedAt()) throw new \RuntimeException('Release not found');
        return $release;
    }

    // ─── Download ──────────────────────────────────────────────

    /**
     * Generate a signed download URL for a release.
     */
    public function generateSignedUrl(string $releaseId, int $ttlSeconds = 3600): array
    {
        $release = $this->getRelease($releaseId);
        if (!$release->getFilePath()) {
            throw new \RuntimeException('No file associated with this release');
        }

        $expires = time() + $ttlSeconds;
        $payload = "{$releaseId}:{$expires}";
        $signature = hash_hmac('sha256', $payload, $this->signingKey);

        $baseUrl = $_ENV['APP_URL'] ?? 'https://api.lodgik.com';
        $url = "{$baseUrl}/api/apps/download/{$releaseId}?expires={$expires}&signature={$signature}";

        return [
            'url' => $url,
            'expires_at' => (new \DateTimeImmutable("@{$expires}"))->format('c'),
            'checksum' => $release->getChecksum(),
            'file_size' => $release->getFileSize(),
        ];
    }

    /**
     * Validate a signed download URL and return the file content.
     */
    public function processDownload(
        string $releaseId,
        int $expires,
        string $signature,
        ?string $tenantId = null,
        ?string $userId = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
    ): array {
        // Verify signature
        $payload = "{$releaseId}:{$expires}";
        $expected = hash_hmac('sha256', $payload, $this->signingKey);
        if (!hash_equals($expected, $signature)) {
            throw new \RuntimeException('Invalid download signature');
        }
        if (time() > $expires) {
            throw new \RuntimeException('Download link has expired');
        }

        $release = $this->getRelease($releaseId);
        if (!$release->getFilePath()) {
            throw new \RuntimeException('No file available');
        }

        // Log download
        $log = new AppDownloadLog($releaseId, $release->getAppType(), $release->getVersion());
        $log->setTenantId($tenantId);
        $log->setUserId($userId);
        $log->setIpAddress($ipAddress);
        $log->setUserAgent($userAgent);
        $this->em->persist($log);

        $release->incrementDownloadCount();
        $this->em->flush();

        $content = $this->fileStorage->read($release->getFilePath());

        return [
            'content' => $content,
            'filename' => basename($release->getFilePath()),
            'mime_type' => $release->getMimeType() ?? 'application/octet-stream',
            'size' => $release->getFileSize(),
        ];
    }

    // ─── Version Check (Auto-update) ──────────────────────────

    /**
     * Check if an update is available.
     */
    public function checkVersion(string $appType, string $currentVersion, int $currentBuild = 0): array
    {
        $latest = $this->em->getRepository(AppRelease::class)
            ->findOneBy(['appType' => $appType, 'isLatest' => true, 'status' => 'published']);

        if (!$latest) {
            return ['update_available' => false, 'message' => 'No published release found'];
        }

        $updateAvailable = $latest->getBuildNumber() > $currentBuild
            || version_compare($latest->getVersion(), $currentVersion, '>');

        return [
            'update_available' => $updateAvailable,
            'is_mandatory' => $updateAvailable && $latest->isMandatory(),
            'latest_version' => $latest->getVersion(),
            'latest_build' => $latest->getBuildNumber(),
            'current_version' => $currentVersion,
            'current_build' => $currentBuild,
            'release_notes' => $updateAvailable ? $latest->getReleaseNotes() : null,
            'min_os_version' => $latest->getMinOsVersion(),
            'download_size' => $latest->getFileSize(),
            'release_id' => $updateAvailable ? $latest->getId() : null,
        ];
    }

    // ─── Heartbeat ─────────────────────────────────────────────

    /**
     * Record app heartbeat from a tenant device.
     */
    public function recordHeartbeat(
        string $tenantId,
        string $appType,
        ?string $version = null,
        ?int $build = null,
        ?array $deviceInfo = null,
        ?string $propertyId = null,
    ): TenantAppConfig {
        $config = $this->em->getRepository(TenantAppConfig::class)
            ->findOneBy(['tenantId' => $tenantId, 'appType' => $appType]);

        if (!$config) {
            $config = new TenantAppConfig($tenantId, $appType);
            $this->em->persist($config);
        }

        $config->recordHeartbeat($version, $build, $deviceInfo);
        if ($propertyId) $config->setPropertyId($propertyId);

        $this->em->flush();
        return $config;
    }

    // ─── Analytics (Super Admin) ───────────────────────────────

    /**
     * Download analytics summary.
     */
    public function getAnalytics(int $days = 30): array
    {
        $conn = $this->em->getConnection();
        $since = (new \DateTimeImmutable("-{$days} days"))->format('Y-m-d H:i:s');

        // Total downloads by app type
        $byType = $conn->fetchAllAssociative(
            "SELECT app_type, COUNT(*) as downloads FROM app_download_logs WHERE downloaded_at >= ? GROUP BY app_type ORDER BY downloads DESC",
            [$since]
        );

        // Total downloads
        $total = (int) $conn->fetchOne(
            "SELECT COUNT(*) FROM app_download_logs WHERE downloaded_at >= ?",
            [$since]
        );

        // Active installations (heartbeat in last 7 days)
        $activeInstalls = (int) $conn->fetchOne(
            "SELECT COUNT(*) FROM tenant_app_configs WHERE last_heartbeat >= ?",
            [(new \DateTimeImmutable('-7 days'))->format('Y-m-d H:i:s')]
        );

        // Latest versions by app type
        $latestVersions = $conn->fetchAllAssociative(
            "SELECT app_type, version, build_number, download_count, status FROM app_releases WHERE is_latest = true AND deleted_at IS NULL ORDER BY app_type"
        );

        // Downloads per day (last N days)
        $dailyDownloads = $conn->fetchAllAssociative(
            "SELECT DATE(downloaded_at) as day, COUNT(*) as downloads FROM app_download_logs WHERE downloaded_at >= ? GROUP BY DATE(downloaded_at) ORDER BY day",
            [$since]
        );

        return [
            'period_days' => $days,
            'total_downloads' => $total,
            'active_installations' => $activeInstalls,
            'by_app_type' => $byType,
            'latest_versions' => $latestVersions,
            'daily_downloads' => $dailyDownloads,
        ];
    }

    /**
     * Get all tenant app configs (active installations).
     */
    public function listInstallations(?string $appType = null, int $page = 1, int $limit = 20): array
    {
        $qb = $this->em->getRepository(TenantAppConfig::class)->createQueryBuilder('c');
        if ($appType) {
            $qb->where('c.appType = :type')->setParameter('type', $appType);
        }

        $total = (int) (clone $qb)->select('COUNT(c.id)')->getQuery()->getSingleScalarResult();
        $items = $qb->orderBy('c.lastHeartbeat', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()->getResult();

        return ['items' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit];
    }

    // ─── Public: Latest releases for download page ─────────────

    /**
     * Get latest published releases for all app types.
     */
    public function getLatestReleases(): array
    {
        return $this->em->getRepository(AppRelease::class)
            ->findBy(['isLatest' => true, 'status' => 'published'], ['appType' => 'ASC']);
    }

    private function guessMimeType(string $appType): string
    {
        return match($appType) {
            'android' => 'application/vnd.android.package-archive',
            'ios' => 'application/octet-stream',
            'windows' => 'application/x-msdownload',
            'macos' => 'application/x-apple-diskimage',
            'linux' => 'application/x-executable',
            default => 'application/octet-stream',
        };
    }
}
