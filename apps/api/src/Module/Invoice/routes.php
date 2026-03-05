<?php
declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Invoice\InvoiceController;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c            = $app->getContainer();
    $invoiceGate  = new FeatureMiddleware('invoice_generation', 'professional', $c->get(RedisClient::class));
    $roles        = new RoleMiddleware(['property_admin', 'manager', 'accountant']);

    $app->group('/api/invoices', function (RouteCollectorProxy $g) {
        $g->get('',                          [InvoiceController::class, 'list']);
        $g->get('/tax-config',               [InvoiceController::class, 'taxConfig']);
        $g->get('/by-booking/{bookingId}',   [InvoiceController::class, 'byBooking']);
        $g->get('/{id}',                     [InvoiceController::class, 'detail']);
        $g->get('/{id}/pdf',                 [InvoiceController::class, 'pdf']);
        $g->post('',                         [InvoiceController::class, 'generate']); // Phase 2: generate from folio
        $g->post('/{id}/email',              [InvoiceController::class, 'email']);
        $g->post('/{id}/void',               [InvoiceController::class, 'void']);
        $g->post('/{id}/pay',                [InvoiceController::class, 'pay']);
    })
        ->add($roles)
        ->add($invoiceGate)
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
