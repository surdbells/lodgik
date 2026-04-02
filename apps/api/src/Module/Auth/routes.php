<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\AuthRateLimitMiddleware;
use Lodgik\Module\Auth\AuthController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/auth', function (RouteCollectorProxy $group) {
        // Public routes (no auth required)
        $group->post('/register',   [AuthController::class, 'register']);
        $group->post('/refresh',    [AuthController::class, 'refresh']);
        $group->post('/accept-invite', [AuthController::class, 'acceptInvite']);

        // Rate-limited public routes (brute-force protection)
        $group->post('/login',          [AuthController::class, 'login'])
            ->add(AuthRateLimitMiddleware::class);
        $group->post('/forgot-password', [AuthController::class, 'forgotPassword'])
            ->add(AuthRateLimitMiddleware::class);
        $group->post('/verify-otp',      [AuthController::class, 'verifyOtp'])
            ->add(AuthRateLimitMiddleware::class);
        $group->post('/reset-password',  [AuthController::class, 'resetPassword'])
            ->add(AuthRateLimitMiddleware::class);

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
