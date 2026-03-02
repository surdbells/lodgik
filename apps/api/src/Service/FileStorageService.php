<?php

declare(strict_types=1);

namespace Lodgik\Service;

use Aws\S3\S3Client;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;
use League\Flysystem\AwsS3V3\PortableVisibilityConverter;
use League\Flysystem\Filesystem;
use League\Flysystem\FilesystemAdapter;
use League\Flysystem\Local\LocalFilesystemAdapter;
use League\Flysystem\Visibility;
use Psr\Log\LoggerInterface;

/**
 * File storage abstraction using Flysystem 3.
 *
 * Supports two drivers, selected via STORAGE_DRIVER env var:
 *   - local  (default): files written to STORAGE_PATH on disk, served by Nginx
 *   - s3:               files written to AWS_S3_BUCKET, using pre-signed URLs
 *
 * All callers work identically regardless of the active driver.
 * Switch from local → S3 by updating .env — no code changes required.
 *
 * Contexts / directory structure:
 *   kyc/          — merchant KYC documents (ID, selfie, proof-of-address)
 *   document/     — general tenant documents
 *   avatar/       — profile / logo images
 *   resource/     — merchant downloadable resources (PDFs, decks)
 *   binary/       — app binaries (APK, IPA, EXE, DMG, AppImage)
 *   other/        — miscellaneous
 */
final class FileStorageService
{
    private readonly Filesystem $filesystem;
    private readonly string     $driver;
    private readonly string     $publicUrlBase;
    private readonly string     $s3Bucket;
    private readonly string     $s3Region;
    private readonly ?S3Client  $s3Client;

    public function __construct(
        private readonly LoggerInterface $logger,
    ) {
        $this->driver = strtolower(trim($_ENV['STORAGE_DRIVER'] ?? 'local'));

        [$adapter, $s3Client] = $this->buildAdapter();
        $this->filesystem = new Filesystem($adapter);
        $this->s3Client   = $s3Client;
        $this->s3Bucket   = $_ENV['AWS_S3_BUCKET'] ?? '';
        $this->s3Region   = $_ENV['AWS_S3_REGION'] ?? 'us-east-1';

        // Public URL base — used only for the local driver.
        // For S3, URLs are always pre-signed and generated per-request.
        $this->publicUrlBase = rtrim($_ENV['STORAGE_URL'] ?? 'https://api.lodgik.co/storage', '/');
    }

    // ─────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────

    /**
     * Store a file from raw binary content.
     *
     * @return array{path: string, url: string, size: int}
     */
    public function store(string $content, string $directory, string $filename): array
    {
        $path = $this->normalisePath($directory, $filename);
        $this->filesystem->write($path, $content);

        $this->logger->info('FileStorage: stored', [
            'driver' => $this->driver,
            'path'   => $path,
            'size'   => strlen($content),
        ]);

        return [
            'path' => $path,
            'url'  => $this->publicUrl($path),
            'size' => strlen($content),
        ];
    }

    /**
     * Store a file from a base64-encoded string (data URI or raw base64).
     *
     * @return array{path: string, url: string, size: int}
     */
    public function storeBase64(string $base64Data, string $directory, string $filename): array
    {
        // Strip data URI prefix, e.g. "data:image/png;base64,..."
        if (str_contains($base64Data, ',')) {
            $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
        }

        $decoded = base64_decode($base64Data, true);
        if ($decoded === false) {
            throw new \RuntimeException('Invalid base64 data — could not decode');
        }

        return $this->store($decoded, $directory, $filename);
    }

    /**
     * Store a logo image (validates it is an image, returns path + URL).
     *
     * @return array{path: string, url: string}
     */
    public function storeLogo(string $base64Data, string $tenantSlug): array
    {
        $ext      = $this->detectImageExtension($base64Data);
        $filename = 'logo_' . bin2hex(random_bytes(8)) . '.' . $ext;
        $result   = $this->storeBase64($base64Data, "tenants/{$tenantSlug}/branding", $filename);

        return ['path' => $result['path'], 'url' => $result['url']];
    }

    /**
     * Store a file from a PSR-7 uploaded file stream or raw stream resource.
     * Used for multipart/form-data binary uploads (APK, IPA, EXE…).
     *
     * @param resource $stream
     * @return array{path: string, url: string, size: int}
     */
    public function storeStream($stream, string $directory, string $filename): array
    {
        $path = $this->normalisePath($directory, $filename);
        $this->filesystem->writeStream($path, $stream);

        $size = $this->filesystem->fileSize($path);

        $this->logger->info('FileStorage: stored stream', [
            'driver' => $this->driver,
            'path'   => $path,
            'size'   => $size,
        ]);

        return [
            'path' => $path,
            'url'  => $this->publicUrl($path),
            'size' => $size,
        ];
    }

    /**
     * Read a file's contents (for small files / checksums).
     */
    public function read(string $path): string
    {
        return $this->filesystem->read($path);
    }

    /**
     * Read a file as a stream (memory-efficient for large binaries).
     *
     * @return resource
     */
    public function readStream(string $path)
    {
        return $this->filesystem->readStream($path);
    }

    /**
     * Check whether a file exists.
     */
    public function exists(string $path): bool
    {
        return $this->filesystem->fileExists($path);
    }

    /**
     * Delete a file (silently ignores missing files).
     */
    public function delete(string $path): bool
    {
        try {
            $this->filesystem->delete($path);
            $this->logger->info('FileStorage: deleted', ['path' => $path]);
            return true;
        } catch (\Throwable $e) {
            $this->logger->warning('FileStorage: delete failed', [
                'path'  => $path,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Get the public URL for a stored file.
     *
     * - Local driver: returns STORAGE_URL / path
     * - S3 driver:    returns a pre-signed URL valid for the given TTL
     */
    public function publicUrl(string $path, int $ttlSeconds = 3600): string
    {
        if ($this->driver === 's3') {
            return $this->s3PresignedUrl($path, $ttlSeconds);
        }

        // Local — Nginx serves /storage → STORAGE_PATH
        return $this->publicUrlBase . '/' . ltrim($path, '/');
    }

    /**
     * Generate a pre-signed S3 download URL (binary downloads, private assets).
     * Falls back to publicUrl() for the local driver.
     */
    public function signedUrl(string $path, int $ttlSeconds = 300): string
    {
        if ($this->driver === 's3') {
            return $this->s3PresignedUrl($path, $ttlSeconds);
        }

        // Local driver — return a time-limited token URL served via the API
        $token = hash_hmac(
            'sha256',
            $path . '|' . (time() + $ttlSeconds),
            $_ENV['APP_SECRET'] ?? 'secret'
        );
        return $this->publicUrlBase . '/' . ltrim($path, '/')
            . '?token=' . $token . '&expires=' . (time() + $ttlSeconds);
    }

    /**
     * Return the active storage driver name: 'local' or 's3'.
     */
    public function getDriver(): string
    {
        return $this->driver;
    }

    /**
     * Generate a unique random filename, preserving the original extension.
     */
    public static function uniqueFilename(string $originalName): string
    {
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        return bin2hex(random_bytes(16)) . ($ext !== '' ? ".{$ext}" : '');
    }

    // ─────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Build the Flysystem adapter and optional S3 client based on STORAGE_DRIVER.
     *
     * @return array{FilesystemAdapter, S3Client|null}
     */
    private function buildAdapter(): array
    {
        if ($this->driver === 's3') {
            $this->assertS3Config();

            $s3Client = new S3Client([
                'version'     => 'latest',
                'region'      => $_ENV['AWS_S3_REGION'] ?? 'us-east-1',
                'credentials' => [
                    'key'    => $_ENV['AWS_S3_KEY']    ?? '',
                    'secret' => $_ENV['AWS_S3_SECRET'] ?? '',
                ],
            ]);

            $adapter = new AwsS3V3Adapter(
                client: $s3Client,
                bucket: $_ENV['AWS_S3_BUCKET'] ?? '',
                // Optional key prefix — keeps all Lodgik files under one prefix
                // even if the bucket is shared with other apps.
                prefix: ltrim($_ENV['AWS_S3_PREFIX'] ?? '', '/'),
                visibility: new PortableVisibilityConverter(
                    // Private by default — all downloads go via pre-signed URLs.
                    defaultForFiles: Visibility::PRIVATE,
                ),
            );

            $this->logger->info('FileStorage: using S3 driver', [
                'bucket' => $_ENV['AWS_S3_BUCKET'] ?? '(not set)',
                'region' => $_ENV['AWS_S3_REGION'] ?? 'us-east-1',
            ]);

            return [$adapter, $s3Client];
        }

        // ── Local driver ──────────────────────────────────────────
        $storagePath = rtrim($_ENV['STORAGE_PATH'] ?? (dirname(__DIR__, 2) . '/storage'), '/');

        if (!is_dir($storagePath)) {
            mkdir($storagePath, 0755, true);
        }

        $adapter = new LocalFilesystemAdapter(
            location: $storagePath,
            // Default file permissions: readable by web server (Nginx)
            writeFlags: LOCK_EX,
            linkHandling: LocalFilesystemAdapter::DISALLOW_LINKS,
        );

        $this->logger->info('FileStorage: using local driver', [
            'path' => $storagePath,
        ]);

        return [$adapter, null];
    }

    /**
     * Generate a pre-signed S3 URL for private object access.
     */
    private function s3PresignedUrl(string $path, int $ttlSeconds): string
    {
        if ($this->s3Client === null) {
            throw new \RuntimeException('S3 client not initialised — STORAGE_DRIVER is not s3');
        }

        $prefix = ltrim($_ENV['AWS_S3_PREFIX'] ?? '', '/');
        $key    = $prefix !== '' ? "{$prefix}/" . ltrim($path, '/') : ltrim($path, '/');

        $cmd = $this->s3Client->getCommand('GetObject', [
            'Bucket' => $this->s3Bucket,
            'Key'    => $key,
        ]);

        $request = $this->s3Client->createPresignedRequest($cmd, "+{$ttlSeconds} seconds");
        return (string) $request->getUri();
    }

    /**
     * Throw if required S3 environment variables are missing.
     */
    private function assertS3Config(): void
    {
        $required = ['AWS_S3_BUCKET', 'AWS_S3_REGION', 'AWS_S3_KEY', 'AWS_S3_SECRET'];
        $missing  = array_filter($required, fn($k) => empty($_ENV[$k]));

        if ($missing !== []) {
            throw new \RuntimeException(
                'S3 driver selected but required env vars are missing: '
                . implode(', ', $missing)
            );
        }
    }

    /**
     * Build a normalised storage path from directory and filename.
     */
    private function normalisePath(string $directory, string $filename): string
    {
        return trim($directory, '/') . '/' . ltrim($filename, '/');
    }

    /**
     * Detect an image extension from a base64 data URI or raw magic bytes.
     */
    private function detectImageExtension(string $base64Data): string
    {
        if (preg_match('#^data:image/(png|jpe?g|gif|webp|svg\+xml);#', $base64Data, $m)) {
            return match ($m[1]) {
                'jpeg', 'jpg' => 'jpg',
                'svg+xml'     => 'svg',
                default       => $m[1],
            };
        }

        $raw = $base64Data;
        if (str_contains($raw, ',')) {
            $raw = substr($raw, strpos($raw, ',') + 1);
        }

        $bytes = base64_decode(substr($raw, 0, 20), true);
        if ($bytes) {
            $hex = bin2hex(substr($bytes, 0, 4));
            return match (true) {
                str_starts_with($hex, '89504e47') => 'png',
                str_starts_with($hex, 'ffd8ff')   => 'jpg',
                str_starts_with($hex, '47494638') => 'gif',
                str_starts_with($hex, '52494646') => 'webp',
                default                           => 'png',
            };
        }

        return 'png';
    }
}
