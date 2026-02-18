<?php

declare(strict_types=1);

use Lodgik\Module\Health\HealthController;
use Slim\App;

return function (App $app): void {
    $app->get('/api/health', [HealthController::class, 'check']);
    $app->get('/api/health/detailed', [HealthController::class, 'detailed']);
};
