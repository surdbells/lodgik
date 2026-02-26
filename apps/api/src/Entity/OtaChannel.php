<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'ota_channels')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_ota_prop')] #[ORM\HasLifecycleCallbacks]
class OtaChannel implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    /** booking_com|expedia|agoda|hotels_com|airbnb|direct */
    #[ORM\Column(name: 'channel_name', type: Types::STRING, length: 30)] private string $channelName;
    #[ORM\Column(name: 'display_name', type: Types::STRING, length: 100)] private string $displayName;
    #[ORM\Column(name: 'credentials', type: Types::JSON, nullable: true)] private ?array $credentials = null;
    #[ORM\Column(name: 'room_type_mapping', type: Types::JSON, nullable: true)] private ?array $roomTypeMapping = null;
    #[ORM\Column(name: 'rate_plan_mapping', type: Types::JSON, nullable: true)] private ?array $ratePlanMapping = null;
    #[ORM\Column(name: 'commission_percentage', type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '15.00'])] private string $commissionPercentage = '15.00';
    /** active|paused|disconnected|error */
    #[ORM\Column(name: 'sync_status', type: Types::STRING, length: 15, options: ['default' => 'disconnected'])] private string $syncStatus = 'disconnected';
    #[ORM\Column(name: 'last_sync_at', type: Types::DATETIME_IMMUTABLE, nullable: true)] private ?\DateTimeImmutable $lastSyncAt = null;
    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => false])] private bool $isActive = false;

    public function __construct(string $propertyId, string $channelName, string $displayName, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->channelName = $channelName; $this->displayName = $displayName; $this->setTenantId($tenantId); }

    public function getChannelName(): string { return $this->channelName; } public function getSyncStatus(): string { return $this->syncStatus; }
    public function setCredentials(?array $v): void { $this->credentials = $v; } public function setRoomTypeMapping(?array $v): void { $this->roomTypeMapping = $v; }
    public function setRatePlanMapping(?array $v): void { $this->ratePlanMapping = $v; } public function setCommissionPercentage(string $v): void { $this->commissionPercentage = $v; }
    public function activate(): void { $this->isActive = true; $this->syncStatus = 'active'; } public function pause(): void { $this->syncStatus = 'paused'; }
    public function disconnect(): void { $this->isActive = false; $this->syncStatus = 'disconnected'; }
    public function markSynced(): void { $this->lastSyncAt = new \DateTimeImmutable(); }
    public function markError(): void { $this->syncStatus = 'error'; }

    public function toArray(): array { return ['id' => $this->getId(), 'property_id' => $this->propertyId, 'channel_name' => $this->channelName, 'display_name' => $this->displayName, 'commission_percentage' => $this->commissionPercentage, 'sync_status' => $this->syncStatus, 'last_sync_at' => $this->lastSyncAt?->format('Y-m-d H:i:s'), 'is_active' => $this->isActive, 'room_type_mapping' => $this->roomTypeMapping, 'rate_plan_mapping' => $this->ratePlanMapping]; }
}
