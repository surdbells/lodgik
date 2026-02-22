<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_resource_downloads')]
#[ORM\Index(columns: ['resource_id'], name: 'idx_mrd_res')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_mrd_merch')]
class MerchantResourceDownload
{
    use HasUuid;

    #[ORM\Column(type: Types::STRING, length: 36)]
    private string $resourceId;
    #[ORM\Column(type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $downloadedAt;
    #[ORM\Column(type: Types::STRING, length: 45, nullable: true)]
    private ?string $ipAddress = null;
    #[ORM\Column(type: Types::STRING, length: 500, nullable: true)]
    private ?string $userAgent = null;

    public function __construct() { $this->generateId(); $this->downloadedAt = new \DateTimeImmutable(); }

    public function getResourceId(): string { return $this->resourceId; }
    public function setResourceId(string $v): self { $this->resourceId = $v; return $this; }
    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getDownloadedAt(): \DateTimeImmutable { return $this->downloadedAt; }
    public function getIpAddress(): ?string { return $this->ipAddress; }
    public function setIpAddress(?string $v): self { $this->ipAddress = $v; return $this; }
    public function getUserAgent(): ?string { return $this->userAgent; }
    public function setUserAgent(?string $v): self { $this->userAgent = $v; return $this; }

    public function toArray(): array
    {
        return ['id' => $this->getId(), 'resource_id' => $this->resourceId, 'merchant_id' => $this->merchantId,
            'downloaded_at' => $this->downloadedAt->format(\DateTimeInterface::ATOM), 'ip_address' => $this->ipAddress];
    }
}
