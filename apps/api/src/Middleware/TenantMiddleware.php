<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Doctrine\Listener\TenantListener;
use Lodgik\Module\Feature\FeatureService;
use Predis\Client as RedisClient;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;

/**
 * Enables Doctrine's TenantFilter using the tenant_id from the
 * authenticated request (set by AuthMiddleware).
 *
 * Must run AFTER AuthMiddleware so auth.tenant_id is available.
 *
 * This middleware:
 * 1. Enables TenantFilter → all SELECT queries auto-filter by tenant
 * 2. Sets TenantListener context → all INSERTs auto-set tenant_id
 * 3. Computes the tenant's EFFECTIVE module list via FeatureService
 *    (merges: tenant snapshot + live plan modules + core modules + overrides)
 *    and sets it on the request for FeatureMiddleware to consume.
 *
 * Previously this read the raw `enabled_modules` snapshot frozen at signup,
 * causing "feature not available" errors for any module added to a plan
 * after the tenant was created.
 */
final class TenantMiddleware implements MiddlewareInterface
{
    private const CACHE_TTL = 300; // 5 minutes — matches FeatureMiddleware

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantListener $tenantListener,
        private readonly FeatureService $featureService,
        private readonly RedisClient $redis,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');

        if ($tenantId === null || $tenantId === '') {
            // No tenant context — super_admin routes operate across tenants.
            return $handler->handle($request);
        }

        // Enable Doctrine TenantFilter for SELECT queries
        $this->em->getFilters()
            ->enable('tenant')
            ->setParameter('tenantId', $tenantId);

        // Set TenantListener context for INSERT operations
        $this->tenantListener->setCurrentTenantId($tenantId);

        // Compute the EFFECTIVE enabled modules and attach to request.
        // FeatureMiddleware reads auth.enabled_modules for its DB fallback path.
        $request = $request->withAttribute(
            'auth.enabled_modules',
            $this->resolveEnabledModules($tenantId),
        );

        return $handler->handle($request);
    }

    /**
     * Returns the fully-resolved module list for a tenant.
     *
     * Resolution order (all merged together):
     *   1. Core modules (always included — auth, booking_engine, room_management, etc.)
     *   2. Modules included in the tenant's current subscription plan (live, not snapshot)
     *   3. Tenant's own enabled_modules snapshot (handles manually-enabled extras)
     *   4. Per-tenant overrides (TenantFeatureModule rows — force-enable or force-disable)
     *
     * Result is cached in Redis for 5 minutes under key tenant:{id}:features
     * so FeatureMiddleware's Redis check also gets a warm cache on subsequent requests.
     *
     * @return string[]
     */
    private function resolveEnabledModules(string $tenantId): array
    {
        // 1. Try Redis cache (written below; also read by FeatureMiddleware directly)
        try {
            $cached = $this->redis->get("tenant:{$tenantId}:features");
            if ($cached !== null) {
                $decoded = json_decode($cached, true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        } catch (\Throwable) {
            // Redis unavailable — continue to DB resolution
        }

        // 2. Compute via FeatureService (authoritative source)
        try {
            $result   = $this->featureService->getTenantFeatures($tenantId);
            $modules  = $result['modules'] ?? [];

            // 3. Write result to Redis so FeatureMiddleware's cache check is warm
            try {
                $this->redis->setex(
                    "tenant:{$tenantId}:features",
                    self::CACHE_TTL,
                    json_encode($modules, JSON_UNESCAPED_SLASHES),
                );
            } catch (\Throwable) {
                // Non-critical
            }

            return $modules;
        } catch (\Throwable) {
            // FeatureService failed (e.g. tenant not found) — fail-open
            return [];
        }
    }
}
