<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Entity;

use Lodgik\Entity\RefreshToken;
use Lodgik\Entity\User;
use Lodgik\Enum\UserRole;
use PHPUnit\Framework\TestCase;

final class AuthEntityTest extends TestCase
{
    public function testUserVerifyPasswordWorks(): void
    {
        $hash = password_hash('secret123', PASSWORD_ARGON2ID);
        $user = new User('John', 'Doe', 'john@test.com', $hash, UserRole::PROPERTY_ADMIN, 'tenant-1');

        $this->assertTrue($user->verifyPassword('secret123'));
        $this->assertFalse($user->verifyPassword('wrongpassword'));
    }

    public function testUserEmailNormalized(): void
    {
        $hash = password_hash('pass', PASSWORD_ARGON2ID);
        $user = new User('A', 'B', '  John@Test.COM  ', $hash, UserRole::MANAGER, 't1');

        $this->assertSame('john@test.com', $user->getEmail());
    }

    public function testUserJwtClaims(): void
    {
        $hash = password_hash('pass', PASSWORD_ARGON2ID);
        $user = new User('A', 'B', 'a@b.com', $hash, UserRole::FRONT_DESK, 'tenant-1');
        $user->setPropertyId('prop-1');

        $claims = $user->getJwtClaims();

        $this->assertSame('tenant-1', $claims['tenant_id']);
        $this->assertSame('front_desk', $claims['role']);
        $this->assertSame('prop-1', $claims['property_id']);
        $this->assertNotEmpty($claims['user_id']);
    }

    public function testUserIsAdmin(): void
    {
        $hash = password_hash('pass', PASSWORD_ARGON2ID);

        $admin = new User('A', 'B', 'a@b.com', $hash, UserRole::PROPERTY_ADMIN, 't1');
        $this->assertTrue($admin->isAdmin());

        $staff = new User('A', 'B', 'c@d.com', $hash, UserRole::FRONT_DESK, 't1');
        $this->assertFalse($staff->isAdmin());
    }

    public function testPasswordResetToken(): void
    {
        $hash = password_hash('pass', PASSWORD_ARGON2ID);
        $user = new User('A', 'B', 'a@b.com', $hash, UserRole::MANAGER, 't1');

        $user->setPasswordResetToken('abc123', 60);

        $this->assertTrue($user->isPasswordResetTokenValid('abc123'));
        $this->assertFalse($user->isPasswordResetTokenValid('wrong'));

        $user->clearPasswordResetToken();
        $this->assertFalse($user->isPasswordResetTokenValid('abc123'));
    }

    public function testRefreshTokenHashing(): void
    {
        $raw = 'my-secret-refresh-token';
        $hash = RefreshToken::hashToken($raw);

        $this->assertSame(hash('sha256', $raw), $hash);
        $this->assertSame(64, strlen($hash));
    }

    public function testRefreshTokenValidity(): void
    {
        $token = new RefreshToken(
            userId: 'user-1',
            tokenHash: 'hash123',
            expiresAt: new \DateTimeImmutable('+1 hour'),
        );

        $this->assertTrue($token->isValid());
        $this->assertFalse($token->isExpired());
        $this->assertFalse($token->isRevoked());

        $token->revoke();
        $this->assertFalse($token->isValid());
        $this->assertTrue($token->isRevoked());
    }

    public function testRefreshTokenExpiry(): void
    {
        $token = new RefreshToken(
            userId: 'user-1',
            tokenHash: 'hash123',
            expiresAt: new \DateTimeImmutable('-1 hour'),
        );

        $this->assertTrue($token->isExpired());
        $this->assertFalse($token->isValid());
    }
}
