<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'device_tokens')]
#[ORM\UniqueConstraint(name: 'uq_device_token', columns: ['tenant_id', 'token'])]
#[ORM\Index(columns: ['tenant_id', 'owner_id'], name: 'idx_dt_owner')]
#[ORM\HasLifecycleCallbacks]
class DeviceToken implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    /** 'staff' or 'guest' */
    #[ORM\Column(name: 'owner_type', type: Types::STRING, length: 10)]
    private string $ownerType;

    /** User ID or Guest ID */
    #[ORM\Column(name: 'owner_id', type: Types::STRING, length: 36)]
    private string $ownerId;

    /** FCM token */
    #[ORM\Column(type: Types::TEXT)]
    private string $token;

    /** 'android', 'ios', 'web' */
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $platform;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(name: 'last_used_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastUsedAt = null;

    public function __construct(string $ownerType, string $ownerId, string $token, string $platform, string $tenantId)
    {
        $this->generateId();
        $this->ownerType = $ownerType;
        $this->ownerId = $ownerId;
        $this->token = $token;
        $this->platform = $platform;
        $this->setTenantId($tenantId);
    }

    public function getOwnerType(): string { return $this->ownerType; }
    public function getOwnerId(): string { return $this->ownerId; }
    public function getToken(): string { return $this->token; }
    public function getPlatform(): string { return $this->platform; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function markUsed(): void { $this->lastUsedAt = new \DateTimeImmutable(); }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'owner_type' => $this->ownerType,
            'owner_id' => $this->ownerId,
            'platform' => $this->platform,
            'is_active' => $this->isActive,
            'last_used_at' => $this->lastUsedAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
