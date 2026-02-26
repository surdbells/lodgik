<?php

declare(strict_types=1);

namespace Lodgik\Module\Auth;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Property;
use Lodgik\Entity\RefreshToken;
use Lodgik\Entity\Tenant;
use Lodgik\Entity\User;
use Lodgik\Enum\SubscriptionStatus;
use Lodgik\Enum\UserRole;
use Lodgik\Module\Auth\DTO\RegisterRequest;
use Lodgik\Repository\RefreshTokenRepository;
use Lodgik\Repository\TenantRepository;
use Lodgik\Repository\UserRepository;
use Lodgik\Service\AuditService;
use Lodgik\Service\JwtService;
use Lodgik\Service\ZeptoMailService;
use Psr\Log\LoggerInterface;

final class AuthService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly JwtService $jwt,
        private readonly TenantRepository $tenantRepo,
        private readonly UserRepository $userRepo,
        private readonly RefreshTokenRepository $refreshTokenRepo,
        private readonly ZeptoMailService $mail,
        private readonly AuditService $audit,
        private readonly LoggerInterface $logger,
        private readonly string $appUrl,
        private readonly ?\Lodgik\Repository\PropertyRepository $propertyRepo = null,
    ) {}

    /**
     * Register a new tenant with admin user and optional first property.
     *
     * @return array{tenant: Tenant, user: User, property: Property|null, access_token: string, refresh_token: string}
     */
    public function register(RegisterRequest $dto): array
    {
        // Generate slug from tenant name
        $slug = $this->generateSlug($dto->tenantName);

        // Check slug uniqueness (disable tenant filter for cross-tenant check)
        $this->disableTenantFilter();
        $wasSoftDeleteEnabled = $this->em->getFilters()->isEnabled('soft_delete');
        if ($wasSoftDeleteEnabled) {
            $this->em->getFilters()->disable('soft_delete');
        }

        if ($this->tenantRepo->slugExists($slug)) {
            if ($wasSoftDeleteEnabled) {
                $this->em->getFilters()->enable('soft_delete');
            }
            $this->restoreTenantFilter();
            throw new \RuntimeException('A business with a similar name already exists. Please choose a different name.');
        }

        // Check email uniqueness across all tenants
        $existingUser = $this->userRepo->findByEmail($dto->email);
        if ($existingUser !== null) {
            if ($wasSoftDeleteEnabled) {
                $this->em->getFilters()->enable('soft_delete');
            }
            $this->restoreTenantFilter();
            throw new \RuntimeException('An account with this email already exists.');
        }

        if ($wasSoftDeleteEnabled) {
            $this->em->getFilters()->enable('soft_delete');
        }

        // Create tenant
        $tenant = new Tenant($dto->tenantName, $slug);
        $tenant->setEmail($dto->email);
        $tenant->setPhone($dto->phone);
        $tenant->setSubscriptionStatus(SubscriptionStatus::TRIAL);
        $tenant->setTrialEndsAt(new \DateTimeImmutable('+14 days'));

        $this->em->persist($tenant);

        // Create admin user
        $passwordHash = password_hash($dto->password, PASSWORD_ARGON2ID);

        $user = new User(
            firstName: $dto->firstName,
            lastName: $dto->lastName,
            email: $dto->email,
            passwordHash: $passwordHash,
            role: UserRole::PROPERTY_ADMIN,
            tenantId: $tenant->getId(),
        );
        $user->setPhone($dto->phone);
        $user->markEmailVerified();

        $this->em->persist($user);

        // Create first property if name provided
        $property = null;
        if ($dto->propertyName !== null && trim($dto->propertyName) !== '') {
            $property = new Property(trim($dto->propertyName), $tenant->getId());
            $this->em->persist($property);
            $user->setPropertyId($property->getId());
        }

        $this->em->flush();

        // Re-enable tenant filter
        $this->restoreTenantFilter();

        // Generate tokens
        $tokens = $this->generateTokenPair($user);

        // Audit log
        $this->audit->logDeferred(
            action: 'register',
            entityType: 'Tenant',
            entityId: $tenant->getId(),
            tenantId: $tenant->getId(),
            userId: $user->getId(),
            description: "Tenant '{$tenant->getName()}' registered by {$user->getFullName()}",
        );
        $this->em->flush();

        // Send welcome email (async-safe: failures don't block registration)
        try {
            $this->mail->sendWelcome($user->getEmail(), $user->getFirstName(), $tenant->getName());
        } catch (\Throwable $e) {
            $this->logger->warning('Failed to send welcome email', ['error' => $e->getMessage()]);
        }

        return [
            'tenant' => $tenant,
            'user' => $user,
            'property' => $property,
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
        ];
    }

    /**
     * Authenticate with email/password.
     *
     * @return array{user: User, tenant: Tenant, access_token: string, refresh_token: string}
     */
    public function login(string $email, string $password, ?string $deviceInfo = null, ?string $ipAddress = null): array
    {
        // Disable tenant filter to search across all tenants
        $this->disableTenantFilter();

        $user = $this->userRepo->findByEmail($email);

        if ($user === null || !$user->verifyPassword($password)) {
            $this->restoreTenantFilter();
            throw new \RuntimeException('Invalid email or password');
        }

        if (!$user->isActive()) {
            $this->restoreTenantFilter();
            throw new \RuntimeException('Your account has been deactivated. Please contact your administrator.');
        }

        if ($user->isDeleted()) {
            $this->restoreTenantFilter();
            throw new \RuntimeException('Invalid email or password');
        }

        // Load tenant (skip for merchant roles — they're platform-level users)
        $isMerchant = in_array($user->getRole(), \Lodgik\Enum\UserRole::merchantRoles(), true);
        $tenant = null;

        if (!$isMerchant) {
            $tenant = $this->tenantRepo->find($user->getTenantId());

            if ($tenant === null || !$tenant->isActive()) {
                $this->restoreTenantFilter();
                throw new \RuntimeException('Your organization is no longer active. Please contact support.');
            }
        }

        $this->restoreTenantFilter();

        // Update last login
        $user->touchLogin();
        $this->em->flush();

        // Generate tokens
        $tokens = $this->generateTokenPair($user, $deviceInfo, $ipAddress);

        return [
            'user' => $user,
            'tenant' => $tenant,
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
        ];
    }

    /**
     * Refresh access token using a valid refresh token.
     *
     * @return array{access_token: string, refresh_token: string}
     */
    public function refresh(string $rawRefreshToken, ?string $deviceInfo = null, ?string $ipAddress = null): array
    {
        $hash = RefreshToken::hashToken($rawRefreshToken);
        $token = $this->refreshTokenRepo->findValidByHash($hash);

        if ($token === null) {
            throw new \RuntimeException('Invalid or expired refresh token');
        }

        // Revoke the used token (rotation)
        $token->revoke();

        // Disable tenant filter to load user
        $this->disableTenantFilter();
        $user = $this->userRepo->find($token->getUserId());
        $this->restoreTenantFilter();

        if ($user === null || !$user->isActive()) {
            throw new \RuntimeException('User account is no longer active');
        }

        // Generate new token pair
        $tokens = $this->generateTokenPair($user, $deviceInfo, $ipAddress);

        $this->em->flush();

        return [
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
        ];
    }

    /**
     * Revoke a specific refresh token (logout from one device).
     */
    public function logout(string $rawRefreshToken): void
    {
        $hash = RefreshToken::hashToken($rawRefreshToken);
        $token = $this->refreshTokenRepo->findByTokenHash($hash);

        if ($token !== null) {
            $token->revoke();
            $this->em->flush();
        }
    }

    /**
     * Revoke all refresh tokens for a user (logout everywhere).
     */
    public function logoutAll(string $userId): int
    {
        $count = $this->refreshTokenRepo->revokeAllForUser($userId);
        return $count;
    }

    /**
     * Initiate password reset — generate token and send email.
     */
    public function forgotPassword(string $email): void
    {
        // Always return success to prevent email enumeration
        $this->disableTenantFilter();
        $user = $this->userRepo->findByEmail($email);
        $this->restoreTenantFilter();

        if ($user === null || !$user->isActive()) {
            return; // Silent fail — no email enumeration
        }

        // Generate secure token
        $token = bin2hex(random_bytes(32));
        $user->setPasswordResetToken($token, 60); // 60 minutes
        $this->em->flush();

        // Send email
        try {
            $this->mail->sendPasswordReset(
                $user->getEmail(),
                $user->getFirstName(),
                $token,
                $this->appUrl,
            );
        } catch (\Throwable $e) {
            $this->logger->error('Failed to send password reset email', [
                'user_id' => $user->getId(),
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Reset password using a valid token.
     */
    public function resetPassword(string $email, string $token, string $newPassword): void
    {
        $this->disableTenantFilter();
        $user = $this->userRepo->findByEmail($email);
        $this->restoreTenantFilter();

        if ($user === null) {
            throw new \RuntimeException('Invalid reset token');
        }

        if (!$user->isPasswordResetTokenValid($token)) {
            throw new \RuntimeException('Invalid or expired reset token');
        }

        $user->setPasswordHash(password_hash($newPassword, PASSWORD_ARGON2ID));
        $user->clearPasswordResetToken();

        // Revoke all refresh tokens (force re-login)
        $this->refreshTokenRepo->revokeAllForUser($user->getId());

        $this->em->flush();

        $this->audit->logDeferred(
            action: 'password_reset',
            entityType: 'User',
            entityId: $user->getId(),
            tenantId: $user->getTenantId(),
            userId: $user->getId(),
            description: "Password reset for {$user->getEmail()}",
        );
        $this->em->flush();
    }

    /**
     * Accept a staff invitation — set password and activate user.
     */
    public function acceptInvitation(string $inviteToken, string $password): User
    {
        $this->disableTenantFilter();
        $user = $this->userRepo->findByInvitationToken($inviteToken);
        $this->restoreTenantFilter();

        if ($user === null) {
            throw new \RuntimeException('Invalid invitation token');
        }

        $user->setPasswordHash(password_hash($password, PASSWORD_ARGON2ID));
        $user->clearInvitationToken();
        $user->markEmailVerified();
        $user->setIsActive(true);
        $this->em->flush();

        return $user;
    }

    // ─── Private helpers ───────────────────────────────────────

    /**
     * @return array{access_token: string, refresh_token: string}
     */
    private function generateTokenPair(User $user, ?string $deviceInfo = null, ?string $ipAddress = null): array
    {
        $accessToken = $this->jwt->createAccessToken($user->getJwtClaims());

        // Generate raw refresh token and store hash
        $rawRefresh = bin2hex(random_bytes(32));
        $hash = RefreshToken::hashToken($rawRefresh);

        $expiresAt = new \DateTimeImmutable('+' . $this->jwt->getRefreshTtl() . ' seconds');

        $refreshEntity = new RefreshToken(
            userId: $user->getId(),
            tokenHash: $hash,
            expiresAt: $expiresAt,
            deviceInfo: $deviceInfo,
            ipAddress: $ipAddress,
        );

        $this->em->persist($refreshEntity);
        $this->em->flush();

        return [
            'access_token' => $accessToken,
            'refresh_token' => $rawRefresh,
        ];
    }

    private function generateSlug(string $name): string
    {
        $slug = strtolower(trim($name));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        $slug = trim($slug, '-');

        // Limit length
        if (mb_strlen($slug) > 80) {
            $slug = substr($slug, 0, 80);
        }

        return $slug;
    }

    /**
     * Safely disable the tenant filter (no-op if not enabled).
     */
    private bool $wasTenantFilterEnabled = false;

    private function disableTenantFilter(): void
    {
        $filters = $this->em->getFilters();
        $this->wasTenantFilterEnabled = $filters->isEnabled('tenant');

        if ($this->wasTenantFilterEnabled) {
            $filters->disable('tenant');
        }
    }

    /**
     * Restore the tenant filter to its previous state.
     */
    private function restoreTenantFilter(): void
    {
        if ($this->wasTenantFilterEnabled) {
            $this->em->getFilters()->enable('tenant');
        }
    }

    // ═══ Multi-Property: Switch Property ══════════════════════════

    /**
     * Switch the user's active property and issue new JWT.
     * Validates user has access to the requested property.
     *
     * @return array{user: User, access_token: string, refresh_token: string, property: array}
     */
    public function switchProperty(string $userId, string $tenantId, string $targetPropertyId, ?string $deviceInfo = null, ?string $ipAddress = null): array
    {
        $user = $this->userRepo->find($userId);
        if ($user === null) {
            throw new \RuntimeException('User not found');
        }

        // Validate property exists and belongs to the same tenant
        $property = $this->propertyRepo?->find($targetPropertyId);
        if ($property === null) {
            throw new \RuntimeException('Property not found');
        }

        if ($property->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Property does not belong to your organization');
        }

        if (!$property->isActive()) {
            throw new \RuntimeException('Property is inactive');
        }

        // Check if user has access (property_admin can access all; others need matching property_id or access record)
        $hasAccess = $this->userHasPropertyAccess($user, $targetPropertyId, $tenantId);
        if (!$hasAccess) {
            throw new \RuntimeException('You do not have access to this property');
        }

        // Update user's active property
        $user->setPropertyId($targetPropertyId);
        $this->em->flush();

        // Generate new tokens with updated property_id
        $tokens = $this->generateTokenPair($user, $deviceInfo, $ipAddress);

        return [
            'user' => $user,
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'property' => [
                'id' => $property->getId(),
                'name' => $property->getName(),
            ],
        ];
    }

    /**
     * Get all properties the user can access within their tenant.
     *
     * @return array<array{id: string, name: string, is_current: bool}>
     */
    public function getAccessibleProperties(string $userId, string $tenantId): array
    {
        $user = $this->userRepo->find($userId);
        if ($user === null) {
            return [];
        }

        // Get all tenant properties
        $allProperties = $this->em->getRepository(\Lodgik\Entity\Property::class)
            ->findBy(['tenantId' => $tenantId, 'isActive' => true], ['name' => 'ASC']);

        $currentPropertyId = $user->getPropertyId();
        $role = $user->getRole();

        $result = [];
        foreach ($allProperties as $prop) {
            $hasAccess = $this->userHasPropertyAccess($user, $prop->getId(), $tenantId);
            if ($hasAccess) {
                $result[] = [
                    'id' => $prop->getId(),
                    'name' => $prop->getName(),
                    'city' => method_exists($prop, 'getCity') ? $prop->getCity() : null,
                    'is_current' => $prop->getId() === $currentPropertyId,
                ];
            }
        }

        return $result;
    }

    /**
     * Check if a user has access to a given property.
     *
     * Access rules:
     * - property_admin: can access ALL properties in their tenant
     * - manager: can access ALL properties in their tenant
     * - Other roles: can only access their assigned property OR properties in user_property_access table
     */
    private function userHasPropertyAccess(User $user, string $propertyId, string $tenantId): bool
    {
        $role = $user->getRole();

        // Admins and managers can access all properties
        if (in_array($role->value, ['super_admin', 'property_admin', 'manager'], true)) {
            return true;
        }

        // Check if it's their assigned property
        if ($user->getPropertyId() === $propertyId) {
            return true;
        }

        // Check user_property_access table (if it exists)
        try {
            $conn = $this->em->getConnection();
            $count = (int) $conn->fetchOne(
                'SELECT COUNT(*) FROM user_property_access WHERE user_id = ? AND property_id = ?',
                [$user->getId(), $propertyId]
            );
            return $count > 0;
        } catch (\Throwable) {
            // Table might not exist yet — fall back to property_id check only
            return false;
        }
    }
}
