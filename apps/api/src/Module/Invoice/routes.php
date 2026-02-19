<?php

declare(strict_types=1);

use Lodgik\Module\Invoice\InvoiceController;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $group) {
    $group->get('/invoices', [InvoiceController::class, 'list']);
    $group->get('/invoices/tax-config', [InvoiceController::class, 'taxConfig']);
    $group->get('/invoices/by-booking/{bookingId}', [InvoiceController::class, 'byBooking']);
    $group->get('/invoices/{id}', [InvoiceController::class, 'detail']);
    $group->get('/invoices/{id}/pdf', [InvoiceController::class, 'pdf']);
    $group->post('/invoices/{id}/email', [InvoiceController::class, 'email']);
    $group->post('/invoices/{id}/void', [InvoiceController::class, 'void']);
};
