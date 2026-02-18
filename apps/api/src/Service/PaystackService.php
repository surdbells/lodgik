<?php

declare(strict_types=1);

namespace Lodgik\Service;

/**
 * Paystack API client for subscription billing.
 * Handles plan creation, subscription initialization, verification, and webhook processing.
 *
 * @see https://paystack.com/docs/api/
 */
final class PaystackService
{
    private string $secretKey;
    private string $publicKey;
    private string $baseUrl = 'https://api.paystack.co';
    private string $webhookSecret;

    public function __construct()
    {
        $this->secretKey = $_ENV['PAYSTACK_SECRET_KEY'] ?? '';
        $this->publicKey = $_ENV['PAYSTACK_PUBLIC_KEY'] ?? '';
        $this->webhookSecret = $_ENV['PAYSTACK_WEBHOOK_SECRET'] ?? $this->secretKey;
    }

    public function getPublicKey(): string { return $this->publicKey; }

    // ─── Plans ─────────────────────────────────────────────────

    /**
     * Create a Paystack plan for recurring billing.
     * @return array{plan_code: string, ...}
     */
    public function createPlan(string $name, int $amountInKobo, string $interval = 'monthly'): array
    {
        return $this->post('/plan', [
            'name' => $name,
            'amount' => $amountInKobo,
            'interval' => $interval, // monthly | annually
            'currency' => 'NGN',
        ]);
    }

    /**
     * Get a Paystack plan by its code.
     */
    public function getPlan(string $planCode): array
    {
        return $this->get("/plan/{$planCode}");
    }

    // ─── Subscriptions ─────────────────────────────────────────

    /**
     * Initialize a transaction (redirect user to Paystack checkout).
     * @return array{authorization_url: string, access_code: string, reference: string}
     */
    public function initializeTransaction(
        string $email,
        int $amountInKobo,
        string $reference,
        ?string $planCode = null,
        array $metadata = [],
        ?string $callbackUrl = null,
    ): array {
        $payload = [
            'email' => $email,
            'amount' => $amountInKobo,
            'reference' => $reference,
            'metadata' => $metadata,
        ];

        if ($planCode !== null) {
            $payload['plan'] = $planCode;
        }
        if ($callbackUrl !== null) {
            $payload['callback_url'] = $callbackUrl;
        }

        return $this->post('/transaction/initialize', $payload);
    }

    /**
     * Verify a transaction by reference.
     */
    public function verifyTransaction(string $reference): array
    {
        return $this->get("/transaction/verify/{$reference}");
    }

    /**
     * Create a subscription using a customer's authorization code.
     */
    public function createSubscription(string $customerCode, string $planCode, ?string $authorizationCode = null): array
    {
        $payload = [
            'customer' => $customerCode,
            'plan' => $planCode,
        ];
        if ($authorizationCode !== null) {
            $payload['authorization'] = $authorizationCode;
        }
        return $this->post('/subscription', $payload);
    }

    /**
     * Get subscription details.
     */
    public function getSubscription(string $subscriptionCodeOrId): array
    {
        return $this->get("/subscription/{$subscriptionCodeOrId}");
    }

    /**
     * Enable a subscription.
     */
    public function enableSubscription(string $subscriptionCode, string $emailToken): array
    {
        return $this->post('/subscription/enable', [
            'code' => $subscriptionCode,
            'token' => $emailToken,
        ]);
    }

    /**
     * Disable (cancel) a subscription.
     */
    public function disableSubscription(string $subscriptionCode, string $emailToken): array
    {
        return $this->post('/subscription/disable', [
            'code' => $subscriptionCode,
            'token' => $emailToken,
        ]);
    }

    // ─── Customers ─────────────────────────────────────────────

    public function createCustomer(string $email, string $firstName, string $lastName, ?string $phone = null): array
    {
        return $this->post('/customer', [
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'phone' => $phone,
        ]);
    }

    public function getCustomer(string $emailOrCode): array
    {
        return $this->get("/customer/{$emailOrCode}");
    }

    // ─── Webhook Verification ──────────────────────────────────

    /**
     * Verify a Paystack webhook signature.
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        $expected = hash_hmac('sha512', $payload, $this->webhookSecret);
        return hash_equals($expected, $signature);
    }

    // ─── HTTP Client ───────────────────────────────────────────

    private function get(string $path): array
    {
        return $this->request('GET', $path);
    }

    private function post(string $path, array $data = []): array
    {
        return $this->request('POST', $path, $data);
    }

    private function request(string $method, string $path, array $data = []): array
    {
        if (empty($this->secretKey)) {
            throw new \RuntimeException('PAYSTACK_SECRET_KEY not configured');
        }

        $url = $this->baseUrl . $path;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->secretKey,
                'Content-Type: application/json',
                'Cache-Control: no-cache',
            ],
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error !== '') {
            throw new \RuntimeException("Paystack API error: {$error}");
        }

        $decoded = json_decode((string) $response, true);
        if ($decoded === null) {
            throw new \RuntimeException("Paystack API returned invalid JSON (HTTP {$httpCode})");
        }

        if ($httpCode >= 400 || ($decoded['status'] ?? false) === false) {
            $msg = $decoded['message'] ?? "HTTP {$httpCode}";
            throw new \RuntimeException("Paystack: {$msg}");
        }

        return $decoded['data'] ?? $decoded;
    }

    /**
     * Generate a unique transaction reference.
     */
    public static function generateReference(string $prefix = 'LDK'): string
    {
        return $prefix . '_' . bin2hex(random_bytes(12));
    }

    /**
     * Check if Paystack is configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->secretKey) && !empty($this->publicKey);
    }
}
