<?php

declare(strict_types=1);

use Lodgik\Module\Gym\GymController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/gym', function (RouteCollectorProxy $g) {
        // Dashboard
        $g->get('/dashboard', [GymController::class, 'dashboard']);

        // Plans
        $g->get('/plans', [GymController::class, 'listPlans']);
        $g->post('/plans', [GymController::class, 'createPlan']);
        $g->put('/plans/{id}', [GymController::class, 'updatePlan']);

        // Members
        $g->get('/members', [GymController::class, 'listMembers']);
        $g->get('/members/{id}', [GymController::class, 'getMember']);
        $g->post('/members', [GymController::class, 'registerMember']);
        $g->put('/members/{id}', [GymController::class, 'updateMember']);

        // Memberships
        $g->get('/memberships', [GymController::class, 'listMemberships']);
        $g->post('/memberships', [GymController::class, 'createMembership']);
        $g->post('/memberships/{id}/renew', [GymController::class, 'renewMembership']);
        $g->post('/memberships/{id}/suspend', [GymController::class, 'suspendMembership']);
        $g->post('/memberships/{id}/cancel', [GymController::class, 'cancelMembership']);
        $g->post('/memberships/{id}/reactivate', [GymController::class, 'reactivateMembership']);
        $g->get('/memberships/expiring', [GymController::class, 'expiringMemberships']);
        $g->post('/memberships/send-expiry-alerts', [GymController::class, 'sendExpiryAlerts']);

        // Check-in
        $g->post('/check-in', [GymController::class, 'checkIn']);
        $g->post('/check-out/{id}', [GymController::class, 'checkOut']);
        $g->get('/visits/today', [GymController::class, 'todayVisits']);
        $g->get('/visits/per-day', [GymController::class, 'visitsPerDay']);

        // Payments
        $g->get('/payments', [GymController::class, 'listPayments']);
        $g->get('/payments/monthly-revenue', [GymController::class, 'monthlyRevenue']);

        // Classes
        $g->get('/classes', [GymController::class, 'listClasses']);
        $g->post('/classes', [GymController::class, 'createClass']);
        $g->post('/classes/book', [GymController::class, 'bookClass']);
        $g->post('/classes/bookings/{id}/cancel', [GymController::class, 'cancelClassBooking']);
        $g->get('/classes/{id}/bookings', [GymController::class, 'classBookings']);
    });
};
