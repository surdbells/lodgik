<?php

declare(strict_types=1);

namespace Lodgik\Module\Auth;

use Lodgik\Helper\ResponseHelper;
use Lodgik\Module\Auth\DTO\ForgotPasswordRequest;
use Lodgik\Module\Auth\DTO\LoginRequest;
use Lodgik\Module\Auth\DTO\RegisterRequest;
use Lodgik\Module\Auth\DTO\ResetPasswordRequest;
use OpenApi\Attributes as OA;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AuthController
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly ResponseHelper $response,
    ) {}

    #[OA\Post(
        path: "/api/auth/register",
        summary: "Register new tenant and admin user",
        tags: ["Auth"],
        security: [],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: "tenant_name", type: "string", example: "Grand Palace Hotel"),
                new OA\Property(property: "first_name", type: "string", example: "John"),
                new OA\Property(property: "last_name", type: "string", example: "Doe"),
                new OA\Property(property: "email", type: "string", format: "email"),
                new OA\Property(property: "password", type: "string", format: "password"),
            ])
        ),
        responses: [
            new OA\Response(response: 201, description: "Tenant created with admin user"),
            new OA\Response(response: 422, description: "Validation error")
        ]
    )]

    /**
     * POST /api/auth/register
     */
    public function register(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = RegisterRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $result = $this->authService->register($dto);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 409);
        }

        return $this->response->created($response, [
            'tenant' => $this->serializeTenant($result['tenant']),
            'user' => $this->serializeUser($result['user']),
            'property' => $result['property'] ? [
                'id' => $result['property']->getId(),
                'name' => $result['property']->getName(),
            ] : null,
            'access_token' => $result['access_token'],
            'refresh_token' => $result['refresh_token'],
            'token_type' => 'Bearer',
            'expires_in' => 900,
        ], 'Account created successfully');
    }

    /**
     * POST /api/auth/login
     */
    #[OA\Post(
        path: "/api/auth/login",
        summary: "Authenticate user and get JWT tokens",
        tags: ["Auth"],
        security: [],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: "email", type: "string", format: "email"),
                new OA\Property(property: "password", type: "string", format: "password"),
            ])
        ),
        responses: [
            new OA\Response(response: 200, description: "Access and refresh tokens returned"),
            new OA\Response(response: 401, description: "Invalid credentials")
        ]
    )]
    public function login(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = LoginRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        $deviceInfo = $request->getHeaderLine('User-Agent') ?: null;
        $ip = $request->getServerParams()['REMOTE_ADDR'] ?? null;

        try {
            $result = $this->authService->login($dto->email, $dto->password, $deviceInfo, $ip);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 401);
        }

        return $this->response->success($response, [
            'user' => $this->serializeUser($result['user']),
            'tenant' => $this->serializeTenant($result['tenant']),
            'access_token' => $result['access_token'],
            'refresh_token' => $result['refresh_token'],
            'token_type' => 'Bearer',
            'expires_in' => 900,
        ], 'Login successful');
    }

    /**
     * POST /api/auth/refresh
     */
    public function refresh(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $refreshToken = $body['refresh_token'] ?? '';

        if (trim($refreshToken) === '') {
            return $this->response->validationError($response, [
                'refresh_token' => 'Refresh token is required',
            ]);
        }

        $deviceInfo = $request->getHeaderLine('User-Agent') ?: null;
        $ip = $request->getServerParams()['REMOTE_ADDR'] ?? null;

        try {
            $tokens = $this->authService->refresh($refreshToken, $deviceInfo, $ip);
        } catch (\RuntimeException $e) {
            return $this->response->unauthorized($response, $e->getMessage());
        }

        return $this->response->success($response, [
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'token_type' => 'Bearer',
            'expires_in' => 900,
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $refreshToken = $body['refresh_token'] ?? '';

        if (trim($refreshToken) !== '') {
            $this->authService->logout($refreshToken);
        }

        return $this->response->success($response, null, 'Logged out successfully');
    }

    /**
     * POST /api/auth/logout-all
     */
    public function logoutAll(Request $request, Response $response): Response
    {
        $userId = $request->getAttribute('auth.user_id');

        if ($userId === null) {
            return $this->response->unauthorized($response);
        }

        $count = $this->authService->logoutAll($userId);

        return $this->response->success($response, [
            'revoked_sessions' => $count,
        ], 'All sessions revoked');
    }

    /**
     * POST /api/auth/forgot-password
     */
    public function forgotPassword(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = ForgotPasswordRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        $this->authService->forgotPassword($dto->email);

        // Always return success to prevent email enumeration
        return $this->response->success(
            $response,
            null,
            'If an account with that email exists, a password reset link has been sent.'
        );
    }

    /**
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = ResetPasswordRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $this->authService->resetPassword($dto->email, $dto->token, $dto->password);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success(
            $response,
            null,
            'Password has been reset successfully. Please log in with your new password.'
        );
    }

    /**
     * POST /api/auth/accept-invite
     */
    public function acceptInvite(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $token = $body['token'] ?? '';
        $password = $body['password'] ?? '';

        $errors = [];
        if (trim($token) === '') {
            $errors['token'] = 'Invitation token is required';
        }
        if ($password === '' || mb_strlen($password) < 8) {
            $errors['password'] = 'Password must be at least 8 characters';
        }

        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $user = $this->authService->acceptInvitation($token, $password);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, [
            'user' => $this->serializeUser($user),
        ], 'Invitation accepted. You can now log in.');
    }

    /**
     * GET /api/auth/me
     */
    #[OA\Get(
        path: "/api/auth/me",
        summary: "Get current authenticated user profile",
        tags: ["Auth"],
        responses: [
            new OA\Response(response: 200, description: "User profile"),
            new OA\Response(response: 401, description: "Unauthorized")
        ]
    )]
    public function me(Request $request, Response $response): Response
    {
        $userId = $request->getAttribute('auth.user_id');
        $tenantId = $request->getAttribute('auth.tenant_id');
        $role = $request->getAttribute('auth.role');
        $propertyId = $request->getAttribute('auth.property_id');

        return $this->response->success($response, [
            'user_id' => $userId,
            'tenant_id' => $tenantId,
            'role' => $role,
            'property_id' => $propertyId,
        ]);
    }

    // ─── Serializers ───────────────────────────────────────────

    private function serializeUser(object $user): array
    {
        return [
            'id' => $user->getId(),
            'first_name' => $user->getFirstName(),
            'last_name' => $user->getLastName(),
            'email' => $user->getEmail(),
            'phone' => $user->getPhone(),
            'role' => $user->getRole()->value,
            'property_id' => $user->getPropertyId(),
            'avatar_url' => $user->getAvatarUrl(),
        ];
    }

    private function serializeTenant(object $tenant): array
    {
        return [
            'id' => $tenant->getId(),
            'name' => $tenant->getName(),
            'slug' => $tenant->getSlug(),
            'subscription_status' => $tenant->getSubscriptionStatus()->value,
            'trial_ends_at' => $tenant->getTrialEndsAt()?->format(\DateTimeInterface::ATOM),
            'enabled_modules' => $tenant->getEnabledModules(),
            'primary_color' => $tenant->getPrimaryColor(),
            'logo_url' => $tenant->getLogoUrl(),
            'currency' => $tenant->getCurrency(),
            'timezone' => $tenant->getTimezone(),
        ];
    }
}
