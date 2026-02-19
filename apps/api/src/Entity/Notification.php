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
#[ORM\Table(name: 'notifications')]
#[ORM\Index(columns: ['tenant_id', 'recipient_id', 'is_read'], name: 'idx_notif_recipient')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_notif_property')]
#[ORM\HasLifecycleCallbacks]
class Notification implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    /** 'staff' or 'guest' */
    #[ORM\Column(name: 'recipient_type', type: Types::STRING, length: 10)]
    private string $recipientType;

    /** User ID (staff) or Guest ID */
    #[ORM\Column(name: 'recipient_id', type: Types::STRING, length: 36)]
    private string $recipientId;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $channel;

    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $title;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $body = null;

    /** JSON metadata for routing/context */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $data = null;

    #[ORM\Column(name: 'is_read', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isRead = false;

    #[ORM\Column(name: 'read_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $readAt = null;

    #[ORM\Column(name: 'push_sent', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $pushSent = false;

    public function __construct(string $propertyId, string $recipientType, string $recipientId, string $channel, string $title, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->recipientType = $recipientType;
        $this->recipientId = $recipientId;
        $this->channel = $channel;
        $this->title = $title;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getRecipientType(): string { return $this->recipientType; }
    public function getRecipientId(): string { return $this->recipientId; }
    public function getChannel(): string { return $this->channel; }
    public function getTitle(): string { return $this->title; }
    public function getBody(): ?string { return $this->body; }
    public function setBody(?string $v): void { $this->body = $v; }
    public function getData(): ?array { return $this->data; }
    public function setData(?array $v): void { $this->data = $v; }
    public function isRead(): bool { return $this->isRead; }
    public function markRead(): void { $this->isRead = true; $this->readAt = new \DateTimeImmutable(); }
    public function isPushSent(): bool { return $this->pushSent; }
    public function setPushSent(bool $v): void { $this->pushSent = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'property_id' => $this->propertyId,
            'recipient_type' => $this->recipientType,
            'recipient_id' => $this->recipientId,
            'channel' => $this->channel,
            'title' => $this->title,
            'body' => $this->body,
            'data' => $this->data,
            'is_read' => $this->isRead,
            'read_at' => $this->readAt?->format('Y-m-d H:i:s'),
            'push_sent' => $this->pushSent,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
