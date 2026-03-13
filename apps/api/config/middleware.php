<?php

declare(strict_types=1);

use Lodgik\Middleware\CorsMiddleware;
use Lodgik\Middleware\ErrorHandlerMiddleware;
use Lodgik\Middleware\JsonBodyParserMiddleware;
use Lodgik\Middleware\RequestIdMiddleware;
use Psr\Log\LoggerInterface;
use Slim\App;

return function (App $app): void {
    $container = $app->getContainer();
    $settings = $container->get('settings');

    // Middleware is applied in reverse order (last added = first executed)

    // 0. Audit all write operations (innermost ___ runs after route/auth)
    // NOTE: JwtService injected so AuditMiddleware can decode the Bearer token directly.
    // It cannot rely on request attributes set by per-route AuthMiddleware because
    // PSR-7 immutable requests mean those attributes exist on a different object.
    $app->add(new \Lodgik\Middleware\AuditMiddleware(
        $container->get(\Doctrine\ORM\EntityManagerInterface::class),
        $container->get(LoggerInterface::class),
        $container->get(\Lodgik\Service\JwtService::class)
    ));

    // 0a. Permission enforcement (runs after AuditMiddleware, before route handlers)
    // Gates all hotel API routes based on role + property-level permission overrides.
    // Bypass roles (super_admin, property_admin) always pass.
    // Redis-cached per (property_id + role) for 60s.
    $app->add(new \Lodgik\Middleware\PermissionMiddleware(
        $container->get(\Lodgik\Module\Rbac\RbacRepository::class),
        $container->get(\Predis\Client::class)
        // global mode - resolves permission from route map
    ));

    // 1. Parse JSON request bodies
    $app->add(new JsonBodyParserMiddleware());

    // 2. Add request ID for tracing
    $app->add(new RequestIdMiddleware());

    // 3. CORS headers
    $app->add(new CorsMiddleware(
        $settings['cors']['allowed_origins'],
        $settings['cors']['allowed_methods'],
        $settings['cors']['allowed_headers']
    ));

    // 4. Error handling (outermost ___ catches everything)
    $app->add(new ErrorHandlerMiddleware(
        $container->get(LoggerInterface::class),
        $settings['app']['debug']
    ));
};
