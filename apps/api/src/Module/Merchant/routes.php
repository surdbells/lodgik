<?php
declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Module\Merchant\MerchantController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {

    // ─── Super Admin: Merchant lifecycle + KYC review + commissions admin + payouts + resources admin ───
    $app->group('/api/admin/merchants', function (RouteCollectorProxy $g) {
        // Merchant list + onboard
        $g->get('', [MerchantController::class, 'list']);
        $g->post('', [MerchantController::class, 'adminRegister']);

        // KYC review (static paths first)
        $g->post('/kyc/{id}/review', [MerchantController::class, 'reviewKyc']);
        $g->get('/kyc/pending', [MerchantController::class, 'pendingKyc']);

        // Bank account approval
        $g->post('/bank/{bank_id}/approve', [MerchantController::class, 'approveBank']);
        $g->post('/bank/{bank_id}/freeze', [MerchantController::class, 'freezeBank']);

        // Commission admin
        $g->get('/commissions', [MerchantController::class, 'listCommissions']);
        $g->post('/commissions/{id}/approve', [MerchantController::class, 'approveCommission']);
        $g->post('/commissions/{id}/reverse', [MerchantController::class, 'reverseCommission']);
        $g->post('/commissions/calculate', [MerchantController::class, 'calculateCommission']);

        // Commission tiers
        $g->get('/tiers', [MerchantController::class, 'listTiers']);
        $g->post('/tiers', [MerchantController::class, 'createTier']);
        $g->put('/tiers/{id}', [MerchantController::class, 'updateTier']);

        // Payouts
        $g->get('/payouts', [MerchantController::class, 'listPayouts']);
        $g->post('/payouts', [MerchantController::class, 'generatePayout']);
        $g->post('/payouts/{id}/process', [MerchantController::class, 'processPayout']);

        // Resources (admin manage)
        $g->get('/resources', [MerchantController::class, 'listResources']);
        $g->post('/resources', [MerchantController::class, 'createResource']);
        $g->post('/resources/{id}/archive', [MerchantController::class, 'archiveResource']);
        $g->get('/resources/{id}/analytics', [MerchantController::class, 'resourceAnalytics']);

        // Hotel onboarding status (admin update)
        $g->post('/hotels/{id}/status', [MerchantController::class, 'updateHotelStatus']);

        // List hotels for a specific merchant (admin)
        $g->get('/{id}/hotels', [MerchantController::class, 'adminListHotels']);

        // Statements
        $g->post('/statements', [MerchantController::class, 'generateStatement']);

        // Merchant detail (parameterized — must come after all static paths)
        $g->get('/{id}', [MerchantController::class, 'show']);
        $g->post('/{id}/approve', [MerchantController::class, 'approve']);
        $g->post('/{id}/activate', [MerchantController::class, 'activate']);
        $g->post('/{id}/reactivate', [MerchantController::class, 'reactivate']);
        $g->post('/{id}/suspend', [MerchantController::class, 'suspend']);
        $g->post('/{id}/terminate', [MerchantController::class, 'terminate']);
        $g->get('/{id}/audit-log', [MerchantController::class, 'auditLog']);
        $g->get('/{id}/kyc', [MerchantController::class, 'kycStatus']);
    })
        ->add(new RoleMiddleware(['super_admin']))
        ->add(AuthMiddleware::class);

    // ─── Merchant Portal: Public self-registration (no auth) ────
    $app->post('/api/merchants/self-register', [MerchantController::class, 'selfRegister']);

    // ─── Merchant Portal: Registration (public with auth) ──────
    $app->post('/api/merchants/register', [MerchantController::class, 'register'])
        ->add(AuthMiddleware::class);

    // ─── Merchant Portal: Authenticated merchant routes ────────
    $app->group('/api/merchant', function (RouteCollectorProxy $g) {
        // Dashboard + Profile
        $g->get('/dashboard', [MerchantController::class, 'dashboard']);
        $g->get('/profile', [MerchantController::class, 'profile']);

        // KYC (own)
        $g->post('/kyc', [MerchantController::class, 'submitOwnKyc']);
        $g->get('/kyc', [MerchantController::class, 'ownKycStatus']);

        // Bank account (own)
        $g->post('/bank', [MerchantController::class, 'addOwnBank']);
        $g->put('/bank/{bank_id}', [MerchantController::class, 'updateBank']);

        // Hotels
        $g->get('/hotels', [MerchantController::class, 'listHotels']);
        $g->post('/hotels', [MerchantController::class, 'registerHotel']);
        $g->get('/hotels/{id}', [MerchantController::class, 'hotelDetail']);

        // Commissions
        $g->get('/commissions', [MerchantController::class, 'listCommissions']);
        $g->get('/earnings', [MerchantController::class, 'earnings']);

        // Payouts
        $g->get('/payouts', [MerchantController::class, 'listPayouts']);

        // Resources
        $g->get('/resources', [MerchantController::class, 'listResources']);
        $g->post('/resources/{id}/download', [MerchantController::class, 'downloadResource']);

        // Support tickets
        $g->get('/tickets', [MerchantController::class, 'listTickets']);
        $g->post('/tickets', [MerchantController::class, 'createTicket']);
        $g->put('/tickets/{id}', [MerchantController::class, 'updateTicket']);

        // Leads
        $g->get('/leads', [MerchantController::class, 'listLeads']);
        $g->post('/leads', [MerchantController::class, 'createLead']);
        $g->put('/leads/{id}', [MerchantController::class, 'updateLead']);
        $g->post('/leads/{id}/convert', [MerchantController::class, 'convertLead']);

        // Notifications
        $g->get('/notifications', [MerchantController::class, 'listNotifications']);
        $g->post('/notifications/{id}/read', [MerchantController::class, 'markRead']);
        $g->post('/notifications/read-all', [MerchantController::class, 'markAllRead']);

        // Statements
        $g->get('/statements', [MerchantController::class, 'listStatements']);
        $g->post('/statements', [MerchantController::class, 'generateStatement']);
    })
        ->add(new RoleMiddleware(['merchant_admin', 'merchant_agent']))
        ->add(AuthMiddleware::class);
};
