<?php

declare(strict_types=1);

namespace Lodgik\Module\Health;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Service\TermiiService;
use Lodgik\Service\ZeptoMailService;
use OpenApi\Attributes as OA;
use Predis\Client as RedisClient;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class HealthController
{
    public function __construct(
        private readonly ResponseHelper          $response,
        private readonly EntityManagerInterface  $em,
        private readonly RedisClient             $redis,
        private readonly ?TermiiService          $termii = null,
        private readonly ?ZeptoMailService       $mail   = null,
    ) {}

    #[OA\Get(
        path: "/api/health",
        summary: "Basic health check",
        tags: ["Health"],
        security: [],
        responses: [
            new OA\Response(response: 200, description: "Healthy"),
            new OA\Response(response: 503, description: "Unhealthy"),
        ]
    )]
    public function check(Request $request, Response $response): Response
    {
        return $this->response->success($response, [
            'status'    => 'ok',
            'service'   => 'lodgik-api',
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ]);
    }

    /**
     * Comprehensive health check — all services, cron jobs, system resources.
     * GET /api/health/detailed
     */
    public function detailed(Request $request, Response $response): Response
    {
        $checks = [
            'api'      => ['status' => 'ok', 'version' => getenv('APP_VERSION') ?: '1.0.0', 'env' => getenv('APP_ENV') ?: 'production'],
            'database' => $this->checkDatabase(),
            'redis'    => $this->checkRedis(),
            'email'    => $this->checkEmail(),
            'sms'      => $this->checkSms(),
            'whatsapp' => $this->checkWhatsApp(),
            'paystack' => $this->checkPaystack(),
            'fcm'      => $this->checkFcm(),
            'apns'     => $this->checkApns(),
            'storage'  => $this->checkStorage(),
            'system'   => $this->checkSystem(),
            'cron'     => $this->checkCronJobs(),
        ];

        $overallStatus = 'ok';
        foreach ($checks as $key => $check) {
            // Degraded for optional services, error for core
            $core = in_array($key, ['api', 'database', 'redis', 'storage'], true);
            if ($check['status'] === 'error' && $core) {
                $overallStatus = 'error';
                break;
            }
            if ($check['status'] === 'error' && $overallStatus === 'ok') {
                $overallStatus = 'degraded';
            }
        }

        return $this->response->success($response, [
            'status'    => $overallStatus,
            'service'   => 'lodgik-api',
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'uptime'    => $this->getUptime(),
            'checks'    => $checks,
        ], status: $overallStatus === 'error' ? 503 : 200);
    }

    // ── Core infrastructure ──────────────────────────────────────────────────

    private function checkDatabase(): array
    {
        try {
            $start = microtime(true);
            $this->em->getConnection()->executeQuery('SELECT 1');
            $latencyMs = round((microtime(true) - $start) * 1000, 2);

            // Fetch DB version
            $version = $this->em->getConnection()->fetchOne('SELECT version()') ?: 'unknown';
            $dbName  = getenv('DB_NAME') ?: 'unknown';

            return [
                'status'     => 'ok',
                'latency_ms' => $latencyMs,
                'database'   => $dbName,
                'version'    => preg_replace('/\s.*/', '', $version), // e.g. "PostgreSQL"
            ];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Database connection failed'];
        }
    }

    private function checkRedis(): array
    {
        try {
            $start = microtime(true);
            $pong   = $this->redis->ping();
            $latencyMs = round((microtime(true) - $start) * 1000, 2);

            $info      = $this->redis->info('server') ?? [];
            $version   = $info['redis_version'] ?? 'unknown';
            $usedMem   = $info['used_memory_human'] ?? 'unknown';

            return [
                'status'     => $pong ? 'ok' : 'error',
                'latency_ms' => $latencyMs,
                'version'    => $version,
                'memory'     => $usedMem,
            ];
        } catch (\Throwable) {
            return ['status' => 'error', 'message' => 'Redis connection failed'];
        }
    }

    private function checkStorage(): array
    {
        $path = getenv('STORAGE_PATH') ?: '/www/wwwroot/lodgik/storage';
        if (!is_dir($path)) {
            return ['status' => 'warning', 'message' => 'Storage path not found', 'path' => $path];
        }

        $total = disk_total_space($path);
        $free  = disk_free_space($path);
        $used  = $total - $free;
        $pct   = $total > 0 ? round($used / $total * 100, 1) : 0;

        return [
            'status'     => $pct > 90 ? 'warning' : 'ok',
            'path'       => $path,
            'total_gb'   => round($total / 1073741824, 2),
            'used_gb'    => round($used  / 1073741824, 2),
            'free_gb'    => round($free  / 1073741824, 2),
            'used_pct'   => $pct,
        ];
    }

    private function checkSystem(): array
    {
        return [
            'status'       => 'ok',
            'php_version'  => PHP_VERSION,
            'php_sapi'     => PHP_SAPI,
            'memory_limit' => ini_get('memory_limit'),
            'max_exec_sec' => ini_get('max_execution_time'),
            'timezone'     => date_default_timezone_get(),
            'os'           => PHP_OS_FAMILY,
        ];
    }

    // ── External services ────────────────────────────────────────────────────

    private function checkEmail(): array
    {
        // ZeptoMail key is stored in the platform settings DB (via admin panel),
        // not necessarily in the env var. Use ZeptoMailService to resolve the key
        // the same way the mailer itself does.
        if ($this->mail === null) {
            return ['status' => 'not_configured', 'provider' => 'ZeptoMail', 'message' => 'Service not injected'];
        }

        // Reflect to call resolveApiKey() (private) — or just send a test ping using the resolved key
        // by calling a harmless info endpoint.
        // We use reflection only to read the key; no email is sent.
        try {
            $ref    = new \ReflectionClass($this->mail);
            $method = $ref->getMethod('resolveApiKey');
            $method->setAccessible(true);
            $apiKey = $method->invoke($this->mail);

            $fromMethod = $ref->getMethod('resolveFromEmail');
            $fromMethod->setAccessible(true);
            $fromEmail = $fromMethod->invoke($this->mail);
        } catch (\Throwable) {
            // Fallback: env var
            $apiKey   = getenv('ZEPTOMAIL_API_KEY') ?: '';
            $fromEmail = getenv('ZEPTOMAIL_FROM_EMAIL') ?: getenv('ZEPTOMAIL_FROM_ADDRESS') ?: '';
        }

        if (!$apiKey || str_contains($apiKey, '<your-send-mail-token>')) {
            return ['status' => 'not_configured', 'provider' => 'ZeptoMail', 'message' => 'API key not configured in admin settings'];
        }

        // Live ping
        try {
            $ctx = stream_context_create(['http' => [
                'method'  => 'GET',
                'header'  => "Authorization: {$apiKey}\r\nAccept: application/json\r\n",
                'timeout' => 5,
                'ignore_errors' => true,
            ]]);
            $start     = microtime(true);
            @file_get_contents('https://api.zeptomail.com/v1.1/accounts', false, $ctx);
            $latencyMs = round((microtime(true) - $start) * 1000, 2);
            $code      = (int) preg_replace('/.*HTTP\/\d\.\d (\d{3}).*/s', '$1', $http_response_header[0] ?? '0');
            $reachable = in_array($code, [200, 201, 400, 401, 403], true);

            return [
                'status'        => $reachable ? 'ok' : 'error',
                'provider'      => 'ZeptoMail',
                'from_address'  => $fromEmail,
                'latency_ms'    => $latencyMs,
                'configured'    => true,
                'key_source'    => 'admin_settings',
            ];
        } catch (\Throwable) {
            return ['status' => 'error', 'provider' => 'ZeptoMail', 'message' => 'API unreachable'];
        }
    }

    private function checkSms(): array
    {
        $apiKey   = getenv('TERMII_API_KEY') ?: '';
        $senderId = getenv('TERMII_SENDER_ID') ?: '';

        if (!$apiKey || $apiKey === '<api-key>') {
            return ['status' => 'not_configured', 'provider' => 'Termii', 'channel' => 'SMS'];
        }

        return $this->pingTermii('SMS', $apiKey, $senderId);
    }

    private function checkWhatsApp(): array
    {
        $apiKey = getenv('TERMII_API_KEY') ?: '';
        if (!$apiKey || $apiKey === '<api-key>') {
            return ['status' => 'not_configured', 'provider' => 'Termii', 'channel' => 'WhatsApp'];
        }

        return $this->pingTermii('WhatsApp', $apiKey, getenv('TERMII_SENDER_ID') ?: '');
    }

    private function pingTermii(string $channel, string $apiKey, string $senderId): array
    {
        try {
            $url = 'https://api.ng.termii.com/api/get-balance';
            $ctx = stream_context_create(['http' => [
                'method'  => 'GET',
                'header'  => "Authorization: Bearer {$apiKey}\r\nAccept: application/json\r\n",
                'timeout' => 5,
                'ignore_errors' => true,
            ]]);
            $start     = microtime(true);
            $raw       = @file_get_contents($url . '?api_key=' . urlencode($apiKey), false, $ctx);
            $latencyMs = round((microtime(true) - $start) * 1000, 2);

            $data = $raw ? @json_decode($raw, true) : null;
            $ok   = isset($data['balance']) || isset($data['data']['balance']);
            $bal  = $data['balance'] ?? $data['data']['balance'] ?? null;

            return [
                'status'      => $ok ? 'ok' : 'error',
                'provider'    => 'Termii',
                'channel'     => $channel,
                'sender_id'   => $senderId,
                'balance'     => $bal !== null ? "₦{$bal}" : null,
                'latency_ms'  => $latencyMs,
                'configured'  => true,
            ];
        } catch (\Throwable) {
            return ['status' => 'error', 'provider' => 'Termii', 'channel' => $channel, 'message' => 'API unreachable'];
        }
    }

    private function checkPaystack(): array
    {
        $secretKey = getenv('PAYSTACK_SECRET_KEY') ?: '';
        if (!$secretKey || str_contains($secretKey, 'xxxx')) {
            return ['status' => 'not_configured', 'provider' => 'Paystack'];
        }

        try {
            $ctx = stream_context_create(['http' => [
                'method'  => 'GET',
                'header'  => "Authorization: Bearer {$secretKey}\r\nAccept: application/json\r\n",
                'timeout' => 5,
                'ignore_errors' => true,
            ]]);
            $start     = microtime(true);
            $raw       = @file_get_contents('https://api.paystack.co/balance', false, $ctx);
            $latencyMs = round((microtime(true) - $start) * 1000, 2);
            $data      = $raw ? @json_decode($raw, true) : null;

            $balance = null;
            if (isset($data['data'][0]['balance'])) {
                $balance = '₦' . number_format($data['data'][0]['balance'] / 100, 2);
            }

            return [
                'status'       => ($data['status'] ?? false) ? 'ok' : 'error',
                'provider'     => 'Paystack',
                'balance'      => $balance,
                'latency_ms'   => $latencyMs,
                'configured'   => true,
            ];
        } catch (\Throwable) {
            return ['status' => 'error', 'provider' => 'Paystack', 'message' => 'API unreachable'];
        }
    }

    private function checkFcm(): array
    {
        $key = getenv('FCM_SERVER_KEY') ?: '';
        if (!$key || $key === '<firebase-server-key>') {
            return ['status' => 'not_configured', 'provider' => 'Firebase FCM'];
        }
        return ['status' => 'ok', 'provider' => 'Firebase FCM', 'configured' => true, 'note' => 'Key present (not validated to avoid quota)'];
    }

    private function checkApns(): array
    {
        $keyId  = getenv('APNS_KEY_ID') ?: '';
        $teamId = getenv('APNS_TEAM_ID') ?: '';
        $keyPath = getenv('APNS_KEY_PATH') ?: '';

        if (!$keyId || !$teamId) {
            return ['status' => 'not_configured', 'provider' => 'Apple APNs'];
        }

        $keyExists = $keyPath && file_exists($keyPath);
        return [
            'status'     => $keyExists ? 'ok' : 'warning',
            'provider'   => 'Apple APNs',
            'key_id'     => $keyId,
            'team_id'    => $teamId,
            'key_file'   => $keyExists ? 'found' : 'missing (' . $keyPath . ')',
            'configured' => $keyExists,
        ];
    }

    // ── Cron jobs ────────────────────────────────────────────────────────────

    private function checkCronJobs(): array
    {
        $jobs = [];

        // NoonCheckout — queries AutoCheckoutLog for most recent auto-checkout
        try {
            $lastRun = $this->em->getConnection()->fetchOne(
                "SELECT MAX(created_at) FROM auto_checkout_logs WHERE created_at > NOW() - INTERVAL '48 hours'"
            );
            $jobs['noon_checkout'] = [
                'name'      => 'Noon Checkout (12:00 PM daily)',
                'status'    => $lastRun ? 'ok' : 'unknown',
                'last_run'  => $lastRun ?: null,
                'schedule'  => '0 12 * * *',
            ];
        } catch (\Throwable) {
            $jobs['noon_checkout'] = ['name' => 'Noon Checkout', 'status' => 'unknown', 'last_run' => null, 'schedule' => '0 12 * * *'];
        }

        // NightAudit — queries night_audits table
        try {
            $lastAudit = $this->em->getConnection()->fetchAssociative(
                "SELECT audit_date, status, created_at FROM night_audits ORDER BY audit_date DESC LIMIT 1"
            );
            $jobs['night_audit'] = [
                'name'       => 'Night Audit (11:50 PM daily)',
                'status'     => ($lastAudit && $lastAudit['status'] === 'completed') ? 'ok' : 'warning',
                'last_run'   => $lastAudit['created_at'] ?? null,
                'last_date'  => $lastAudit['audit_date'] ?? null,
                'audit_status' => $lastAudit['status'] ?? null,
                'schedule'   => '50 23 * * *',
            ];
        } catch (\Throwable) {
            $jobs['night_audit'] = ['name' => 'Night Audit', 'status' => 'unknown', 'last_run' => null, 'schedule' => '50 23 * * *'];
        }

        // LateCheckoutCharge — last 24h
        try {
            $lastCharge = $this->em->getConnection()->fetchOne(
                "SELECT MAX(created_at) FROM booking_status_logs WHERE notes LIKE '%Late checkout%' AND created_at > NOW() - INTERVAL '48 hours'"
            );
            $jobs['late_checkout_charge'] = [
                'name'     => 'Late Checkout Charge',
                'status'   => 'unknown',
                'last_run' => $lastCharge ?: null,
                'schedule' => '0 13 * * *',
            ];
        } catch (\Throwable) {
            $jobs['late_checkout_charge'] = ['name' => 'Late Checkout Charge', 'status' => 'unknown', 'last_run' => null, 'schedule' => '0 13 * * *'];
        }

        // FraudAutoCheckout
        try {
            $fraudLog = $this->em->getConnection()->fetchOne(
                "SELECT MAX(created_at) FROM auto_checkout_logs WHERE reason LIKE '%fraud%' AND created_at > NOW() - INTERVAL '48 hours'"
            );
            $jobs['fraud_auto_checkout'] = [
                'name'     => 'Fraud Auto-Checkout',
                'status'   => 'unknown',
                'last_run' => $fraudLog ?: null,
                'schedule' => '*/15 * * * *',
            ];
        } catch (\Throwable) {
            $jobs['fraud_auto_checkout'] = ['name' => 'Fraud Auto-Checkout', 'status' => 'unknown', 'last_run' => null, 'schedule' => '*/15 * * * *'];
        }

        // VisitorOverstay
        $jobs['visitor_overstay'] = [
            'name'     => 'Visitor Overstay Check',
            'status'   => 'unknown',
            'last_run' => null,
            'schedule' => '0 * * * *',
        ];

        // Database backup — check if backup files exist
        $backupPath = '/www/backup';
        if (is_dir($backupPath)) {
            $files = glob($backupPath . '/lodgik_*.dump.gz') ?: [];
            $latest = $files ? max(array_map('filemtime', $files)) : null;
            $jobs['database_backup'] = [
                'name'      => 'Database Backup (3:00 AM daily)',
                'status'    => $latest && (time() - $latest) < 86400 * 2 ? 'ok' : 'warning',
                'last_run'  => $latest ? date('Y-m-d H:i:s', $latest) : null,
                'schedule'  => '0 3 * * *',
                'file_count' => count($files),
            ];
        } else {
            $jobs['database_backup'] = ['name' => 'Database Backup', 'status' => 'unknown', 'last_run' => null, 'schedule' => '0 3 * * *'];
        }

        return $jobs;
    }

    private function getUptime(): string
    {
        if (function_exists('sys_getloadavg') && PHP_OS_FAMILY === 'Linux') {
            try {
                $uptime = @file_get_contents('/proc/uptime');
                if ($uptime) {
                    $seconds = (int) $uptime;
                    $days    = floor($seconds / 86400);
                    $hours   = floor(($seconds % 86400) / 3600);
                    return "{$days}d {$hours}h";
                }
            } catch (\Throwable) {}
        }
        return 'unknown';
    }
}
