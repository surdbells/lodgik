<?php

declare(strict_types=1);

namespace Lodgik\Command;

use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Runs at 02:00 AM daily, after the night audit (see crontab.example).
 *
 * Steps:
 *   1. Runs pg_dump to create a full database dump (.sql).
 *   2. Compresses with gzip.
 *   3. Encrypts with AES-256-CBC using BACKUP_ENCRYPTION_KEY from env.
 *   4. Moves the encrypted archive to BACKUP_STORAGE_PATH.
 *   5. Optionally uploads to an S3-compatible bucket if BACKUP_S3_BUCKET is set.
 *   6. Prunes local and remote backups older than BACKUP_RETENTION_DAYS (default 30).
 *
 * Required env vars:
 *   BACKUP_ENCRYPTION_KEY   — 32+ char passphrase for AES-256 encryption
 *   BACKUP_STORAGE_PATH     — Local directory to store backup files (e.g. /var/backups/lodgik)
 *
 * Optional env vars:
 *   BACKUP_RETENTION_DAYS   — How many days to keep backups (default: 30)
 *   BACKUP_S3_BUCKET        — S3 bucket name (if set, uploads after local save)
 *   BACKUP_S3_PREFIX        — Key prefix within bucket (default: lodgik/backups/)
 *   AWS_DEFAULT_REGION      — Required if using S3
 *
 * Database connection is read from the same env vars used by the application:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */
#[AsCommand(
    name: 'lodgik:database-backup',
    description: 'Full database backup with AES-256 encryption and 30-day retention',
)]
final class DatabaseBackupCommand extends AbstractCommand
{
    public function __construct(
        EntityManagerInterface $em,
        LoggerInterface        $logger,
    ) {
        parent::__construct($em, $logger);
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Show what would happen without creating any files');
        $this->addOption('skip-prune', null, InputOption::VALUE_NONE, 'Skip the old backup pruning step');
    }

    protected function handle(InputInterface $input, SymfonyStyle $io): int
    {
        $dryRun    = (bool) $input->getOption('dry-run');
        $skipPrune = (bool) $input->getOption('skip-prune');

        // ── Resolve config ─────────────────────────────────────────────────
        $encKey        = $_ENV['BACKUP_ENCRYPTION_KEY']  ?? null;
        $storagePath   = rtrim($_ENV['BACKUP_STORAGE_PATH'] ?? '/var/backups/lodgik', '/');
        $retentionDays = (int) ($_ENV['BACKUP_RETENTION_DAYS'] ?? 30);
        $s3Bucket      = $_ENV['BACKUP_S3_BUCKET']   ?? null;
        $s3Prefix      = rtrim($_ENV['BACKUP_S3_PREFIX'] ?? 'lodgik/backups', '/');

        $dbHost = $_ENV['DB_HOST']     ?? 'localhost';
        $dbPort = $_ENV['DB_PORT']     ?? '5432';
        $dbName = $_ENV['DB_NAME']     ?? 'lodgik';
        $dbUser = $_ENV['DB_USER']     ?? 'lodgik';
        $dbPass = $_ENV['DB_PASSWORD'] ?? '';

        if (!$encKey) {
            $io->error('BACKUP_ENCRYPTION_KEY is not set. Backup aborted.');
            return self::FAILURE;
        }

        if (!$dryRun && !is_dir($storagePath)) {
            mkdir($storagePath, 0750, true);
        }

        $timestamp  = (new \DateTimeImmutable())->format('Y-m-d_His');
        $dumpFile   = "{$storagePath}/lodgik_{$timestamp}.sql";
        $gzipFile   = "{$dumpFile}.gz";
        $encFile    = "{$gzipFile}.enc";
        $iv         = random_bytes(16);
        $ivHex      = bin2hex($iv);

        $io->definitionList(
            ['Database' => "{$dbName}@{$dbHost}:{$dbPort}"],
            ['Storage'  => $storagePath],
            ['Retention' => "{$retentionDays} days"],
            ['S3 upload' => $s3Bucket ?? 'disabled'],
            ['Encryption' => 'AES-256-CBC'],
        );

        if ($dryRun) {
            $io->caution("DRY-RUN — would create: {$encFile}");
            return self::SUCCESS;
        }

        // ── 1. pg_dump ────────────────────────────────────────────────────
        $io->text('Step 1/4: Running pg_dump...');
        $pgPassEnv = "PGPASSWORD=" . escapeshellarg($dbPass);
        $dumpCmd   = "{$pgPassEnv} pg_dump"
            . " -h " . escapeshellarg($dbHost)
            . " -p " . escapeshellarg($dbPort)
            . " -U " . escapeshellarg($dbUser)
            . " --format=plain --no-owner --no-acl"
            . " " . escapeshellarg($dbName)
            . " > " . escapeshellarg($dumpFile)
            . " 2>&1";

        $output = []; $code = 0;
        exec($dumpCmd, $output, $code);

        if ($code !== 0) {
            $this->logger->error('[Backup] pg_dump failed: ' . implode("\n", $output));
            $io->error('pg_dump failed: ' . implode("\n", $output));
            return self::FAILURE;
        }
        $dumpSize = filesize($dumpFile);
        $io->text("  ✓ Dump: " . $this->humanBytes($dumpSize));

        // ── 2. Gzip compress ─────────────────────────────────────────────
        $io->text('Step 2/4: Compressing...');
        exec("gzip -9 " . escapeshellarg($dumpFile), $out, $code);
        if ($code !== 0 || !file_exists($gzipFile)) {
            $io->error('gzip compression failed');
            @unlink($dumpFile);
            return self::FAILURE;
        }
        $io->text("  ✓ Compressed: " . $this->humanBytes(filesize($gzipFile)));

        // ── 3. AES-256-CBC encrypt ─────────────────────────────────────
        $io->text('Step 3/4: Encrypting (AES-256-CBC)...');
        $plaintext  = file_get_contents($gzipFile);
        $key        = hash('sha256', $encKey, true);   // 32-byte key
        $ciphertext = openssl_encrypt($plaintext, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        if ($ciphertext === false) {
            $io->error('Encryption failed: ' . openssl_error_string());
            @unlink($gzipFile);
            return self::FAILURE;
        }
        // Prepend IV (hex, 32 chars) to ciphertext so we can decrypt later
        file_put_contents($encFile, $ivHex . $ciphertext);
        @unlink($gzipFile);  // Remove unencrypted gzip
        $io->text("  ✓ Encrypted: " . $this->humanBytes(filesize($encFile)));

        // ── 4. S3 upload (optional) ───────────────────────────────────
        if ($s3Bucket) {
            $io->text('Step 4/4: Uploading to S3...');
            $s3Key  = "{$s3Prefix}/lodgik_{$timestamp}.sql.gz.enc";
            $awsCmd = "aws s3 cp " . escapeshellarg($encFile)
                . " s3://{$s3Bucket}/{$s3Key}"
                . " --storage-class STANDARD_IA 2>&1";
            $s3Out  = []; $s3Code = 0;
            exec($awsCmd, $s3Out, $s3Code);
            if ($s3Code !== 0) {
                $this->logger->warning('[Backup] S3 upload failed: ' . implode("\n", $s3Out));
                $io->warning('S3 upload failed — backup saved locally only');
            } else {
                $io->text("  ✓ Uploaded to s3://{$s3Bucket}/{$s3Key}");
            }
        } else {
            $io->text('Step 4/4: S3 upload skipped (BACKUP_S3_BUCKET not set)');
        }

        // ── 5. Prune old backups ────────────────────────────────────────
        if (!$skipPrune) {
            $io->text("Pruning backups older than {$retentionDays} days...");
            $pruned = $this->pruneLocal($storagePath, $retentionDays, $io);
            $io->text("  ✓ Pruned {$pruned} old local backup(s)");

            if ($s3Bucket) {
                $this->pruneS3($s3Bucket, $s3Prefix, $retentionDays, $io);
            }
        }

        $this->logger->info("[Backup] Completed: {$encFile} | size=" . $this->humanBytes(filesize($encFile)));
        $io->success("Backup complete: {$encFile}");

        return self::SUCCESS;
    }

    private function pruneLocal(string $storagePath, int $retentionDays, SymfonyStyle $io): int
    {
        $cutoff  = (new \DateTimeImmutable())->modify("-{$retentionDays} days")->getTimestamp();
        $files   = glob("{$storagePath}/lodgik_*.enc") ?: [];
        $pruned  = 0;
        foreach ($files as $file) {
            if (filemtime($file) < $cutoff) {
                @unlink($file);
                $this->logger->info("[Backup] Pruned old backup: {$file}");
                $pruned++;
            }
        }
        return $pruned;
    }

    private function pruneS3(string $bucket, string $prefix, int $retentionDays, SymfonyStyle $io): void
    {
        // List and delete S3 objects older than retention window
        $cutoffDate = (new \DateTimeImmutable())->modify("-{$retentionDays} days")->format('Y-m-d');
        $listCmd    = "aws s3api list-objects-v2"
            . " --bucket " . escapeshellarg($bucket)
            . " --prefix " . escapeshellarg($prefix . '/')
            . " --query 'Contents[?LastModified<=\`{$cutoffDate}\`].Key'"
            . " --output text 2>&1";
        $listOut = []; $listCode = 0;
        exec($listCmd, $listOut, $listCode);
        if ($listCode !== 0 || empty($listOut)) return;

        foreach (array_filter($listOut) as $key) {
            $key = trim($key);
            if (empty($key) || $key === 'None') continue;
            $delCmd = "aws s3 rm s3://{$bucket}/{$key} 2>&1";
            exec($delCmd);
            $this->logger->info("[Backup] S3 pruned: s3://{$bucket}/{$key}");
        }
    }

    private function humanBytes(int $bytes): string
    {
        if ($bytes < 1024)       return "{$bytes} B";
        if ($bytes < 1048576)    return round($bytes / 1024, 1) . ' KB';
        if ($bytes < 1073741824) return round($bytes / 1048576, 1) . ' MB';
        return round($bytes / 1073741824, 2) . ' GB';
    }
}
