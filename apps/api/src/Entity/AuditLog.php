<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;

/**
 * Immutable audit log record. Not tenant-filtered — super admin can view all.
 * Queried via tenant_id column for tenant-scoped reports.
 */
#[ORM\Entity]
#[ORM\Table(name: 'audit_logs')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_audit_tenant')]
#[ORM\Index(columns: ['user_id'], name: 'idx_audit_user')]
#[ORM\Index(columns: ['entity_type', 'entity_id'], name: 'idx_audit_entity')]
#[ORM\Index(columns: ['action'], name: 'idx_audit_action')]
#[ORM\Index(columns: ['created_at'], name: 'idx_audit_created')]
class AuditLog
{
    use HasUuid;

    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $tenantId;

    #[ORM\Column(name: 'user_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $userId;

    #[ORM\Column(name: 'user_name', type: Types::STRING, length: 200, nullable: true)]
    private ?string $userName;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $action;

    #[ORM\Column(name: 'entity_type', type: Types::STRING, length: 100)]
    private string $entityType;

    #[ORM\Column(name: 'entity_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $entityId;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    /** @var array<string, mixed>|null Before state snapshot */
    #[ORM\Column(name: 'old_values', type: Types::JSON, nullable: true)]
    private ?array $oldValues = null;

    /** @var array<string, mixed>|null After state snapshot */
    #[ORM\Column(name: 'new_values', type: Types::JSON, nullable: true)]
    private ?array $newValues = null;

    #[ORM\Column(name: 'ip_address', type: Types::STRING, length: 45, nullable: true)]
    private ?string $ipAddress = null;

    #[ORM\Column(name: 'user_agent', type: Types::STRING, length: 500, nullable: true)]
    private ?string $userAgent = null;

    #[ORM\Column(name: 'request_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $requestId = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        string $action,
        string $entityType,
        ?string $entityId = null,
        ?string $tenantId = null,
        ?string $userId = null,
        ?string $userName = null,
    ) {
        $this->generateId();
        $this->action = $action;
        $this->entityType = $entityType;
        $this->entityId = $entityId;
        $this->tenantId = $tenantId;
        $this->userId = $userId;
        $this->userName = $userName;
        $this->createdAt = new \DateTimeImmutable();
    }

    // ─── Getters ───────────────────────────────────────────────

    public function getTenantId(): ?string { return $this->tenantId; }
    public function getUserId(): ?string { return $this->userId; }
    public function getUserName(): ?string { return $this->userName; }
    public function getAction(): string { return $this->action; }
    public function getEntityType(): string { return $this->entityType; }
    public function getEntityId(): ?string { return $this->entityId; }
    public function getDescription(): ?string { return $this->description; }
    public function getOldValues(): ?array { return $this->oldValues; }
    public function getNewValues(): ?array { return $this->newValues; }
    public function getIpAddress(): ?string { return $this->ipAddress; }
    public function getUserAgent(): ?string { return $this->userAgent; }
    public function getRequestId(): ?string { return $this->requestId; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    // ─── Setters (used via builder pattern before persist) ─────

    public function setDescription(?string $desc): self
    {
        $this->description = $desc;
        return $this;
    }

    public function setOldValues(?array $values): self
    {
        $this->oldValues = $values;
        return $this;
    }

    public function setNewValues(?array $values): self
    {
        $this->newValues = $values;
        return $this;
    }

    public function setIpAddress(?string $ip): self
    {
        $this->ipAddress = $ip;
        return $this;
    }

    public function setUserAgent(?string $ua): self
    {
        $this->userAgent = $ua;
        return $this;
    }

    public function setRequestId(?string $id): self
    {
        $this->requestId = $id;
        return $this;
    }
}
