<?php declare(strict_types=1);

use Lodgik\Middleware\{AuthMiddleware, RoleMiddleware, TenantMiddleware};
use Lodgik\Module\HR\HRController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/hr', function (RouteCollectorProxy $g) {

        // ── Phase B: Documents & Job History ─────────────────────────────
        $g->get('/employees/{id}/documents',                          [HRController::class, 'listDocuments']);
        $g->post('/employees/{id}/documents',                         [HRController::class, 'createDocument']);
        $g->delete('/employees/{id}/documents/{docId}',               [HRController::class, 'deleteDocument']);
        $g->get('/employees/{id}/job-history',                        [HRController::class, 'listJobHistory']);
        $g->post('/employees/{id}/job-history',                       [HRController::class, 'addJobHistory']);

        // ── Phase C: Recruitment ─────────────────────────────────────────
        $g->get('/job-openings',                                      [HRController::class, 'listOpenings']);
        $g->post('/job-openings',                                     [HRController::class, 'createOpening']);
        $g->put('/job-openings/{id}',                                 [HRController::class, 'updateOpening']);
        $g->get('/job-openings/{id}/applications',                    [HRController::class, 'listApplications']);
        $g->post('/job-openings/{id}/applications',                   [HRController::class, 'createApplication']);
        $g->patch('/job-openings/{id}/applications/{appId}',          [HRController::class, 'updateApplication']);

        // ── Phase C: Onboarding ──────────────────────────────────────────
        $g->get('/employees/{id}/onboarding',                         [HRController::class, 'listOnboarding']);
        $g->post('/employees/{id}/onboarding',                        [HRController::class, 'addOnboardingTask']);
        $g->post('/employees/{id}/onboarding/seed',                   [HRController::class, 'seedDefaultOnboarding']);
        $g->post('/employees/{id}/onboarding/{taskId}/complete',      [HRController::class, 'completeOnboardingTask']);

        // ── Phase F: Payroll Components ──────────────────────────────────
        $g->get('/payroll-components',                                [HRController::class, 'listComponents']);
        $g->post('/payroll-components',                               [HRController::class, 'createComponent']);
        $g->put('/payroll-components/{id}',                           [HRController::class, 'updateComponent']);

        // ── Phase G: Performance Goals ───────────────────────────────────
        $g->get('/employees/{id}/goals',                              [HRController::class, 'listGoals']);
        $g->post('/employees/{id}/goals',                             [HRController::class, 'createGoal']);
        $g->patch('/employees/{id}/goals/{goalId}',                   [HRController::class, 'updateGoal']);

        // ── Phase I: Expense Claims ──────────────────────────────────────
        $g->get('/expense-claims',                                    [HRController::class, 'listClaims']);
        $g->get('/expense-claims/{id}',                               [HRController::class, 'getClaim']);
        $g->post('/expense-claims',                                   [HRController::class, 'createClaim']);
        $g->post('/expense-claims/{id}/submit',                       [HRController::class, 'submitClaim']);
        $g->post('/expense-claims/{id}/approve',                      [HRController::class, 'approveClaim']);
        $g->post('/expense-claims/{id}/reject',                       [HRController::class, 'rejectClaim']);
        $g->post('/expense-claims/{id}/paid',                         [HRController::class, 'markClaimPaid']);

        // ── Phase J: Training ────────────────────────────────────────────
        $g->get('/training',                                          [HRController::class, 'listTraining']);
        $g->post('/training',                                         [HRController::class, 'createTraining']);
        $g->put('/training/{id}',                                     [HRController::class, 'updateTraining']);

        // ── Phase K: Offboarding ─────────────────────────────────────────
        $g->get('/employees/{id}/offboarding',                        [HRController::class, 'listOffboarding']);
        $g->post('/employees/{id}/offboarding',                       [HRController::class, 'addOffboardingTask']);
        $g->post('/employees/{id}/offboarding/seed',                  [HRController::class, 'seedDefaultOffboarding']);
        $g->post('/employees/{id}/offboarding/{taskId}/complete',     [HRController::class, 'completeOffboardingTask']);

        // ── Phase L: HR Analytics ────────────────────────────────────────
        $g->get('/analytics',                                         [HRController::class, 'analytics']);

    })
    ->add(new RoleMiddleware(['property_admin', 'manager', 'accountant', 'hr']))
    ->add(TenantMiddleware::class)
    ->add(AuthMiddleware::class);
};
