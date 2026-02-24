<?php

declare(strict_types=1);

use DI\ContainerBuilder;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

// ─── Load environment variables early ─────────────────────
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// ─── Build DI Container ───────────────────────────────────
$containerBuilder = new ContainerBuilder();

// Enable compilation in production for performance
$appEnv = $_ENV['APP_ENV'] ?? ($_SERVER['APP_ENV'] ?? 'production');
if ($appEnv !== 'development') {
    $containerBuilder->enableCompilation(__DIR__ . '/../var/cache');
}

// Load dependency definitions
(require __DIR__ . '/../config/dependencies.php')($containerBuilder);

$container = $containerBuilder->build();

// ─── Create Slim App with PHP-DI ──────────────────────────
$app = AppFactory::createFromContainer($container);

// ─── Register Routes ─────────────────────────────────────
(require __DIR__ . '/../config/routes.php')($app);

// ─── Register Middleware ──────────────────────────────────
// Slim middleware is LIFO: last added = first executed.
// Order of execution: ErrorHandler → CORS → RequestId → JsonBodyParser → RoutingMiddleware → Route
//
// RoutingMiddleware must be added FIRST (runs last, closest to route).
// ErrorHandler must be added LAST (runs first, catches everything).
$app->addRoutingMiddleware();
(require __DIR__ . '/../config/middleware.php')($app);

// ─── Run ──────────────────────────────────────────────────
$app->run();
