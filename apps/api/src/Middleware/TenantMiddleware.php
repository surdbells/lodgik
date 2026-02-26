<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Doctrine\Listener\TenantListener;
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
 */
final class TenantMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantListener $tenantListener,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');

        if ($tenantId === null || $tenantId === '') {
            // No tenant context — let the request proceed without tenant filtering.
            // This covers super_admin routes that operate across tenants.
            return $handler->handle($request);
        }

        // Enable Doctrine TenantFilter for SELECT queries
        $this->em->getFilters()
            ->enable('tenant')
            ->setParameter('tenantId', $tenantId);

        // Set TenantListener context for INSERT operations
        $this->tenantListener->setCurrentTenantId($tenantId);

        // Load tenant's enabled modules for FeatureMiddleware fallback
        try {
            $tenant = $this->em->find(\Lodgik\Entity\Tenant::class, $tenantId);
            if ($tenant !== null) {
                $request = $request->withAttribute('auth.enabled_modules', $tenant->getEnabledModules() ?? []);
            }
        } catch (\Throwable) {
            // Non-critical — FeatureMiddleware will fail-open
        }

        return $handler->handle($request);
    }
}
