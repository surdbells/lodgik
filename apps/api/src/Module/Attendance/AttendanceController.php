<?php

declare(strict_types=1);

namespace Lodgik\Module\Attendance;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Enum\AttendanceStatus;
use Lodgik\Util\JsonResponse;

final class AttendanceController
{
    public function __construct(
        private readonly AttendanceService $service,
    ) {}

    // ─── Shifts ─────────────────────────────────────────────────

    public function listShifts(Request $req, Response $res): Response
    {
        $shifts = $this->service->listShifts();
        return JsonResponse::ok($res, array_map(fn($s) => $s->toArray(), $shifts));
    }

    public function createShift(Request $req, Response $res): Response
    {
        $data = (array) $req->getParsedBody();
        $tenantId = $req->getAttribute('auth.tenant_id');
        foreach (['name', 'start_time', 'end_time'] as $f) {
            if (empty($data[$f])) return JsonResponse::error($res, "$f is required", 422);
        }
        $shift = $this->service->createShift($data['name'], $data['start_time'], $data['end_time'], $tenantId, (int) ($data['grace_minutes'] ?? 15));
        return JsonResponse::ok($res, $shift->toArray(), 'Shift created');
    }

    public function updateShift(Request $req, Response $res, array $args): Response
    {
        try {
            $shift = $this->service->updateShift($args['id'], (array) $req->getParsedBody());
            return JsonResponse::ok($res, $shift->toArray(), 'Shift updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 404);
        }
    }

    // ─── Shift Assignments ──────────────────────────────────────

    public function assignShift(Request $req, Response $res): Response
    {
        $data = (array) $req->getParsedBody();
        $tenantId = $req->getAttribute('auth.tenant_id');
        foreach (['employee_id', 'shift_id', 'date'] as $f) {
            if (empty($data[$f])) return JsonResponse::error($res, "$f is required", 422);
        }
        try {
            $sa = $this->service->assignShift($data['employee_id'], $data['shift_id'], $data['date'], $tenantId);
            return JsonResponse::ok($res, $sa->toArray(), 'Shift assigned');
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function bulkAssign(Request $req, Response $res): Response
    {
        $data = (array) $req->getParsedBody();
        $tenantId = $req->getAttribute('auth.tenant_id');
        if (empty($data['assignments']) || !is_array($data['assignments'])) {
            return JsonResponse::error($res, 'assignments array required', 422);
        }
        $count = $this->service->bulkAssignShifts($data['assignments'], $tenantId);
        return JsonResponse::ok($res, ['assigned' => $count], "$count shifts assigned");
    }

    public function getSchedule(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        if (empty($q['from']) || empty($q['to'])) return JsonResponse::error($res, 'from and to required', 422);
        $schedule = $this->service->getSchedule($q['from'], $q['to'], $q['employee_id'] ?? null);
        return JsonResponse::ok($res, array_map(fn($s) => $s->toArray(), $schedule));
    }

    public function removeAssignment(Request $req, Response $res, array $args): Response
    {
        $this->service->removeAssignment($args['id']);
        return JsonResponse::ok($res, null, 'Assignment removed');
    }

    // ─── Attendance ─────────────────────────────────────────────

    public function clockIn(Request $req, Response $res): Response
    {
        $data = (array) $req->getParsedBody();
        $tenantId = $req->getAttribute('auth.tenant_id');
        $userId = $req->getAttribute('auth.user_id');
        if (empty($data['employee_id'])) return JsonResponse::error($res, 'employee_id required', 422);
        if (empty($data['property_id'])) return JsonResponse::error($res, 'property_id required', 422);
        try {
            $record = $this->service->clockIn($data['employee_id'], $data['property_id'], $tenantId, $userId);
            return JsonResponse::ok($res, $record->toArray(), 'Clocked in');
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function clockOut(Request $req, Response $res): Response
    {
        $data = (array) $req->getParsedBody();
        if (empty($data['employee_id'])) return JsonResponse::error($res, 'employee_id required', 422);
        try {
            $record = $this->service->clockOut($data['employee_id']);
            return JsonResponse::ok($res, $record->toArray(), 'Clocked out');
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function recordAttendance(Request $req, Response $res): Response
    {
        $data = (array) $req->getParsedBody();
        $tenantId = $req->getAttribute('auth.tenant_id');
        $userId = $req->getAttribute('auth.user_id');
        foreach (['employee_id', 'property_id', 'date', 'status'] as $f) {
            if (empty($data[$f])) return JsonResponse::error($res, "$f is required", 422);
        }
        $record = $this->service->recordAttendance(
            $data['employee_id'], $data['property_id'], $data['date'],
            AttendanceStatus::from($data['status']), $tenantId, $data['notes'] ?? null, $userId
        );
        return JsonResponse::ok($res, $record->toArray(), 'Attendance recorded');
    }

    public function dailyAttendance(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $date = $q['date'] ?? date('Y-m-d');
        $records = $this->service->getDailyAttendance($date, $q['property_id'] ?? null);
        $summary = $this->service->getDailySummary($date, $q['property_id'] ?? null);
        return JsonResponse::ok($res, [
            'records' => array_map(fn($r) => $r->toArray(), $records),
            'summary' => $summary,
        ]);
    }

    public function employeeAttendance(Request $req, Response $res, array $args): Response
    {
        $q = $req->getQueryParams();
        if (empty($q['from']) || empty($q['to'])) return JsonResponse::error($res, 'from and to required', 422);
        $records = $this->service->getEmployeeAttendance($args['employee_id'], $q['from'], $q['to']);
        return JsonResponse::ok($res, array_map(fn($r) => $r->toArray(), $records));
    }

    public function listRecords(Request $req, Response $res): Response { return $this->dailyAttendance($req, $res); }
    public function todayRecords(Request $req, Response $res): Response { return $this->dailyAttendance($req, $res); }

    public function report(Request $req, Response $res): Response
    {
        $propertyId = $req->getAttribute('property_id');
        $params = $req->getQueryParams();
        $from = $params['from'] ?? date('Y-m-01');
        $to = $params['to'] ?? date('Y-m-d');
        $records = $this->service->getDailyAttendance($from, $propertyId);
        return JsonResponse::ok($res, ['records' => array_map(fn($r) => $r->toArray(), $records), 'from' => $from, 'to' => $to, 'total' => count($records)]);
    }
}
