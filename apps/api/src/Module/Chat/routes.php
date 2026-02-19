<?php

declare(strict_types=1);

use Lodgik\Module\Chat\ChatController;
use Lodgik\Middleware\FeatureMiddleware;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();
    $featureGate = new FeatureMiddleware('guest_chat', 'professional', $c->get(RedisClient::class));

    $app->group('/chat', function (RouteCollectorProxy $g) {
        $g->get('/active', [ChatController::class, 'activeChats']);
        $g->get('/messages/{bookingId}', [ChatController::class, 'messages']);
        $g->get('/unread/{bookingId}', [ChatController::class, 'unreadCount']);
        $g->post('/messages', [ChatController::class, 'send']);
        $g->post('/messages/{bookingId}/read', [ChatController::class, 'markRead']);
    })->add($featureGate);
};
