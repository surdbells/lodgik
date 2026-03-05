<?php
declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\ScanPointType;

/**
 * Configurable scan terminal — reception desk, security gate, gym door, POS, etc.
 * Each terminal gets a unique device_key used by physical scanner hardware to authenticate.
 */
#[ORM\Entity]
#[ORM\Table(name: 'card_scan_points')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_csp_property')]
#[ORM\Index(columns: ['device_key'],               name: 'idx_csp_device_key')]
#[ORM\HasLifecycleCallbacks]
class CardScanPoint implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(name: 'scan_point_type', type: Types::STRING, length: 20, enumType: ScanPointType::class)]
    private ScanPointType $scanPointType;

    #[ORM\Column(name: 'location_desc', type: Types::STRING, length: 200, nullable: true)]
    private ?string $locationDesc = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    /**
     * API key sent by physical RFID/QR scanner hardware.
     * Generated once, stored here. Hardware POSTs card_uid + device_key to /api/cards/scan.
     */
    #[ORM\Column(name: 'device_key', type: Types::STRING, length: 100, nullable: true, unique: true)]
    private ?string $deviceKey = null;

    public function __construct(string $propertyId, string $name, ScanPointType $scanPointType, string $tenantId)
    {
        $this->propertyId    = $propertyId;
        $this->name          = $name;
        $this->scanPointType = $scanPointType;
        $this->tenantId      = $tenantId;
        // Generate device key on creation
        $this->deviceKey     = 'spk_' . bin2hex(random_bytes(16));
    }

    public function getPropertyId(): string          { return $this->propertyId; }
    public function getName(): string                { return $this->name; }
    public function getScanPointType(): ScanPointType{ return $this->scanPointType; }
    public function getLocationDesc(): ?string       { return $this->locationDesc; }
    public function isActive(): bool                 { return $this->isActive; }
    public function getDeviceKey(): ?string          { return $this->deviceKey; }

    public function setName(string $v): void              { $this->name          = $v; }
    public function setScanPointType(ScanPointType $v): void { $this->scanPointType = $v; }
    public function setLocationDesc(?string $v): void     { $this->locationDesc  = $v; }
    public function setIsActive(bool $v): void            { $this->isActive      = $v; }
    public function regenerateDeviceKey(): void           { $this->deviceKey     = 'spk_' . bin2hex(random_bytes(16)); }
}
