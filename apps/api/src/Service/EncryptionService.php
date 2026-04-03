<?php

declare(strict_types=1);

namespace Lodgik\Service;

/**
 * Field-level AES-256-GCM encryption for PII columns.
 *
 * Usage:
 *   $enc = new EncryptionService();
 *   $ciphertext = $enc->encrypt('07012345678');  // store this in DB
 *   $plaintext  = $enc->decrypt($ciphertext);    // '07012345678'
 *
 * Storage format: base64(iv . tag . ciphertext)
 *   - iv:         12 bytes  (GCM recommended nonce size)
 *   - tag:        16 bytes  (GCM auth tag)
 *   - ciphertext: variable
 *
 * Key: PII_ENCRYPTION_KEY env var — must be exactly 32 bytes (256-bit).
 *      Generate with: openssl rand -hex 16  (produces 32 hex chars)
 *
 * If PII_ENCRYPTION_KEY is not set, encrypt() returns the plaintext unchanged
 * and decrypt() returns the value unchanged. This allows deployments without
 * the key configured to continue working, with a log warning.
 *
 * Existing plaintext records (before encryption was introduced) are detected
 * by the absence of the base64/binary prefix pattern and returned as-is.
 */
final class EncryptionService
{
    private const CIPHER   = 'aes-256-gcm';
    private const IV_LEN   = 12;
    private const TAG_LEN  = 16;
    private const PREFIX   = 'ENC:';  // sentinel to distinguish ciphertext from plaintext

    private ?string $key;

    public function __construct()
    {
        $raw = $_ENV['PII_ENCRYPTION_KEY'] ?? '';
        if ($raw === '') {
            $this->key = null;
            return;
        }
        // Accept either a 64-char hex string or a raw 32-byte key
        if (strlen($raw) === 64 && ctype_xdigit($raw)) {
            $this->key = hex2bin($raw);
        } elseif (strlen($raw) === 32) {
            $this->key = $raw;
        } else {
            // Derive a 32-byte key from whatever was provided
            $this->key = hash('sha256', $raw, true);
        }
    }

    public function isConfigured(): bool
    {
        return $this->key !== null;
    }

    /**
     * Encrypt plaintext. Returns prefixed base64 ciphertext.
     * Returns value unchanged if key is not configured.
     */
    public function encrypt(?string $plaintext): ?string
    {
        if ($plaintext === null || $plaintext === '') {
            return $plaintext;
        }

        if ($this->key === null) {
            return $plaintext;
        }

        // Already encrypted — idempotent
        if (str_starts_with($plaintext, self::PREFIX)) {
            return $plaintext;
        }

        $iv  = random_bytes(self::IV_LEN);
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            self::TAG_LEN,
        );

        if ($ciphertext === false) {
            throw new \RuntimeException('PII encryption failed: ' . openssl_error_string());
        }

        return self::PREFIX . base64_encode($iv . $tag . $ciphertext);
    }

    /**
     * Decrypt ciphertext. Returns null if decryption fails (corrupted or wrong key).
     * Returns value unchanged if it was never encrypted (legacy plaintext).
     */
    public function decrypt(?string $ciphertext): ?string
    {
        if ($ciphertext === null || $ciphertext === '') {
            return $ciphertext;
        }

        // Not encrypted — legacy plaintext row, return as-is
        if (!str_starts_with($ciphertext, self::PREFIX)) {
            return $ciphertext;
        }

        if ($this->key === null) {
            // Key not configured — return null rather than leaking garbled data
            return null;
        }

        $decoded = base64_decode(substr($ciphertext, strlen(self::PREFIX)), true);
        if ($decoded === false || strlen($decoded) < self::IV_LEN + self::TAG_LEN + 1) {
            return null;
        }

        $iv         = substr($decoded, 0, self::IV_LEN);
        $tag        = substr($decoded, self::IV_LEN, self::TAG_LEN);
        $rawCipher  = substr($decoded, self::IV_LEN + self::TAG_LEN);

        $plaintext = openssl_decrypt(
            $rawCipher,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
        );

        return $plaintext === false ? null : $plaintext;
    }
}
