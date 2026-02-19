<?php

/**
 * Phase 1D Seed: Dashboard snapshot demo data (30 days of history)
 *
 * Usage: php bin/seed-phase1d.php
 */

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Lodgik\Entity\DailySnapshot;
use Lodgik\Entity\Property;

$container = (require __DIR__ . '/../config/bootstrap.php');
$em = $container->get(\Doctrine\ORM\EntityManagerInterface::class);

echo "🌱 Phase 1D Seed: Dashboard Snapshots (30 days)\n";
echo str_repeat('─', 50) . "\n";

if ($em->getFilters()->isEnabled('tenant_filter')) {
    $em->getFilters()->disable('tenant_filter');
}

$properties = $em->getRepository(Property::class)->findAll();

foreach ($properties as $property) {
    $tenantId = $property->getTenantId();
    $propertyId = $property->getId();
    $propertyName = $property->getName();

    $existing = $em->getRepository(DailySnapshot::class)->findOneBy(['propertyId' => $propertyId]);
    if ($existing !== null) {
        echo "⏭️  Snapshots already exist for {$propertyName}\n";
        continue;
    }

    echo "\n🏨 {$propertyName}\n";

    $totalRooms = 20;
    $baseOccupancy = 55; // start around 55%

    for ($d = 30; $d >= 1; $d--) {
        $date = new \DateTimeImmutable("-{$d} days");

        // Simulate realistic occupancy curve (weekends higher)
        $dayOfWeek = (int) $date->format('N'); // 1=Mon, 7=Sun
        $weekendBoost = in_array($dayOfWeek, [5, 6, 7]) ? rand(10, 20) : 0;
        $randomVariance = rand(-8, 12);
        $trendGrowth = (int) ((30 - $d) * 0.4); // slight upward trend

        $occupancy = min(95, max(20, $baseOccupancy + $weekendBoost + $randomVariance + $trendGrowth));
        $roomsSold = (int) round(($occupancy / 100) * $totalRooms);

        $avgRate = rand(18000, 35000);
        $revenue = $roomsSold * $avgRate;
        $adr = $roomsSold > 0 ? $revenue / $roomsSold : 0;
        $revpar = $totalRooms > 0 ? $revenue / $totalRooms : 0;

        $checkIns = rand(1, max(1, $roomsSold));
        $checkOuts = rand(1, max(1, $roomsSold));
        $newBookings = rand(1, 5);
        $cancellations = rand(0, 1);

        $snapshot = new DailySnapshot($propertyId, $tenantId, $date);
        $snapshot->setTotalRooms($totalRooms);
        $snapshot->setRoomsSold($roomsSold);
        $snapshot->setOccupancyRate(number_format($occupancy, 2, '.', ''));
        $snapshot->setTotalRevenue(number_format($revenue, 2, '.', ''));
        $snapshot->setAdr(number_format($adr, 2, '.', ''));
        $snapshot->setRevpar(number_format($revpar, 2, '.', ''));
        $snapshot->setCheckIns($checkIns);
        $snapshot->setCheckOuts($checkOuts);
        $snapshot->setNewBookings($newBookings);
        $snapshot->setCancellations($cancellations);

        $em->persist($snapshot);
    }

    $em->flush();
    echo "  📊 30 daily snapshots created\n";
}

echo "\n" . str_repeat('─', 50) . "\n";
$total = $em->createQuery('SELECT COUNT(s.id) FROM Lodgik\Entity\DailySnapshot s')->getSingleScalarResult();
echo "✅ Phase 1D seed complete! Total snapshots: {$total}\n";
