<?php
declare(strict_types=1);
use Lodgik\Module\Loyalty\LoyaltyController; use Lodgik\Middleware\{RoleMiddleware, AuthMiddleware, TenantMiddleware};
use Slim\App; use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/loyalty', function (RouteCollectorProxy $g) {
        $g->get('/tiers', [LoyaltyController::class, 'listTiers']); $g->post('/tiers', [LoyaltyController::class, 'createTier']); $g->put('/tiers/{id}', [LoyaltyController::class, 'updateTier']);
        $g->get('/guests/{guestId}/points', [LoyaltyController::class, 'getGuestPoints']); $g->get('/guests/{guestId}/tier', [LoyaltyController::class, 'getGuestTier']);
        $g->post('/points/earn', [LoyaltyController::class, 'earnPoints']); $g->post('/points/redeem', [LoyaltyController::class, 'redeemPoints']);
        $g->get('/guests/{guestId}/history', [LoyaltyController::class, 'pointsHistory']);
        $g->get('/promotions', [LoyaltyController::class, 'listPromotions']); $g->post('/promotions', [LoyaltyController::class, 'createPromotion']);
        $g->post('/promotions/validate', [LoyaltyController::class, 'validatePromo']); $g->post('/promotions/{id}/apply', [LoyaltyController::class, 'applyPromo']);
        $g->get('/guests/{guestId}/preferences', [LoyaltyController::class, 'getPreferences']); $g->put('/guests/{guestId}/preferences', [LoyaltyController::class, 'setPreferences']);
        $g->get('/guests/preferences', [LoyaltyController::class, 'listAllPreferences']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'concierge']))->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
