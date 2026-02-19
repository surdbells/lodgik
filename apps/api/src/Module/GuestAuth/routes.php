<?php

declare(strict_types=1);

use Lodgik\Module\GuestAuth\GuestAuthController;
use Lodgik\Middleware\FeatureMiddleware;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();

    // Guest auth endpoints — public (no staff JWT required)
    $app->group('/guest-auth', function (RouteCollectorProxy $g) {
        $g->post('/otp/send', [GuestAuthController::class, 'sendOtp']);
        $g->post('/otp/verify', [GuestAuthController::class, 'verifyOtp']);
        $g->post('/access-code', [GuestAuthController::class, 'loginAccessCode']);
        $g->post('/tablet', [GuestAuthController::class, 'tabletAuth']);
        $g->post('/logout', [GuestAuthController::class, 'logout']);
        $g->get('/session', [GuestAuthController::class, 'validateSession']);
    });

    // Tablet management — staff auth required, feature gated
    $featureGate = new FeatureMiddleware('concierge_tablet', 'enterprise', $c->get(RedisClient::class));
    $app->group('/tablets', function (RouteCollectorProxy $g) {
        $g->get('', [GuestAuthController::class, 'listTablets']);
        $g->post('', [GuestAuthController::class, 'registerTablet']);
    })->add($featureGate);
};
