<?php
declare(strict_types=1);
use Lodgik\Module\Employee\EmployeeController;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();
    $featureGate = new FeatureMiddleware('employee_management', 'professional', $c->get(RedisClient::class));
    $app->group('/departments', function (RouteCollectorProxy $g) {
        $g->get('', [EmployeeController::class, 'listDepartments']);
        $g->post('', [EmployeeController::class, 'createDepartment']);
        $g->put('/{id}', [EmployeeController::class, 'updateDepartment']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'hr']))
        ->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    $app->group('/employees', function (RouteCollectorProxy $g) {
        $g->get('', [EmployeeController::class, 'listEmployees']);
        $g->get('/directory', [EmployeeController::class, 'activeDirectory']);
        $g->get('/{id}', [EmployeeController::class, 'getEmployee']);
        $g->post('', [EmployeeController::class, 'createEmployee']);
        $g->put('/{id}', [EmployeeController::class, 'updateEmployee']);
        $g->post('/{id}/terminate', [EmployeeController::class, 'terminateEmployee']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'hr']))
        ->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
