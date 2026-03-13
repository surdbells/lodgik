<?php
declare(strict_types=1);

namespace Lodgik\Middleware;

use Lodgik\Module\Rbac\RbacRepository;
use Lodgik\Module\Rbac\RbacService;
use Predis\Client as RedisClient;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

/**
 * PermissionMiddleware
 *
 * Enforces RBAC permission checks on hotel API endpoints.
 *
 * Two usage modes:
 *
 * 1. Specific permission check (opt-in decorator on a route):
 *    ->add(new PermissionMiddleware('bookings.cancel'))
 *
 * 2. Global "register route → permission" map (applied as app-level middleware):
 *    Automatically resolves required permission from METHOD + route pattern.
 *
 * Bypass: super_admin and property_admin always pass.
 * Fallback: if no override exists for (property, role, permission), uses system default.
 * Redis cache: permission sets cached for 60s per (property_id + role).
 */
final class PermissionMiddleware implements MiddlewareInterface
{
    /**
     * Maps "METHOD /route/pattern" → "module.action"
     *
     * Used when the middleware is applied globally (no $requiredPermission constructor arg).
     * Key format: "{METHOD} {path_prefix}" — longest prefix match wins.
     */
    private const ROUTE_PERMISSION_MAP = [
        // ── Bookings ────────────────────────────────────
        'GET /api/bookings'                         => 'bookings.view',
        'POST /api/bookings'                        => 'bookings.create',
        'PUT /api/bookings'                         => 'bookings.edit',
        'PATCH /api/bookings'                       => 'bookings.edit',
        'DELETE /api/bookings'                      => 'bookings.cancel',
        'POST /api/bookings/*/check-in'             => 'bookings.check_in',
        'POST /api/bookings/*/check-out'            => 'bookings.check_out',
        'POST /api/bookings/*/cancel'               => 'bookings.cancel',
        'POST /api/bookings/*/extend'               => 'bookings.extend_stay',
        'POST /api/bookings/search'                 => 'bookings.view',
        'GET /api/bookings/search'                  => 'bookings.view',
        'GET /api/group-bookings'                   => 'bookings.manage_group',
        'POST /api/group-bookings'                  => 'bookings.manage_group',
        'PUT /api/group-bookings'                   => 'bookings.manage_group',
        'PATCH /api/group-bookings'                 => 'bookings.manage_group',

        // ── Rooms ────────────────────────────────────────
        'GET /api/rooms'                            => 'rooms.view',
        'POST /api/rooms'                           => 'rooms.manage_types',
        'PUT /api/rooms'                            => 'rooms.manage_types',
        'DELETE /api/rooms'                         => 'rooms.manage_types',
        'GET /api/room-types'                       => 'rooms.view',
        'POST /api/room-types'                      => 'rooms.manage_types',
        'PUT /api/room-types'                       => 'rooms.manage_types',
        'DELETE /api/room-types'                    => 'rooms.manage_types',
        'PATCH /api/rooms/*/status'                 => 'rooms.edit_status',
        'POST /api/rooms/*/block'                   => 'rooms.block_room',

        // ── Guests ───────────────────────────────────────
        'GET /api/guests'                           => 'guests.view',
        'POST /api/guests'                          => 'guests.create',
        'PUT /api/guests'                           => 'guests.edit',
        'PATCH /api/guests'                         => 'guests.edit',
        'DELETE /api/guests'                        => 'guests.delete',
        'GET /api/guests/*/documents'               => 'guests.view_id_documents',
        'POST /api/guests/*/documents'              => 'guests.upload_id_documents',
        'GET /api/guests/*/intelligence'            => 'guests.view_intelligence',

        // ── Folios ───────────────────────────────────────
        'GET /api/folios'                           => 'folios.view',
        'POST /api/folios'                          => 'folios.view',
        'GET /api/folios/search'                    => 'folios.view',
        'POST /api/folios/*/charges'                => 'folios.add_charge',
        'PUT /api/folios/*/charges'                 => 'folios.edit_charge',
        'PATCH /api/folios/*/charges'               => 'folios.edit_charge',
        'DELETE /api/folios/*/charges'              => 'folios.delete_charge',
        'POST /api/folios/*/payments'               => 'folios.add_payment',
        'POST /api/folios/*/discount'               => 'folios.apply_discount',
        'POST /api/folios/*/adjustments'            => 'folios.add_adjustment',
        'POST /api/folios/*/close'                  => 'folios.close',
        'POST /api/folios/*/reopen'                 => 'folios.reopen',

        // ── Invoices ─────────────────────────────────────
        'GET /api/invoices'                         => 'invoices.view',
        'POST /api/invoices'                        => 'invoices.create',
        'POST /api/invoices/*/email'                => 'invoices.email',
        'GET /api/invoices/*/pdf'                   => 'invoices.download_pdf',
        'POST /api/invoices/*/pay'                  => 'invoices.record_payment',
        'POST /api/invoices/*/void'                 => 'invoices.void',

        // ── Housekeeping ─────────────────────────────────
        'GET /api/housekeeping'                     => 'housekeeping.view_tasks',
        'POST /api/housekeeping/*/assign'           => 'housekeeping.assign_tasks',
        'POST /api/housekeeping/*/complete'         => 'housekeeping.mark_complete',
        'POST /api/housekeeping/*/inspect'          => 'housekeeping.mark_inspected',
        'GET /api/housekeeping/lost-found'          => 'housekeeping.view_lost_found',
        'POST /api/housekeeping/lost-found'         => 'housekeeping.report_lost_found',
        'GET /api/consumables'                      => 'housekeeping.view_consumables',
        'POST /api/consumables'                     => 'housekeeping.manage_consumables',
        'PUT /api/consumables'                      => 'housekeeping.manage_consumables',

        // ── Staff / HR ───────────────────────────────────
        'GET /api/staff'                            => 'staff.view',
        'POST /api/staff/invite'                    => 'staff.invite',
        'PUT /api/staff'                            => 'staff.edit',
        'PATCH /api/staff'                          => 'staff.edit',
        'POST /api/staff/*/deactivate'              => 'staff.deactivate',
        'GET /api/attendance'                       => 'staff.view_clock_records',
        'GET /api/shifts'                           => 'staff.view',
        'POST /api/shifts'                          => 'staff.manage_shifts',
        'PUT /api/shifts'                           => 'staff.manage_shifts',
        'GET /api/leave'                            => 'staff.view_leave',
        'POST /api/leave/*/approve'                 => 'staff.approve_leave',
        'POST /api/leave/*/reject'                  => 'staff.approve_leave',
        'GET /api/employees'                        => 'staff.view',

        // ── Payroll ──────────────────────────────────────
        'GET /api/payroll'                          => 'payroll.view',
        'POST /api/payroll'                         => 'payroll.run',
        'PUT /api/payroll'                          => 'payroll.edit',
        'PATCH /api/payroll'                        => 'payroll.edit',
        'POST /api/payroll/*/approve'               => 'payroll.approve',
        'GET /api/payroll/*/payslips'               => 'payroll.view_payslips',
        'GET /api/payroll/*/export'                 => 'payroll.export',

        // ── POS ──────────────────────────────────────────
        'GET /api/pos/orders'                       => 'pos.view',
        'POST /api/pos/orders'                      => 'pos.take_order',
        'PUT /api/pos/orders'                       => 'pos.edit_order',
        'PATCH /api/pos/orders'                     => 'pos.edit_order',
        'POST /api/pos/orders/*/void'               => 'pos.void_order',
        'POST /api/pos/orders/*/discount'           => 'pos.apply_discount',
        'POST /api/pos/orders/*/room-charge'        => 'pos.charge_to_room',
        'GET /api/pos/menu'                         => 'pos.view',
        'POST /api/pos/menu'                        => 'pos.manage_menu',
        'PUT /api/pos/menu'                         => 'pos.manage_menu',
        'DELETE /api/pos/menu'                      => 'pos.manage_menu',
        'GET /api/pos/tables'                       => 'pos.view',
        'POST /api/pos/tables'                      => 'pos.manage_tables',

        // ── Inventory ────────────────────────────────────
        'GET /api/inventory'                        => 'inventory.view',
        'POST /api/inventory/items'                 => 'inventory.add_item',
        'POST /api/inventory/adjustments'           => 'inventory.adjust_stock',
        'POST /api/inventory/grn'                   => 'inventory.create_grn',
        'POST /api/inventory/purchase-orders'       => 'inventory.create_purchase_order',
        'POST /api/inventory/purchase-orders/*/approve' => 'inventory.approve_purchase_order',
        'GET /api/inventory/vendors'                => 'inventory.view',
        'POST /api/inventory/vendors'               => 'inventory.manage_vendors',

        // ── Security ─────────────────────────────────────
        'GET /api/security/incidents'               => 'security.view_incidents',
        'POST /api/security/incidents'              => 'security.create_incident',
        'PUT /api/security/incidents'               => 'security.edit_incident',
        'PATCH /api/security/incidents'             => 'security.edit_incident',
        'POST /api/security/incidents/*/close'      => 'security.close_incident',
        'GET /api/security/cards'                   => 'security.manage_cards',
        'POST /api/security/cards'                  => 'security.manage_cards',
        'GET /api/security/card-events'             => 'security.view_card_events',
        'GET /api/security/scan-points'             => 'security.manage_scan_points',
        'POST /api/security/scan-points'            => 'security.manage_scan_points',
        'GET /api/police-reports'                   => 'security.view_police_reports',
        'POST /api/police-reports'                  => 'security.create_police_report',
        'GET /api/audit-log'                        => 'security.view_audit_log',

        // ── Events ───────────────────────────────────────
        'GET /api/events'                           => 'events.view',
        'POST /api/events'                          => 'events.create',
        'PUT /api/events'                           => 'events.edit',
        'PATCH /api/events'                         => 'events.edit',
        'POST /api/events/*/cancel'                 => 'events.cancel',
        'GET /api/event-spaces'                     => 'events.view',
        'POST /api/event-spaces'                    => 'events.manage_spaces',

        // ── Corporate ────────────────────────────────────
        'GET /api/corporate-profiles'               => 'corporate.view',
        'POST /api/corporate-profiles'              => 'corporate.create',
        'PUT /api/corporate-profiles'               => 'corporate.edit',
        'PATCH /api/corporate-profiles'             => 'corporate.edit',

        // ── Analytics ────────────────────────────────────
        'GET /api/analytics'                        => 'analytics.view_dashboard',
        'GET /api/reports/occupancy'                => 'analytics.view_occupancy_report',
        'GET /api/reports/revenue'                  => 'analytics.view_revenue_report',
        'GET /api/reports/guests'                   => 'analytics.view_guest_report',
        'GET /api/reports/staff'                    => 'analytics.view_staff_report',
        'GET /api/reports/*/export'                 => 'analytics.export',

        // ── Settings ─────────────────────────────────────
        'GET /api/settings'                         => 'settings.view',
        'PUT /api/settings'                         => 'settings.edit_property',
        'PATCH /api/settings'                       => 'settings.edit_property',
        'GET /api/settings/bank-accounts'           => 'settings.manage_bank_accounts',
        'POST /api/settings/bank-accounts'          => 'settings.manage_bank_accounts',
        'GET /api/integrations'                     => 'settings.manage_integrations',
        'PUT /api/integrations'                     => 'settings.manage_integrations',

        // ── Service Requests ─────────────────────────────
        'GET /api/service-requests'                 => 'service_requests.view',
        'POST /api/service-requests'                => 'service_requests.create',
        'POST /api/service-requests/*/assign'       => 'service_requests.assign',
        'POST /api/service-requests/*/resolve'      => 'service_requests.resolve',
        'GET /api/chat'                             => 'service_requests.view_chat',

        // ── OTA ──────────────────────────────────────────
        'GET /api/ota'                              => 'ota.view',
        'POST /api/ota'                             => 'ota.manage',
        'PUT /api/ota'                              => 'ota.manage',

        // ── Gym ──────────────────────────────────────────
        'GET /api/gym/members'                      => 'gym.view',
        'POST /api/gym/members'                     => 'gym.create_member',
        'PUT /api/gym/members'                      => 'gym.edit_member',
        'PATCH /api/gym/members'                    => 'gym.edit_member',
        'POST /api/gym/memberships/*/payments'      => 'gym.record_payment',
        'POST /api/gym/visits/check-in'             => 'gym.check_in',
        'GET /api/gym/plans'                        => 'gym.view',
        'POST /api/gym/plans'                       => 'gym.manage_plans',
        'GET /api/gym/classes'                      => 'gym.view',
        'POST /api/gym/classes'                     => 'gym.manage_classes',

        // ── Dashboard ────────────────────────────────────
        'GET /api/dashboard'                        => 'dashboard.view',

        // ── RBAC itself (guarded by RoleMiddleware in its own routes.php) ────
        // Leave out — handled directly in Rbac/routes.php
    ];

    /**
     * Routes that are completely exempt from permission checks.
     * (Auth endpoints, health, guest-facing APIs)
     */
    private const EXEMPT_PREFIXES = [
        '/api/auth',
        '/api/health',
        '/api/guest',         // GuestPortal routes
        '/api/guest-auth',
        '/api/subscriptions/webhook', // Paystack webhook (uses HMAC, not JWT)
        '/api/rbac/my-permissions',   // Self-fetch after login
    ];

    private RbacRepository $repo;
    private RedisClient $redis;
    private ?string $requiredPermission;

    public function __construct(
        RbacRepository $repo,
        RedisClient $redis,
        ?string $requiredPermission = null
    ) {
        $this->repo               = $repo;
        $this->redis              = $redis;
        $this->requiredPermission = $requiredPermission;
    }

    public function process(Request $request, Handler $handler): Response
    {
        $role       = $request->getAttribute('auth.role');
        $propertyId = $request->getAttribute('auth.property_id');
        $path       = $request->getUri()->getPath();
        $method     = $request->getMethod();

        // OPTIONS preflight — always allow
        if ($method === 'OPTIONS') {
            return $handler->handle($request);
        }

        // Exempt routes
        foreach (self::EXEMPT_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return $handler->handle($request);
            }
        }

        // Bypass roles
        if (in_array($role, RbacService::BYPASS_ROLES, true)) {
            return $handler->handle($request);
        }

        if (!$role || !$propertyId) {
            return $this->forbidden('Authentication context incomplete.');
        }

        // Resolve which permission is required
        $required = $this->requiredPermission ?? $this->resolveFromRoute($method, $path);

        // If no mapping found — allow (route may not need a specific permission,
        // or it has its own RoleMiddleware). Strict mode can change this.
        if ($required === null) {
            return $handler->handle($request);
        }

        // Check permission (with Redis cache)
        if (!$this->isGranted($propertyId, $role, $required)) {
            return $this->forbidden(
                "Your role does not have permission to perform this action ($required)."
            );
        }

        // Inject resolved permissions into request for downstream use
        $request = $request->withAttribute('auth.required_permission', $required);
        return $handler->handle($request);
    }

    private function isGranted(string $propertyId, string $role, string $permission): bool
    {
        $cacheKey = "rbac:$propertyId:$role";

        try {
            $cached = $this->redis->get($cacheKey);
            if ($cached !== null) {
                $granted = json_decode($cached, true);
                return in_array($permission, $granted, true);
            }
        } catch (\Throwable $e) {
            // Redis down — fall through to DB
        }

        // DB lookup
        $granted = $this->repo->getGrantedForRole($propertyId, $role);

        try {
            $this->redis->setex($cacheKey, 60, json_encode($granted));
        } catch (\Throwable $e) {}

        return in_array($permission, $granted, true);
    }

    /**
     * Resolve required permission from HTTP method + path using the map.
     * Supports wildcard segments: "POST /api/bookings/*/check-in"
     */
    private function resolveFromRoute(string $method, string $path): ?string
    {
        // Exact match first
        $exact = "$method $path";
        if (isset(self::ROUTE_PERMISSION_MAP[$exact])) {
            return self::ROUTE_PERMISSION_MAP[$exact];
        }

        // Wildcard match — longest pattern wins
        $bestMatch  = null;
        $bestLength = 0;

        foreach (self::ROUTE_PERMISSION_MAP as $pattern => $permission) {
            [$patternMethod, $patternPath] = explode(' ', $pattern, 2);

            if ($patternMethod !== $method) {
                continue;
            }

            if ($this->matchesPattern($path, $patternPath)) {
                if (strlen($patternPath) > $bestLength) {
                    $bestLength = strlen($patternPath);
                    $bestMatch  = $permission;
                }
            }
        }

        return $bestMatch;
    }

    private function matchesPattern(string $path, string $pattern): bool
    {
        $regex = '#^' . str_replace(['\*', '/'], ['[^/]+', '\/'], preg_quote($pattern, '#')) . '(\/.*)?$#';
        return (bool)preg_match($regex, $path);
    }

    private function forbidden(string $message): Response
    {
        $body = json_encode([
            'success' => false,
            'error'   => ['code' => 'FORBIDDEN', 'message' => $message],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $response = new SlimResponse();
        $response->getBody()->write($body);
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }
}
