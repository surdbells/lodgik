<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Lodgik\Entity\AuditLog;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Psr\Log\LoggerInterface;

/**
 * Automatically logs all write operations (POST, PATCH, PUT, DELETE) to audit_logs.
 * Captures: who did what, from where, and what changed.
 * Applied globally — no per-controller modification needed.
 */
final class AuditMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        $method = $request->getMethod();

        // Only audit write operations
        if (!in_array($method, ['POST', 'PATCH', 'PUT', 'DELETE'], true)) {
            return $handler->handle($request);
        }

        $path = $request->getUri()->getPath();

        // Skip non-API and high-frequency endpoints
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
            $this->logAudit($request, $method, $path, $response);
        } catch (\Throwable $e) {
            $this->logger->warning('AuditMiddleware failed: ' . $e->getMessage());
        }

        return $response;
    }

    private function logAudit(Request $request, string $method, string $path, Response $response): void
    {
        $userId = $request->getAttribute('auth.user_id');
        $tenantId = $request->getAttribute('auth.tenant_id');
        $userName = $request->getAttribute('auth.user_name');
        $propertyId = $request->getAttribute('auth.property_id');

        // Derive action and entity from the path
        $parsed = $this->parsePath($path, $method);

        $serverParams = $request->getServerParams();
        $ipAddress = $serverParams['REMOTE_ADDR']
            ?? $request->getHeaderLine('X-Forwarded-For')
            ?: null;
        $userAgent = $request->getHeaderLine('User-Agent') ?: null;

        // Sanitize body (remove passwords, tokens)
        $body = (array) ($request->getParsedBody() ?? []);
        $sanitized = $this->sanitizeBody($body);

        $log = new AuditLog(
            action: $parsed['action'],
            entityType: $parsed['entity_type'],
            entityId: $parsed['entity_id'],
            tenantId: $tenantId,
            userId: $userId,
            userName: $userName,
        );

        $description = $parsed['description'];
        if ($propertyId) {
            $description .= " [property:{$propertyId}]";
        }

        $log->setDescription($description)
            ->setNewValues(!empty($sanitized) ? $sanitized : null)
            ->setIpAddress($ipAddress)
            ->setUserAgent($userAgent);

        $this->em->persist($log);
        $this->em->flush();
    }

    private function parsePath(string $path, string $method): array
    {
        // Remove /api/ prefix and query params
        $clean = preg_replace('#^/api/#', '', $path);
        $segments = explode('/', $clean);

        // Map HTTP method to action verb
        $verb = match ($method) {
            'POST'   => 'create',
            'PATCH', 'PUT' => 'update',
            'DELETE' => 'delete',
            default  => $method,
        };

        // Extract module and entity info
        $module = $segments[0] ?? 'unknown';
        $entityId = null;
        $subAction = null;

        // Detect patterns like: bookings/{id}/check-in, staff/{id}/avatar
        if (count($segments) >= 3 && $this->isUuidLike($segments[1] ?? '')) {
            $entityId = $segments[1];
            $subAction = $segments[2] ?? null;
        } elseif (count($segments) >= 2 && $this->isUuidLike($segments[1] ?? '')) {
            $entityId = $segments[1];
        }

        // Build action name
        $action = $subAction ? "{$module}.{$subAction}" : "{$module}.{$verb}";
        // Normalize common patterns
        $action = str_replace('-', '_', $action);

        // Derive entity type
        $entityType = $this->moduleToEntity($module);

        return [
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => ucfirst($verb) . ' ' . $entityType . ($entityId ? " ({$entityId})" : ''),
        ];
    }

    private function moduleToEntity(string $module): string
    {
        return match ($module) {
            'bookings' => 'Booking',
            'rooms' => 'Room',
            'room-types' => 'RoomType',
            'folios' => 'Folio',
            'guests' => 'Guest',
            'staff' => 'User',
            'invoices' => 'Invoice',
            'expenses' => 'Expense',
            'housekeeping' => 'Housekeeping',
            'pos' => 'POS',
            'gym' => 'Gym',
            'night-audit' => 'NightAudit',
            'properties' => 'Property',
            'tenants' => 'Tenant',
            'auth' => 'Auth',
            'admin' => 'Admin',
            'settings' => 'Settings',
            'merchants' => 'Merchant',
            'subscriptions' => 'Subscription',
            'plans' => 'Plan',
            'features' => 'Feature',
            'notifications' => 'Notification',
            'attendance' => 'Attendance',
            'leave' => 'Leave',
            'payroll' => 'Payroll',
            'security' => 'Security',
            'audit-logs' => 'AuditLog',
            'employee', 'employees' => 'Employee',
            default => ucfirst($module),
        };
    }

    private function isUuidLike(string $s): bool
    {
        return (bool) preg_match('/^[a-f0-9\-]{8,36}$/i', $s);
    }

    private function sanitizeBody(array $body): array
    {
        $sensitive = ['password', 'password_hash', 'token', 'access_token', 'refresh_token',
            'secret', 'api_key', 'card_number', 'cvv', 'pin', 'image', '_avatarBase64'];

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
            '/api/dashboard',          // read-only
            '/api/analytics',
            '/api/audit-logs',          // prevent recursive audit of audit
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
