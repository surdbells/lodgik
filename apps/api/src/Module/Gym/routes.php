<?php
declare(strict_types=1);
use Lodgik\Module\Gym\GymController;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/gym', function (RouteCollectorProxy $g) {
        $g->get('/dashboard', [GymController::class, 'dashboard']);
        $g->get('/plans', [GymController::class, 'listPlans']);
        $g->post('/plans', [GymController::class, 'createPlan']);
        $g->put('/plans/{id}', [GymController::class, 'updatePlan']);
        $g->get('/members', [GymController::class, 'listMembers']);
        $g->get('/members/{id}', [GymController::class, 'getMember']);
        $g->post('/members', [GymController::class, 'registerMember']);
        $g->put('/members/{id}', [GymController::class, 'updateMember']);
        $g->get('/memberships', [GymController::class, 'listMemberships']);
        $g->post('/memberships', [GymController::class, 'createMembership']);
        $g->post('/memberships/{id}/renew', [GymController::class, 'renewMembership']);
        $g->post('/memberships/{id}/cancel', [GymController::class, 'cancelMembership']);
        $g->get('/check-ins', [GymController::class, 'listCheckIns']);
        $g->post('/check-ins', [GymController::class, 'checkIn']);
        $g->post('/check-ins/{id}/out', [GymController::class, 'checkOut']);
        $g->get('/classes', [GymController::class, 'listClasses']);
        $g->post('/classes', [GymController::class, 'createClass']);
        $g->put('/classes/{id}', [GymController::class, 'updateClass']);
        $g->post('/classes/{id}/enroll', [GymController::class, 'enroll']);
        $g->post('/classes/book', [GymController::class, 'enroll']);
        $g->get('/payments', [GymController::class, 'listPayments']);
        $g->post('/payments', [GymController::class, 'recordPayment']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'gym_staff', 'front_desk']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
