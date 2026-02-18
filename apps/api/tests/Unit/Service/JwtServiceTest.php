<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Service;

use Lodgik\Service\JwtService;
use PHPUnit\Framework\TestCase;

final class JwtServiceTest extends TestCase
{
    private JwtService $jwt;

    protected function setUp(): void
    {
        $this->jwt = new JwtService(
            secret: 'test-secret-key-that-is-long-enough-for-hmac',
            accessTtl: 900,
            refreshTtl: 604800,
        );
    }

    public function testCreateAndDecodeAccessToken(): void
    {
        $claims = [
            'user_id' => 'user-123',
            'tenant_id' => 'tenant-456',
            'role' => 'property_admin',
        ];

        $token = $this->jwt->createAccessToken($claims);
        $decoded = $this->jwt->decode($token);

        $this->assertSame('user-123', $decoded['sub']);
        $this->assertSame('tenant-456', $decoded['tenant_id']);
        $this->assertSame('property_admin', $decoded['role']);
        $this->assertSame('access', $decoded['type']);
        $this->assertSame('lodgik-api', $decoded['iss']);
    }

    public function testAccessTokenIncludesPropertyId(): void
    {
        $claims = [
            'user_id' => 'user-123',
            'tenant_id' => 'tenant-456',
            'role' => 'front_desk',
            'property_id' => 'prop-789',
        ];

        $token = $this->jwt->createAccessToken($claims);
        $decoded = $this->jwt->decode($token);

        $this->assertSame('prop-789', $decoded['property_id']);
    }

    public function testCreateRefreshToken(): void
    {
        $token = $this->jwt->createRefreshToken('user-123');
        $decoded = $this->jwt->decode($token);

        $this->assertSame('user-123', $decoded['sub']);
        $this->assertSame('refresh', $decoded['type']);
    }

    public function testExpiredTokenThrows(): void
    {
        $jwt = new JwtService(
            secret: 'test-secret',
            accessTtl: -10, // already expired
            refreshTtl: 604800,
        );

        $token = $jwt->createAccessToken([
            'user_id' => 'u1',
            'tenant_id' => 't1',
            'role' => 'manager',
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Token has expired');
        $jwt->decode($token);
    }

    public function testInvalidTokenThrows(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->jwt->decode('not.a.valid.token');
    }

    public function testDecodeUnsafe(): void
    {
        $token = $this->jwt->createAccessToken([
            'user_id' => 'u1',
            'tenant_id' => 't1',
            'role' => 'manager',
        ]);

        $payload = $this->jwt->decodeUnsafe($token);

        $this->assertSame('u1', $payload['sub']);
        $this->assertSame('t1', $payload['tenant_id']);
    }
}
