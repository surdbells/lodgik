<?php

declare(strict_types=1);

namespace Lodgik\Service;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

final class JwtService
{
    public function __construct(
        private readonly string $secret,
        private readonly int $accessTtl,
        private readonly int $refreshTtl,
        private readonly string $algorithm = 'HS256',
        private readonly string $issuer = 'lodgik-api',
    ) {}

    /**
     * Create an access token.
     *
     * @param array<string, mixed> $claims  Must include: user_id, tenant_id, role
     */
    public function createAccessToken(array $claims): string
    {
        $now = time();

        $payload = [
            'iss' => $this->issuer,
            'iat' => $now,
            'exp' => $now + $this->accessTtl,
            'type' => 'access',
            'sub' => $claims['user_id'],
            'tenant_id' => $claims['tenant_id'],
            'role' => $claims['role'],
        ];

        // Include property_id if present
        if (isset($claims['property_id'])) {
            $payload['property_id'] = $claims['property_id'];
        }

        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    /**
     * Create a refresh token.
     */
    public function createRefreshToken(string $userId): string
    {
        $now = time();

        $payload = [
            'iss' => $this->issuer,
            'iat' => $now,
            'exp' => $now + $this->refreshTtl,
            'type' => 'refresh',
            'sub' => $userId,
        ];

        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    /**
     * Decode and verify a token. Returns the payload as an associative array.
     *
     * @throws \RuntimeException on invalid/expired token
     * @return array<string, mixed>
     */
    public function decode(string $token): array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));
            return (array) $decoded;
        } catch (ExpiredException $e) {
            throw new \RuntimeException('Token has expired', 401);
        } catch (\Throwable $e) {
            throw new \RuntimeException('Invalid token: ' . $e->getMessage(), 401);
        }
    }

    /**
     * Decode without verification (to inspect expired tokens for refresh flow).
     *
     * @return array<string, mixed>
     */
    public function decodeUnsafe(string $token): array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            throw new \RuntimeException('Invalid token format');
        }

        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

        if (!is_array($payload)) {
            throw new \RuntimeException('Invalid token payload');
        }

        return $payload;
    }

    public function getAccessTtl(): int
    {
        return $this->accessTtl;
    }

    public function getRefreshTtl(): int
    {
        return $this->refreshTtl;
    }
}
