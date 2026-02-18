<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Entity\Traits\SoftDeletable;
use Lodgik\Enum\UserRole;

#[ORM\Entity]
#[ORM\Table(name: 'users')]
#[ORM\UniqueConstraint(name: 'uq_users_email_tenant', columns: ['email', 'tenant_id'])]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_users_tenant')]
#[ORM\Index(columns: ['email'], name: 'idx_users_email')]
#[ORM\HasLifecycleCallbacks]
class User implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;
    use SoftDeletable;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $firstName;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $lastName;

    #[ORM\Column(type: Types::STRING, length: 320)]
    private string $email;

    #[ORM\Column(type: Types::STRING, length: 30, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(name: 'password_hash', type: Types::STRING, length: 255)]
    private string $passwordHash;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: UserRole::class)]
    private UserRole $role;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $propertyId = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(name: 'email_verified_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $emailVerifiedAt = null;

    #[ORM\Column(name: 'last_login_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastLoginAt = null;

    #[ORM\Column(name: 'avatar_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $avatarUrl = null;

    #[ORM\Column(name: 'password_reset_token', type: Types::STRING, length: 100, nullable: true)]
    private ?string $passwordResetToken = null;

    #[ORM\Column(name: 'password_reset_expires_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $passwordResetExpiresAt = null;

    #[ORM\Column(name: 'invitation_token', type: Types::STRING, length: 100, nullable: true)]
    private ?string $invitationToken = null;

    #[ORM\Column(name: 'invited_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $invitedAt = null;

    public function __construct(
        string $firstName,
        string $lastName,
        string $email,
        string $passwordHash,
        UserRole $role,
        string $tenantId,
    ) {
        $this->generateId();
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->email = strtolower(trim($email));
        $this->passwordHash = $passwordHash;
        $this->role = $role;
        $this->setTenantId($tenantId);
    }

    // ─── Getters & Setters ─────────────────────────────────────

    public function getFirstName(): string { return $this->firstName; }
    public function setFirstName(string $name): void { $this->firstName = $name; }

    public function getLastName(): string { return $this->lastName; }
    public function setLastName(string $name): void { $this->lastName = $name; }

    public function getFullName(): string { return $this->firstName . ' ' . $this->lastName; }

    public function getEmail(): string { return $this->email; }
    public function setEmail(string $email): void { $this->email = strtolower(trim($email)); }

    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $phone): void { $this->phone = $phone; }

    public function getPasswordHash(): string { return $this->passwordHash; }
    public function setPasswordHash(string $hash): void { $this->passwordHash = $hash; }

    public function getRole(): UserRole { return $this->role; }
    public function setRole(UserRole $role): void { $this->role = $role; }

    public function getPropertyId(): ?string { return $this->propertyId; }
    public function setPropertyId(?string $propertyId): void { $this->propertyId = $propertyId; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }

    public function getEmailVerifiedAt(): ?\DateTimeImmutable { return $this->emailVerifiedAt; }
    public function markEmailVerified(): void { $this->emailVerifiedAt = new \DateTimeImmutable(); }

    public function getLastLoginAt(): ?\DateTimeImmutable { return $this->lastLoginAt; }
    public function touchLogin(): void { $this->lastLoginAt = new \DateTimeImmutable(); }

    public function getAvatarUrl(): ?string { return $this->avatarUrl; }
    public function setAvatarUrl(?string $url): void { $this->avatarUrl = $url; }

    // ─── Password Reset ────────────────────────────────────────

    public function getPasswordResetToken(): ?string { return $this->passwordResetToken; }

    public function setPasswordResetToken(string $token, int $ttlMinutes = 60): void
    {
        $this->passwordResetToken = $token;
        $this->passwordResetExpiresAt = new \DateTimeImmutable("+{$ttlMinutes} minutes");
    }

    public function clearPasswordResetToken(): void
    {
        $this->passwordResetToken = null;
        $this->passwordResetExpiresAt = null;
    }

    public function isPasswordResetTokenValid(string $token): bool
    {
        return $this->passwordResetToken === $token
            && $this->passwordResetExpiresAt !== null
            && $this->passwordResetExpiresAt > new \DateTimeImmutable();
    }

    // ─── Invitation ────────────────────────────────────────────

    public function getInvitationToken(): ?string { return $this->invitationToken; }

    public function setInvitationToken(string $token): void
    {
        $this->invitationToken = $token;
        $this->invitedAt = new \DateTimeImmutable();
    }

    public function clearInvitationToken(): void
    {
        $this->invitationToken = null;
    }

    // ─── Auth helpers ──────────────────────────────────────────

    public function verifyPassword(string $plainPassword): bool
    {
        return password_verify($plainPassword, $this->passwordHash);
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, UserRole::adminRoles(), true);
    }

    public function isManagement(): bool
    {
        return in_array($this->role, UserRole::managementRoles(), true);
    }

    /**
     * JWT claims for this user.
     */
    public function getJwtClaims(): array
    {
        return [
            'user_id' => $this->getId(),
            'tenant_id' => $this->getTenantId(),
            'role' => $this->role->value,
            'property_id' => $this->propertyId,
        ];
    }
}
