<?php
declare(strict_types=1);
use Lodgik\Module\Attendance\AttendanceController;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();
    $featureGate = new FeatureMiddleware('attendance_shifts', 'professional', $c->get(RedisClient::class));
    $roleGate = new RoleMiddleware(['property_admin', 'manager', 'hr', 'front_desk']);

    $app->group('/api/shifts', function (RouteCollectorProxy $g) {
        $g->get('', [AttendanceController::class, 'listShifts']);
        $g->post('', [AttendanceController::class, 'createShift']);
        $g->put('/{id}', [AttendanceController::class, 'updateShift']);
    })->add($roleGate)->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    $app->group('/api/shift-assignments', function (RouteCollectorProxy $g) {
        $g->get('', [AttendanceController::class, 'getSchedule']);
        $g->post('', [AttendanceController::class, 'assignShift']);
        $g->post('/bulk', [AttendanceController::class, 'bulkAssign']);
        $g->delete('/{id}', [AttendanceController::class, 'removeAssignment']);
    })->add($roleGate)->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    $app->group('/api/attendance', function (RouteCollectorProxy $g) {
        $g->get('', [AttendanceController::class, 'listRecords']);
        $g->get('/today', [AttendanceController::class, 'todayRecords']);
        $g->get('/report', [AttendanceController::class, 'report']);
        $g->post('/clock-in', [AttendanceController::class, 'clockIn']);
        $g->post('/clock-out', [AttendanceController::class, 'clockOut']);
        $g->post('/record', [AttendanceController::class, 'recordAttendance']);
    })->add($roleGate)->add($featureGate)->add(TenantMiddleware::class)->add(AuthMiddleware::class);
};
