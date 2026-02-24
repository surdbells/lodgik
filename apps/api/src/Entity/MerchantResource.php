<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_resources')]
#[ORM\Index(columns: ['category'], name: 'idx_mres_cat')]
#[ORM\Index(columns: ['status'], name: 'idx_mres_status')]
#[ORM\HasLifecycleCallbacks]
class MerchantResource
{
    use HasUuid; use HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $title;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;
    #[ORM\Column(type: Types::STRING, length: 30)]
    private string $category = 'user_manual';
    #[ORM\Column(name: 'sub_category', type: Types::STRING, length: 50, nullable: true)]
    private ?string $subCategory = null;
    #[ORM\Column(name: 'file_type', type: Types::STRING, length: 10)]
    private string $fileType = 'pdf';
    #[ORM\Column(name: 'file_url', type: Types::STRING, length: 500)]
    private string $fileUrl;
    #[ORM\Column(name: 'file_size', type: Types::INTEGER)]
    private int $fileSize = 0;
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $version = 'v1.0';
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $visibility = 'merchant';
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $status = 'active';
    #[ORM\Column(name: 'uploaded_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $uploadedBy = null;

    public function __construct() { $this->generateId(); }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $v): self { $this->title = $v; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): self { $this->description = $v; return $this; }
    public function getCategory(): string { return $this->category; }
    public function setCategory(string $v): self { $this->category = $v; return $this; }
    public function getSubCategory(): ?string { return $this->subCategory; }
    public function setSubCategory(?string $v): self { $this->subCategory = $v; return $this; }
    public function getFileType(): string { return $this->fileType; }
    public function setFileType(string $v): self { $this->fileType = $v; return $this; }
    public function getFileUrl(): string { return $this->fileUrl; }
    public function setFileUrl(string $v): self { $this->fileUrl = $v; return $this; }
    public function getFileSize(): int { return $this->fileSize; }
    public function setFileSize(int $v): self { $this->fileSize = $v; return $this; }
    public function getVersion(): string { return $this->version; }
    public function setVersion(string $v): self { $this->version = $v; return $this; }
    public function getVisibility(): string { return $this->visibility; }
    public function setVisibility(string $v): self { $this->visibility = $v; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): self { $this->status = $v; return $this; }
    public function getUploadedBy(): ?string { return $this->uploadedBy; }
    public function setUploadedBy(?string $v): self { $this->uploadedBy = $v; return $this; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'title' => $this->title, 'description' => $this->description,
            'category' => $this->category, 'sub_category' => $this->subCategory,
            'file_type' => $this->fileType, 'file_url' => $this->fileUrl, 'file_size' => $this->fileSize,
            'version' => $this->version, 'visibility' => $this->visibility, 'status' => $this->status,
            'uploaded_by' => $this->uploadedBy, 'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
