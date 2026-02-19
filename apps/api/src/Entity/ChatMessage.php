<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Chat messages between guest and staff for a booking.
 * Conversation is implicitly per-booking (no separate conversation entity).
 */
#[ORM\Entity]
#[ORM\Table(name: 'chat_messages')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_cm_booking')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_cm_property')]
#[ORM\HasLifecycleCallbacks]
class ChatMessage implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    /** 'guest' | 'staff' */
    #[ORM\Column(name: 'sender_type', type: Types::STRING, length: 10)]
    private string $senderType;

    /** Guest ID or User/Staff ID */
    #[ORM\Column(name: 'sender_id', type: Types::STRING, length: 36)]
    private string $senderId;

    #[ORM\Column(name: 'sender_name', type: Types::STRING, length: 150)]
    private string $senderName;

    #[ORM\Column(type: Types::TEXT)]
    private string $message;

    /** 'text' | 'image' | 'system' */
    #[ORM\Column(name: 'message_type', type: Types::STRING, length: 10, options: ['default' => 'text'])]
    private string $messageType = 'text';

    #[ORM\Column(name: 'image_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $imageUrl = null;

    #[ORM\Column(name: 'is_read', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isRead = false;

    #[ORM\Column(name: 'read_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $readAt = null;

    public function __construct(string $bookingId, string $propertyId, string $senderType, string $senderId, string $senderName, string $message, string $tenantId)
    {
        $this->generateId();
        $this->bookingId = $bookingId;
        $this->propertyId = $propertyId;
        $this->senderType = $senderType;
        $this->senderId = $senderId;
        $this->senderName = $senderName;
        $this->message = $message;
        $this->setTenantId($tenantId);
    }

    public function getBookingId(): string { return $this->bookingId; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getSenderType(): string { return $this->senderType; }
    public function getSenderId(): string { return $this->senderId; }
    public function getSenderName(): string { return $this->senderName; }
    public function getMessage(): string { return $this->message; }
    public function getMessageType(): string { return $this->messageType; }
    public function setMessageType(string $v): void { $this->messageType = $v; }
    public function getImageUrl(): ?string { return $this->imageUrl; }
    public function setImageUrl(?string $v): void { $this->imageUrl = $v; }
    public function isRead(): bool { return $this->isRead; }
    public function getReadAt(): ?\DateTimeImmutable { return $this->readAt; }

    public function markRead(): void
    {
        $this->isRead = true;
        $this->readAt = new \DateTimeImmutable();
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'booking_id' => $this->bookingId,
            'sender_type' => $this->senderType,
            'sender_id' => $this->senderId,
            'sender_name' => $this->senderName,
            'message' => $this->message,
            'message_type' => $this->messageType,
            'image_url' => $this->imageUrl,
            'is_read' => $this->isRead,
            'read_at' => $this->readAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
