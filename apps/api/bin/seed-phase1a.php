<?php

/**
 * Phase 1A Seed: Room Types, Rooms & Amenities
 *
 * Usage: php bin/seed-phase1a.php
 *
 * Prerequisites: Phase 0 seed must have been run first.
 */

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Lodgik\Entity\Amenity;
use Lodgik\Entity\Property;
use Lodgik\Entity\Room;
use Lodgik\Entity\RoomType;
use Lodgik\Enum\RoomStatus;

// Bootstrap Doctrine
$container = (require __DIR__ . '/../config/bootstrap.php');
$em = $container->get(\Doctrine\ORM\EntityManagerInterface::class);

echo "🌱 Phase 1A Seed: Room Types, Rooms & Amenities\n";
echo str_repeat('─', 50) . "\n";

// Disable tenant filter for seeding
if ($em->getFilters()->isEnabled('tenant_filter')) {
    $em->getFilters()->disable('tenant_filter');
}

// Get all properties
$properties = $em->getRepository(Property::class)->findAll();
if (empty($properties)) {
    echo "❌ No properties found. Run Phase 0 seed first.\n";
    exit(1);
}

echo "📋 Found " . count($properties) . " properties\n\n";

// ─── Amenities (per tenant) ───────────────────────────────────
$amenityDefs = [
    ['name' => 'WiFi', 'category' => 'connectivity', 'icon' => 'wifi'],
    ['name' => 'Air Conditioning', 'category' => 'comfort', 'icon' => 'ac_unit'],
    ['name' => 'Mini Bar', 'category' => 'food_beverage', 'icon' => 'local_bar'],
    ['name' => 'Safe', 'category' => 'security', 'icon' => 'lock'],
    ['name' => 'Flat Screen TV', 'category' => 'entertainment', 'icon' => 'tv'],
    ['name' => 'Balcony', 'category' => 'outdoor', 'icon' => 'balcony'],
    ['name' => 'Bathtub', 'category' => 'bathroom', 'icon' => 'bathtub'],
    ['name' => 'Shower', 'category' => 'bathroom', 'icon' => 'shower'],
    ['name' => 'Room Service', 'category' => 'food_beverage', 'icon' => 'room_service'],
    ['name' => 'Iron & Board', 'category' => 'convenience', 'icon' => 'iron'],
    ['name' => 'Coffee Maker', 'category' => 'food_beverage', 'icon' => 'coffee'],
    ['name' => 'Work Desk', 'category' => 'business', 'icon' => 'desk'],
    ['name' => 'Swimming Pool Access', 'category' => 'recreation', 'icon' => 'pool'],
    ['name' => 'Gym Access', 'category' => 'recreation', 'icon' => 'fitness_center'],
    ['name' => 'Laundry Service', 'category' => 'convenience', 'icon' => 'local_laundry_service'],
];

$tenantAmenities = [];
$seenTenants = [];

foreach ($properties as $property) {
    $tenantId = $property->getTenantId();
    if (in_array($tenantId, $seenTenants, true)) {
        continue;
    }
    $seenTenants[] = $tenantId;

    // Check if amenities already exist
    $existing = $em->getRepository(Amenity::class)->findOneBy(['tenantId' => $tenantId]);
    if ($existing !== null) {
        echo "⏭️  Amenities already exist for tenant {$tenantId}\n";
        $tenantAmenities[$tenantId] = $em->getRepository(Amenity::class)->findBy(['tenantId' => $tenantId]);
        continue;
    }

    $amenities = [];
    foreach ($amenityDefs as $def) {
        $a = new Amenity($def['name'], $tenantId);
        $a->setCategory($def['category']);
        $a->setIcon($def['icon']);
        $em->persist($a);
        $amenities[] = $a;
    }
    $tenantAmenities[$tenantId] = $amenities;
    echo "✅ Created " . count($amenities) . " amenities for tenant {$tenantId}\n";
}

$em->flush();

// ─── Room Types & Rooms per Property ──────────────────────────
$roomTypeDefs = [
    [
        'name' => 'Standard',
        'description' => 'Comfortable room with essential amenities for a pleasant stay.',
        'base_rate' => '15000.00',
        'hourly_rate' => '3000.00',
        'max_occupancy' => 2,
        'sort_order' => 1,
        'rooms_per_floor' => 5,
        'floors' => [1, 2],
    ],
    [
        'name' => 'Deluxe',
        'description' => 'Spacious room with premium amenities and city views.',
        'base_rate' => '25000.00',
        'hourly_rate' => '5000.00',
        'max_occupancy' => 2,
        'sort_order' => 2,
        'rooms_per_floor' => 4,
        'floors' => [2, 3],
    ],
    [
        'name' => 'Executive Suite',
        'description' => 'Luxury suite with separate living area, premium amenities and personalized service.',
        'base_rate' => '45000.00',
        'hourly_rate' => '9000.00',
        'max_occupancy' => 3,
        'sort_order' => 3,
        'rooms_per_floor' => 2,
        'floors' => [3],
    ],
    [
        'name' => 'Presidential Suite',
        'description' => 'Our finest accommodation. Full suite with dining room, kitchenette, and panoramic views.',
        'base_rate' => '80000.00',
        'hourly_rate' => null,
        'max_occupancy' => 4,
        'sort_order' => 4,
        'rooms_per_floor' => 1,
        'floors' => [3],
    ],
];

$statuses = [
    RoomStatus::VACANT_CLEAN,
    RoomStatus::VACANT_CLEAN,
    RoomStatus::VACANT_CLEAN,
    RoomStatus::OCCUPIED,
    RoomStatus::VACANT_DIRTY,
    RoomStatus::RESERVED,
    RoomStatus::VACANT_CLEAN,
    RoomStatus::VACANT_CLEAN,
    RoomStatus::MAINTENANCE,
    RoomStatus::VACANT_CLEAN,
];

foreach ($properties as $property) {
    $tenantId = $property->getTenantId();
    $propertyId = $property->getId();
    $propertyName = $property->getName();

    // Check if room types already exist
    $existing = $em->getRepository(RoomType::class)->findOneBy(['propertyId' => $propertyId]);
    if ($existing !== null) {
        echo "⏭️  Room types already exist for {$propertyName}\n";
        continue;
    }

    echo "\n🏨 {$propertyName}\n";
    $roomCount = 0;
    $statusIdx = 0;

    foreach ($roomTypeDefs as $rtDef) {
        // Create room type
        $rt = new RoomType($rtDef['name'], $propertyId, $tenantId, $rtDef['base_rate']);
        $rt->setDescription($rtDef['description']);
        if ($rtDef['hourly_rate'] !== null) {
            $rt->setHourlyRate($rtDef['hourly_rate']);
        }
        $rt->setMaxOccupancy($rtDef['max_occupancy']);
        $rt->setSortOrder($rtDef['sort_order']);

        // Assign amenity names to room type
        $amenityNames = ['WiFi', 'Air Conditioning', 'Flat Screen TV', 'Shower'];
        if (in_array($rtDef['name'], ['Deluxe', 'Executive Suite', 'Presidential Suite'])) {
            $amenityNames = array_merge($amenityNames, ['Mini Bar', 'Safe', 'Coffee Maker', 'Work Desk', 'Room Service']);
        }
        if (in_array($rtDef['name'], ['Executive Suite', 'Presidential Suite'])) {
            $amenityNames = array_merge($amenityNames, ['Bathtub', 'Balcony', 'Swimming Pool Access', 'Gym Access']);
        }
        if ($rtDef['name'] === 'Presidential Suite') {
            $amenityNames = array_merge($amenityNames, ['Laundry Service', 'Iron & Board']);
        }
        $rt->setAmenities(array_values(array_unique($amenityNames)));

        $em->persist($rt);
        echo "  📦 {$rtDef['name']} — ₦" . number_format((float) $rtDef['base_rate']) . "/night\n";

        // Create rooms
        foreach ($rtDef['floors'] as $floor) {
            for ($i = 1; $i <= $rtDef['rooms_per_floor']; $i++) {
                $roomNumber = $floor . str_pad((string) ($roomCount % 20 + 1), 2, '0', STR_PAD_LEFT);
                // More deterministic: use floor + sequential
                $roomNumber = $floor . str_pad((string) $i, 2, '0', STR_PAD_LEFT);

                // Make room number unique per type on same floor
                $typePrefix = match($rtDef['name']) {
                    'Standard' => '',
                    'Deluxe' => 'D',
                    'Executive Suite' => 'E',
                    'Presidential Suite' => 'P',
                };
                $roomNumber = $typePrefix . $floor . str_pad((string) $i, 2, '0', STR_PAD_LEFT);

                $room = new Room($roomNumber, $rt->getId(), $propertyId, $tenantId);
                $room->setFloor($floor);

                // Assign realistic statuses
                $room->setStatus($statuses[$statusIdx % count($statuses)]);
                $statusIdx++;

                $em->persist($room);
                $roomCount++;
            }
        }
    }

    $em->flush();
    echo "  🛏️  {$roomCount} rooms created\n";
}

echo "\n" . str_repeat('─', 50) . "\n";
echo "✅ Phase 1A seed complete!\n";

// Summary
$totalRoomTypes = $em->createQuery('SELECT COUNT(rt.id) FROM Lodgik\Entity\RoomType rt WHERE rt.deletedAt IS NULL')->getSingleScalarResult();
$totalRooms = $em->createQuery('SELECT COUNT(r.id) FROM Lodgik\Entity\Room r WHERE r.deletedAt IS NULL')->getSingleScalarResult();
$totalAmenities = $em->createQuery('SELECT COUNT(a.id) FROM Lodgik\Entity\Amenity a')->getSingleScalarResult();

echo "📊 Totals: {$totalRoomTypes} room types, {$totalRooms} rooms, {$totalAmenities} amenities\n";
