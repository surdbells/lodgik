<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'app_download_logs')]
#[ORM\Index(columns: ['release_id'], name: 'idx_adl_release')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_adl_tenant')]
#[ORM\Index(columns: ['downloaded_at'], name: 'idx_adl_date')]
#[ORM\HasLifecycleCallbacks]
class AppDownloadLog
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(name: 'release_id', type: Types::STRING, length: 36)]
    private string $releaseId;

    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $tenantId = null;

    #[ORM\Column(name: 'user_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $userId = null;

    #[ORM\Column(name: 'app_type', type: Types::STRING, length: 30)]
    private string $appType;

    #[ORM\Column(type: Types::STRING, length: 30)]
    private string $version;

    #[ORM\Column(name: 'ip_address', type: Types::STRING, length: 45, nullable: true)]
    private ?string $ipAddress = null;

    #[ORM\Column(name: 'user_agent', type: Types::STRING, length: 500, nullable: true)]
    private ?string $userAgent = null;

    #[ORM\Column(name: 'downloaded_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $downloadedAt;

    public function __construct(string $releaseId, string $appType, string $version)
    {
        $this->generateId();
        $this->releaseId = $releaseId;
        $this->appType = $appType;
        $this->version = $version;
        $this->downloadedAt = new \DateTimeImmutable();
    }

    public function getReleaseId(): string { return $this->releaseId; }
    public function getTenantId(): ?string { return $this->tenantId; }
    public function setTenantId(?string $id): void { $this->tenantId = $id; }
    public function getUserId(): ?string { return $this->userId; }
    public function setUserId(?string $id): void { $this->userId = $id; }
    public function getAppType(): string { return $this->appType; }
    public function getVersion(): string { return $this->version; }
    public function getIpAddress(): ?string { return $this->ipAddress; }
    public function setIpAddress(?string $ip): void { $this->ipAddress = $ip; }
    public function getUserAgent(): ?string { return $this->userAgent; }
    public function setUserAgent(?string $ua): void { $this->userAgent = $ua; }
    public function getDownloadedAt(): \DateTimeImmutable { return $this->downloadedAt; }
}
