#!/usr/bin/env php
<?php

/**
 * Lodgik — Phase 1C: Secrets Rotation Checklist
 *
 * Audits the current .env for weak or potentially-exposed secrets.
 * Produces a checklist of what needs rotating and the commands to do so.
 *
 * Run: php bin/secrets-checklist.php
 * This script is READ-ONLY — it never modifies anything.
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

echo "\n";
echo "╔══════════════════════════════════════════════════════╗\n";
echo "║  Lodgik Secrets Audit — " . date('Y-m-d H:i:s') . "     \n";
echo "╚══════════════════════════════════════════════════════╝\n\n";

$issues = [];

// ── Secret strength checks ─────────────────────────────────────────────────
$checks = [
    'JWT_SECRET'              => ['min_len' => 48, 'label' => 'JWT signing secret'],
    'DB_PASSWORD'             => ['min_len' => 16, 'label' => 'PostgreSQL password'],
    'REDIS_PASSWORD'          => ['min_len' => 16, 'label' => 'Redis password'],
    'PAYSTACK_SECRET_KEY'     => ['prefix'  => 'sk_live_', 'label' => 'Paystack secret key'],
    'PAYSTACK_WEBHOOK_SECRET' => ['min_len' => 16, 'label' => 'Paystack webhook secret'],
    'ZEPTOMAIL_API_KEY'       => ['min_len' => 20, 'label' => 'ZeptoMail send token'],
    'TERMII_API_KEY'          => ['min_len' => 10, 'label' => 'Termii API key'],
];

echo "── Secret Strength ─────────────────────────────────────────────────────\n\n";

foreach ($checks as $key => $rule) {
    $val = $_ENV[$key] ?? '';

    if ($val === '' || $val === 'changeme' || $val === 'secret' || $val === 'password') {
        printf("  ❌  %-30s NOT SET or placeholder\n", $key);
        $issues[] = $key;
        continue;
    }

    if (isset($rule['prefix']) && !str_starts_with($val, $rule['prefix'])) {
        printf("  ⚠️   %-30s expected to start with '%s'\n", $key, $rule['prefix']);
        $issues[] = $key;
        continue;
    }

    if (isset($rule['min_len']) && strlen($val) < $rule['min_len']) {
        printf("  ⚠️   %-30s too short (%d chars, min %d)\n", $key, strlen($val), $rule['min_len']);
        $issues[] = $key;
        continue;
    }

    // Mask for display: first 4 + stars + last 4
    $masked = substr($val, 0, 4) . str_repeat('*', max(8, strlen($val) - 8)) . substr($val, -4);
    printf("  ✅  %-30s %s  (%d chars)\n", $key, $masked, strlen($val));
}

// ── Environment mode check ─────────────────────────────────────────────────
echo "\n── Application Mode ─────────────────────────────────────────────────────\n\n";

$appEnv   = $_ENV['APP_ENV']   ?? 'development';
$appDebug = $_ENV['APP_DEBUG'] ?? 'true';

printf("  %s  APP_ENV   = %s\n",  $appEnv === 'production' ? '✅' : '❌', $appEnv);
printf("  %s  APP_DEBUG = %s\n",  $appDebug === 'false'    ? '✅' : '❌', $appDebug);

if ($appDebug !== 'false') {
    $issues[] = 'APP_DEBUG';
    echo "       ⚠️  Debug mode exposes stack traces in API responses — set APP_DEBUG=false\n";
}

// ── git history exposure check ─────────────────────────────────────────────
echo "\n── Git History Exposure ─────────────────────────────────────────────────\n\n";

$gitLog = shell_exec('cd ' . dirname(__DIR__, 2) . ' && git log --oneline --all 2>&1 | head -30') ?? '';
$exposedCommits = [];

// Check if any commit messages mention saas-backup or .env
foreach (explode("\n", $gitLog) as $line) {
    if (preg_match('/saas.backup|\.env\b|secret|credential/i', $line)) {
        $exposedCommits[] = trim($line);
    }
}

if (!empty($exposedCommits)) {
    echo "  ⚠️  Potentially sensitive commits detected in git history:\n";
    foreach ($exposedCommits as $commit) {
        echo "      → {$commit}\n";
    }
    echo "\n  ACTION REQUIRED: Rotate ALL secrets listed above regardless of strength.\n";
    echo "  Assume any secret that was in the repo at any point is compromised.\n";
    $issues[] = '__GIT_HISTORY__';
} else {
    echo "  ✅  No obviously sensitive commits found in recent git history.\n";
}

// ── Rotation commands ──────────────────────────────────────────────────────
echo "\n── Rotation Commands (run on server as root) ────────────────────────────\n\n";

echo "  # Generate new JWT_SECRET:\n";
echo "  openssl rand -hex 32\n\n";

echo "  # Generate new Redis password:\n";
echo "  openssl rand -base64 32\n\n";

echo "  # Generate new DB password (then update aaPanel + .env):\n";
echo "  openssl rand -base64 32\n\n";

echo "  # After updating .env, clear cache and restart:\n";
echo "  rm -rf /www/wwwroot/lodgik/apps/api/var/cache/*\n";
echo "  service php-fpm-83 restart\n\n";

// ── Summary ────────────────────────────────────────────────────────────────
echo "── Summary ──────────────────────────────────────────────────────────────\n\n";

$realIssues = array_filter($issues, fn($i) => $i !== '__GIT_HISTORY__');
if (empty($issues)) {
    echo "  ✅  All secrets appear strong and properly configured.\n\n";
} else {
    echo "  Found " . count($realIssues) . " secret(s) that need attention:\n";
    foreach ($realIssues as $key) {
        echo "    → {$key}\n";
    }
    if (in_array('__GIT_HISTORY__', $issues, true)) {
        echo "  + Git history may have exposed secrets — rotate everything.\n";
    }
    echo "\n";
}
