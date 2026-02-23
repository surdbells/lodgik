<?php

declare(strict_types=1);

use Dotenv\Dotenv;

// Load .env file
$dotenv = Dotenv::createImmutable(dirname(__DIR__));
$dotenv->safeLoad();

return [
    'app' => [
        'name' => $_ENV['APP_NAME'] ?? 'Lodgik',
        'env' => $_ENV['APP_ENV'] ?? 'production',
        'debug' => filter_var($_ENV['APP_DEBUG'] ?? false, FILTER_VALIDATE_BOOLEAN),
        'url' => $_ENV['APP_URL'] ?? 'http://localhost:8080',
        'secret' => $_ENV['APP_SECRET'] ?? '',
    ],

    'database' => [
        'driver' => $_ENV['DB_DRIVER'] ?? 'pdo_pgsql',
        'host' => $_ENV['DB_HOST'] ?? 'localhost',
        'port' => (int) ($_ENV['DB_PORT'] ?? 5432),
        'dbname' => $_ENV['DB_NAME'] ?? 'lodgik',
        'user' => $_ENV['DB_USER'] ?? 'lodgik',
        'password' => $_ENV['DB_PASSWORD'] ?? '',
        'charset' => $_ENV['DB_CHARSET'] ?? 'utf8',
    ],

    'redis' => [
        'host' => $_ENV['REDIS_HOST'] ?? 'localhost',
        'port' => (int) ($_ENV['REDIS_PORT'] ?? 6379),
        'password' => $_ENV['REDIS_PASSWORD'] ?: null,
        'prefix' => $_ENV['REDIS_PREFIX'] ?? 'lodgik:',
    ],

    'jwt' => [
        'secret' => $_ENV['JWT_SECRET'] ?? '',
        'access_ttl' => (int) ($_ENV['JWT_ACCESS_TTL'] ?? 900),
        'refresh_ttl' => (int) ($_ENV['JWT_REFRESH_TTL'] ?? 604800),
        'algorithm' => 'HS256',
        'issuer' => 'lodgik-api',
    ],

    'zeptomail' => [
        'api_key' => $_ENV['ZEPTOMAIL_API_KEY'] ?? '',
        'from_email' => $_ENV['ZEPTOMAIL_FROM_EMAIL'] ?? 'noreply@lodgik.co',
        'from_name' => $_ENV['ZEPTOMAIL_FROM_NAME'] ?? 'Lodgik',
    ],

    'termii' => [
        'api_key' => $_ENV['TERMII_API_KEY'] ?? '',
        'sender_id' => $_ENV['TERMII_SENDER_ID'] ?? 'Lodgik',
    ],

    'paystack' => [
        'secret_key' => $_ENV['PAYSTACK_SECRET_KEY'] ?? '',
        'public_key' => $_ENV['PAYSTACK_PUBLIC_KEY'] ?? '',
        'webhook_secret' => $_ENV['PAYSTACK_WEBHOOK_SECRET'] ?? '',
    ],

    'storage' => [
        'driver' => $_ENV['STORAGE_DRIVER'] ?? 'local',
        'local_path' => $_ENV['STORAGE_LOCAL_PATH'] ?? './storage',
        's3' => [
            'bucket' => $_ENV['AWS_S3_BUCKET'] ?? '',
            'region' => $_ENV['AWS_S3_REGION'] ?? '',
            'key' => $_ENV['AWS_S3_KEY'] ?? '',
            'secret' => $_ENV['AWS_S3_SECRET'] ?? '',
        ],
    ],

    'cors' => [
        'allowed_origins' => array_filter(explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? '')),
        'allowed_methods' => array_filter(explode(',', $_ENV['CORS_ALLOWED_METHODS'] ?? 'GET,POST,PUT,PATCH,DELETE,OPTIONS')),
        'allowed_headers' => array_filter(explode(',', $_ENV['CORS_ALLOWED_HEADERS'] ?? 'Content-Type,Authorization,X-Request-ID')),
        'max_age' => 86400,
    ],

    'logging' => [
        'channel' => $_ENV['LOG_CHANNEL'] ?? 'stderr',
        'level' => $_ENV['LOG_LEVEL'] ?? 'debug',
        'path' => $_ENV['LOG_PATH'] ?? './logs',
    ],
];
