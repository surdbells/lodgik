<?php

declare(strict_types=1);

use Lodgik\Module\Attendance\AttendanceController;
use Lodgik\Middleware\FeatureMiddleware;
use Predis\Client as RedisClient;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $c = $app->getContainer();
    $featureGate = new FeatureMiddleware('attendance_shifts', 'professional', $c->get(RedisClient::class));

    $app->group('/shifts', function (RouteCollectorProxy $g) {
        $g->get('', [AttendanceController::class, 'listShifts']);
        $g->post('', [AttendanceController::class, 'createShift']);
        $g->put('/{id}', [AttendanceController::class, 'updateShift']);
    })->add($featureGate);

    $app->group('/shift-assignments', function (RouteCollectorProxy $g) {
        $g->get('', [AttendanceController::class, 'getSchedule']);
        $g->post('', [AttendanceController::class, 'assignShift']);
        $g->post('/bulk', [AttendanceController::class, 'bulkAssign']);
        $g->delete('/{id}', [AttendanceController::class, 'removeAssignment']);
    })->add($featureGate);

    $app->group('/attendance', function (RouteCollectorProxy $g) {
        $g->get('', [AttendanceController::class, 'dailyAttendance']);
        $g->get('/employee/{employee_id}', [AttendanceController::class, 'employeeAttendance']);
        $g->post('/clock-in', [AttendanceController::class, 'clockIn']);
        $g->post('/clock-out', [AttendanceController::class, 'clockOut']);
        $g->post('/record', [AttendanceController::class, 'recordAttendance']);
    })->add($featureGate);
};
