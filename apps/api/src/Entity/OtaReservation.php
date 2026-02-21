<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'ota_reservations')]
#[ORM\Index(columns: ['tenant_id', 'channel_id'], name: 'idx_otar_ch')]
#[ORM\Index(columns: ['tenant_id', 'external_id'], name: 'idx_otar_ext')] #[ORM\HasLifecycleCallbacks]
class OtaReservation implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'channel_id', type: Types::STRING, length: 36)] private string $channelId;
    #[ORM\Column(name: 'channel_name', type: Types::STRING, length: 30)] private string $channelName;
    #[ORM\Column(name: 'external_id', type: Types::STRING, length: 100)] private string $externalId;
    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36, nullable: true)] private ?string $bookingId = null;
    #[ORM\Column(name: 'guest_name', type: Types::STRING, length: 200)] private string $guestName;
    #[ORM\Column(name: 'check_in', type: Types::DATE_IMMUTABLE)] private \DateTimeImmutable $checkIn;
    #[ORM\Column(name: 'check_out', type: Types::DATE_IMMUTABLE)] private \DateTimeImmutable $checkOut;
    #[ORM\Column(type: Types::BIGINT)] private string $amount;
    #[ORM\Column(type: Types::BIGINT, nullable: true)] private ?string $commission = null;
    /** pending|confirmed|cancelled|no_show */
    #[ORM\Column(name: 'sync_status', type: Types::STRING, length: 15, options: ['default' => 'pending'])] private string $syncStatus = 'pending';
    #[ORM\Column(name: 'raw_data', type: Types::JSON, nullable: true)] private ?array $rawData = null;

    public function __construct(string $channelId, string $channelName, string $externalId, string $guestName, \DateTimeImmutable $checkIn, \DateTimeImmutable $checkOut, string $amount, string $tenantId)
    { $this->generateId(); $this->channelId = $channelId; $this->channelName = $channelName; $this->externalId = $externalId; $this->guestName = $guestName; $this->checkIn = $checkIn; $this->checkOut = $checkOut; $this->amount = $amount; $this->setTenantId($tenantId); }

    public function getSyncStatus(): string { return $this->syncStatus; } public function getExternalId(): string { return $this->externalId; }
    public function setBookingId(?string $v): void { $this->bookingId = $v; } public function setCommission(?string $v): void { $this->commission = $v; }
    public function setRawData(?array $v): void { $this->rawData = $v; }
    public function confirm(): void { $this->syncStatus = 'confirmed'; } public function cancel(): void { $this->syncStatus = 'cancelled'; }

    public function toArray(): array { return ['id' => $this->getId(), 'channel_id' => $this->channelId, 'channel_name' => $this->channelName, 'external_id' => $this->externalId, 'booking_id' => $this->bookingId, 'guest_name' => $this->guestName, 'check_in' => $this->checkIn->format('Y-m-d'), 'check_out' => $this->checkOut->format('Y-m-d'), 'amount' => $this->amount, 'commission' => $this->commission, 'sync_status' => $this->syncStatus]; }
}
