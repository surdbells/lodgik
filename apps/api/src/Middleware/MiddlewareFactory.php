<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Predis\Client as RedisClient;
use Psr\Container\ContainerInterface;

/**
 * Factory for creating route-level middleware instances.
 *
 * Usage in routes.php:
 *   $mw = $container->get(MiddlewareFactory::class);
 *
 *   $app->group('/api/bar', function ($group) { ... })
 *       ->add($mw->feature('bar_pos', 'professional'))
 *       ->add($mw->role(['bar', 'property_admin']))
 *       ->add($mw->tenant())
 *       ->add($mw->auth())
 *       ->add($mw->rateLimit());
 *
 * Note: Middleware is added in reverse order (last added = first executed).
 * So the stack above executes: rateLimit → auth → tenant → role → feature → controller
 */
final class MiddlewareFactory
{
    public function __construct(
        private readonly ContainerInterface $container,
    ) {}

    /**
     * JWT authentication middleware.
     */
    public function auth(): AuthMiddleware
    {
        return $this->container->get(AuthMiddleware::class);
    }

    /**
     * Tenant context middleware (enables Doctrine filter).
     */
    public function tenant(): TenantMiddleware
    {
        return $this->container->get(TenantMiddleware::class);
    }

    /**
     * Role-based access control.
     *
     * @param array<string> $roles Allowed roles
     */
    public function role(array $roles): RoleMiddleware
    {
        return new RoleMiddleware($roles);
    }

    /**
     * Feature gate middleware.
     *
     * @param string $moduleKey  Module key to check (e.g., 'bar_pos')
     * @param string $upgradeTo  Plan name to suggest (e.g., 'professional')
     */
    public function feature(string $moduleKey, string $upgradeTo = 'professional'): FeatureMiddleware
    {
        return new FeatureMiddleware(
            moduleKey: $moduleKey,
            upgradeTo: $upgradeTo,
            redis: $this->container->get(RedisClient::class),
        );
    }

    /**
     * Rate limiting middleware.
     */
    public function rateLimit(): RateLimitMiddleware
    {
        return $this->container->get(RateLimitMiddleware::class);
    }

    /**
     * Common stack: auth + tenant + rate limit.
     * Used by most tenant-scoped routes.
     *
     * @return array<MiddlewareInterface>
     */
    public function authenticated(): array
    {
        return [
            $this->rateLimit(),
            $this->auth(),
            $this->tenant(),
        ];
    }

    /**
     * Common stack: auth + tenant + role + rate limit.
     *
     * @param array<string> $roles
     * @return array<MiddlewareInterface>
     */
    public function withRole(array $roles): array
    {
        return [
            $this->rateLimit(),
            $this->auth(),
            $this->tenant(),
            $this->role($roles),
        ];
    }

    /**
     * Common stack: auth + tenant + role + feature + rate limit.
     *
     * @param array<string> $roles
     * @param string $moduleKey
     * @param string $upgradeTo
     * @return array<MiddlewareInterface>
     */
    public function withFeature(array $roles, string $moduleKey, string $upgradeTo = 'professional'): array
    {
        return [
            $this->rateLimit(),
            $this->auth(),
            $this->tenant(),
            $this->role($roles),
            $this->feature($moduleKey, $upgradeTo),
        ];
    }
}
