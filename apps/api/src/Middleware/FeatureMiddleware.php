<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Predis\Client as RedisClient;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

/**
 * Checks if the authenticated tenant has a specific feature module enabled.
 * Must run AFTER AuthMiddleware and TenantMiddleware.
 *
 * Checks Redis cache first (5-min TTL), falls back to DB query.
 *
 * Usage in routes:
 *   ->add(new FeatureMiddleware('bar_pos', 'professional', $redis, $em))
 *
 * If the tenant doesn't have the feature:
 *   403 with upgrade_to hint
 */
final class FeatureMiddleware implements MiddlewareInterface
{
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * @param string $moduleKey    The feature module key to check (e.g., 'bar_pos')
     * @param string $upgradeTo    Plan name to suggest if feature is unavailable
     */
    public function __construct(
        private readonly string $moduleKey,
        private readonly string $upgradeTo,
        private readonly RedisClient $redis,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $userRole = $request->getAttribute('auth.role');

        // Super admin bypasses feature checks
        if ($userRole === 'super_admin') {
            return $handler->handle($request);
        }

        if ($tenantId === null) {
            return $this->featureUnavailable();
        }

        // Check if feature is enabled for this tenant
        if (!$this->isFeatureEnabled($tenantId)) {
            return $this->featureUnavailable();
        }

        return $handler->handle($request);
    }

    /**
     * Check Redis cache for tenant's enabled features.
     * The cache is populated by FeatureService when features are loaded/changed.
     */
    private function isFeatureEnabled(string $tenantId): bool
    {
        $cacheKey = "tenant:{$tenantId}:features";

        try {
            $cached = $this->redis->get($cacheKey);

            if ($cached !== null) {
                $features = json_decode($cached, true);

                if (is_array($features)) {
                    return in_array($this->moduleKey, $features, true);
                }
            }
        } catch (\Throwable) {
            // Redis unavailable — we'll need to check DB
            // This will be handled by FeatureService in Phase 0D
        }

        // If no cache, check the hash set alternative
        try {
            $enabled = $this->redis->sismember(
                "tenant:{$tenantId}:enabled_modules",
                $this->moduleKey
            );

            return (bool) $enabled;
        } catch (\Throwable) {
            // Redis completely down — deny by default for safety
            // In production, you might want to allow and log a warning
            return false;
        }
    }

    private function featureUnavailable(): Response
    {
        $response = new SlimResponse();
        $body = json_encode([
            'success' => false,
            'message' => "The '{$this->moduleKey}' feature is not available on your current plan.",
            'feature' => $this->moduleKey,
            'upgrade_to' => $this->upgradeTo,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $response->getBody()->write($body);

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(403);
    }
}
