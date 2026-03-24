<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Module\Auth\AuthController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/auth', function (RouteCollectorProxy $group) {
        // Public routes (no auth required)
        $group->post('/register', [AuthController::class, 'register']);
        $group->post('/login', [AuthController::class, 'login']);
        $group->post('/refresh', [AuthController::class, 'refresh']);
        $group->post('/forgot-password', [AuthController::class, 'forgotPassword']);
        $group->post('/verify-otp',       [AuthController::class, 'verifyOtp']);
        $group->post('/reset-password',   [AuthController::class, 'resetPassword']);
        $group->post('/accept-invite', [AuthController::class, 'acceptInvite']);

        // Authenticated routes
        $group->post('/logout', [AuthController::class, 'logout'])
            ->add(AuthMiddleware::class);
        $group->post('/logout-all', [AuthController::class, 'logoutAll'])
            ->add(AuthMiddleware::class);
        $group->get('/me', [AuthController::class, 'me'])
            ->add(AuthMiddleware::class);
        $group->post('/switch-property', [AuthController::class, 'switchProperty'])
            ->add(AuthMiddleware::class);
        $group->get('/accessible-properties', [AuthController::class, 'accessibleProperties'])
            ->add(AuthMiddleware::class);
    });
};
