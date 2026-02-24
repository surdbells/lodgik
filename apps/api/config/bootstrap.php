<?php

/**
 * CLI Bootstrap — builds and returns the DI container.
 *
 * Used by bin/ scripts (seeds, console, migrations, etc.)
 * Mirrors the setup in public/index.php but without Slim.
 */

declare(strict_types=1);

use DI\ContainerBuilder;

require __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Build DI Container
$containerBuilder = new ContainerBuilder();

// Load dependency definitions
(require __DIR__ . '/dependencies.php')($containerBuilder);

return $containerBuilder->build();
