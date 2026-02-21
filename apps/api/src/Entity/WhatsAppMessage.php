<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity]
#[ORM\Table(name: 'whatsapp_messages')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'direction'], name: 'idx_wa_dir')]
#[ORM\Index(columns: ['tenant_id', 'recipient_phone'], name: 'idx_wa_phone')]
#[ORM\HasLifecycleCallbacks]
class WhatsAppMessage implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    /** outbound|inbound */
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $direction;

    #[ORM\Column(name: 'recipient_phone', type: Types::STRING, length: 20)]
    private string $recipientPhone;

    #[ORM\Column(name: 'recipient_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $recipientName = null;

    /** booking_confirmation|check_in_welcome|check_out_thanks|payment_receipt|visitor_code|custom|otp|reminder */
    #[ORM\Column(name: 'message_type', type: Types::STRING, length: 30)]
    private string $messageType;

    #[ORM\Column(name: 'template_id', type: Types::STRING, length: 50, nullable: true)]
    private ?string $templateId = null;

    #[ORM\Column(name: 'template_params', type: Types::JSON, nullable: true)]
    private ?array $templateParams = null;

    #[ORM\Column(type: Types::TEXT)]
    private string $body;

    /** pending|sent|delivered|read|failed */
    #[ORM\Column(type: Types::STRING, length: 12, options: ['default' => 'pending'])]
    private string $status = 'pending';

    #[ORM\Column(name: 'provider_message_id', type: Types::STRING, length: 100, nullable: true)]
    private ?string $providerMessageId = null;

    #[ORM\Column(name: 'failure_reason', type: Types::TEXT, nullable: true)]
    private ?string $failureReason = null;

    #[ORM\Column(name: 'sent_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $sentAt = null;

    #[ORM\Column(name: 'delivered_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $deliveredAt = null;

    /** Cost in kobo (NGN) */
    #[ORM\Column(type: Types::BIGINT, nullable: true)]
    private ?string $cost = null;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $bookingId = null;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $guestId = null;

    public function __construct(
        string $propertyId,
        string $direction,
        string $recipientPhone,
        string $messageType,
        string $body,
        string $tenantId
    ) {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->direction = $direction;
        $this->recipientPhone = $recipientPhone;
        $this->messageType = $messageType;
        $this->body = $body;
        $this->setTenantId($tenantId);
    }

    public function getStatus(): string { return $this->status; }
    public function getRecipientPhone(): string { return $this->recipientPhone; }
    public function getMessageType(): string { return $this->messageType; }
    public function getBody(): string { return $this->body; }
    public function getProviderMessageId(): ?string { return $this->providerMessageId; }

    public function setRecipientName(?string $v): void { $this->recipientName = $v; }
    public function setTemplateId(?string $v): void { $this->templateId = $v; }
    public function setTemplateParams(?array $v): void { $this->templateParams = $v; }
    public function setBookingId(?string $v): void { $this->bookingId = $v; }
    public function setGuestId(?string $v): void { $this->guestId = $v; }
    public function setCost(?string $v): void { $this->cost = $v; }

    public function markSent(string $providerMsgId): void
    {
        $this->status = 'sent';
        $this->providerMessageId = $providerMsgId;
        $this->sentAt = new \DateTimeImmutable();
    }

    public function markDelivered(): void
    {
        $this->status = 'delivered';
        $this->deliveredAt = new \DateTimeImmutable();
    }

    public function markRead(): void { $this->status = 'read'; }

    public function markFailed(string $reason): void
    {
        $this->status = 'failed';
        $this->failureReason = $reason;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'property_id' => $this->propertyId,
            'direction' => $this->direction,
            'recipient_phone' => $this->recipientPhone,
            'recipient_name' => $this->recipientName,
            'message_type' => $this->messageType,
            'template_id' => $this->templateId,
            'body' => $this->body,
            'status' => $this->status,
            'provider_message_id' => $this->providerMessageId,
            'failure_reason' => $this->failureReason,
            'booking_id' => $this->bookingId,
            'guest_id' => $this->guestId,
            'cost' => $this->cost,
            'sent_at' => $this->sentAt?->format('Y-m-d H:i:s'),
            'delivered_at' => $this->deliveredAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
