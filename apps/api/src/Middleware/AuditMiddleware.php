<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Lodgik\Entity\AuditLog;
use Lodgik\Entity\User;
use Lodgik\Service\JwtService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Psr\Log\LoggerInterface;

/**
 * Automatically logs all write operations (POST, PATCH, PUT, DELETE) to audit_logs.
 *
 * WHY WE DECODE JWT HERE:
 *   This middleware is registered globally via $app->add(). In Slim 4 with PSR-7
 *   (immutable requests), inner middleware (AuthMiddleware, route middleware) sets
 *   attributes via $request->withAttribute() on a NEW request object. The global
 *   middleware still holds the ORIGINAL request with no auth attributes set.
 *   We decode the Bearer token directly so we can reliably capture tenant_id,
 *   user_id, and property_id regardless of execution order.
 */
final class AuditMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
        private readonly JwtService $jwt,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        $method = $request->getMethod();

        // Only audit write operations
        if (!in_array($method, ['POST', 'PATCH', 'PUT', 'DELETE'], true)) {
            return $handler->handle($request);
        }

        $path = $request->getUri()->getPath();

        // Skip non-API and high-frequency / excluded endpoints
        if (!str_starts_with($path, '/api/') || $this->isExcluded($path)) {
            return $handler->handle($request);
        }

        // Execute the handler first
        $response = $handler->handle($request);

        // Only log successful operations (2xx)
        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            return $response;
        }

        try {
            $this->logAudit($request, $method, $path);
        } catch (\Throwable $e) {
            $this->logger->warning('AuditMiddleware failed: ' . $e->getMessage());
        }

        return $response;
    }

    private function logAudit(Request $request, string $method, string $path): void
    {
        // ── Decode auth directly from the Authorization header ──────────
        // We cannot rely on $request->getAttribute('auth.*') because this global
        // middleware holds the original (pre-auth-enrichment) request object.
        $claims     = $this->extractClaimsFromRequest($request);
        $userId     = $claims['user_id']    ?? null;
        $tenantId   = $claims['tenant_id']  ?? null;
        $propertyId = $claims['property_id'] ?? null;
        $userName   = null;

        // Fetch user's display name from DB (cached for this request only)
        if ($userId) {
            try {
                $user = $this->em->find(User::class, $userId);
                $userName = $user?->getFullName();
            } catch (\Throwable) {
                // Non-fatal — log without name
            }
        }

        // ── Derive action and entity from the URL path ──────────────────
        $parsed = $this->parsePath($path, $method);

        // ── Capture client info ─────────────────────────────────────────
        $serverParams = $request->getServerParams();
        $ipRaw = $serverParams['HTTP_X_FORWARDED_FOR']
            ?? $serverParams['REMOTE_ADDR']
            ?? $request->getHeaderLine('X-Forwarded-For')
            ?: null;
        // Take first IP if comma-separated (CDN/proxy list)
        $ipAddress = $ipRaw ? trim(explode(',', $ipRaw)[0]) : null;
        $userAgent = $request->getHeaderLine('User-Agent') ?: null;

        // ── Sanitize request body ───────────────────────────────────────
        $body      = (array) ($request->getParsedBody() ?? []);
        $sanitized = $this->sanitizeBody($body);

        // ── Build description ───────────────────────────────────────────
        $verb = match ($method) {
            'POST'   => 'create',
            'PATCH', 'PUT' => 'update',
            'DELETE' => 'delete',
            default  => strtolower($method),
        };
        $description = ucfirst($verb) . ' ' . $parsed['entity_type']
            . ($parsed['entity_id'] ? " ({$parsed['entity_id']})" : '');
        if ($propertyId) {
            $description .= " [property:{$propertyId}]";
        }

        // ── Persist ─────────────────────────────────────────────────────
        $log = new AuditLog(
            action:     $parsed['action'],
            entityType: $parsed['entity_type'],
            entityId:   $parsed['entity_id'],
            tenantId:   $tenantId,
            userId:     $userId,
            userName:   $userName,
        );

        $log->setDescription($description)
            ->setNewValues(!empty($sanitized) ? $sanitized : null)
            ->setIpAddress($ipAddress)
            ->setUserAgent($userAgent);

        $this->em->persist($log);
        $this->em->flush();
    }

    // ─── JWT decoding ─────────────────────────────────────────────────

    private function extractClaimsFromRequest(Request $request): array
    {
        $auth = $request->getHeaderLine('Authorization');
        if (!str_starts_with($auth, 'Bearer ')) {
            return [];
        }

        $token = substr($auth, 7);

        try {
            $decoded = $this->jwt->decodeUnsafe($token);
            return [
                'user_id'     => $decoded['sub']         ?? null,
                'tenant_id'   => $decoded['tenant_id']   ?? null,
                'property_id' => $decoded['property_id'] ?? null,
                'role'        => $decoded['role']         ?? null,
            ];
        } catch (\Throwable) {
            return [];
        }
    }

    // ─── Path parsing ─────────────────────────────────────────────────

    private function parsePath(string $path, string $method): array
    {
        $clean    = preg_replace('#^/api/#', '', $path);
        $segments = explode('/', $clean);

        $verb   = match ($method) {
            'POST'   => 'create',
            'PATCH', 'PUT' => 'update',
            'DELETE' => 'delete',
            default  => $method,
        };

        $module    = $segments[0] ?? 'unknown';
        $entityId  = null;
        $subAction = null;

        if (count($segments) >= 3 && $this->isUuidLike($segments[1] ?? '')) {
            $entityId  = $segments[1];
            $subAction = $segments[2] ?? null;
        } elseif (count($segments) >= 2 && $this->isUuidLike($segments[1] ?? '')) {
            $entityId = $segments[1];
        }

        $action = $subAction ? "{$module}.{$subAction}" : "{$module}.{$verb}";
        $action = str_replace('-', '_', $action);

        return [
            'action'      => $action,
            'entity_type' => $this->moduleToEntity($module),
            'entity_id'   => $entityId,
        ];
    }

    private function moduleToEntity(string $module): string
    {
        return match ($module) {
            'bookings'     => 'Booking',
            'rooms'        => 'Room',
            'room-types'   => 'RoomType',
            'folios'       => 'Folio',
            'guests'       => 'Guest',
            'staff'        => 'User',
            'invoices'     => 'Invoice',
            'expenses'     => 'Expense',
            'housekeeping' => 'Housekeeping',
            'pos'          => 'POS',
            'gym'          => 'Gym',
            'night-audit'  => 'NightAudit',
            'properties'   => 'Property',
            'tenants'      => 'Tenant',
            'auth'         => 'Auth',
            'admin'        => 'Admin',
            'settings'     => 'Settings',
            'merchants'    => 'Merchant',
            'subscriptions'=> 'Subscription',
            'plans'        => 'Plan',
            'features'     => 'Feature',
            'notifications'=> 'Notification',
            'attendance'   => 'Attendance',
            'leave'        => 'Leave',
            'payroll'      => 'Payroll',
            'security'     => 'Security',
            'audit-logs'   => 'AuditLog',
            'employee', 'employees' => 'Employee',
            default        => ucfirst($module),
        };
    }

    private function isUuidLike(string $s): bool
    {
        return (bool) preg_match('/^[a-f0-9\-]{8,36}$/i', $s);
    }

    private function sanitizeBody(array $body): array
    {
        $sensitive = [
            'password', 'password_hash', 'token', 'access_token', 'refresh_token',
            'secret', 'api_key', 'card_number', 'cvv', 'pin', 'image', '_avatarBase64',
        ];

        $clean = [];
        foreach ($body as $key => $value) {
            if (in_array(strtolower($key), $sensitive, true)) {
                $clean[$key] = '***REDACTED***';
            } elseif (is_string($value) && strlen($value) > 500) {
                $clean[$key] = substr($value, 0, 100) . '…[truncated]';
            } elseif (is_array($value)) {
                $clean[$key] = $this->sanitizeBody($value);
            } else {
                $clean[$key] = $value;
            }
        }
        return $clean;
    }

    private function isExcluded(string $path): bool
    {
        $excluded = [
            '/api/health',
            '/api/dashboard',
            '/api/analytics',
            '/api/audit-logs',       // prevent recursive self-audit
            '/api/admin/audit-logs',
            '/api/admin/dashboard',
            '/api/admin/analytics',
        ];

        foreach ($excluded as $prefix) {
            if (str_starts_with($path, $prefix)) return true;
        }

        return false;
    }
}
