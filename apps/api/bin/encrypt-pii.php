#!/usr/bin/env php
<?php

/**
 * bin/encrypt-pii.php — One-shot PII re-encryption script
 *
 * Encrypts existing plaintext values in the database for:
 *   - guests.phone
 *   - guests.id_number
 *   - employees.phone
 *   - employees.bank_account_number
 *   - payroll_items.bank_account_number
 *
 * USAGE:
 *   cd /www/wwwroot/lodgik/apps/api
 *   php bin/encrypt-pii.php --dry-run   # preview changes, no writes
 *   php bin/encrypt-pii.php --apply     # apply encryption
 *
 * REQUIREMENTS:
 *   - PII_ENCRYPTION_KEY must be set in .env
 *   - Run AFTER deploying Version20260403200001 migration
 *   - Safe to run multiple times — already-encrypted rows (ENC: prefix) are skipped
 *
 * ROLLBACK:
 *   If needed, the EncryptionService::decrypt() transparently returns plaintext
 *   for rows that were never encrypted (legacy rows without ENC: prefix).
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Lodgik\Service\EncryptionService;

// Load .env
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$dryRun = in_array('--dry-run', $argv, true);
$apply  = in_array('--apply', $argv, true);

if (!$dryRun && !$apply) {
    echo "Usage: php bin/encrypt-pii.php --dry-run | --apply\n";
    exit(1);
}

$enc = new EncryptionService();
if (!$enc->isConfigured()) {
    echo "ERROR: PII_ENCRYPTION_KEY is not set in .env\n";
    echo "Generate one with: openssl rand -hex 32\n";
    exit(1);
}

// Build DSN from env
$dsn = sprintf(
    'pgsql:host=%s;port=%s;dbname=%s',
    $_ENV['DB_HOST'] ?? '127.0.0.1',
    $_ENV['DB_PORT'] ?? '5432',
    $_ENV['DB_NAME'] ?? 'lodgik',
);

try {
    $pdo = new PDO($dsn, $_ENV['DB_USER'] ?? 'lodgik_app', $_ENV['DB_PASSWORD'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (\PDOException $e) {
    echo "DB connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

$mode = $dryRun ? '[DRY RUN]' : '[APPLY]';
echo "{$mode} PII encryption run started\n\n";

$totalUpdated = 0;
$totalSkipped = 0;

/**
 * Process a single table+column combination.
 */
function processColumn(
    PDO $pdo,
    EncryptionService $enc,
    string $table,
    string $column,
    bool $dryRun,
    int &$totalUpdated,
    int &$totalSkipped,
): void {
    $mode = $dryRun ? '[DRY RUN]' : '[APPLY]';

    $rows = $pdo->query(
        "SELECT id, {$column} FROM {$table} WHERE {$column} IS NOT NULL AND {$column} != ''"
    )->fetchAll(PDO::FETCH_ASSOC);

    $toEncrypt = array_filter($rows, fn($r) => !str_starts_with((string) $r[$column], 'ENC:'));
    $skipped   = count($rows) - count($toEncrypt);
    $totalSkipped += $skipped;

    echo "{$mode} {$table}.{$column}: {$skipped} already encrypted, " . count($toEncrypt) . " to encrypt\n";

    if (empty($toEncrypt)) return;

    $stmt = $pdo->prepare("UPDATE {$table} SET {$column} = :val WHERE id = :id");

    foreach ($toEncrypt as $row) {
        $encrypted = $enc->encrypt($row[$column]);
        if (!$dryRun) {
            $stmt->execute([':val' => $encrypted, ':id' => $row['id']]);
        }
        $totalUpdated++;
    }
}

processColumn($pdo, $enc, 'guests',        'phone',                $dryRun, $totalUpdated, $totalSkipped);
processColumn($pdo, $enc, 'guests',        'id_number',            $dryRun, $totalUpdated, $totalSkipped);
processColumn($pdo, $enc, 'employees',     'phone',                $dryRun, $totalUpdated, $totalSkipped);
processColumn($pdo, $enc, 'employees',     'bank_account_number',  $dryRun, $totalUpdated, $totalSkipped);
processColumn($pdo, $enc, 'payroll_items', 'bank_account_number',  $dryRun, $totalUpdated, $totalSkipped);

echo "\n{$mode} Done.\n";
echo "  Encrypted : {$totalUpdated} rows\n";
echo "  Skipped   : {$totalSkipped} rows (already encrypted)\n";

if ($dryRun) {
    echo "\nThis was a dry run. Run with --apply to write changes.\n";
} else {
    echo "\nEncryption complete. All PII fields are now protected at rest.\n";
}
