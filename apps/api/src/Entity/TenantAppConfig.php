<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'tenant_app_configs')]
#[ORM\UniqueConstraint(name: 'uq_tac_tenant_type', columns: ['tenant_id', 'app_type'])]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_tac_tenant')]
#[ORM\HasLifecycleCallbacks]
class TenantAppConfig
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36)]
    private string $tenantId;

    #[ORM\Column(name: 'app_type', type: Types::STRING, length: 30)]
    private string $appType;

    /** Currently installed version reported by heartbeat. */
    #[ORM\Column(name: 'installed_version', type: Types::STRING, length: 30, nullable: true)]
    private ?string $installedVersion = null;

    #[ORM\Column(name: 'installed_build', type: Types::INTEGER, nullable: true)]
    private ?int $installedBuild = null;

    #[ORM\Column(name: 'auto_update', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $autoUpdate = true;

    /** Last heartbeat from this app instance. */
    #[ORM\Column(name: 'last_heartbeat', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastHeartbeat = null;

    #[ORM\Column(name: 'device_info', type: Types::JSON, nullable: true)]
    private ?array $deviceInfo = null;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $propertyId = null;

    public function __construct(string $tenantId, string $appType)
    {
        $this->generateId();
        $this->tenantId = $tenantId;
        $this->appType = $appType;
    }

    public function getTenantId(): string { return $this->tenantId; }
    public function getAppType(): string { return $this->appType; }
    public function getInstalledVersion(): ?string { return $this->installedVersion; }
    public function setInstalledVersion(?string $v): void { $this->installedVersion = $v; }
    public function getInstalledBuild(): ?int { return $this->installedBuild; }
    public function setInstalledBuild(?int $b): void { $this->installedBuild = $b; }
    public function getAutoUpdate(): bool { return $this->autoUpdate; }
    public function setAutoUpdate(bool $a): void { $this->autoUpdate = $a; }
    public function getLastHeartbeat(): ?\DateTimeImmutable { return $this->lastHeartbeat; }
    public function setLastHeartbeat(?\DateTimeImmutable $d): void { $this->lastHeartbeat = $d; }
    public function getDeviceInfo(): ?array { return $this->deviceInfo; }
    public function setDeviceInfo(?array $d): void { $this->deviceInfo = $d; }
    public function getPropertyId(): ?string { return $this->propertyId; }
    public function setPropertyId(?string $id): void { $this->propertyId = $id; }

    public function recordHeartbeat(?string $version = null, ?int $build = null, ?array $device = null): void
    {
        $this->lastHeartbeat = new \DateTimeImmutable();
        if ($version) $this->installedVersion = $version;
        if ($build) $this->installedBuild = $build;
        if ($device) $this->deviceInfo = $device;
    }
}
