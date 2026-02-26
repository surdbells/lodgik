<?php
declare(strict_types=1);
use Lodgik\Module\Invoice\InvoiceController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/invoices', function (RouteCollectorProxy $g) {
        $g->get('', [InvoiceController::class, 'list']);
        $g->get('/tax-config', [InvoiceController::class, 'taxConfig']);
        $g->get('/by-booking/{bookingId}', [InvoiceController::class, 'byBooking']);
        $g->get('/{id}', [InvoiceController::class, 'detail']);
        $g->get('/{id}/pdf', [InvoiceController::class, 'pdf']);
        $g->post('/{id}/email', [InvoiceController::class, 'email']);
        $g->post('/{id}/void', [InvoiceController::class, 'void']);
        $g->post('/{id}/pay', [InvoiceController::class, 'pay']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'accountant']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
