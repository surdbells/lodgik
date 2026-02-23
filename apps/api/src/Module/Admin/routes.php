<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Module\Admin\AdminController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Public: list subscription plans (for pricing page)
    $app->get('/api/plans', [AdminController::class, 'listPublicPlans']);

    // Super admin routes (no tenant context needed)
    $app->group('/api/admin', function (RouteCollectorProxy $group) {
        // Dashboard
        $group->get('/dashboard', [AdminController::class, 'dashboard']);

        // Tenant management
        $group->get('/tenants', [AdminController::class, 'listTenants']);
        $group->get('/tenants/{id}', [AdminController::class, 'showTenant']);
        $group->patch('/tenants/{id}/activate', [AdminController::class, 'activateTenant']);
        $group->patch('/tenants/{id}/suspend', [AdminController::class, 'suspendTenant']);
        $group->post('/tenants/{id}/assign-plan', [AdminController::class, 'assignPlan']);

        // Plan management
        $group->get('/plans', [AdminController::class, 'listPlans']);
        $group->get('/plans/{id}', [AdminController::class, 'showPlan']);
        $group->post('/plans', [AdminController::class, 'createPlan']);
        $group->patch('/plans/{id}', [AdminController::class, 'updatePlan']);
        $group->delete('/plans/{id}', [AdminController::class, 'deletePlan']);
        $group->post('/plans/{id}/duplicate', [AdminController::class, 'duplicatePlan']);

        // Tenant detail: usage, features, impersonate
        $group->get('/tenants/{id}/usage', [AdminController::class, 'tenantUsage']);
        $group->get('/tenants/{id}/features', [AdminController::class, 'tenantFeatures']);
        $group->post('/tenants/{id}/features/enable/{moduleKey}', [AdminController::class, 'enableTenantFeature']);
        $group->post('/tenants/{id}/features/disable/{moduleKey}', [AdminController::class, 'disableTenantFeature']);
        $group->post('/tenants/{id}/impersonate', [AdminController::class, 'impersonateTenant']);

        // Platform settings
        $group->get('/settings', [AdminController::class, 'getSettings']);
        $group->patch('/settings', [AdminController::class, 'updateSettings']);
        $group->post('/settings/test-email', [AdminController::class, 'testEmail']);
        $group->post('/settings/test-sms', [AdminController::class, 'testSms']);

        // Platform analytics
        $group->get('/analytics', [AdminController::class, 'analytics']);

        // WhatsApp admin config
        $group->get('/whatsapp/config', [AdminController::class, 'whatsappConfig']);
        $group->patch('/whatsapp/config', [AdminController::class, 'updateWhatsappConfig']);
        $group->get('/whatsapp/stats', [AdminController::class, 'whatsappStats']);
        $group->get('/whatsapp/templates', [AdminController::class, 'whatsappTemplates']);
        $group->post('/whatsapp/templates', [AdminController::class, 'createWhatsappTemplate']);
        $group->get('/whatsapp/logs', [AdminController::class, 'whatsappLogs']);
        $group->post('/whatsapp/test', [AdminController::class, 'testWhatsapp']);

        // App release management
        $group->get('/apps/releases', [AdminController::class, 'listAppReleases']);
        $group->post('/apps/releases', [AdminController::class, 'createAppRelease']);
        $group->patch('/apps/releases/{id}/publish', [AdminController::class, 'publishRelease']);
        $group->patch('/apps/releases/{id}/deprecate', [AdminController::class, 'deprecateRelease']);
    })
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);
};
