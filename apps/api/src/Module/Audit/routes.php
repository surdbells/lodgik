<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Audit\AuditController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Super admin — platform-wide audit
    $app->group('/api/admin/audit-logs', function (RouteCollectorProxy $g) {
        $g->get('', [AuditController::class, 'adminList']);
        $g->get('/stats', [AuditController::class, 'adminStats']);
        $g->get('/filters', [AuditController::class, 'adminFilters']);
    })
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);

    // Hotel staff — tenant-scoped audit
    $app->group('/api/audit-logs', function (RouteCollectorProxy $g) {
        $g->get('', [AuditController::class, 'tenantList']);
        $g->get('/stats', [AuditController::class, 'tenantStats']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
