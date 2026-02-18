<?php
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();
return [
    'driver' => 'pdo_pgsql',
    'host' => $_ENV['DB_HOST'] ?? 'localhost',
    'port' => (int)($_ENV['DB_PORT'] ?? 5432),
    'dbname' => $_ENV['DB_NAME'] ?? 'lodgik',
    'user' => $_ENV['DB_USER'] ?? 'lodgik',
    'password' => $_ENV['DB_PASS'] ?? 'lodgik_secret',
];
