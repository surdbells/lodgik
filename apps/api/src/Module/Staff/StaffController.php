<?php

declare(strict_types=1);

namespace Lodgik\Module\Staff;

use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Module\Staff\DTO\InviteStaffRequest;
use Lodgik\Module\Staff\DTO\UpdateStaffRequest;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class StaffController
{
    public function __construct(
        private readonly StaffService $staffService,
        private readonly ResponseHelper $response,
    ) {}

    /**
     * GET /api/staff
     */
    public function list(Request $request, Response $response): Response
    {
        $pagination = PaginationHelper::fromRequest($request);
        $search = PaginationHelper::searchFromRequest($request);
        $filters = PaginationHelper::filtersFromRequest($request, ['property_id', 'role', 'active']);

        $activeOnly = null;
        if (isset($filters['active'])) {
            $activeOnly = $filters['active'] === 'true' || $filters['active'] === '1';
        }

        $result = $this->staffService->list(
            propertyId: $filters['property_id'] ?? null,
            search: $search,
            role: $filters['role'] ?? null,
            activeOnly: $activeOnly,
            page: $pagination['page'],
            limit: $pagination['limit'],
        );

        $items = array_map(fn($u) => $this->serializeUser($u), $result['items']);

        return $this->response->paginated(
            $response,
            $items,
            $result['total'],
            $pagination['page'],
            $pagination['limit'],
        );
    }

    /**
     * GET /api/staff/{id}
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $user = $this->staffService->getById($args['id']);

        if ($user === null) {
            return $this->response->notFound($response, 'Staff member not found');
        }

        return $this->response->success($response, $this->serializeUser($user));
    }

    /** POST /api/staff — create staff directly (active, with password) */
    public function create(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        foreach (['first_name', 'last_name', 'email', 'password', 'role'] as $f) {
            if (empty($body[$f])) return $this->response->validationError($response, ["$f is required"]);
        }
        try {
            $user = $this->staffService->createDirect(
                firstName: $body['first_name'],
                lastName: $body['last_name'],
                email: $body['email'],
                password: $body['password'],
                roleStr: $body['role'],
                tenantId: $request->getAttribute('auth.tenant_id'),
                propertyId: $request->getAttribute('auth.property_id') ?? '',
                actorId: $request->getAttribute('auth.user_id'),
            );
            return $this->response->success($response, $this->serializeUser($user), 'Staff member created');
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /**
     * POST /api/staff/invite
     */
    public function invite(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = InviteStaffRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        $tenantId = $request->getAttribute('auth.tenant_id');
        $userId = $request->getAttribute('auth.user_id');
        $claims = $request->getAttribute('auth.claims', []);

        // Build inviter name from claims or fallback
        $inviterName = $claims['name'] ?? 'Admin';

        try {
            $user = $this->staffService->invite($dto, $tenantId, $userId, $inviterName);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 409);
        }

        return $this->response->created($response, $this->serializeUser($user), 'Invitation sent successfully');
    }

    /**
     * PATCH /api/staff/{id}
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = UpdateStaffRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        $actorId = $request->getAttribute('auth.user_id');

        try {
            $user = $this->staffService->update($args['id'], $dto, $actorId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $this->serializeUser($user), 'Staff member updated');
    }

    /**
     * DELETE /api/staff/{id}
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $actorId = $request->getAttribute('auth.user_id');
        $tenantId = $request->getAttribute('auth.tenant_id');

        try {
            $this->staffService->delete($args['id'], $actorId, $tenantId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->noContent($response);
    }

    /**
     * POST /api/staff/{id}/resend-invite
     */
    public function resendInvite(Request $request, Response $response, array $args): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $claims = $request->getAttribute('auth.claims', []);
        $inviterName = $claims['name'] ?? 'Admin';

        try {
            $this->staffService->resendInvitation($args['id'], $tenantId, $inviterName);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, null, 'Invitation resent successfully');
    }

    private function serializeUser(object $user): array
    {
        return [
            'id' => $user->getId(),
            'first_name' => $user->getFirstName(),
            'last_name' => $user->getLastName(),
            'full_name' => $user->getFullName(),
            'email' => $user->getEmail(),
            'phone' => $user->getPhone(),
            'role' => $user->getRole()->value,
            'role_label' => $user->getRole()->label(),
            'property_id' => $user->getPropertyId(),
            'is_active' => $user->isActive(),
            'email_verified_at' => $user->getEmailVerifiedAt()?->format(\DateTimeInterface::ATOM),
            'last_login_at' => $user->getLastLoginAt()?->format(\DateTimeInterface::ATOM),
            'avatar_url' => $user->getAvatarUrl(),
            'has_pending_invite' => $user->getInvitationToken() !== null,
            'created_at' => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }
}
