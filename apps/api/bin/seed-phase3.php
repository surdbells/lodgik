<?php

declare(strict_types=1);

/**
 * Phase 3 Seed: Nigeria PAYE tax brackets, default leave types, sample departments
 * Run: php bin/seed-phase3.php
 */

require __DIR__ . '/../vendor/autoload.php';

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\TaxBracket;
use Lodgik\Entity\LeaveType;
use Lodgik\Entity\Department;

$container = require __DIR__ . '/../config/bootstrap.php';
$em = $container->get(EntityManagerInterface::class);
$conn = $em->getConnection();

echo "\n=== Phase 3 Seed: HR & Payroll ===\n\n";

$tenants = $conn->fetchAllAssociative('SELECT id, name FROM tenants ORDER BY created_at');
if (empty($tenants)) { echo "No tenants. Run seed.php first.\n"; exit(1); }

foreach ($tenants as $tenant) {
    $tid = $tenant['id'];
    echo "Tenant: {$tenant['name']}\n";

    // ─── Nigeria PAYE Tax Brackets (annual, in naira) ─────────
    $existingBrackets = (int) $conn->fetchOne('SELECT COUNT(*) FROM tax_brackets WHERE tenant_id = ?', [$tid]);
    if ($existingBrackets === 0) {
        $brackets = [
            // [lower, upper, rate%, sort]
            [0,       300000,   '7.00',  1],
            [300000,  600000,   '11.00', 2],
            [600000,  1100000,  '15.00', 3],
            [1100000, 1600000,  '19.00', 4],
            [1600000, 3200000,  '21.00', 5],
            [3200000, 0,        '24.00', 6], // 0 = unlimited
        ];
        foreach ($brackets as [$lower, $upper, $rate, $sort]) {
            $b = new TaxBracket((string)$lower, (string)$upper, $rate, $sort, $tid);
            $em->persist($b);
        }
        echo "  ✓ 6 PAYE tax brackets (7%-24%)\n";
    } else {
        echo "  ⏭ Tax brackets already exist\n";
    }

    // ─── Default Leave Types ──────────────────────────────────
    $existingLeaveTypes = (int) $conn->fetchOne('SELECT COUNT(*) FROM leave_types WHERE tenant_id = ?', [$tid]);
    if ($existingLeaveTypes === 0) {
        $types = [
            ['annual',    'Annual Leave',     21, true,  '#22c55e'],
            ['sick',      'Sick Leave',       12, true,  '#ef4444'],
            ['casual',    'Casual Leave',      5, true,  '#f59e0b'],
            ['maternity', 'Maternity Leave',  84, true,  '#ec4899'],
            ['paternity', 'Paternity Leave',  14, true,  '#3b82f6'],
            ['compassion','Compassionate',     5, true,  '#8b5cf6'],
            ['unpaid',    'Unpaid Leave',      0, false, '#6b7280'],
        ];
        foreach ($types as [$key, $name, $days, $paid, $color]) {
            $lt = new LeaveType($key, $name, $days, $tid);
            $lt->setIsPaid($paid);
            $lt->setColor($color);
            $em->persist($lt);
        }
        echo "  ✓ 7 leave types seeded\n";
    } else {
        echo "  ⏭ Leave types already exist\n";
    }

    // ─── Default Departments ──────────────────────────────────
    $existingDepts = (int) $conn->fetchOne('SELECT COUNT(*) FROM departments WHERE tenant_id = ?', [$tid]);
    if ($existingDepts === 0) {
        $depts = ['Front Office', 'Housekeeping', 'Food & Beverage', 'Kitchen', 'Security', 'Maintenance', 'Administration'];
        foreach ($depts as $d) { $em->persist(new Department($d, $tid)); }
        echo "  ✓ 7 departments seeded\n";
    } else {
        echo "  ⏭ Departments already exist\n";
    }
}

$em->flush();
echo "\n✅ Phase 3 seed complete\n";
