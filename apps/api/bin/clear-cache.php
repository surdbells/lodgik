#!/usr/bin/env php
<?php
declare(strict_types=1);

$cacheDir = __DIR__ . '/../var/cache';

if (is_dir($cacheDir)) {
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($cacheDir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($files as $file) {
        $file->isDir() ? rmdir($file->getRealPath()) : unlink($file->getRealPath());
    }
    echo "Cache cleared: {$cacheDir}\n";
} else {
    echo "No cache directory found.\n";
}
