#!/usr/bin/env php
<?php

/**
 * Lodgik — Phase 1B: Folio Charge Audit & Remediation Script
 *
 * Finds POS restaurant/bar charges that were stored at kobo values instead of
 * naira (the ×100 inflation bug). Produces a CSV report and optionally applies
 * the correction.
 *
 * Usage:
 *   php bin/audit-folio-charges.php             # dry-run (safe, no changes)
 *   php bin/audit-folio-charges.php --apply     # apply corrections to DB
 *   php bin/audit-folio-charges.php --csv=out.csv  # save report to file
 *
 * Safety guarantees:
 *   - Dry-run by default (must pass --apply explicitly)
 *   - Each correction is individually logged to audit_logs
 *   - Folio balances are recalculated after each correction
 *   - A transaction wraps all changes; if anything fails, nothing is committed
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

// ── Bootstrap ──────────────────────────────────────────────────────────────
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

// ── Parse args ─────────────────────────────────────────────────────────────
$apply   = in_array('--apply', $argv, true);
$csvFile = null;
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--csv=')) {
        $csvFile = substr($arg, 6);
    }
}

$mode = $apply ? 'APPLY' : 'DRY-RUN';
echo "\n";
echo "╔══════════════════════════════════════════════════════╗\n";
echo "║  Lodgik Folio Charge Audit — {$mode}                \n";
echo "╚══════════════════════════════════════════════════════╝\n\n";

if ($apply) {
    echo "⚠️  WARNING: --apply flag set. Changes WILL be written to the database.\n";
    echo "   Press ENTER to continue, or Ctrl+C to abort...\n";
    fgets(STDIN);
}

// ── Detection query ────────────────────────────────────────────────────────
// Heuristic: POS room-service charges inflated ×100 will show amounts that
// are implausibly large for Nigerian hotel F&B (> ₦100,000 for a single item).
// We also cross-reference against what the POS order recorded as total_amount.
//
// Strategy: join folio_charges with pos_orders on description match.
// The description is "Room Service #ORDER_NUM — N item(s)"
// If the folio charge amount ≈ pos_order.total_amount / 100 → it was inflated.

$stmt = $pdo->query("
    SELECT
        fc.id           AS charge_id,
        fc.folio_id,
        fc.description,
        fc.amount::text AS stored_amount,
        fc.created_at,
        f.booking_id,
        -- Extract order number from description e.g. 'Room Service #101 — 2 item(s)'
        substring(fc.description FROM '#([0-9]+)') AS order_number
    FROM folio_charges fc
    JOIN folios f ON f.id = fc.folio_id
    WHERE fc.category IN ('restaurant', 'bar')
      AND fc.amount > 1000    -- more than ₦1,000 — reasonable threshold
    ORDER BY fc.created_at DESC
");

$charges = $stmt->fetchAll();

echo "Found " . count($charges) . " restaurant/bar charges > ₦1,000 to analyse.\n\n";

// ── Cross-reference with POS orders ───────────────────────────────────────
$affected = [];

foreach ($charges as $charge) {
    if (empty($charge['order_number'])) continue;

    // Look up the POS order
    $posStmt = $pdo->prepare("
        SELECT total_amount, order_number
        FROM pos_orders
        WHERE order_number = ?
        LIMIT 1
    ");
    $posStmt->execute([$charge['order_number']]);
    $posOrder = $posStmt->fetch();

    if (!$posOrder) continue;

    $storedAmount    = (float) $charge['stored_amount'];
    $posKobo         = (int) $posOrder['total_amount'];
    $posNairaCorrect = $posKobo / 100;

    // If stored amount ≈ pos_kobo (not pos_naira) → was inflated ×100
    // Allow 1% tolerance for floating point
    $isInflated = abs($storedAmount - $posKobo) < ($posKobo * 0.01);

    if ($isInflated) {
        $affected[] = [
            'charge_id'       => $charge['charge_id'],
            'folio_id'        => $charge['folio_id'],
            'booking_id'      => $charge['booking_id'],
            'description'     => $charge['description'],
            'stored_amount'   => $storedAmount,
            'correct_amount'  => $posNairaCorrect,
            'overcharge'      => $storedAmount - $posNairaCorrect,
            'created_at'      => $charge['created_at'],
        ];
    }
}

// ── Report ─────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗\n";
echo "║  AFFECTED CHARGES (inflated ×100)                    ║\n";
echo "╚══════════════════════════════════════════════════════╝\n\n";

if (empty($affected)) {
    echo "✅  No inflated charges detected. Folio data appears clean.\n\n";
    exit(0);
}

$totalOvercharge = array_sum(array_column($affected, 'overcharge'));

printf("%-36s %-10s %-12s %-12s %-12s %s\n",
    'Charge ID', 'Folio ID', 'Stored (₦)', 'Correct (₦)', 'Overcharge', 'Created');
echo str_repeat('-', 120) . "\n";

foreach ($affected as $row) {
    printf("%-36s %-36s %10.2f %12.2f %12.2f %s\n",
        $row['charge_id'],
        $row['folio_id'],
        $row['stored_amount'],
        $row['correct_amount'],
        $row['overcharge'],
        $row['created_at']
    );
}

echo str_repeat('-', 120) . "\n";
echo sprintf("TOTAL OVERCHARGE: ₦%s across %d charges\n\n",
    number_format($totalOvercharge, 2),
    count($affected)
);

// ── CSV export ─────────────────────────────────────────────────────────────
$csvPath = $csvFile ?? __DIR__ . '/../var/folio-audit-' . date('Y-m-d-His') . '.csv';
$fp = fopen($csvPath, 'w');
fputcsv($fp, ['charge_id','folio_id','booking_id','description','stored_amount','correct_amount','overcharge','created_at']);
foreach ($affected as $row) {
    fputcsv($fp, $row);
}
fclose($fp);
echo "📄 Report saved to: {$csvPath}\n\n";

// ── Apply corrections ──────────────────────────────────────────────────────
if (!$apply) {
    echo "ℹ️  Dry-run complete. No changes made.\n";
    echo "   Review the CSV above, then run with --apply to correct the data.\n\n";
    exit(0);
}

echo "Applying corrections...\n";
$pdo->beginTransaction();

try {
    $corrected = 0;
    foreach ($affected as $row) {
        $newAmount    = number_format($row['correct_amount'], 2, '.', '');
        $newLineTotal = $newAmount; // quantity assumed 1 for POS charges

        // Update the charge
        $upd = $pdo->prepare("
            UPDATE folio_charges
            SET amount = ?, line_total = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $upd->execute([$newAmount, $newLineTotal, $row['charge_id']]);

        // Recalculate folio balance
        $recalc = $pdo->prepare("
            UPDATE folios f
            SET
                total_charges   = COALESCE((SELECT SUM(fc2.line_total) FROM folio_charges fc2 WHERE fc2.folio_id = f.id), 0),
                balance         = COALESCE((SELECT SUM(fc2.line_total) FROM folio_charges fc2 WHERE fc2.folio_id = f.id), 0)
                                  - COALESCE((SELECT SUM(fp.amount) FROM folio_payments fp WHERE fp.folio_id = f.id AND fp.status = 'confirmed'), 0)
                                  + COALESCE((SELECT SUM(fa.amount) FROM folio_adjustments fa WHERE fa.folio_id = f.id), 0)
            WHERE f.id = ?
        ");
        $recalc->execute([$row['folio_id']]);

        // Audit log entry
        $audit = $pdo->prepare("
            INSERT INTO audit_logs (id, tenant_id, action, entity_type, entity_id, description, created_at)
            SELECT gen_random_uuid(), f.tenant_id,
                   'folio_charge_corrected',
                   'FolioCharge',
                   ?,
                   ?,
                   NOW()
            FROM folios f WHERE f.id = ?
        ");
        $audit->execute([
            $row['charge_id'],
            json_encode([
                'old_amount'  => $row['stored_amount'],
                'new_amount'  => (float) $newAmount,
                'reason'      => 'Kobo→Naira inflation fix (Phase 1B remediation)',
            ]),
            $row['folio_id'],
        ]);

        $corrected++;
        echo "  ✅ Corrected charge {$row['charge_id']}: ₦{$row['stored_amount']} → ₦{$newAmount}\n";
    }

    $pdo->commit();
    echo "\n✅ Done. {$corrected} charges corrected. Folio balances recalculated.\n\n";
} catch (\Throwable $e) {
    $pdo->rollBack();
    echo "\n❌ Error during apply — transaction rolled back. No data was changed.\n";
    echo "   Error: " . $e->getMessage() . "\n\n";
    exit(1);
}
