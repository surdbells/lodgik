<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_notifications')]
#[ORM\Index(columns: ['merchant_id', 'is_read'], name: 'idx_mn_merch_read')]
class MerchantNotification
{
    use HasUuid;

    #[ORM\Column(type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(type: Types::STRING, length: 30)]
    private string $type;
    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $title;
    #[ORM\Column(type: Types::TEXT)]
    private string $body;
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $data = null;
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $channel = 'in_app';
    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isRead = false;
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $sentAt;

    public function __construct() { $this->generateId(); $this->sentAt = new \DateTimeImmutable(); }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $v): self { $this->type = $v; return $this; }
    public function getTitle(): string { return $this->title; }
    public function setTitle(string $v): self { $this->title = $v; return $this; }
    public function getBody(): string { return $this->body; }
    public function setBody(string $v): self { $this->body = $v; return $this; }
    public function getData(): ?array { return $this->data; }
    public function setData(?array $v): self { $this->data = $v; return $this; }
    public function getChannel(): string { return $this->channel; }
    public function setChannel(string $v): self { $this->channel = $v; return $this; }
    public function isRead(): bool { return $this->isRead; }
    public function setIsRead(bool $v): self { $this->isRead = $v; return $this; }
    public function getSentAt(): \DateTimeImmutable { return $this->sentAt; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'type' => $this->type,
            'title' => $this->title, 'body' => $this->body, 'data' => $this->data,
            'channel' => $this->channel, 'is_read' => $this->isRead,
            'sent_at' => $this->sentAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
