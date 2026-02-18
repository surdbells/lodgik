<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Helper\UuidHelper;

#[ORM\Entity]
#[ORM\Table(name: 'refresh_tokens')]
#[ORM\Index(columns: ['user_id'], name: 'idx_refresh_tokens_user')]
#[ORM\Index(columns: ['token_hash'], name: 'idx_refresh_tokens_hash')]
#[ORM\Index(columns: ['expires_at'], name: 'idx_refresh_tokens_expires')]
class RefreshToken
{
    use HasUuid;

    #[ORM\Column(name: 'user_id', type: Types::STRING, length: 36)]
    private string $userId;

    #[ORM\Column(name: 'token_hash', type: Types::STRING, length: 64, unique: true)]
    private string $tokenHash;

    #[ORM\Column(name: 'device_info', type: Types::STRING, length: 500, nullable: true)]
    private ?string $deviceInfo = null;

    #[ORM\Column(name: 'ip_address', type: Types::STRING, length: 45, nullable: true)]
    private ?string $ipAddress = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'expires_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(name: 'revoked_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $revokedAt = null;

    public function __construct(
        string $userId,
        string $tokenHash,
        \DateTimeImmutable $expiresAt,
        ?string $deviceInfo = null,
        ?string $ipAddress = null,
    ) {
        $this->generateId();
        $this->userId = $userId;
        $this->tokenHash = $tokenHash;
        $this->expiresAt = $expiresAt;
        $this->deviceInfo = $deviceInfo;
        $this->ipAddress = $ipAddress;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getUserId(): string { return $this->userId; }

    public function getTokenHash(): string { return $this->tokenHash; }

    public function getDeviceInfo(): ?string { return $this->deviceInfo; }

    public function getIpAddress(): ?string { return $this->ipAddress; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }

    public function isExpired(): bool
    {
        return $this->expiresAt < new \DateTimeImmutable();
    }

    public function isRevoked(): bool
    {
        return $this->revokedAt !== null;
    }

    public function revoke(): void
    {
        $this->revokedAt = new \DateTimeImmutable();
    }

    public function isValid(): bool
    {
        return !$this->isExpired() && !$this->isRevoked();
    }

    /**
     * Hash a raw refresh token for storage.
     */
    public static function hashToken(string $rawToken): string
    {
        return hash('sha256', $rawToken);
    }
}
