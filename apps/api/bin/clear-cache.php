#!/usr/bin/env php
<?php
declare(strict_types=1);

echo "=== Lodgik Cache Clear ===\n\n";

$basePath = __DIR__ . '/..';

// 1. DI Container compilation cache
clearDir($basePath . '/var/cache', 'DI Container cache');

// 2. Doctrine proxy cache
clearDir($basePath . '/var/doctrine/proxies', 'Doctrine proxies');

// 3. Doctrine metadata cache (production file cache in system temp)
$tempDoctrine = sys_get_temp_dir() . '/doctrine';
clearDir($tempDoctrine, 'Doctrine temp metadata (' . $tempDoctrine . ')');

// Also try common locations
foreach (glob(sys_get_temp_dir() . '/doctrine*') as $dir) {
    if (is_dir($dir)) clearDir($dir, 'Doctrine temp (' . $dir . ')');
}

// 4. Clear any Doctrine cache in var/
$varDoctrine = $basePath . '/var/doctrine';
if (is_dir($varDoctrine)) clearDir($varDoctrine, 'var/doctrine');

// 5. OPcache
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "✅ OPcache reset (CLI only)\n";
} else {
    echo "⚠️  OPcache not available in CLI\n";
}

echo "\n⚠️  IMPORTANT: Also restart PHP-FPM to clear web OPcache:\n";
echo "   systemctl restart php8.3-fpm  (or your PHP version)\n";
echo "\nDone.\n";

function clearDir(string $dir, string $label): void
{
    if (!is_dir($dir)) { echo "⏭  {$label}: not found\n"; return; }
    $count = 0;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $f) {
        if ($f->isDir()) @rmdir($f->getRealPath()); else { @unlink($f->getRealPath()); $count++; }
    }
    echo "✅ {$label}: cleared ({$count} files)\n";
}
