<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'guest_stay_notifications')]
#[ORM\Index(columns: ['booking_id'], name: 'idx_gsn_booking')]
#[ORM\Index(columns: ['guest_id', 'tenant_id'], name: 'idx_gsn_guest')]
#[ORM\HasLifecycleCallbacks]
class GuestStayNotification
{
    use HasUuid, HasTimestamps;

    #[ORM\Column(name: 'booking_id',   type: Types::STRING, length: 36)] private string $bookingId;
    #[ORM\Column(name: 'guest_id',     type: Types::STRING, length: 36)] private string $guestId;
    #[ORM\Column(name: 'tenant_id',    type: Types::STRING, length: 36)] private string $tenantId;
    #[ORM\Column(name: 'property_id',  type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(name: 'contact_name', type: Types::STRING, length: 150)] private string $contactName;

    #[ORM\Column(name: 'contact_email', type: Types::STRING, length: 255, nullable: true)]
    private ?string $contactEmail = null;

    #[ORM\Column(name: 'contact_phone', type: Types::STRING, length: 50, nullable: true)]
    private ?string $contactPhone = null;

    #[ORM\Column(name: 'notify_on_checkin', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $notifyOnCheckin = false;

    #[ORM\Column(name: 'share_booking_details', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $shareBookingDetails = true;

    #[ORM\Column(name: 'share_guest_details', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $shareGuestDetails = false;

    #[ORM\Column(name: 'last_sent_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastSentAt = null;

    #[ORM\Column(name: 'last_sent_channel', type: Types::STRING, length: 20, nullable: true)]
    private ?string $lastSentChannel = null;

    #[ORM\Column(name: 'status', type: Types::STRING, length: 20, options: ['default' => 'pending'])]
    private string $status = 'pending';

    public function __construct(string $bookingId, string $guestId, string $tenantId, string $propertyId, string $contactName)
    {
        $this->generateId();
        $this->bookingId  = $bookingId;
        $this->guestId    = $guestId;
        $this->tenantId   = $tenantId;
        $this->propertyId = $propertyId;
        $this->contactName = $contactName;
    }

    public function getId(): string           { return $this->id; }
    public function getBookingId(): string     { return $this->bookingId; }
    public function getContactName(): string   { return $this->contactName; }
    public function getContactEmail(): ?string { return $this->contactEmail; }
    public function getContactPhone(): ?string { return $this->contactPhone; }
    public function isNotifyOnCheckin(): bool  { return $this->notifyOnCheckin; }
    public function isShareBookingDetails(): bool { return $this->shareBookingDetails; }
    public function isShareGuestDetails(): bool   { return $this->shareGuestDetails; }
    public function getLastSentAt(): ?\DateTimeImmutable { return $this->lastSentAt; }
    public function getStatus(): string        { return $this->status; }

    public function setContactName(string $v): void   { $this->contactName = $v; }
    public function setContactEmail(?string $v): void  { $this->contactEmail = $v; }
    public function setContactPhone(?string $v): void  { $this->contactPhone = $v; }
    public function setNotifyOnCheckin(bool $v): void  { $this->notifyOnCheckin = $v; }
    public function setShareBookingDetails(bool $v): void { $this->shareBookingDetails = $v; }
    public function setShareGuestDetails(bool $v): void   { $this->shareGuestDetails = $v; }

    public function markSent(string $channel): void
    {
        $this->lastSentAt      = new \DateTimeImmutable();
        $this->lastSentChannel = $channel;
        $this->status          = 'sent';
    }

    public function toArray(): array
    {
        return [
            'id'                    => $this->getId(),
            'contact_name'          => $this->contactName,
            'contact_email'         => $this->contactEmail,
            'contact_phone'         => $this->contactPhone,
            'notify_on_checkin'     => $this->notifyOnCheckin,
            'share_booking_details' => $this->shareBookingDetails,
            'share_guest_details'   => $this->shareGuestDetails,
            'last_sent_at'          => $this->lastSentAt?->format('Y-m-d H:i:s'),
            'last_sent_channel'     => $this->lastSentChannel,
            'status'                => $this->status,
            'created_at'            => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
