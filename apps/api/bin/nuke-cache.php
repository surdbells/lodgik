#!/usr/bin/env php
<?php
/**
 * Nuclear cache clear — removes EVERYTHING that could serve stale code.
 * Run this, then restart PHP-FPM.
 */
declare(strict_types=1);

$base = dirname(__DIR__);

echo "=== NUCLEAR CACHE CLEAR ===\n\n";

// 1. Delete ALL files in var/cache/ recursively
$cacheDir = $base . '/var/cache';
if (is_dir($cacheDir)) {
    shell_exec("rm -rf " . escapeshellarg($cacheDir) . "/*");
    shell_exec("rm -rf " . escapeshellarg($cacheDir) . "/.*"); // hidden files
    echo "✅ Cleared var/cache/\n";
} else {
    mkdir($cacheDir, 0777, true);
    echo "✅ Created var/cache/\n";
}

// 2. Delete ALL Doctrine proxy files
$proxyDir = $base . '/var/doctrine/proxies';
if (is_dir($proxyDir)) {
    shell_exec("rm -rf " . escapeshellarg($proxyDir) . "/*");
    echo "✅ Cleared var/doctrine/proxies/\n";
}

// 3. Delete ALL Doctrine cache files
$doctrineDir = $base . '/var/doctrine';
if (is_dir($doctrineDir)) {
    shell_exec("rm -rf " . escapeshellarg($doctrineDir) . "/*");
    echo "✅ Cleared var/doctrine/\n";
}

// 4. Clear system temp doctrine files
$tmp = sys_get_temp_dir();
shell_exec("rm -rf {$tmp}/doctrine* 2>/dev/null");
shell_exec("rm -rf {$tmp}/DoctrineProxies* 2>/dev/null");
echo "✅ Cleared system temp Doctrine files\n";

// 5. Recreate required directories
foreach ([$cacheDir, $proxyDir, $base . '/var/cache/doctrine'] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
}
echo "✅ Recreated cache directories\n";

// 6. OPcache
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "✅ OPcache reset (CLI)\n";
}

// 7. APCu
if (function_exists('apcu_clear_cache')) {
    apcu_clear_cache();
    echo "✅ APCu cache cleared\n";
} else {
    echo "⏭  APCu not available in CLI\n";
}

// 8. Verify the entity file is correct
$merchantFile = $base . '/src/Entity/Merchant.php';
$content = file_get_contents($merchantFile);
if (strpos($content, "name: 'merchant_id'") !== false) {
    echo "✅ Merchant entity has correct column mapping\n";
} else {
    echo "❌ WARNING: Merchant entity does NOT have the fix!\n";
    echo "   Run: git pull origin main\n";
}

// 9. Quick sanity test — can we bootstrap?
echo "\n=== Bootstrap Test ===\n";
try {
    require $base . '/vendor/autoload.php';
    $dotenv = Dotenv\Dotenv::createImmutable($base);
    $dotenv->safeLoad();
    
    $cb = new DI\ContainerBuilder();
    (require $base . '/config/dependencies.php')($cb);
    $container = $cb->build();
    echo "✅ DI Container builds OK\n";
    
    $em = $container->get(Doctrine\ORM\EntityManagerInterface::class);
    echo "✅ EntityManager created\n";
    
    // Check metadata
    $meta = $em->getClassMetadata(\Lodgik\Entity\User::class);
    $fnCol = is_object($meta->fieldMappings['firstName']) 
        ? $meta->fieldMappings['firstName']->columnName 
        : $meta->fieldMappings['firstName']['columnName'];
    echo "   User.firstName → column: {$fnCol}\n";
    
    if ($fnCol === 'first_name') {
        echo "✅ Column mapping is CORRECT\n";
    } else {
        echo "❌ Column mapping is WRONG (expected 'first_name', got '{$fnCol}')\n";
    }
    
} catch (\Throwable $e) {
    echo "❌ Bootstrap FAILED: {$e->getMessage()}\n";
    echo "   {$e->getFile()}:{$e->getLine()}\n";
}

echo "\n⚠️  NOW RESTART PHP-FPM via aaPanel!\n";
echo "Done.\n";
