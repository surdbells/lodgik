<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_audit_logs')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_mal_merch')]
#[ORM\Index(columns: ['action'], name: 'idx_mal_action')]
class MerchantAuditLog
{
    use HasUuid;

    #[ORM\Column(name: 'merchant_id', type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(name: 'actor_id', type: Types::STRING, length: 36)]
    private string $actorId;
    #[ORM\Column(name: 'actor_type', type: Types::STRING, length: 10)]
    private string $actorType = 'merchant';
    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $action;
    #[ORM\Column(name: 'entity_type', type: Types::STRING, length: 50, nullable: true)]
    private ?string $entityType = null;
    #[ORM\Column(name: 'entity_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $entityId = null;
    #[ORM\Column(name: 'old_value', type: Types::JSON, nullable: true)]
    private ?array $oldValue = null;
    #[ORM\Column(name: 'new_value', type: Types::JSON, nullable: true)]
    private ?array $newValue = null;
    #[ORM\Column(name: 'ip_address', type: Types::STRING, length: 45, nullable: true)]
    private ?string $ipAddress = null;
    #[ORM\Column(name: 'user_agent', type: Types::STRING, length: 500, nullable: true)]
    private ?string $userAgent = null;
    #[ORM\Column(name: 'logged_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $timestamp;

    public function __construct() { $this->generateId(); $this->timestamp = new \DateTimeImmutable(); }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getActorId(): string { return $this->actorId; }
    public function setActorId(string $v): self { $this->actorId = $v; return $this; }
    public function getActorType(): string { return $this->actorType; }
    public function setActorType(string $v): self { $this->actorType = $v; return $this; }
    public function getAction(): string { return $this->action; }
    public function setAction(string $v): self { $this->action = $v; return $this; }
    public function getEntityType(): ?string { return $this->entityType; }
    public function setEntityType(?string $v): self { $this->entityType = $v; return $this; }
    public function getEntityId(): ?string { return $this->entityId; }
    public function setEntityId(?string $v): self { $this->entityId = $v; return $this; }
    public function getOldValue(): ?array { return $this->oldValue; }
    public function setOldValue(?array $v): self { $this->oldValue = $v; return $this; }
    public function getNewValue(): ?array { return $this->newValue; }
    public function setNewValue(?array $v): self { $this->newValue = $v; return $this; }
    public function getIpAddress(): ?string { return $this->ipAddress; }
    public function setIpAddress(?string $v): self { $this->ipAddress = $v; return $this; }
    public function getUserAgent(): ?string { return $this->userAgent; }
    public function setUserAgent(?string $v): self { $this->userAgent = $v; return $this; }
    public function getTimestamp(): \DateTimeImmutable { return $this->timestamp; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'actor_id' => $this->actorId,
            'actor_type' => $this->actorType, 'action' => $this->action, 'entity_type' => $this->entityType,
            'entity_id' => $this->entityId, 'old_value' => $this->oldValue, 'new_value' => $this->newValue,
            'ip_address' => $this->ipAddress, 'logged_at' => $this->timestamp->format(\DateTimeInterface::ATOM),
        ];
    }
}
