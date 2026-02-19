<?php

declare(strict_types=1);

namespace Lodgik\Service;

use Psr\Log\LoggerInterface;

/**
 * Firebase Cloud Messaging v1 HTTP API.
 *
 * Uses a service account JSON key for OAuth2 auth.
 * Env: FCM_SERVICE_ACCOUNT_JSON (path or JSON string)
 *      FCM_PROJECT_ID (Firebase project ID)
 *
 * If FCM_PROJECT_ID is empty, push notifications are logged but not sent (dev mode).
 */
final class FcmService
{
    private string $projectId;
    private ?array $serviceAccount = null;
    private ?string $accessToken = null;
    private ?int $tokenExpiry = null;

    public function __construct(
        private readonly LoggerInterface $logger,
        string $projectId = '',
        string $serviceAccountJson = '',
    ) {
        $this->projectId = $projectId;

        if ($serviceAccountJson) {
            // Could be file path or raw JSON
            if (is_file($serviceAccountJson)) {
                $raw = file_get_contents($serviceAccountJson);
            } else {
                $raw = $serviceAccountJson;
            }
            $decoded = json_decode($raw ?: '', true);
            if (is_array($decoded) && isset($decoded['private_key'], $decoded['client_email'])) {
                $this->serviceAccount = $decoded;
            }
        }
    }

    public function isEnabled(): bool
    {
        return $this->projectId !== '' && $this->serviceAccount !== null;
    }

    /**
     * Send push notification to a single FCM token.
     *
     * @param string      $token FCM registration token
     * @param string      $title Notification title
     * @param string|null $body  Notification body
     * @param array|null  $data  Custom data payload
     * @return bool Success
     */
    public function sendToToken(string $token, string $title, ?string $body = null, ?array $data = null): bool
    {
        if (!$this->isEnabled()) {
            $this->logger->info("[FCM-dev] Would send to token: title={$title}, body={$body}");
            return false;
        }

        $message = [
            'message' => [
                'token' => $token,
                'notification' => array_filter([
                    'title' => $title,
                    'body' => $body,
                ]),
            ],
        ];

        if ($data) {
            $message['message']['data'] = array_map('strval', $data);
        }

        // Android-specific config
        $message['message']['android'] = [
            'priority' => 'high',
            'notification' => [
                'sound' => 'default',
                'channel_id' => 'lodgik_default',
            ],
        ];

        // iOS-specific config
        $message['message']['apns'] = [
            'payload' => [
                'aps' => [
                    'sound' => 'default',
                    'badge' => 1,
                ],
            ],
        ];

        return $this->sendRequest($message);
    }

    /**
     * Send to multiple tokens (one-by-one, FCM v1 doesn't support multicast natively).
     *
     * @param string[]    $tokens
     * @param string      $title
     * @param string|null $body
     * @param array|null  $data
     * @return int Number of successful sends
     */
    public function sendToTokens(array $tokens, string $title, ?string $body = null, ?array $data = null): int
    {
        $success = 0;
        foreach ($tokens as $token) {
            if ($this->sendToToken($token, $title, $body, $data)) {
                $success++;
            }
        }
        return $success;
    }

    // ─── Private ────────────────────────────────────────────────

    private function sendRequest(array $message): bool
    {
        $accessToken = $this->getAccessToken();
        if (!$accessToken) return false;

        $url = "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($message),
            CURLOPT_TIMEOUT => 10,
        ]);

        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status === 200) {
            $this->logger->debug("[FCM] Push sent successfully");
            return true;
        }

        $this->logger->warning("[FCM] Push failed: status={$status}, response={$response}");
        return false;
    }

    /**
     * Get OAuth2 access token using service account JWT assertion.
     * Caches token until 5 minutes before expiry.
     */
    private function getAccessToken(): ?string
    {
        if ($this->accessToken && $this->tokenExpiry && time() < ($this->tokenExpiry - 300)) {
            return $this->accessToken;
        }

        if (!$this->serviceAccount) return null;

        $now = time();
        $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claim = base64_encode(json_encode([
            'iss' => $this->serviceAccount['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $signatureInput = $header . '.' . $claim;
        $privateKey = openssl_pkey_get_private($this->serviceAccount['private_key']);
        if (!$privateKey) {
            $this->logger->error('[FCM] Invalid private key in service account');
            return null;
        }

        openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        $jwt = $signatureInput . '.' . base64_encode($signature);

        // Exchange JWT for access token
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]),
            CURLOPT_TIMEOUT => 10,
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($response ?: '', true);
        if (isset($data['access_token'])) {
            $this->accessToken = $data['access_token'];
            $this->tokenExpiry = $now + ($data['expires_in'] ?? 3600);
            return $this->accessToken;
        }

        $this->logger->error('[FCM] Failed to obtain access token: ' . ($response ?: 'no response'));
        return null;
    }
}
