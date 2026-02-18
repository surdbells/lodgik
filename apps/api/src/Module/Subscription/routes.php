<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Subscription\SubscriptionController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Public: Paystack webhook (no auth)
    $app->post('/api/subscriptions/webhook', [SubscriptionController::class, 'webhook']);

    // Tenant: subscription management
    $app->group('/api/subscriptions', function (RouteCollectorProxy $group) {
        $group->get('/current', [SubscriptionController::class, 'current']);
        $group->get('/invoices', [SubscriptionController::class, 'invoices']);
        $group->post('/initialize', [SubscriptionController::class, 'initialize']);
        $group->post('/verify', [SubscriptionController::class, 'verify']);
        $group->post('/upgrade', [SubscriptionController::class, 'upgrade']);
        $group->post('/cancel', [SubscriptionController::class, 'cancel']);
    })
        ->add(new RoleMiddleware(['property_admin']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
