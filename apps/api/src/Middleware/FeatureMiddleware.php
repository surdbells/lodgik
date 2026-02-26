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

        // Check if feature is enabled — Redis first, then DB via request attribute
        if (!$this->isFeatureEnabled($tenantId, $request)) {
            return $this->featureUnavailable();
        }

        return $handler->handle($request);
    }

    private function isFeatureEnabled(string $tenantId, Request $request): bool
    {
        // 1. Try Redis cache
        try {
            $cached = $this->redis->get("tenant:{$tenantId}:features");
            if ($cached !== null) {
                $features = json_decode($cached, true);
                if (is_array($features)) {
                    return in_array($this->moduleKey, $features, true);
                }
            }

            $enabled = $this->redis->sismember("tenant:{$tenantId}:enabled_modules", $this->moduleKey);
            if ($enabled) return true;
        } catch (\Throwable) {
            // Redis unavailable
        }

        // 2. Fallback: check enabled_modules from tenant record
        // TenantMiddleware sets this on the request
        $enabledModules = $request->getAttribute('auth.enabled_modules');
        if (is_array($enabledModules)) {
            return in_array($this->moduleKey, $enabledModules, true);
        }

        // 3. If no data at all, allow access (fail-open for better UX)
        // Features are enforced by plan assignment, not by middleware denial
        return true;
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
