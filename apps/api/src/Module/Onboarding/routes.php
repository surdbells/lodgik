<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Onboarding\OnboardingController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // Public: registration and invitation verification
    $app->post('/api/onboarding/register', [OnboardingController::class, 'register']);
    $app->post('/api/onboarding/register-with-invite', [OnboardingController::class, 'registerWithInvite']);
    $app->get('/api/onboarding/verify-invite/{token}', [OnboardingController::class, 'verifyInvite']);

    // Authenticated: onboarding wizard steps (property admin)
    $app->group('/api/onboarding', function (RouteCollectorProxy $group) {
        $group->get('/progress', [OnboardingController::class, 'progress']);
        $group->post('/bank-account', [OnboardingController::class, 'bankAccount']);
        $group->post('/branding', [OnboardingController::class, 'branding']);
        $group->post('/select-plan', [OnboardingController::class, 'selectPlan']);
        $group->post('/invite-staff', [OnboardingController::class, 'inviteStaff']);
        $group->post('/upload-logo', [OnboardingController::class, 'uploadLogo']);
    })
        ->add(new RoleMiddleware(['property_admin']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // Super admin: tenant invitations
    $app->group('/api/admin/invitations', function (RouteCollectorProxy $group) {
        $group->get('', [OnboardingController::class, 'listInvitations']);
        $group->post('', [OnboardingController::class, 'createInvitation']);
        $group->delete('/{id}', [OnboardingController::class, 'revokeInvitation']);
    })
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);
};
