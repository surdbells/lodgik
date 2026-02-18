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
 * Redis-based rate limiting.
 *
 * Rate limits are per-tenant and per-minute using a sliding window.
 * Default limits by tier:
 *   - starter:      60 req/min
 *   - professional: 120 req/min
 *   - business:     300 req/min
 *   - enterprise:   600 req/min
 *   - super_admin:  1000 req/min
 *
 * Adds standard rate limit headers to every response.
 */
final class RateLimitMiddleware implements MiddlewareInterface
{
    private const WINDOW_SECONDS = 60;

    private const TIER_LIMITS = [
        'starter' => 60,
        'professional' => 120,
        'business' => 300,
        'enterprise' => 600,
        'super_admin' => 1000,
    ];

    public function __construct(
        private readonly RedisClient $redis,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $role = $request->getAttribute('auth.role');

        // Skip rate limiting for unauthenticated routes (health, public plans, etc.)
        if ($tenantId === null && $role === null) {
            return $handler->handle($request);
        }

        // Determine rate limit based on role or tenant tier
        $limit = $this->getLimit($tenantId, $role);
        $key = $this->getKey($tenantId, $role, $request);
        $window = self::WINDOW_SECONDS;

        try {
            $current = $this->increment($key, $window);
        } catch (\Throwable) {
            // Redis down — allow the request but don't rate limit
            return $handler->handle($request);
        }

        $remaining = max(0, $limit - $current);

        // Rate limit exceeded
        if ($current > $limit) {
            return $this->tooManyRequests($limit, $remaining, $window);
        }

        // Add rate limit headers to response
        $response = $handler->handle($request);

        return $response
            ->withHeader('X-RateLimit-Limit', (string) $limit)
            ->withHeader('X-RateLimit-Remaining', (string) $remaining)
            ->withHeader('X-RateLimit-Reset', (string) $window);
    }

    private function getLimit(?string $tenantId, ?string $role): int
    {
        if ($role === 'super_admin') {
            return self::TIER_LIMITS['super_admin'];
        }

        if ($tenantId === null) {
            return self::TIER_LIMITS['starter'];
        }

        // Look up tenant tier from Redis cache
        try {
            $tier = $this->redis->get("tenant:{$tenantId}:tier");

            if ($tier !== null && isset(self::TIER_LIMITS[$tier])) {
                return self::TIER_LIMITS[$tier];
            }
        } catch (\Throwable) {
            // Fallback
        }

        return self::TIER_LIMITS['starter'];
    }

    private function getKey(?string $tenantId, ?string $role, Request $request): string
    {
        if ($role === 'super_admin') {
            $userId = $request->getAttribute('auth.user_id', 'unknown');
            return "ratelimit:admin:{$userId}";
        }

        return "ratelimit:tenant:{$tenantId}";
    }

    /**
     * Increment counter using Redis INCR + EXPIRE (sliding window approximation).
     */
    private function increment(string $key, int $window): int
    {
        $current = $this->redis->incr($key);

        // Set expiry on first request in window
        if ($current === 1) {
            $this->redis->expire($key, $window);
        }

        return $current;
    }

    private function tooManyRequests(int $limit, int $remaining, int $retryAfter): Response
    {
        $response = new SlimResponse();
        $body = json_encode([
            'success' => false,
            'message' => 'Rate limit exceeded. Please slow down.',
            'retry_after' => $retryAfter,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $response->getBody()->write($body);

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('X-RateLimit-Limit', (string) $limit)
            ->withHeader('X-RateLimit-Remaining', '0')
            ->withHeader('X-RateLimit-Reset', (string) $retryAfter)
            ->withHeader('Retry-After', (string) $retryAfter)
            ->withStatus(429);
    }
}
