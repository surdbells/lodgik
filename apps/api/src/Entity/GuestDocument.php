<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;

#[ORM\Entity]
#[ORM\Table(name: 'guest_documents')]
#[ORM\Index(columns: ['tenant_id', 'guest_id'], name: 'idx_guest_docs_guest')]
#[ORM\HasLifecycleCallbacks]
class GuestDocument implements TenantAware
{
    use HasUuid;
    use HasTenant;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)]
    private string $guestId;

    #[ORM\Column(name: 'document_type', type: Types::STRING, length: 50)]
    private string $documentType;

    #[ORM\Column(name: 'file_url', type: Types::STRING, length: 500)]
    private string $fileUrl;

    #[ORM\Column(name: 'file_name', type: Types::STRING, length: 255, nullable: true)]
    private ?string $fileName = null;

    #[ORM\Column(name: 'uploaded_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $uploadedAt;

    public function __construct(string $guestId, string $documentType, string $fileUrl, string $tenantId)
    {
        $this->generateId();
        $this->guestId = $guestId;
        $this->documentType = $documentType;
        $this->fileUrl = $fileUrl;
        $this->setTenantId($tenantId);
        $this->uploadedAt = new \DateTimeImmutable();
    }

    public function getGuestId(): string { return $this->guestId; }
    public function getDocumentType(): string { return $this->documentType; }
    public function getFileUrl(): string { return $this->fileUrl; }
    public function getFileName(): ?string { return $this->fileName; }
    public function setFileName(?string $v): void { $this->fileName = $v; }
    public function getUploadedAt(): \DateTimeImmutable { return $this->uploadedAt; }
}
