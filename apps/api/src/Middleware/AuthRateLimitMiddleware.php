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
 * Auth-endpoint rate limiter.
 *
 * Applies strict per-IP and per-email sliding-window limits to sensitive
 * unauthenticated endpoints (forgot-password, verify-otp, login).
 *
 * Limits are enforced on TWO keys simultaneously:
 *   - IP key:    prevents volumetric attacks from a single IP
 *   - Email key: prevents distributed password/OTP spraying across IPs
 *
 * Limits per endpoint:
 *   /login          → 10 attempts / 15 min / IP
 *   /forgot-password → 3 requests / 10 min / IP  (prevents email flooding)
 *   /verify-otp     → 5 attempts / 15 min / IP  + 5 / 15 min / email
 *   /reset-password → 5 attempts / 15 min / IP
 */
final class AuthRateLimitMiddleware implements MiddlewareInterface
{
    private const RULES = [
        '/api/auth/login'            => ['ip_limit' => 10, 'window' => 900],
        '/api/auth/forgot-password'  => ['ip_limit' => 3,  'window' => 600],
        '/api/auth/verify-otp'       => ['ip_limit' => 5,  'window' => 900, 'email_limit' => 5],
        '/api/auth/reset-password'   => ['ip_limit' => 5,  'window' => 900],
    ];

    public function __construct(
        private readonly RedisClient $redis,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        $path = $request->getUri()->getPath();

        // Only apply to configured auth routes
        if (!isset(self::RULES[$path])) {
            return $handler->handle($request);
        }

        $rule   = self::RULES[$path];
        $ip     = $this->resolveIp($request);
        $window = $rule['window'];

        // ── IP-based limit ────────────────────────────────────────────────
        $ipKey   = "authlimit:ip:{$ip}:" . md5($path);
        $ipCount = $this->increment($ipKey, $window);

        if ($ipCount > $rule['ip_limit']) {
            return $this->tooManyRequests($window, "Too many requests from your IP. Try again later.");
        }

        // ── Email-based limit (where configured) ─────────────────────────
        if (isset($rule['email_limit'])) {
            $email = $this->extractEmail($request);
            if ($email !== null) {
                $emailKey   = "authlimit:email:" . md5($email) . ":" . md5($path);
                $emailCount = $this->increment($emailKey, $window);

                if ($emailCount > $rule['email_limit']) {
                    return $this->tooManyRequests($window, "Too many attempts for this account. Try again later.");
                }
            }
        }

        return $handler->handle($request);
    }

    /**
     * Resolve real client IP, respecting Cloudflare CF-Connecting-IP header.
     */
    private function resolveIp(Request $request): string
    {
        // Cloudflare passes the real client IP in CF-Connecting-IP
        $cf = $request->getHeaderLine('CF-Connecting-IP');
        if ($cf !== '') return $cf;

        // Standard forwarded-for (Nginx behind proxy)
        $xff = $request->getHeaderLine('X-Forwarded-For');
        if ($xff !== '') return trim(explode(',', $xff)[0]);

        // Direct connection
        $server = $request->getServerParams();
        return $server['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * Extract email from JSON body (parsed by JsonBodyParserMiddleware).
     * Returns null if not present — limit still applies on IP.
     */
    private function extractEmail(Request $request): ?string
    {
        $body = $request->getParsedBody();
        if (!is_array($body)) return null;
        $email = trim((string)($body['email'] ?? ''));
        return $email !== '' ? strtolower($email) : null;
    }

    /**
     * Atomic increment with TTL. Uses INCR + EXPIRE (set on first request).
     */
    private function increment(string $key, int $ttl): int
    {
        try {
            $count = $this->redis->incr($key);
            if ($count === 1) {
                $this->redis->expire($key, $ttl);
            }
            return $count;
        } catch (\Throwable) {
            // Redis unavailable — fail open (log in production via Sentry)
            return 0;
        }
    }

    private function tooManyRequests(int $retryAfter, string $message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode([
            'success'     => false,
            'message'     => $message,
            'retry_after' => $retryAfter,
        ], JSON_UNESCAPED_UNICODE));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Retry-After', (string) $retryAfter)
            ->withStatus(429);
    }
}
