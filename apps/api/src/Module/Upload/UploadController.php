<?php

declare(strict_types=1);

namespace Lodgik\Module\Upload;

use Lodgik\Util\JsonResponse;
use Lodgik\Service\FileStorageService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

/**
 * Generic file upload endpoints.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  POST /api/upload         — small files via base64 JSON body    │
 * │                             images + PDFs, max 10 MB            │
 * │                             contexts: kyc | document | avatar   │
 * │                                       resource | other          │
 * │                                                                  │
 * │  POST /api/admin/upload/binary  — large app binaries via        │
 * │                             multipart/form-data, max 500 MB     │
 * │                             contexts: binary | resource | other  │
 * │                             admin role only                     │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Why two endpoints?
 * Base64 encoding inflates file size by ~33%, making it impractical
 * for app binaries (APK/IPA/EXE can be 50–200 MB). Multipart uploads
 * stream the raw bytes directly without the encoding overhead.
 */
final class UploadController
{
    // ── Shared: media (images + PDFs) ────────────────────────────
    private const MEDIA_MIME = [
        'image/jpeg'      => 'jpg',
        'image/jpg'       => 'jpg',
        'image/png'       => 'png',
        'image/webp'      => 'webp',
        'image/gif'       => 'gif',
        'application/pdf' => 'pdf',
    ];

    private const MEDIA_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    private const MEDIA_CONTEXTS = ['kyc', 'document', 'avatar', 'resource', 'other'];

    // ── Binary uploads (app distributions) ───────────────────────
    /** MIME → canonical extension for app binaries. */
    private const BINARY_MIME = [
        // Android APK
        'application/vnd.android.package-archive'             => 'apk',
        // iOS IPA
        'application/octet-stream'                            => 'bin',   // fallback — ext override applies
        'application/x-ios-app'                               => 'ipa',
        // Windows installer
        'application/x-msdownload'                            => 'exe',
        'application/vnd.microsoft.portable-executable'       => 'exe',
        // macOS DMG / PKG
        'application/x-apple-diskimage'                       => 'dmg',
        'application/x-newton-compatible-pkg'                 => 'pkg',
        // Linux AppImage / deb / rpm
        'application/x-executable'                            => 'appimage',
        'application/vnd.debian.binary-package'               => 'deb',
        'application/x-rpm'                                   => 'rpm',
        // Archives (for resources / bundles)
        'application/zip'                                     => 'zip',
        'application/x-zip-compressed'                        => 'zip',
    ];

    /**
     * Extension override table — because browsers send octet-stream for most
     * binary types; we trust the original filename extension instead.
     */
    private const EXTENSION_BY_ORIGINAL = [
        'apk'      => 'apk',
        'ipa'      => 'ipa',
        'exe'      => 'exe',
        'dmg'      => 'dmg',
        'pkg'      => 'pkg',
        'appimage' => 'appimage',
        'deb'      => 'deb',
        'rpm'      => 'rpm',
        'zip'      => 'zip',
    ];

    private const BINARY_MAX_BYTES  = 500 * 1024 * 1024; // 500 MB
    private const BINARY_CONTEXTS   = ['binary', 'resource', 'other'];

    public function __construct(
        private readonly FileStorageService $storage,
        private readonly JsonResponse       $response,
    ) {}

    // ─────────────────────────────────────────────────────────────
    // POST /api/upload  — base64 JSON upload (small files)
    // ─────────────────────────────────────────────────────────────

    /**
     * Accept a base64-encoded file in the JSON body and store it.
     *
     * Request body (JSON):
     *   { "file_base64": "data:image/png;base64,...", "filename": "id.png", "context": "kyc" }
     *
     * Response:
     *   { "url": "...", "path": "...", "filename": "...", "original": "...",
     *     "size": 12345, "mime_type": "image/png", "context": "kyc" }
     */
    public function upload(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);

        $base64   = trim($body['file_base64'] ?? '');
        $filename = trim($body['filename']    ?? '');
        $context  = trim($body['context']     ?? 'other');

        // ── Validate inputs ──────────────────────────────────────
        $errors = [];
        if ($base64 === '') {
            $errors['file_base64'] = 'File data is required';
        }
        if ($filename === '') {
            $errors['filename'] = 'Filename is required';
        }
        if (!in_array($context, self::MEDIA_CONTEXTS, true)) {
            $errors['context'] = 'Invalid context. Allowed: ' . implode(', ', self::MEDIA_CONTEXTS);
        }
        if ($errors !== []) {
            return $this->response->validationError($res, $errors);
        }

        // ── Detect MIME type ─────────────────────────────────────
        $mime = $this->detectMediaMime($base64);
        if ($mime === null) {
            return $this->response->error(
                $res,
                'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, PDF.',
                422
            );
        }

        // ── Decode & size-check ──────────────────────────────────
        $raw = $base64;
        if (str_contains($raw, ',')) {
            $raw = substr($raw, strpos($raw, ',') + 1);
        }
        $decoded = base64_decode($raw, true);
        if ($decoded === false) {
            return $this->response->error($res, 'Invalid base64 data', 422);
        }
        if (strlen($decoded) > self::MEDIA_MAX_BYTES) {
            return $this->response->error(
                $res,
                'File too large. Maximum size for this endpoint is 10 MB.',
                422
            );
        }

        // ── Build safe filename & store ──────────────────────────
        $ext          = self::MEDIA_MIME[$mime];
        $safeFilename = bin2hex(random_bytes(16)) . '.' . $ext;

        try {
            $result = $this->storage->storeBase64($base64, $context, $safeFilename);
        } catch (\Throwable $e) {
            return $this->response->error($res, 'Storage error: ' . $e->getMessage(), 500);
        }

        return $this->response->success($res, [
            'url'       => $result['url'],
            'path'      => $result['path'],
            'filename'  => $safeFilename,
            'original'  => $filename,
            'size'      => $result['size'],
            'mime_type' => $mime,
            'context'   => $context,
        ], 'File uploaded successfully');
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/admin/upload/binary  — multipart upload (large files)
    // ─────────────────────────────────────────────────────────────

    /**
     * Accept a binary file via multipart/form-data and store it.
     * Intended for app distributions: APK, IPA, EXE, DMG, AppImage.
     *
     * Requires admin JWT.
     * PHP + Nginx must allow upload_max_filesize / client_max_body_size ≥ 512M
     * for the largest binaries.
     *
     * Request (multipart/form-data):
     *   file     — binary file field
     *   context  — 'binary' | 'resource' | 'other'  (optional, default: binary)
     *
     * Response:
     *   { "url": "...", "path": "...", "filename": "...", "original": "...",
     *     "size": 12345678, "mime_type": "application/vnd.android.package-archive",
     *     "context": "binary" }
     */
    public function uploadBinary(Request $req, Response $res): Response
    {
        $uploadedFiles = $req->getUploadedFiles();
        $body          = (array) ($req->getParsedBody() ?? []);
        $context       = trim($body['context'] ?? 'binary');

        // ── Validate context ─────────────────────────────────────
        if (!in_array($context, self::BINARY_CONTEXTS, true)) {
            return $this->response->validationError($res, [
                'context' => 'Invalid context. Allowed: ' . implode(', ', self::BINARY_CONTEXTS),
            ]);
        }

        // ── Validate file field ──────────────────────────────────
        /** @var UploadedFileInterface|null $upload */
        $upload = $uploadedFiles['file'] ?? null;
        if ($upload === null) {
            return $this->response->validationError($res, [
                'file' => 'No file uploaded. Use multipart/form-data with field name "file".',
            ]);
        }

        if ($upload->getError() !== UPLOAD_ERR_OK) {
            $errMsg = $this->phpUploadError($upload->getError());
            return $this->response->error($res, "Upload error: {$errMsg}", 422);
        }

        // ── Size check ────────────────────────────────────────────
        $size = $upload->getSize() ?? 0;
        if ($size > self::BINARY_MAX_BYTES) {
            $maxMb = self::BINARY_MAX_BYTES / 1024 / 1024;
            return $this->response->error(
                $res,
                "File too large. Maximum size for binary uploads is {$maxMb} MB.",
                422
            );
        }

        // ── Determine extension and MIME ─────────────────────────
        $originalName = $upload->getClientFilename() ?? 'upload.bin';
        $originalExt  = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $clientMime   = strtolower($upload->getClientMediaType() ?? 'application/octet-stream');

        // Prefer extension-based detection (more reliable than browser MIME)
        $ext = self::EXTENSION_BY_ORIGINAL[$originalExt]
            ?? self::BINARY_MIME[$clientMime]
            ?? null;

        if ($ext === null) {
            return $this->response->error(
                $res,
                'Unsupported binary type. Allowed: APK, IPA, EXE, DMG, PKG, AppImage, DEB, RPM, ZIP.',
                422
            );
        }

        // Resolve final MIME type — fall back to octet-stream for unknown types
        $mime = array_search($ext, self::BINARY_MIME, true) ?: 'application/octet-stream';
        if ($clientMime !== 'application/octet-stream' && isset(self::BINARY_MIME[$clientMime])) {
            $mime = $clientMime; // use the browser-sent MIME if it's in our allowed list
        }

        // ── Build safe filename ───────────────────────────────────
        $safeFilename = bin2hex(random_bytes(16)) . '.' . $ext;

        // ── Stream to storage ─────────────────────────────────────
        try {
            $stream = $upload->getStream()->detach();
            if ($stream === null) {
                return $this->response->error($res, 'Could not read uploaded file stream.', 500);
            }

            $result = $this->storage->storeStream($stream, $context, $safeFilename);
        } catch (\Throwable $e) {
            return $this->response->error($res, 'Storage error: ' . $e->getMessage(), 500);
        }

        return $this->response->success($res, [
            'url'       => $result['url'],
            'path'      => $result['path'],
            'filename'  => $safeFilename,
            'original'  => $originalName,
            'size'      => $result['size'],
            'mime_type' => $mime,
            'context'   => $context,
        ], 'Binary uploaded successfully');
    }

    // ─────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────

    /**
     * Detect MIME type from a base64 string — checks data URI prefix first,
     * then falls back to magic bytes.
     */
    private function detectMediaMime(string $base64): ?string
    {
        // Data URI prefix is the most reliable source
        if (preg_match(
            '#^data:([a-z][a-z0-9!#$&\-^_]+/[a-z0-9!#$&\-^_+.]+);base64,#i',
            $base64,
            $m
        )) {
            $mime = strtolower($m[1]);
            $mime = ($mime === 'image/jpg') ? 'image/jpeg' : $mime;
            return array_key_exists($mime, self::MEDIA_MIME) ? $mime : null;
        }

        // Magic bytes fallback
        $raw = $base64;
        if (str_contains($raw, ',')) {
            $raw = substr($raw, strpos($raw, ',') + 1);
        }
        $bytes = base64_decode(substr($raw, 0, 16), true);
        if (!$bytes) {
            return null;
        }
        $hex = bin2hex($bytes);

        return match (true) {
            str_starts_with($hex, 'ffd8ff')     => 'image/jpeg',
            str_starts_with($hex, '89504e47')   => 'image/png',
            str_starts_with($hex, '47494638')   => 'image/gif',
            str_starts_with($hex, '52494646')   => 'image/webp',
            str_starts_with($hex, '25504446')   => 'application/pdf', // %PDF
            default                             => null,
        };
    }

    /**
     * Map PHP upload error code to a human-readable message.
     */
    private function phpUploadError(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE,
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds the maximum allowed size.',
            UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
            UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder on server.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
            UPLOAD_ERR_EXTENSION  => 'Upload blocked by PHP extension.',
            default               => "Unknown upload error (code {$code}).",
        };
    }
}
