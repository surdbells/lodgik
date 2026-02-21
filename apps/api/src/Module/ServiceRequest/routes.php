<?php
declare(strict_types=1);
use Lodgik\Module\ServiceRequest\ServiceRequestController;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();
    $featureGate = new FeatureMiddleware('service_requests', 'professional', $c->get(RedisClient::class));
    $app->group('/service-requests', function (RouteCollectorProxy $g) {
        $g->get('', [ServiceRequestController::class, 'list']);
        $g->get('/active', [ServiceRequestController::class, 'listActive']);
        $g->get('/summary', [ServiceRequestController::class, 'summary']);
        $g->get('/booking/{bookingId}', [ServiceRequestController::class, 'byBooking']);
        $g->get('/{id}', [ServiceRequestController::class, 'get']);
        $g->post('', [ServiceRequestController::class, 'create']);
        $g->post('/{id}/acknowledge', [ServiceRequestController::class, 'acknowledge']);
        $g->post('/{id}/progress', [ServiceRequestController::class, 'startProgress']);
        $g->post('/{id}/complete', [ServiceRequestController::class, 'complete']);
        $g->post('/{id}/cancel', [ServiceRequestController::class, 'cancel']);
        $g->post('/{id}/assign', [ServiceRequestController::class, 'assign']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'housekeeping', 'maintenance', 'concierge', 'engineer']))
        ->add($featureGate)
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};
