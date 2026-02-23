<?php

declare(strict_types=1);

/**
 * Doctrine CLI configuration
 *
 * This file bootstraps the Doctrine EntityManager for CLI tools:
 * - doctrine-migrations (database migrations)
 * - doctrine (ORM commands)
 *
 * Usage:
 *   php vendor/bin/doctrine-migrations migrate --no-interaction
 *   php vendor/bin/doctrine-migrations status
 *   php vendor/bin/doctrine-migrations diff
 */

use Doctrine\DBAL\DriverManager;
use Doctrine\Migrations\Configuration\EntityManager\ExistingEntityManager;
use Doctrine\Migrations\Configuration\Migration\PhpFile;
use Doctrine\Migrations\DependencyFactory;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\ORMSetup;

require_once __DIR__ . '/vendor/autoload.php';

// Load environment variables
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (str_contains($line, '=')) {
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!isset($_ENV[$key])) {
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
}

// Build Doctrine configuration
$config = ORMSetup::createAttributeMetadataConfiguration(
    paths: [__DIR__ . '/src/Entity'],
    isDevMode: ($_ENV['APP_DEBUG'] ?? 'false') === 'true',
);

// Build database connection from .env
$connection = DriverManager::getConnection([
    'driver'   => $_ENV['DB_DRIVER'] ?? 'pdo_pgsql',
    'host'     => $_ENV['DB_HOST'] ?? '127.0.0.1',
    'port'     => (int) ($_ENV['DB_PORT'] ?? 5432),
    'dbname'   => $_ENV['DB_NAME'] ?? 'lodgik',
    'user'     => $_ENV['DB_USER'] ?? 'lodgik_app',
    'password' => $_ENV['DB_PASSWORD'] ?? '',
    'charset'  => $_ENV['DB_CHARSET'] ?? 'utf8',
], $config);

// Create EntityManager
$entityManager = new EntityManager($connection, $config);

// Build DependencyFactory for doctrine-migrations CLI
$migrationConfig = new PhpFile(__DIR__ . '/config/migrations.php');

return DependencyFactory::fromEntityManager(
    $migrationConfig,
    new ExistingEntityManager($entityManager)
);
