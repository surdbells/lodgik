<?php
declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Folio\FolioController;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c          = $app->getContainer();
    $folioGate  = new FeatureMiddleware('folio_billing', 'starter', $c->get(RedisClient::class));
    $roles      = new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'accountant']);

    $app->group('/api/folios', function (RouteCollectorProxy $g) {
        $g->get('',                              [FolioController::class, 'list']);
        $g->get('/pending-payments',             [FolioController::class, 'pendingPayments']);
        $g->get('/by-booking/{bookingId}',       [FolioController::class, 'byBooking']);
        $g->get('/{id}',                         [FolioController::class, 'detail']);
        $g->post('/{id}/charges',                [FolioController::class, 'addCharge']);
        $g->post('/{id}/payments',               [FolioController::class, 'recordPayment']);
        $g->post('/{id}/adjustments',            [FolioController::class, 'addAdjustment']);
        $g->post('/{id}/close',                  [FolioController::class, 'close']);
        $g->post('/{id}/void',                   [FolioController::class, 'void']);
        $g->post('/payments/{paymentId}/confirm',[FolioController::class, 'confirmPayment']);
        $g->post('/payments/{paymentId}/reject', [FolioController::class, 'rejectPayment']);
    })
        ->add($roles)
        ->add($folioGate)
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
