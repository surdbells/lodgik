<?php

/**
 * Phase 1C Seed: Booking demo data
 *
 * Usage: php bin/seed-phase1c.php
 * Requires: Phase 1A (rooms) and Phase 1B (guests) seeds
 */

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Lodgik\Entity\Booking;
use Lodgik\Entity\BookingStatusLog;
use Lodgik\Entity\Guest;
use Lodgik\Entity\Property;
use Lodgik\Entity\Room;
use Lodgik\Enum\BookingStatus;
use Lodgik\Enum\BookingType;

$container = (require __DIR__ . '/../config/bootstrap.php');
$em = $container->get(\Doctrine\ORM\EntityManagerInterface::class);

echo "🌱 Phase 1C Seed: Booking Data\n";
echo str_repeat('─', 50) . "\n";

if ($em->getFilters()->isEnabled('tenant_filter')) {
    $em->getFilters()->disable('tenant_filter');
}

$properties = $em->getRepository(Property::class)->findAll();
if (empty($properties)) {
    echo "❌ No properties found.\n";
    exit(1);
}

$refCounter = 0;

foreach ($properties as $property) {
    $tenantId = $property->getTenantId();
    $propertyId = $property->getId();
    $propertyName = $property->getName();

    // Check if bookings exist
    $existing = $em->getRepository(Booking::class)->findOneBy(['propertyId' => $propertyId]);
    if ($existing !== null) {
        echo "⏭️  Bookings already exist for {$propertyName}\n";
        continue;
    }

    // Get rooms and guests
    $rooms = $em->getRepository(Room::class)->findBy(['propertyId' => $propertyId], null, 10);
    $guests = $em->getRepository(Guest::class)->findBy(['tenantId' => $tenantId], null, 10);

    if (empty($rooms) || empty($guests)) {
        echo "⚠️  Skipping {$propertyName}: no rooms or guests\n";
        continue;
    }

    echo "\n🏨 {$propertyName}\n";

    $bookingDefs = [
        // Checked-out bookings (past)
        ['days_ago' => 10, 'nights' => 2, 'type' => 'overnight', 'status' => 'checked_out'],
        ['days_ago' => 7,  'nights' => 3, 'type' => 'overnight', 'status' => 'checked_out'],
        ['days_ago' => 5,  'nights' => 1, 'type' => 'overnight', 'status' => 'checked_out'],
        // Currently checked in
        ['days_ago' => 1,  'nights' => 3, 'type' => 'overnight', 'status' => 'checked_in'],
        ['days_ago' => 0,  'nights' => 2, 'type' => 'walk_in',   'status' => 'checked_in'],
        // Confirmed (upcoming)
        ['days_ago' => -2, 'nights' => 2, 'type' => 'overnight', 'status' => 'confirmed'],
        ['days_ago' => -5, 'nights' => 4, 'type' => 'corporate', 'status' => 'confirmed'],
        // Pending
        ['days_ago' => -7, 'nights' => 1, 'type' => 'overnight', 'status' => 'pending'],
        // Short rest (today)
        ['days_ago' => 0,  'nights' => 0, 'type' => 'short_rest_3hr', 'status' => 'checked_out', 'hours' => 3],
        // Cancelled
        ['days_ago' => -3, 'nights' => 2, 'type' => 'overnight', 'status' => 'cancelled'],
    ];

    $count = 0;
    foreach ($bookingDefs as $idx => $def) {
        $room = $rooms[$idx % count($rooms)];
        $guest = $guests[$idx % count($guests)];

        $refCounter++;
        $date = (new \DateTimeImmutable())->modify("-{$def['days_ago']} days");
        $ref = 'BK-' . $date->format('Ymd') . '-' . str_pad((string) $refCounter, 3, '0', STR_PAD_LEFT);

        $bt = BookingType::from($def['type']);

        if ($bt->isHourly()) {
            $checkIn = $date->setTime(10, 0);
            $hours = $def['hours'] ?? $bt->durationHours() ?? 3;
            $checkOut = $checkIn->modify("+{$hours} hours");
            $rate = '3000.00';
            $total = bcmul($rate, (string) $hours, 2);
        } else {
            $checkIn = $date->setTime(14, 0);
            $nights = max(1, $def['nights']);
            $checkOut = $checkIn->modify("+{$nights} days")->setTime(12, 0);
            $rate = '25000.00';
            $total = bcmul($rate, (string) $nights, 2);
        }

        $booking = new Booking($ref, $bt, $guest->getId(), $propertyId, $tenantId, $checkIn, $checkOut, $rate, $total);
        $booking->setRoomId($room->getId());
        $booking->setAdults(rand(1, 2));
        $booking->setSource('front_desk');
        $booking->setDurationHours($bt->isHourly() ? ($def['hours'] ?? $bt->durationHours()) : null);

        $status = BookingStatus::from($def['status']);
        $booking->setStatus($status);

        if ($status === BookingStatus::CHECKED_IN || $status === BookingStatus::CHECKED_OUT) {
            $booking->setCheckedInAt($checkIn);
        }
        if ($status === BookingStatus::CHECKED_OUT) {
            $booking->setCheckedOutAt($checkOut);
        }

        $em->persist($booking);

        // Status log
        $log = new BookingStatusLog($booking->getId(), BookingStatus::PENDING, $status, $tenantId);
        $em->persist($log);

        $count++;
    }

    $em->flush();
    echo "  📋 {$count} bookings created\n";
}

echo "\n" . str_repeat('─', 50) . "\n";
$total = $em->createQuery('SELECT COUNT(b.id) FROM Lodgik\Entity\Booking b WHERE b.deletedAt IS NULL')->getSingleScalarResult();
echo "✅ Phase 1C seed complete! Total bookings: {$total}\n";
