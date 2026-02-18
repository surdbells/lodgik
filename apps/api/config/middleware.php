<?php

declare(strict_types=1);

use Lodgik\Middleware\CorsMiddleware;
use Lodgik\Middleware\ErrorHandlerMiddleware;
use Lodgik\Middleware\JsonBodyParserMiddleware;
use Lodgik\Middleware\RequestIdMiddleware;
use Psr\Log\LoggerInterface;
use Slim\App;

return function (App $app): void {
    $container = $app->getContainer();
    $settings = $container->get('settings');

    // Middleware is applied in reverse order (last added = first executed)

    // 1. Parse JSON request bodies
    $app->add(new JsonBodyParserMiddleware());

    // 2. Add request ID for tracing
    $app->add(new RequestIdMiddleware());

    // 3. CORS headers
    $app->add(new CorsMiddleware(
        allowedOrigins: $settings['cors']['allowed_origins'],
        allowedMethods: $settings['cors']['allowed_methods'],
        allowedHeaders: $settings['cors']['allowed_headers'],
    ));

    // 4. Error handling (outermost — catches everything)
    $app->add(new ErrorHandlerMiddleware(
        logger: $container->get(LoggerInterface::class),
        debug: $settings['app']['debug'],
    ));
};
