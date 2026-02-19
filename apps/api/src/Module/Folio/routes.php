<?php

declare(strict_types=1);

use Lodgik\Module\Folio\FolioController;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $group) {
    $group->get('/folios', [FolioController::class, 'list']);
    $group->get('/folios/pending-payments', [FolioController::class, 'pendingPayments']);
    $group->get('/folios/by-booking/{bookingId}', [FolioController::class, 'byBooking']);
    $group->get('/folios/{id}', [FolioController::class, 'detail']);
    $group->post('/folios/{id}/charges', [FolioController::class, 'addCharge']);
    $group->post('/folios/{id}/payments', [FolioController::class, 'recordPayment']);
    $group->post('/folios/{id}/adjustments', [FolioController::class, 'addAdjustment']);
    $group->post('/folios/{id}/close', [FolioController::class, 'close']);
    $group->post('/folios/{id}/void', [FolioController::class, 'void']);
    $group->post('/folios/payments/{paymentId}/confirm', [FolioController::class, 'confirmPayment']);
    $group->post('/folios/payments/{paymentId}/reject', [FolioController::class, 'rejectPayment']);
};
