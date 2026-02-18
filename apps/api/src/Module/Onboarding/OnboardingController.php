<?php

declare(strict_types=1);

namespace Lodgik\Module\Onboarding;

use Lodgik\Helper\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class OnboardingController
{
    public function __construct(
        private readonly OnboardingService $onboardingService,
        private readonly ResponseHelper $response,
    ) {}

    // ─── Public: Register (Steps 1-3) ──────────────────────────

    /**
     * POST /api/onboarding/register
     * Self-service registration: creates tenant + admin + property.
     */
    public function register(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $errors = $this->validateRegistration($body);
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $result = $this->onboardingService->registerTenant($body);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 409);
        }

        return $this->response->created($response, [
            'tenant_id' => $result['tenant']->getId(),
            'tenant_name' => $result['tenant']->getName(),
            'user_id' => $result['user']->getId(),
            'property_id' => $result['property']->getId(),
            'trial_ends_at' => $result['tenant']->getTrialEndsAt()?->format('c'),
        ], 'Registration successful. Your 14-day free trial has started.');
    }

    /**
     * POST /api/onboarding/register-with-invite
     * Register using a tenant invitation token.
     */
    public function registerWithInvite(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $token = $body['invitation_token'] ?? '';

        if (empty($token)) {
            return $this->response->validationError($response, ['invitation_token' => 'Required']);
        }

        try {
            $invitation = $this->onboardingService->verifyInvitation($token);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        // Override hotel name from invitation
        $body['hotel_name'] = $body['hotel_name'] ?? $invitation->getHotelName();
        $body['hotel_email'] = $body['hotel_email'] ?? $invitation->getEmail();

        $errors = $this->validateRegistration($body);
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $result = $this->onboardingService->registerTenant($body);
            $invitation->accept($result['tenant']->getId());

            // Auto-assign suggested plan
            if ($invitation->getSuggestedPlanId()) {
                $this->onboardingService->selectPlan($result['tenant']->getId(), $invitation->getSuggestedPlanId());
            }
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 409);
        }

        return $this->response->created($response, [
            'tenant_id' => $result['tenant']->getId(),
            'tenant_name' => $result['tenant']->getName(),
            'user_id' => $result['user']->getId(),
            'property_id' => $result['property']->getId(),
        ], 'Registration via invitation successful.');
    }

    /**
     * GET /api/onboarding/verify-invite/{token}
     * Verify an invitation token (public, before registration form).
     */
    public function verifyInvite(Request $request, Response $response, array $args): Response
    {
        try {
            $invitation = $this->onboardingService->verifyInvitation($args['token']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, [
            'hotel_name' => $invitation->getHotelName(),
            'email' => $invitation->getEmail(),
            'contact_name' => $invitation->getContactName(),
            'suggested_plan_id' => $invitation->getSuggestedPlanId(),
            'expires_at' => $invitation->getExpiresAt()->format('c'),
        ]);
    }

    // ─── Authenticated: Steps 4-7 ─────────────────────────────

    /**
     * GET /api/onboarding/progress
     * Get onboarding wizard progress.
     */
    public function progress(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        try {
            $data = $this->onboardingService->getProgress($tenantId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
        return $this->response->success($response, $data);
    }

    /**
     * POST /api/onboarding/bank-account
     * Step 4: Set up bank account.
     */
    public function bankAccount(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $body = (array) ($request->getParsedBody() ?? []);

        $required = ['property_id', 'bank_name', 'account_number', 'account_name'];
        $errors = [];
        foreach ($required as $f) {
            if (empty($body[$f])) $errors[$f] = 'Required';
        }
        if (!empty($errors)) return $this->response->validationError($response, $errors);

        try {
            $bank = $this->onboardingService->setupBankAccount($tenantId, $body['property_id'], $body);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->created($response, [
            'id' => $bank->getId(),
            'bank_name' => $bank->getBankName(),
            'account_number' => $bank->getAccountNumber(),
            'is_primary' => $bank->isPrimary(),
        ], 'Bank account added');
    }

    /**
     * POST /api/onboarding/branding
     * Step 5: Update branding.
     */
    public function branding(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $body = (array) ($request->getParsedBody() ?? []);

        try {
            $tenant = $this->onboardingService->updateBranding($tenantId, $body);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, [
            'primary_color' => $tenant->getPrimaryColor(),
            'secondary_color' => $tenant->getSecondaryColor(),
            'logo_url' => $tenant->getLogoUrl(),
        ], 'Branding updated');
    }

    /**
     * POST /api/onboarding/select-plan
     * Step 6: Choose subscription plan.
     */
    public function selectPlan(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $body = (array) ($request->getParsedBody() ?? []);

        if (empty($body['plan_id'])) {
            return $this->response->validationError($response, ['plan_id' => 'Required']);
        }

        try {
            $tenant = $this->onboardingService->selectPlan($tenantId, $body['plan_id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, [
            'plan_id' => $tenant->getSubscriptionPlanId(),
            'max_rooms' => $tenant->getMaxRooms(),
            'max_staff' => $tenant->getMaxStaff(),
            'max_properties' => $tenant->getMaxProperties(),
            'trial_ends_at' => $tenant->getTrialEndsAt()?->format('c'),
        ], 'Plan selected');
    }

    /**
     * POST /api/onboarding/invite-staff
     * Step 7: Bulk invite staff.
     */
    public function inviteStaff(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $userId = $request->getAttribute('auth.user_id');
        $propertyId = $request->getAttribute('auth.property_id');
        $body = (array) ($request->getParsedBody() ?? []);

        $invites = $body['invites'] ?? [];
        if (!is_array($invites) || empty($invites)) {
            return $this->response->validationError($response, ['invites' => 'Provide an array of staff to invite']);
        }

        try {
            $result = $this->onboardingService->inviteStaff($tenantId, $propertyId, $userId, $invites);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $result,
            "Invited {$result['invited']} staff members" .
            ($result['skipped'] > 0 ? ", {$result['skipped']} skipped (already exist)" : ''));
    }

    // ─── Admin: Tenant Invitations ─────────────────────────────

    /**
     * POST /api/admin/invitations
     * Create a tenant invitation.
     */
    public function createInvitation(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $userId = $request->getAttribute('auth.user_id');

        $errors = [];
        if (empty($body['email'])) $errors['email'] = 'Required';
        if (empty($body['hotel_name'])) $errors['hotel_name'] = 'Required';
        if (!empty($errors)) return $this->response->validationError($response, $errors);

        try {
            $invitation = $this->onboardingService->createInvitation($body, $userId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->created($response, [
            'id' => $invitation->getId(),
            'email' => $invitation->getEmail(),
            'hotel_name' => $invitation->getHotelName(),
            'token' => $invitation->getToken(),
            'expires_at' => $invitation->getExpiresAt()->format('c'),
            'status' => $invitation->getStatus(),
        ], 'Invitation created');
    }

    /**
     * GET /api/admin/invitations
     * List tenant invitations.
     */
    public function listInvitations(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $page = max(1, (int) ($params['page'] ?? 1));
        $limit = min(50, max(1, (int) ($params['limit'] ?? 20)));
        $status = $params['status'] ?? null;

        $result = $this->onboardingService->listInvitations($page, $limit, $status);

        $items = array_map(fn($i) => [
            'id' => $i->getId(),
            'email' => $i->getEmail(),
            'hotel_name' => $i->getHotelName(),
            'contact_name' => $i->getContactName(),
            'status' => $i->getStatus(),
            'tenant_id' => $i->getTenantId(),
            'expires_at' => $i->getExpiresAt()->format('c'),
            'created_at' => $i->getCreatedAt()?->format('c'),
        ], $result['items']);

        return $this->response->paginated($response, $items, $result['total'], $page, $limit);
    }

    /**
     * DELETE /api/admin/invitations/{id}
     * Revoke an invitation.
     */
    public function revokeInvitation(Request $request, Response $response, array $args): Response
    {
        try {
            $this->onboardingService->revokeInvitation($args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, null, 'Invitation revoked');
    }

    // ─── Upload: Logo ──────────────────────────────────────────

    /**
     * POST /api/onboarding/upload-logo
     */
    public function uploadLogo(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $body = (array) ($request->getParsedBody() ?? []);

        if (empty($body['logo_base64'])) {
            return $this->response->validationError($response, ['logo_base64' => 'Required']);
        }

        try {
            $tenant = $this->onboardingService->updateBranding($tenantId, [
                'logo_base64' => $body['logo_base64'],
            ]);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, [
            'logo_url' => $tenant->getLogoUrl(),
        ], 'Logo uploaded');
    }

    // ─── Validation ────────────────────────────────────────────

    private function validateRegistration(array $body): array
    {
        $errors = [];
        if (empty($body['hotel_name'])) $errors['hotel_name'] = 'Required';
        if (empty($body['admin_first_name'])) $errors['admin_first_name'] = 'Required';
        if (empty($body['admin_last_name'])) $errors['admin_last_name'] = 'Required';
        if (empty($body['admin_email'])) $errors['admin_email'] = 'Required';
        elseif (!filter_var($body['admin_email'], FILTER_VALIDATE_EMAIL)) $errors['admin_email'] = 'Invalid email';
        if (empty($body['admin_password'])) $errors['admin_password'] = 'Required';
        elseif (strlen($body['admin_password']) < 8) $errors['admin_password'] = 'Minimum 8 characters';
        return $errors;
    }
}
