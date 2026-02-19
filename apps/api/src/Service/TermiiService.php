<?php

declare(strict_types=1);

namespace Lodgik\Service;

use Psr\Log\LoggerInterface;

/**
 * Termii SMS integration for guest OTP delivery (Nigeria).
 * Uses Termii's messaging API for SMS delivery.
 * Docs: https://developer.termii.com/
 */
final class TermiiService
{
    private const BASE_URL = 'https://api.ng.termii.com/api';

    public function __construct(
        private readonly string $apiKey,
        private readonly string $senderId,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * Send an SMS message.
     */
    public function send(string $phone, string $message): bool
    {
        if (empty($this->apiKey) || $this->apiKey === 'disabled') {
            $this->logger->info("SMS (disabled): to=$phone msg=$message");
            return true; // Silent success in dev mode
        }

        $phone = $this->normalizePhone($phone);

        $payload = [
            'to' => $phone,
            'from' => $this->senderId,
            'sms' => $message,
            'type' => 'plain',
            'channel' => 'generic',
            'api_key' => $this->apiKey,
        ];

        try {
            $ch = curl_init(self::BASE_URL . '/sms/send');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 15,
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                $this->logger->info("SMS sent: to=$phone");
                return true;
            }

            $this->logger->error("SMS failed: http=$httpCode response=$response");
            return false;
        } catch (\Throwable $e) {
            $this->logger->error("SMS exception: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Send OTP to a phone number.
     */
    public function sendOtp(string $phone, string $otp, string $hotelName): bool
    {
        $message = "Your Lodgik access code for {$hotelName} is: {$otp}. Valid for 10 minutes.";
        return $this->send($phone, $message);
    }

    /**
     * Normalize Nigerian phone numbers to international format.
     * 08012345678 → 2348012345678
     */
    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9+]/', '', $phone);
        if (str_starts_with($phone, '0') && strlen($phone) === 11) {
            return '234' . substr($phone, 1);
        }
        if (str_starts_with($phone, '+')) {
            return ltrim($phone, '+');
        }
        return $phone;
    }
}
