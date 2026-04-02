#!/usr/bin/env php
<?php

/**
 * Lodgik — Phase 1C: Cron Verification Script
 *
 * Checks that all expected scheduled tasks have run recently.
 * Run this manually or add to monitoring: php bin/verify-cron.php
 *
 * Exit codes:
 *   0 = All tasks running
 *   1 = One or more tasks missing or stale
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$dsn = sprintf(
    'pgsql:host=%s;port=%s;dbname=%s',
    $_ENV['DB_HOST'] ?? '127.0.0.1',
    $_ENV['DB_PORT'] ?? '5432',
    $_ENV['DB_NAME'] ?? 'lodgik'
);

$pdo = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASSWORD'], [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

// ── Expected cron tasks ────────────────────────────────────────────────────
// Each entry defines:
//   action        => the audit_log action written by the cron handler
//   label         => human-readable name
//   max_stale_hrs => how many hours since last run before we flag it as stale
$tasks = [
    [
        'action'        => 'night_audit_run',
        'label'         => 'Night Audit',
        'max_stale_hrs' => 26,   // runs daily at 3 AM WAT; allow 26h for missed runs
    ],
    [
        'action'        => 'leave_balance_credited',
        'label'         => 'Leave Balance Auto-Credit',
        'max_stale_hrs' => 750,  // runs monthly; flag if >31 days
    ],
    [
        'action'        => 'subscription_check_run',
        'label'         => 'Subscription Expiry Check',
        'max_stale_hrs' => 26,
    ],
];

echo "\n";
echo "╔══════════════════════════════════════════════════════╗\n";
echo "║  Lodgik Cron Verification — " . date('Y-m-d H:i:s') . "  \n";
echo "╚══════════════════════════════════════════════════════╝\n\n";

$exitCode = 0;

foreach ($tasks as $task) {
    $stmt = $pdo->prepare("
        SELECT created_at
        FROM   audit_logs
        WHERE  action = ?
        ORDER  BY created_at DESC
        LIMIT  1
    ");
    $stmt->execute([$task['action']]);
    $row = $stmt->fetch();

    if (!$row) {
        printf("  ❌  %-35s NEVER RUN — set up cron immediately\n", $task['label']);
        $exitCode = 1;
        continue;
    }

    $lastRun    = new DateTimeImmutable($row['created_at']);
    $hoursSince = (time() - $lastRun->getTimestamp()) / 3600;

    if ($hoursSince > $task['max_stale_hrs']) {
        printf("  ⚠️   %-35s STALE — last run %.1fh ago (max %dh)\n",
            $task['label'], $hoursSince, $task['max_stale_hrs']);
        $exitCode = 1;
    } else {
        printf("  ✅  %-35s OK — last run %.1fh ago\n",
            $task['label'], $hoursSince);
    }
}

// ── PHP-FPM worker check ───────────────────────────────────────────────────
$workers = shell_exec('ps aux | grep php-fpm | grep -v grep | wc -l') ?? '0';
$workerCount = (int) trim($workers);
echo "\n";
printf("  %s  PHP-FPM workers running: %d\n",
    $workerCount > 0 ? '✅' : '❌', $workerCount);
if ($workerCount === 0) $exitCode = 1;

// ── Redis connectivity check ───────────────────────────────────────────────
try {
    $redis = new Redis();
    $redis->connect(
        $_ENV['REDIS_HOST'] ?? '127.0.0.1',
        (int) ($_ENV['REDIS_PORT'] ?? 6379),
        2.0  // 2 second connect timeout
    );
    if (!empty($_ENV['REDIS_PASSWORD'])) {
        $redis->auth($_ENV['REDIS_PASSWORD']);
    }
    $redis->ping();
    echo "  ✅  Redis connectivity: OK\n";
} catch (\Throwable $e) {
    echo "  ❌  Redis connectivity: FAILED — {$e->getMessage()}\n";
    echo "      Rate limiting and session handling will be degraded.\n";
    $exitCode = 1;
}

// ── Pending migrations check ───────────────────────────────────────────────
$migOut = shell_exec('cd ' . dirname(__DIR__) . ' && php vendor/bin/doctrine-migrations status --no-interaction 2>&1');
if (str_contains((string)$migOut, 'New Migrations') && preg_match('/New Migrations:\s+(\d+)/', (string)$migOut, $m) && (int)$m[1] > 0) {
    echo "  ⚠️   Database migrations: {$m[1]} pending migration(s) — run doctrine-migrations migrate\n";
    $exitCode = 1;
} else {
    echo "  ✅  Database migrations: all up to date\n";
}

echo "\n";
if ($exitCode === 0) {
    echo "All checks passed. ✅\n\n";
} else {
    echo "One or more checks failed. Review warnings above. ⚠️\n\n";
}

exit($exitCode);
