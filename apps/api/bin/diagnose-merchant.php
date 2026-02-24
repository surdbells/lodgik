#!/usr/bin/env php
<?php
declare(strict_types=1);
require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
$dotenv->safeLoad();

echo "=== Lodgik Merchant Diagnostic ===\n\n";

// 1. Test DB connection
try {
    $pdo = new PDO(
        sprintf('pgsql:host=%s;port=%s;dbname=%s',
            $_ENV['DB_HOST'] ?? 'localhost',
            $_ENV['DB_PORT'] ?? '5432',
            $_ENV['DB_NAME'] ?? 'lodgik'
        ),
        $_ENV['DB_USER'] ?? 'lodgik',
        $_ENV['DB_PASS'] ?? 'lodgik_secret',
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ DB connection OK\n";
} catch (\Throwable $e) {
    echo "❌ DB connection FAILED: {$e->getMessage()}\n";
    exit(1);
}

// 2. Check if tables exist
$tables = ['merchants', 'merchant_kyc', 'merchant_bank_accounts', 'merchant_hotels',
           'commission_tiers', 'commissions', 'commission_payouts',
           'merchant_resources', 'merchant_resource_downloads',
           'merchant_support_tickets', 'merchant_audit_logs',
           'merchant_notifications', 'merchant_leads', 'merchant_statements'];

foreach ($tables as $t) {
    $exists = $pdo->query("SELECT to_regclass('public.{$t}')")->fetchColumn();
    echo ($exists ? "✅" : "❌") . " Table: {$t}" . ($exists ? "" : " — MISSING") . "\n";
}

// 3. Test actual queries
echo "\n=== Query Tests ===\n";

try {
    $count = $pdo->query("SELECT COUNT(*) FROM merchants")->fetchColumn();
    echo "✅ merchants: {$count} rows\n";
} catch (\Throwable $e) {
    echo "❌ merchants query FAILED: {$e->getMessage()}\n";
}

try {
    $count = $pdo->query("SELECT COUNT(*) FROM commission_tiers")->fetchColumn();
    echo "✅ commission_tiers: {$count} rows\n";
} catch (\Throwable $e) {
    echo "❌ commission_tiers query FAILED: {$e->getMessage()}\n";
}

try {
    $count = $pdo->query("SELECT COUNT(*) FROM merchant_resources")->fetchColumn();
    echo "✅ merchant_resources: {$count} rows\n";
} catch (\Throwable $e) {
    echo "❌ merchant_resources query FAILED: {$e->getMessage()}\n";
}

try {
    $count = $pdo->query("SELECT COUNT(*) FROM merchant_kyc")->fetchColumn();
    echo "✅ merchant_kyc: {$count} rows\n";
} catch (\Throwable $e) {
    echo "❌ merchant_kyc query FAILED: {$e->getMessage()}\n";
}

try {
    $count = $pdo->query("SELECT COUNT(*) FROM commission_payouts")->fetchColumn();
    echo "✅ commission_payouts: {$count} rows\n";
} catch (\Throwable $e) {
    echo "❌ commission_payouts query FAILED: {$e->getMessage()}\n";
}

// 4. Test Doctrine EntityManager
echo "\n=== Doctrine EntityManager Test ===\n";
try {
    $containerBuilder = new DI\ContainerBuilder();
    (require __DIR__ . '/../config/dependencies.php')($containerBuilder);
    $container = $containerBuilder->build();
    $em = $container->get(\Doctrine\ORM\EntityManagerInterface::class);
    echo "✅ EntityManager created\n";

    // Test merchant query through Doctrine
    $result = $em->createQueryBuilder()
        ->select('m')
        ->from(\Lodgik\Entity\Merchant::class, 'm')
        ->setMaxResults(1)
        ->getQuery()
        ->getResult();
    echo "✅ Doctrine Merchant query OK (found " . count($result) . " rows)\n";
} catch (\Throwable $e) {
    echo "❌ Doctrine FAILED: {$e->getMessage()}\n";
    echo "   File: {$e->getFile()}:{$e->getLine()}\n";
    if ($prev = $e->getPrevious()) {
        echo "   Caused by: {$prev->getMessage()}\n";
    }
}

echo "\nDone.\n";

echo "\n=== Entity File Check ===\n";
$entityFile = __DIR__ . '/../src/Entity/Merchant.php';
echo "File: {$entityFile}\n";
echo "Exists: " . (file_exists($entityFile) ? 'YES' : 'NO') . "\n";
$content = file_get_contents($entityFile);

// Check if the fix is present
if (strpos($content, "name: 'merchant_id'") !== false) {
    echo "✅ Column name fix IS present (name: 'merchant_id')\n";
} else {
    echo "❌ Column name fix NOT present!\n";
}

// Show the first ORM\Column line
preg_match_all('/#\[ORM\\\\Column.*merchantId.*$/m', $content, $matches);
echo "Column annotation: " . ($matches[0][0] ?? 'NOT FOUND') . "\n";

// Also check what Doctrine actually sees
echo "\n=== Doctrine Metadata Check ===\n";
try {
    $containerBuilder = new DI\ContainerBuilder();
    (require __DIR__ . '/../config/dependencies.php')($containerBuilder);
    $container = $containerBuilder->build();
    $em = $container->get(\Doctrine\ORM\EntityManagerInterface::class);
    
    $meta = $em->getClassMetadata(\Lodgik\Entity\Merchant::class);
    echo "Doctrine column for 'merchantId': " . ($meta->getColumnName('merchantId') ?? 'UNKNOWN') . "\n";
    echo "All column mappings:\n";
    foreach ($meta->fieldMappings as $field => $mapping) {
        $col = $mapping['columnName'] ?? $mapping->columnName ?? '???';
        echo "  \${$field} → {$col}\n";
    }
} catch (\Throwable $e) {
    echo "❌ Metadata check failed: {$e->getMessage()}\n";
}
