<?php
declare(strict_types=1);
use Lodgik\Module\GuestServices\GuestServicesController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/guest-services', function (RouteCollectorProxy $g) {
        $g->get('/vouchers', [GuestServicesController::class, 'listVouchers']);
        $g->post('/vouchers', [GuestServicesController::class, 'createVoucher']);
        $g->post('/vouchers/redeem', [GuestServicesController::class, 'redeemVoucher']);
        $g->get('/waitlist', [GuestServicesController::class, 'listWaitlist']);
        $g->post('/waitlist', [GuestServicesController::class, 'joinWaitlist']);
        $g->post('/waitlist/{id}/notify', [GuestServicesController::class, 'notifyWaitlist']);
        $g->post('/waitlist/{id}/fulfill', [GuestServicesController::class, 'fulfillWaitlist']);
        $g->post('/waitlist/{id}/cancel', [GuestServicesController::class, 'cancelWaitlist']);
        $g->get('/transfers', [GuestServicesController::class, 'listTransfers']);
        $g->post('/transfers', [GuestServicesController::class, 'requestTransfer']);
        $g->post('/transfers/{id}/approve', [GuestServicesController::class, 'approveTransfer']);
        $g->post('/transfers/{id}/reject', [GuestServicesController::class, 'rejectTransfer']);
        $g->get('/extensions/check', [GuestServicesController::class, 'checkExtension']);
        $g->post('/extensions', [GuestServicesController::class, 'requestExtension']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'concierge']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
