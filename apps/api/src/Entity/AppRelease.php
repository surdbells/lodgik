<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Entity\Traits\SoftDeletable;

/**
 * Platform app release (APK, IPA, .exe, .dmg, .AppImage, PWA, POS, KDS).
 * Managed by super admin. Not tenant-scoped.
 */
#[ORM\Entity]
#[ORM\Table(name: 'app_releases')]
#[ORM\Index(columns: ['app_type'], name: 'idx_ar_type')]
#[ORM\Index(columns: ['is_latest'], name: 'idx_ar_latest')]
#[ORM\UniqueConstraint(name: 'uq_ar_type_version', columns: ['app_type', 'version'])]
#[ORM\HasLifecycleCallbacks]
class AppRelease
{
    use HasUuid;
    use HasTimestamps;
    use SoftDeletable;

    /** App type: android, ios, windows, macos, linux, pwa, pos_terminal, kds_display */
    #[ORM\Column(name: 'app_type', type: Types::STRING, length: 30)]
    private string $appType;

    /** Semver version string: 1.0.0, 1.2.3-beta */
    #[ORM\Column(type: Types::STRING, length: 30)]
    private string $version;

    /** Numeric build number for comparison. */
    #[ORM\Column(name: 'build_number', type: Types::INTEGER)]
    private int $buildNumber;

    /** Stored file path (relative to storage). */
    #[ORM\Column(name: 'file_path', type: Types::STRING, length: 500, nullable: true)]
    private ?string $filePath = null;

    /** File size in bytes. */
    #[ORM\Column(name: 'file_size', type: Types::BIGINT, nullable: true)]
    private ?int $fileSize = null;

    /** SHA-256 checksum. */
    #[ORM\Column(type: Types::STRING, length: 64, nullable: true)]
    private ?string $checksum = null;

    /** MIME type. */
    #[ORM\Column(name: 'mime_type', type: Types::STRING, length: 100, nullable: true)]
    private ?string $mimeType = null;

    /** Markdown release notes. */
    #[ORM\Column(name: 'release_notes', type: Types::TEXT, nullable: true)]
    private ?string $releaseNotes = null;

    #[ORM\Column(name: 'min_os_version', type: Types::STRING, length: 30, nullable: true)]
    private ?string $minOsVersion = null;

    /** Whether this is the latest release for this app_type. */
    #[ORM\Column(name: 'is_latest', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isLatest = false;

    /** Whether this is a mandatory update. */
    #[ORM\Column(name: 'is_mandatory', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isMandatory = false;

    /** draft, published, deprecated */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'draft'])]
    private string $status = 'draft';

    #[ORM\Column(name: 'published_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $publishedAt = null;

    #[ORM\Column(name: 'download_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $downloadCount = 0;

    #[ORM\Column(name: 'uploaded_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $uploadedBy = null;

    public function __construct(string $appType, string $version, int $buildNumber)
    {
        $this->generateId();
        $this->appType = $appType;
        $this->version = $version;
        $this->buildNumber = $buildNumber;
    }

    public function getAppType(): string { return $this->appType; }
    public function getVersion(): string { return $this->version; }
    public function getBuildNumber(): int { return $this->buildNumber; }
    public function getFilePath(): ?string { return $this->filePath; }
    public function setFilePath(?string $p): void { $this->filePath = $p; }
    public function getFileSize(): ?int { return $this->fileSize; }
    public function setFileSize(?int $s): void { $this->fileSize = $s; }
    public function getChecksum(): ?string { return $this->checksum; }
    public function setChecksum(?string $c): void { $this->checksum = $c; }
    public function getMimeType(): ?string { return $this->mimeType; }
    public function setMimeType(?string $m): void { $this->mimeType = $m; }
    public function getReleaseNotes(): ?string { return $this->releaseNotes; }
    public function setReleaseNotes(?string $n): void { $this->releaseNotes = $n; }
    public function getMinOsVersion(): ?string { return $this->minOsVersion; }
    public function setMinOsVersion(?string $v): void { $this->minOsVersion = $v; }
    public function isLatest(): bool { return $this->isLatest; }
    public function setIsLatest(bool $l): void { $this->isLatest = $l; }
    public function isMandatory(): bool { return $this->isMandatory; }
    public function setIsMandatory(bool $m): void { $this->isMandatory = $m; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $s): void { $this->status = $s; }
    public function getPublishedAt(): ?\DateTimeImmutable { return $this->publishedAt; }
    public function getDownloadCount(): int { return $this->downloadCount; }
    public function incrementDownloadCount(): void { $this->downloadCount++; }
    public function getUploadedBy(): ?string { return $this->uploadedBy; }
    public function setUploadedBy(?string $id): void { $this->uploadedBy = $id; }

    public function publish(): void
    {
        $this->status = 'published';
        $this->publishedAt = new \DateTimeImmutable();
    }

    public function deprecate(): void
    {
        $this->status = 'deprecated';
        $this->isLatest = false;
    }

    /** Valid app types. */
    public static function validAppTypes(): array
    {
        return ['android', 'ios', 'windows', 'macos', 'linux', 'pwa', 'pos_terminal', 'kds_display'];
    }

    /** File extensions by app type. */
    public static function extensionForType(string $type): string
    {
        return match($type) {
            'android' => 'apk',
            'ios' => 'ipa',
            'windows' => 'exe',
            'macos' => 'dmg',
            'linux' => 'AppImage',
            default => 'bin',
        };
    }
}
