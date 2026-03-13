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

final class PermissionMiddleware implements MiddlewareInterface
{
    private RbacRepository $repo;
    private RedisClient $redis;
    private $requiredPermission;

    public function __construct(
        RbacRepository $repo,
        RedisClient $redis,
        $requiredPermission = null
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

        if ($method === 'OPTIONS') {
            return $handler->handle($request);
        }

        foreach ($this->getExemptPrefixes() as $prefix) {
            if (strpos($path, $prefix) === 0) {
                return $handler->handle($request);
            }
        }

        if (in_array($role, RbacService::BYPASS_ROLES, true)) {
            return $handler->handle($request);
        }

        if (!$role || !$propertyId) {
            return $this->forbidden('Authentication context incomplete.');
        }

        $required = $this->requiredPermission !== null
            ? $this->requiredPermission
            : $this->resolveFromRoute($method, $path);

        if ($required === null) {
            return $handler->handle($request);
        }

        if (!$this->isGranted($propertyId, $role, $required)) {
            return $this->forbidden(
                'Your role does not have permission to perform this action (' . $required . ').'
            );
        }

        $request = $request->withAttribute('auth.required_permission', $required);
        return $handler->handle($request);
    }

    private function getExemptPrefixes()
    {
        return array(
            '/api/auth',
            '/api/health',
            '/api/guest',
            '/api/guest-auth',
            '/api/subscriptions/webhook',
            '/api/rbac/my-permissions',
        );
    }

    private function getRoutePermissionMap()
    {
        return array(
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
            'GET /api/guests'                           => 'guests.view',
            'POST /api/guests'                          => 'guests.create',
            'PUT /api/guests'                           => 'guests.edit',
            'PATCH /api/guests'                         => 'guests.edit',
            'DELETE /api/guests'                        => 'guests.delete',
            'GET /api/folios'                           => 'folios.view',
            'POST /api/folios'                          => 'folios.view',
            'GET /api/folios/*'                         => 'folios.view',
            'POST /api/folios/*/charges'                => 'folios.add_charge',
            'POST /api/folios/*/payments'               => 'folios.add_payment',
            'POST /api/folios/*/adjustments'            => 'folios.add_adjustment',
            'POST /api/folios/*/close'                  => 'folios.close',
            'POST /api/folios/*/void'                   => 'folios.close',
            'GET /api/invoices'                         => 'invoices.view',
            'POST /api/invoices'                        => 'invoices.create',
            'GET /api/invoices/*'                       => 'invoices.view',
            'POST /api/invoices/*/payments'             => 'invoices.record_payment',
            'POST /api/invoices/*/void'                 => 'invoices.void',
            'GET /api/invoices/*/pdf'                   => 'invoices.download_pdf',
            'POST /api/invoices/*/email'                => 'invoices.email',
            'GET /api/housekeeping'                     => 'housekeeping.view',
            'POST /api/housekeeping'                    => 'housekeeping.manage',
            'PUT /api/housekeeping'                     => 'housekeeping.manage',
            'PATCH /api/housekeeping/*/status'          => 'housekeeping.update_status',
            'POST /api/housekeeping/*/assign'           => 'housekeeping.assign',
            'GET /api/staff'                            => 'staff.view',
            'POST /api/staff'                           => 'staff.create',
            'PUT /api/staff'                            => 'staff.edit',
            'DELETE /api/staff'                         => 'staff.delete',
            'GET /api/employees'                        => 'staff.view',
            'POST /api/employees'                       => 'staff.create',
            'PUT /api/employees'                        => 'staff.edit',
            'DELETE /api/employees'                     => 'staff.delete',
            'GET /api/payroll'                          => 'payroll.view',
            'POST /api/payroll'                         => 'payroll.run',
            'GET /api/payroll/*'                        => 'payroll.view',
            'POST /api/payroll/*/calculate'             => 'payroll.run',
            'POST /api/payroll/*/approve'               => 'payroll.approve',
            'POST /api/payroll/*/mark-paid'             => 'payroll.approve',
            'GET /api/payroll/*/payslips'               => 'payroll.view_payslips',
            'POST /api/payroll/*/payslips/*/email'      => 'payroll.view_payslips',
            'GET /api/pos'                              => 'pos.view',
            'POST /api/pos/orders'                      => 'pos.create_order',
            'PUT /api/pos/orders'                       => 'pos.manage_orders',
            'PATCH /api/pos/orders'                     => 'pos.manage_orders',
            'GET /api/inventory'                        => 'inventory.view',
            'POST /api/inventory'                       => 'inventory.manage',
            'PUT /api/inventory'                        => 'inventory.manage',
            'GET /api/security/incidents'               => 'security.view_incidents',
            'POST /api/security/incidents'              => 'security.log_incident',
            'GET /api/events'                           => 'events.view',
            'POST /api/events'                          => 'events.create',
            'PUT /api/events'                           => 'events.edit',
            'DELETE /api/events'                        => 'events.delete',
            'GET /api/corporate'                        => 'corporate.view',
            'POST /api/corporate'                       => 'corporate.create',
            'PUT /api/corporate'                        => 'corporate.edit',
            'GET /api/analytics'                        => 'analytics.view',
            'GET /api/reports'                          => 'analytics.view',
            'GET /api/settings'                         => 'settings.view',
            'PUT /api/settings'                         => 'settings.manage',
            'PATCH /api/settings'                       => 'settings.manage',
            'POST /api/settings'                        => 'settings.manage',
            'GET /api/service-requests'                 => 'service_requests.view',
            'POST /api/service-requests'                => 'service_requests.create',
            'PUT /api/service-requests'                 => 'service_requests.manage',
            'PATCH /api/service-requests/*/status'      => 'service_requests.manage',
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
            'GET /api/dashboard'                        => 'dashboard.view',
        );
    }

    private function isGranted($propertyId, $role, $permission)
    {
        $cacheKey = 'rbac:' . $propertyId . ':' . $role;

        try {
            $cached = $this->redis->get($cacheKey);
            if ($cached !== null) {
                $granted = json_decode($cached, true);
                return in_array($permission, $granted, true);
            }
        } catch (\Exception $e) {
            // Redis down - fall through to DB
        }

        $granted = $this->repo->getGrantedForRole($propertyId, $role);

        try {
            $this->redis->setex($cacheKey, 60, json_encode($granted));
        } catch (\Exception $e) {
            // ignore
        }

        return in_array($permission, $granted, true);
    }

    private function resolveFromRoute($method, $path)
    {
        $map   = $this->getRoutePermissionMap();
        $exact = $method . ' ' . $path;

        if (isset($map[$exact])) {
            return $map[$exact];
        }

        $bestMatch  = null;
        $bestLength = 0;

        foreach ($map as $pattern => $permission) {
            $parts         = explode(' ', $pattern, 2);
            $patternMethod = $parts[0];
            $patternPath   = $parts[1];

            if ($patternMethod !== $method) {
                continue;
            }

            if ($this->matchesPattern($path, $patternPath)) {
                $len = strlen($patternPath);
                if ($len > $bestLength) {
                    $bestLength = $len;
                    $bestMatch  = $permission;
                }
            }
        }

        return $bestMatch;
    }

    private function matchesPattern($path, $pattern)
    {
        $quoted = preg_quote($pattern, '#');
        $regex  = '#^' . str_replace(array('\\*', '\\/'), array('[^/]+', '/'), $quoted) . '(/.*)?$#';
        return (bool) preg_match($regex, $path);
    }

    private function forbidden($message)
    {
        $body = json_encode(array(
            'success' => false,
            'error'   => array('code' => 'FORBIDDEN', 'message' => $message),
        ));

        $response = new SlimResponse();
        $response->getBody()->write($body);
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }
}
