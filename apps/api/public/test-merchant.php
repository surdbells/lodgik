<?php
header('Content-Type: application/json');
error_reporting(E_ALL);

require __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

try {
    $cb = new DI\ContainerBuilder();
    (require __DIR__ . '/../config/dependencies.php')($cb);
    $container = $cb->build();
    $em = $container->get(Doctrine\ORM\EntityManagerInterface::class);

    // Test 1: Raw SQL
    $count = $em->getConnection()->fetchOne('SELECT COUNT(*) FROM merchants');
    $results = ['raw_sql' => "OK: {$count} merchants"];

    // Test 2: Doctrine metadata
    $meta = $em->getClassMetadata(Lodgik\Entity\Merchant::class);
    $cols = [];
    foreach ($meta->fieldMappings as $f => $m) {
        $c = is_object($m) ? $m->columnName : $m['columnName'];
        $cols[$f] = $c;
    }
    $results['metadata'] = $cols;

    // Test 3: Actual Doctrine query
    $qb = $em->createQueryBuilder()->select('m')->from(Lodgik\Entity\Merchant::class, 'm')->setMaxResults(5);
    $dql = $qb->getDQL();
    $sql = $qb->getQuery()->getSQL();
    $results['dql'] = $dql;
    $results['sql'] = $sql;

    $data = $qb->getQuery()->getResult();
    $results['query'] = 'OK: ' . count($data) . ' rows';

    // Test 4: CommissionTier
    $tiers = $em->getRepository(Lodgik\Entity\CommissionTier::class)->findAll();
    $results['tiers'] = 'OK: ' . count($tiers) . ' rows';

    // Test 5: MerchantKyc
    $kyc = $em->getRepository(Lodgik\Entity\MerchantKyc::class)->findBy(['status' => 'under_review']);
    $results['kyc_pending'] = 'OK: ' . count($kyc) . ' rows';

    // Test 6: MerchantResource
    $res2 = $em->getRepository(Lodgik\Entity\MerchantResource::class)->findBy(['status' => 'active']);
    $results['resources'] = 'OK: ' . count($res2) . ' rows';

    // Test 7: CommissionPayout
    $payouts = $em->getRepository(Lodgik\Entity\CommissionPayout::class)->findAll();
    $results['payouts'] = 'OK: ' . count($payouts) . ' rows';

    // Test 8: MerchantService directly
    $svc = $container->get(Lodgik\Module\Merchant\MerchantService::class);
    $list = $svc->listMerchants();
    $results['service_list'] = 'OK: ' . count($list) . ' rows';

} catch (\Throwable $e) {
    $results['error'] = $e->getMessage();
    $results['file'] = $e->getFile() . ':' . $e->getLine();
    $results['trace'] = array_slice(array_map(fn($t) =>
        basename($t['file'] ?? '?') . ':' . ($t['line'] ?? '?') . ' ' . ($t['class'] ?? '') . ($t['type'] ?? '') . ($t['function'] ?? ''),
        $e->getTrace()), 0, 15);
    if ($p = $e->getPrevious()) {
        $results['caused_by'] = $p->getMessage();
    }
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
