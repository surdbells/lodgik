<?php

declare(strict_types=1);

namespace Lodgik\Module\Leave;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class LeaveController
{
    public function __construct(private readonly LeaveService $service) {}

    public function listTypes(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, array_map(fn($t) => $t->toArray(), $this->service->listLeaveTypes()));
    }

    public function createType(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');
        foreach (['type_key', 'name', 'default_days'] as $f) { if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422); }
        $lt = $this->service->createLeaveType($d['type_key'], $d['name'], (int)$d['default_days'], $tid, (bool)($d['is_paid'] ?? true));
        return JsonResponse::ok($res, $lt->toArray(), 'Leave type created');
    }

    public function getBalances(Request $req, Response $res, array $args): Response
    {
        $qs   = $req->getQueryParams();
        $year = (int)($qs['year'] ?? date('Y'));
        // employee_id from path param or query string
        $empId = $args['employeeId'] ?? $args['employee_id'] ?? $qs['employee_id'] ?? null;
        if (!$empId) return JsonResponse::error($res, 'employee_id required', 422);
        return JsonResponse::ok($res, array_map(fn($b) => $b->toArray(), $this->service->getBalances($empId, $year)));
    }

    public function listRequests(Request $req, Response $res): Response
    {
        $qs = $req->getQueryParams();
        $tid = $req->getAttribute('auth.tenant_id');
        $pid = $req->getAttribute('auth.property_id') ?? '';
        $year = isset($qs['year']) ? (int)$qs['year'] : null;
        if (!empty($qs['employee_id'])) {
            $requests = $this->service->getEmployeeRequests($qs['employee_id'], $year);
        } else {
            $requests = $this->service->getAllRequests($tid, $pid, $year, $qs['status'] ?? null);
        }
        return JsonResponse::ok($res, array_map(fn($r) => $r->toArray(), $requests));
    }

    public function initBalances(Request $req, Response $res, array $args): Response
    {
        // Support both /init/{employeeId} and /{employeeId}/init path patterns
        $empId = $args['employeeId'] ?? $args['employee_id'] ?? null;
        if (!$empId) return JsonResponse::error($res, 'employee_id required', 422);
        $body = (array)($req->getParsedBody() ?? []);
        $year = (int)($body['year'] ?? $req->getQueryParams()['year'] ?? date('Y'));
        $this->service->initializeBalances($empId, $year, $req->getAttribute('auth.tenant_id'));
        return JsonResponse::ok($res, null, 'Leave balances initialized');
    }

    public function submitRequest(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['employee_id', 'leave_type_id', 'start_date', 'end_date'] as $f) { if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422); }
        try {
            $r = $this->service->submitRequest($d['employee_id'], $d['leave_type_id'], $d['start_date'], $d['end_date'], $req->getAttribute('auth.tenant_id'), $d['reason'] ?? null);
            return JsonResponse::ok($res, $r->toArray(), 'Leave request submitted');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function approveRequest(Request $req, Response $res, array $args): Response
    {
        try {
            $r = $this->service->approveRequest($args['id'], $req->getAttribute('auth.user_id'), ((array)$req->getParsedBody())['notes'] ?? null);
            return JsonResponse::ok($res, $r->toArray(), 'Leave approved');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function rejectRequest(Request $req, Response $res, array $args): Response
    {
        try {
            $r = $this->service->rejectRequest($args['id'], $req->getAttribute('auth.user_id'), ((array)$req->getParsedBody())['notes'] ?? null);
            return JsonResponse::ok($res, $r->toArray(), 'Leave rejected');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function cancelRequest(Request $req, Response $res, array $args): Response
    {
        try {
            return JsonResponse::ok($res, $this->service->cancelRequest($args['id'])->toArray(), 'Leave cancelled');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function getRequest(Request $req, Response $res, array $args): Response
    {
        $r = $this->service->getRequest($args['id']);
        return $r ? JsonResponse::ok($res, $r->toArray()) : JsonResponse::error($res, 'Not found', 404);
    }

    public function employeeRequests(Request $req, Response $res, array $args): Response
    {
        $year = isset($req->getQueryParams()['year']) ? (int)$req->getQueryParams()['year'] : null;
        return JsonResponse::ok($res, array_map(fn($r) => $r->toArray(), $this->service->getEmployeeRequests($args['employee_id'], $year)));
    }

    public function pendingRequests(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, array_map(fn($r) => $r->toArray(), $this->service->getPendingRequests()));
    }
}
