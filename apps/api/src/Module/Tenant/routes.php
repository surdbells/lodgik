<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Tenant\TenantController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Tenant settings
    $app->group('/api/tenant', function (RouteCollectorProxy $group) {
        $group->get('', [TenantController::class, 'show']);
        $group->patch('', [TenantController::class, 'update']);
    })
        ->add(new RoleMiddleware(['property_admin']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // Properties
    $app->group('/api/properties', function (RouteCollectorProxy $group) {
        $group->get('', [TenantController::class, 'listProperties']);
        $group->get('/{id}', [TenantController::class, 'showProperty']);
        $group->post('', [TenantController::class, 'createProperty']);
        $group->patch('/{id}', [TenantController::class, 'updateProperty']);
        $group->delete('/{id}', [TenantController::class, 'deleteProperty']);

        // Bank accounts (nested under property)
        $group->get('/{propertyId}/bank-accounts', [TenantController::class, 'listBankAccounts']);
        $group->post('/{propertyId}/bank-accounts', [TenantController::class, 'createBankAccount']);
        $group->put('/{propertyId}/bank-accounts/{id}', [TenantController::class, 'updateBankAccount']);
        $group->delete('/{propertyId}/bank-accounts/{id}', [TenantController::class, 'deleteBankAccount']);
    })
        ->add(new RoleMiddleware(['property_admin']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
