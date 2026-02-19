<?php

/**
 * Phase 1B Seed: Guest demo data
 *
 * Usage: php bin/seed-phase1b.php
 */

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Lodgik\Entity\Guest;
use Lodgik\Entity\Tenant;

$container = (require __DIR__ . '/../config/bootstrap.php');
$em = $container->get(\Doctrine\ORM\EntityManagerInterface::class);

echo "🌱 Phase 1B Seed: Guest Data\n";
echo str_repeat('─', 50) . "\n";

if ($em->getFilters()->isEnabled('tenant_filter')) {
    $em->getFilters()->disable('tenant_filter');
}

$tenants = $em->getRepository(Tenant::class)->findAll();
if (empty($tenants)) {
    echo "❌ No tenants found. Run Phase 0 seed first.\n";
    exit(1);
}

$guestData = [
    ['Adebayo', 'Ogundimu', '+2348012345678', 'adebayo.ogundimu@gmail.com', 'Nigerian', 'national_id', 'NIN-12345678901', 'male', '1985-03-15', 'Lagos', 'Lagos', 'regular', 'Ogundimu & Associates'],
    ['Chidinma', 'Okafor', '+2348023456789', 'chidinma.okafor@yahoo.com', 'Nigerian', 'passport', 'A12345678', 'female', '1990-07-22', 'Enugu', 'Enugu', 'gold', null],
    ['Emeka', 'Nwankwo', '+2348034567890', 'emeka.nwankwo@outlook.com', 'Nigerian', 'drivers_license', 'DL-LAG-98765', 'male', '1978-11-08', 'Owerri', 'Imo', 'platinum', 'Nwankwo Industries Ltd'],
    ['Fatima', 'Abdullahi', '+2348045678901', 'fatima.abdullahi@gmail.com', 'Nigerian', 'nin', 'NIN-98765432101', 'female', '1992-01-30', 'Kano', 'Kano', 'silver', null],
    ['Oluwaseun', 'Adekunle', '+2348056789012', 'seun.adekunle@company.ng', 'Nigerian', 'voters_card', 'VC-LAG-11223', 'male', '1988-05-12', 'Ibadan', 'Oyo', 'regular', 'TechHub Nigeria'],
    ['Ngozi', 'Eze', '+2348067890123', 'ngozi.eze@gmail.com', 'Nigerian', null, null, 'female', '1995-09-03', 'Nsukka', 'Enugu', 'regular', null],
    ['Ibrahim', 'Musa', '+2348078901234', 'ibrahim.musa@hotmail.com', 'Nigerian', 'national_id', 'NIN-55566677788', 'male', '1980-12-25', 'Abuja', 'FCT', 'vvip', 'Musa Holdings PLC'],
    ['Aisha', 'Mohammed', '+2348089012345', null, 'Nigerian', 'passport', 'B98765432', 'female', '1987-04-18', 'Kaduna', 'Kaduna', 'regular', null],
    ['Tunde', 'Bakare', '+2348090123456', 'tunde@bakare.com', 'Nigerian', null, null, 'male', '1993-08-07', 'Abeokuta', 'Ogun', 'silver', 'Bakare Consulting'],
    ['Blessing', 'Okonkwo', '+2348001234567', 'blessing.okonkwo@gmail.com', 'Nigerian', 'nin', 'NIN-33344455566', 'female', '1991-02-14', 'Benin City', 'Edo', 'gold', null],
    ['John', 'Smith', '+447700900123', 'john.smith@gmail.com', 'British', 'passport', 'GB-123456789', 'male', '1975-06-20', null, null, 'platinum', 'Smith & Partners UK'],
    ['Marie', 'Dupont', '+33612345678', 'marie.dupont@email.fr', 'French', 'passport', 'FR-987654321', 'female', '1989-10-11', null, null, 'regular', null],
    ['Kwame', 'Asante', '+233241234567', 'kwame.asante@gmail.com', 'Ghanaian', 'passport', 'GH-456789012', 'male', '1982-03-28', null, null, 'silver', 'Asante Trading Ghana'],
    ['Amina', 'Diallo', '+221771234567', 'amina.diallo@email.sn', 'Senegalese', 'passport', 'SN-111222333', 'female', '1994-07-05', null, null, 'regular', null],
    ['Yusuf', 'Bello', '+2348012378945', 'yusuf.bello@gmail.com', 'Nigerian', 'national_id', 'NIN-77788899900', 'male', '1986-11-19', 'Sokoto', 'Sokoto', 'regular', null],
];

foreach ($tenants as $tenant) {
    $tenantId = $tenant->getId();
    $tenantName = $tenant->getName();

    // Check if guests already exist
    $existing = $em->getRepository(Guest::class)->findOneBy(['tenantId' => $tenantId]);
    if ($existing !== null) {
        echo "⏭️  Guests already exist for {$tenantName}\n";
        continue;
    }

    echo "\n🏨 {$tenantName}\n";
    $count = 0;

    foreach ($guestData as $idx => $g) {
        $guest = new Guest($g[0], $g[1], $tenantId);
        $guest->setPhone($g[2]);
        if ($g[3] !== null) $guest->setEmail($g[3]);
        $guest->setNationality($g[4]);
        if ($g[5] !== null) $guest->setIdType($g[5]);
        if ($g[6] !== null) $guest->setIdNumber($g[6]);
        $guest->setGender($g[7]);
        $guest->setDateOfBirth(\DateTimeImmutable::createFromFormat('Y-m-d', $g[8]) ?: null);
        if ($g[9] !== null) $guest->setCity($g[9]);
        if ($g[10] !== null) $guest->setState($g[10]);
        $guest->setCountry($g[4] === 'Nigerian' ? 'NG' : ($g[4] === 'British' ? 'GB' : ($g[4] === 'French' ? 'FR' : ($g[4] === 'Ghanaian' ? 'GH' : 'SN'))));
        $guest->setVipStatus($g[11]);
        if ($g[12] !== null) $guest->setCompanyName($g[12]);

        // Assign random stays/spending
        $stays = rand(0, 12);
        $guest->setTotalStays($stays);
        $guest->setTotalSpent(number_format($stays * rand(15000, 80000), 2, '.', ''));
        if ($stays > 0) {
            $daysAgo = rand(1, 180);
            $guest->setLastVisitAt(new \DateTimeImmutable("-{$daysAgo} days"));
        }

        $em->persist($guest);
        $count++;
    }

    $em->flush();
    echo "  👥 {$count} guests created\n";
}

echo "\n" . str_repeat('─', 50) . "\n";

$total = $em->createQuery('SELECT COUNT(g.id) FROM Lodgik\Entity\Guest g WHERE g.deletedAt IS NULL')->getSingleScalarResult();
echo "✅ Phase 1B seed complete! Total guests: {$total}\n";
