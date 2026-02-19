<?php

declare(strict_types=1);

use Lodgik\Module\Notification\NotificationController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/notifications', function (RouteCollectorProxy $g) {
        $g->get('', [NotificationController::class, 'list']);
        $g->get('/unread-count', [NotificationController::class, 'unreadCount']);
        $g->post('/read-all', [NotificationController::class, 'markAllRead']);
        $g->post('/{id}/read', [NotificationController::class, 'markRead']);
    });

    $app->group('/device-tokens', function (RouteCollectorProxy $g) {
        $g->post('', [NotificationController::class, 'registerToken']);
        $g->post('/remove', [NotificationController::class, 'removeToken']);
    });
};
