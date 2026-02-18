<?php

declare(strict_types=1);

namespace Lodgik\Service;

use League\Flysystem\Filesystem;
use League\Flysystem\Local\LocalFilesystemAdapter;
use Psr\Log\LoggerInterface;

/**
 * File storage abstraction using Flysystem.
 * Supports local storage (development) and can be extended to S3.
 */
final class FileStorageService
{
    private Filesystem $filesystem;
    private string $publicUrlBase;

    public function __construct(
        private readonly LoggerInterface $logger,
    ) {
        $storagePath = $_ENV['STORAGE_PATH'] ?? dirname(__DIR__, 2) . '/storage';
        $adapter = new LocalFilesystemAdapter($storagePath);
        $this->filesystem = new Filesystem($adapter);
        $this->publicUrlBase = $_ENV['STORAGE_URL'] ?? '/storage';
    }

    /**
     * Store a file from base64 data.
     *
     * @return array{path: string, url: string, size: int}
     */
    public function storeBase64(string $base64Data, string $directory, string $filename): array
    {
        // Strip data URI prefix if present (e.g. "data:image/png;base64,...")
        if (str_contains($base64Data, ',')) {
            $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
        }

        $decoded = base64_decode($base64Data, true);
        if ($decoded === false) {
            throw new \RuntimeException('Invalid base64 data');
        }

        $path = trim($directory, '/') . '/' . $filename;
        $this->filesystem->write($path, $decoded);

        $this->logger->info('File stored', ['path' => $path, 'size' => strlen($decoded)]);

        return [
            'path' => $path,
            'url' => $this->publicUrlBase . '/' . $path,
            'size' => strlen($decoded),
        ];
    }

    /**
     * Store uploaded file content.
     *
     * @return array{path: string, url: string, size: int}
     */
    public function store(string $content, string $directory, string $filename): array
    {
        $path = trim($directory, '/') . '/' . $filename;
        $this->filesystem->write($path, $content);

        return [
            'path' => $path,
            'url' => $this->publicUrlBase . '/' . $path,
            'size' => strlen($content),
        ];
    }

    /**
     * Store a logo (validates image, resizes path).
     *
     * @return array{path: string, url: string}
     */
    public function storeLogo(string $base64Data, string $tenantSlug): array
    {
        $ext = $this->detectImageExtension($base64Data);
        $filename = 'logo_' . time() . '.' . $ext;
        $result = $this->storeBase64($base64Data, "tenants/{$tenantSlug}/branding", $filename);

        return ['path' => $result['path'], 'url' => $result['url']];
    }

    /**
     * Delete a file.
     */
    public function delete(string $path): bool
    {
        try {
            $this->filesystem->delete($path);
            return true;
        } catch (\Throwable $e) {
            $this->logger->warning('File delete failed', ['path' => $path, 'error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Check if a file exists.
     */
    public function exists(string $path): bool
    {
        return $this->filesystem->fileExists($path);
    }

    /**
     * Read file contents.
     */
    public function read(string $path): string
    {
        return $this->filesystem->read($path);
    }

    /**
     * Generate a unique filename.
     */
    public static function uniqueFilename(string $originalName): string
    {
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        return bin2hex(random_bytes(16)) . ($ext ? ".{$ext}" : '');
    }

    /**
     * Detect image extension from base64 data URI or magic bytes.
     */
    private function detectImageExtension(string $base64Data): string
    {
        // Check data URI prefix
        if (preg_match('#^data:image/(png|jpe?g|gif|webp|svg\+xml);#', $base64Data, $m)) {
            return match($m[1]) {
                'jpeg', 'jpg' => 'jpg',
                'svg+xml' => 'svg',
                default => $m[1],
            };
        }

        // Fallback: check magic bytes
        $raw = base64_decode(substr($base64Data, 0, 20), true);
        if ($raw) {
            $hex = bin2hex(substr($raw, 0, 4));
            return match(true) {
                str_starts_with($hex, '89504e47') => 'png',
                str_starts_with($hex, 'ffd8ff') => 'jpg',
                str_starts_with($hex, '47494638') => 'gif',
                str_starts_with($hex, '52494646') => 'webp',
                default => 'png',
            };
        }

        return 'png';
    }
}
