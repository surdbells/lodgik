<?php
declare(strict_types=1);

use Lodgik\Module\GuestPortal\GuestPortalController;
use Lodgik\Middleware\GuestMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/guest', function (RouteCollectorProxy $g) {
        $g->get('/booking',          [GuestPortalController::class, 'booking']);
        $g->get('/folio',            [GuestPortalController::class, 'folio']);
        $g->get('/service-requests', [GuestPortalController::class, 'listServiceRequests']);
        $g->post('/service-requests',[GuestPortalController::class, 'createServiceRequest']);
        $g->get('/chat/messages',    [GuestPortalController::class, 'chatMessages']);
        $g->post('/chat/send',        [GuestPortalController::class, 'chatSend']);
        $g->post('/chat/read',        [GuestPortalController::class, 'chatMarkRead']);
    })->add(GuestMiddleware::class);
};
