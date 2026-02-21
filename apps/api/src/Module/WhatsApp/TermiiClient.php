<?php
declare(strict_types=1);
namespace Lodgik\Module\WhatsApp;

/**
 * Termii API Client for WhatsApp messaging in Nigeria.
 * Docs: https://developers.termii.com
 *
 * Supports: send message, send OTP, verify OTP, delivery status, balance check.
 */
final class TermiiClient
{
    private string $baseUrl = 'https://api.ng.termii.com/api';

    public function __construct(
        private readonly string $apiKey,
        private readonly string $senderId = 'Lodgik',
    ) {}

    // ─── Send WhatsApp Message ────────────────────────────────
    public function sendWhatsApp(string $phone, string $message): array
    {
        return $this->post('/sms/send', [
            'to' => $this->normalizePhone($phone),
            'from' => $this->senderId,
            'sms' => $message,
            'type' => 'plain',
            'channel' => 'whatsapp',
            'api_key' => $this->apiKey,
        ]);
    }

    // ─── Send OTP via WhatsApp ────────────────────────────────
    public function sendOtp(string $phone, int $pinLength = 6, int $pinTimeToLive = 10, string $pinType = 'NUMERIC'): array
    {
        return $this->post('/sms/otp/send', [
            'api_key' => $this->apiKey,
            'message_type' => 'NUMERIC',
            'to' => $this->normalizePhone($phone),
            'from' => $this->senderId,
            'channel' => 'whatsapp',
            'pin_attempts' => 3,
            'pin_time_to_live' => $pinTimeToLive,
            'pin_length' => $pinLength,
            'pin_placeholder' => '< 1234 >',
            'message_text' => 'Your Lodgik verification code is < 1234 >. Valid for ' . $pinTimeToLive . ' minutes.',
            'pin_type' => $pinType,
        ]);
    }

    // ─── Verify OTP ───────────────────────────────────────────
    public function verifyOtp(string $pinId, string $pin): array
    {
        return $this->post('/sms/otp/verify', [
            'api_key' => $this->apiKey,
            'pin_id' => $pinId,
            'pin' => $pin,
        ]);
    }

    // ─── Check Delivery Status ────────────────────────────────
    public function getDeliveryStatus(string $messageId): array
    {
        return $this->get('/sms/inbox', ['api_key' => $this->apiKey, 'message_id' => $messageId]);
    }

    // ─── Balance Check ────────────────────────────────────────
    public function getBalance(): array
    {
        return $this->get('/get-balance', ['api_key' => $this->apiKey]);
    }

    // ─── Send SMS (fallback) ──────────────────────────────────
    public function sendSms(string $phone, string $message): array
    {
        return $this->post('/sms/send', [
            'to' => $this->normalizePhone($phone),
            'from' => $this->senderId,
            'sms' => $message,
            'type' => 'plain',
            'channel' => 'generic',
            'api_key' => $this->apiKey,
        ]);
    }

    // ─── HTTP Helpers ─────────────────────────────────────────
    private function post(string $path, array $data): array
    {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) return ['success' => false, 'error' => $err, 'http_code' => 0];
        $decoded = json_decode($resp, true) ?? [];
        $decoded['http_code'] = $code;
        $decoded['success'] = $code >= 200 && $code < 300;
        return $decoded;
    }

    private function get(string $path, array $params): array
    {
        $url = $this->baseUrl . $path . '?' . http_build_query($params);
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $decoded = json_decode($resp, true) ?? [];
        $decoded['http_code'] = $code;
        $decoded['success'] = $code >= 200 && $code < 300;
        return $decoded;
    }

    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9+]/', '', $phone);
        if (str_starts_with($phone, '0')) $phone = '234' . substr($phone, 1);
        if (str_starts_with($phone, '+')) $phone = substr($phone, 1);
        return $phone;
    }
}
