<?php

declare(strict_types=1);

/**
 * Phase 2 Seed: Tax config + folios/charges/payments for checked-out bookings
 * Run: php bin/seed-phase2.php
 */

require __DIR__ . '/../vendor/autoload.php';

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\TaxConfiguration;
use Lodgik\Entity\Folio;
use Lodgik\Entity\FolioCharge;
use Lodgik\Entity\FolioPayment;
use Lodgik\Entity\Booking;
use Lodgik\Enum\BookingStatus;
use Lodgik\Enum\ChargeCategory;
use Lodgik\Enum\FolioStatus;
use Lodgik\Enum\PaymentMethod;
use Lodgik\Enum\PaymentStatus;

$container = (require __DIR__ . '/../config/app.php')();
$em = $container->get(EntityManagerInterface::class);
$conn = $em->getConnection();

echo "\n=== Phase 2 Seed: Finance ===\n\n";

// Get tenants
$tenants = $conn->fetchAllAssociative('SELECT id, name FROM tenants ORDER BY created_at');
if (empty($tenants)) {
    echo "No tenants found. Run seed.php first.\n";
    exit(1);
}

foreach ($tenants as $tenant) {
    $tenantId = $tenant['id'];
    echo "Tenant: {$tenant['name']}\n";

    // ─── Seed VAT Configuration ───────────────────────────────
    $existing = $conn->fetchOne('SELECT id FROM tax_configurations WHERE tenant_id = ? AND tax_key = ?', [$tenantId, 'vat']);
    if (!$existing) {
        $tax = new TaxConfiguration('vat', 'Value Added Tax (VAT)', '7.50', $tenantId);
        $em->persist($tax);
        echo "  ✓ VAT 7.5% configured\n";
    }

    // ─── Create folios for checked-out/checked-in bookings ────
    $bookings = $conn->fetchAllAssociative(
        "SELECT id, property_id, guest_id, booking_ref, total_amount, status, tenant_id FROM bookings WHERE tenant_id = ? AND status IN ('checked_in', 'checked_out')",
        [$tenantId]
    );

    $folioCount = 0;
    foreach ($bookings as $bk) {
        $existingFolio = $conn->fetchOne('SELECT id FROM folios WHERE booking_id = ?', [$bk['id']]);
        if ($existingFolio) continue;

        $folioNumber = sprintf('FL-%s-%03d', date('Ymd'), ++$folioCount);
        $folio = new Folio($bk['property_id'], $bk['id'], $bk['guest_id'], $folioNumber, $tenantId);

        // Room charge
        $charge = new FolioCharge($folio->getId(), ChargeCategory::ROOM, "Room charge — {$bk['booking_ref']}", $bk['total_amount'], 1, $tenantId);
        $em->persist($charge);

        // Random extra charges
        $extras = [
            ['minibar', 'Minibar — Coca Cola, Water', '3500.00'],
            ['laundry', 'Laundry service', '5000.00'],
            ['restaurant', 'Room service — Dinner', '12000.00'],
            ['bar', 'Bar — 2x Chapman', '4000.00'],
        ];
        $numExtras = rand(0, 2);
        $extraTotal = 0.0;
        for ($i = 0; $i < $numExtras; $i++) {
            $ex = $extras[array_rand($extras)];
            $exCharge = new FolioCharge($folio->getId(), ChargeCategory::from($ex[0]), $ex[1], $ex[2], 1, $tenantId);
            $em->persist($exCharge);
            $extraTotal += (float)$ex[2];
        }

        $totalCharges = (float)$bk['total_amount'] + $extraTotal;
        $totalPayments = 0.0;

        // Payment for checked_out bookings (fully paid)
        if ($bk['status'] === 'checked_out') {
            $methods = [PaymentMethod::CASH, PaymentMethod::BANK_TRANSFER, PaymentMethod::POS_CARD];
            $method = $methods[array_rand($methods)];
            $payment = new FolioPayment($folio->getId(), $method, number_format($totalCharges, 2, '.', ''), $tenantId);
            $payment->setStatus(PaymentStatus::CONFIRMED);
            $payment->setConfirmedAt(new \DateTimeImmutable());
            if ($method === PaymentMethod::BANK_TRANSFER) {
                $payment->setSenderName('Guest Transfer');
                $payment->setTransferReference('TRF-' . rand(100000, 999999));
            }
            $em->persist($payment);
            $totalPayments = $totalCharges;
            $folio->setStatus(FolioStatus::CLOSED);
            $folio->setClosedAt(new \DateTimeImmutable());
        }

        // Partial payment for checked_in (50-80%)
        if ($bk['status'] === 'checked_in') {
            $pct = rand(50, 80) / 100;
            $partialAmt = round($totalCharges * $pct, 2);
            $payment = new FolioPayment($folio->getId(), PaymentMethod::CASH, number_format($partialAmt, 2, '.', ''), $tenantId);
            $payment->setStatus(PaymentStatus::CONFIRMED);
            $payment->setConfirmedAt(new \DateTimeImmutable());
            $em->persist($payment);
            $totalPayments = $partialAmt;
        }

        $folio->recalculate(
            number_format($totalCharges, 2, '.', ''),
            number_format($totalPayments, 2, '.', ''),
            '0.00'
        );
        $em->persist($folio);
    }

    echo "  ✓ {$folioCount} folios with charges & payments\n";
}

$em->flush();
echo "\n✅ Phase 2 seed complete\n";
