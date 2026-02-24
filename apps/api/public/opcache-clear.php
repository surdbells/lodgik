<?php
/**
 * Clear OPcache from within PHP-FPM (web context).
 * Access via: https://api.lodgik.co/opcache-clear.php
 * DELETE THIS FILE after use!
 */
header('Content-Type: application/json');

$result = [];

// Clear OPcache (this runs inside PHP-FPM, so it actually works)
if (function_exists('opcache_reset')) {
    opcache_reset();
    $result['opcache'] = 'cleared';
} else {
    $result['opcache'] = 'not available';
}

// Clear APCu if available
if (function_exists('apcu_clear_cache')) {
    apcu_clear_cache();
    $result['apcu'] = 'cleared';
} else {
    $result['apcu'] = 'not available';
}

// Show OPcache status
if (function_exists('opcache_get_status')) {
    $status = opcache_get_status(false);
    $result['opcache_status'] = [
        'enabled' => $status['opcache_enabled'] ?? false,
        'cached_scripts' => $status['opcache_statistics']['num_cached_scripts'] ?? 0,
        'memory_used' => $status['memory_usage']['used_memory'] ?? 0,
    ];
}

// Quick bootstrap test
try {
    require __DIR__ . '/../vendor/autoload.php';
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->safeLoad();
    
    $cb = new DI\ContainerBuilder();
    (require __DIR__ . '/../config/dependencies.php')($cb);
    $container = $cb->build();
    $em = $container->get(Doctrine\ORM\EntityManagerInterface::class);
    
    $meta = $em->getClassMetadata(Lodgik\Entity\Merchant::class);
    $col = is_object($meta->fieldMappings['merchantId']) 
        ? $meta->fieldMappings['merchantId']->columnName 
        : $meta->fieldMappings['merchantId']['columnName'];
    
    $result['merchant_column_test'] = $col;
    $result['column_correct'] = ($col === 'merchant_id');
    
    // Also test User
    $userMeta = $em->getClassMetadata(Lodgik\Entity\User::class);
    $userCol = is_object($userMeta->fieldMappings['firstName']) 
        ? $userMeta->fieldMappings['firstName']->columnName 
        : $userMeta->fieldMappings['firstName']['columnName'];
    $result['user_firstname_column'] = $userCol;
    
} catch (\Throwable $e) {
    $result['bootstrap_error'] = $e->getMessage();
    $result['file'] = $e->getFile() . ':' . $e->getLine();
}

echo json_encode($result, JSON_PRETTY_PRINT) . "\n";
