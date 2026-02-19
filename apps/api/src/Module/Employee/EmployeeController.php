<?php

declare(strict_types=1);

namespace Lodgik\Module\Employee;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class EmployeeController
{
    public function __construct(
        private readonly EmployeeService $service,
    ) {}

    // ─── Departments ────────────────────────────────────────────

    public function listDepartments(Request $req, Response $res): Response
    {
        $propertyId = $req->getQueryParams()['property_id'] ?? null;
        $depts = $this->service->listDepartments($propertyId);
        $counts = $this->service->getDepartmentCounts();
        return JsonResponse::ok($res, array_map(fn($d) => array_merge($d->toArray(), ['employee_count' => $counts[$d->getId()] ?? 0]), $depts));
    }

    public function createDepartment(Request $req, Response $res): Response
    {
        $data = (array) $req->getParsedBody();
        $tenantId = $req->getAttribute('auth.tenant_id');
        if (empty($data['name'])) return JsonResponse::error($res, 'Name is required', 422);
        $dept = $this->service->createDepartment($data['name'], $tenantId, $data['property_id'] ?? null, $data['description'] ?? null);
        return JsonResponse::ok($res, $dept->toArray(), 'Department created');
    }

    public function updateDepartment(Request $req, Response $res, array $args): Response
    {
        try {
            $dept = $this->service->updateDepartment($args['id'], (array) $req->getParsedBody());
            return JsonResponse::ok($res, $dept->toArray(), 'Department updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 404);
        }
    }

    // ─── Employees ──────────────────────────────────────────────

    public function listEmployees(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $result = $this->service->listEmployees(
            propertyId: $q['property_id'] ?? null,
            departmentId: $q['department_id'] ?? null,
            status: $q['status'] ?? null,
            search: $q['search'] ?? null,
            page: (int) ($q['page'] ?? 1),
            limit: (int) ($q['limit'] ?? 20),
        );
        return JsonResponse::ok($res, $result['items'], meta: ['total' => $result['total']]);
    }

    public function getEmployee(Request $req, Response $res, array $args): Response
    {
        $emp = $this->service->getEmployee($args['id']);
        if (!$emp) return JsonResponse::error($res, 'Employee not found', 404);
        return JsonResponse::ok($res, $emp->toArray());
    }

    public function createEmployee(Request $req, Response $res): Response
    {
        $data = (array) $req->getParsedBody();
        $tenantId = $req->getAttribute('auth.tenant_id');
        foreach (['property_id', 'first_name', 'last_name', 'job_title'] as $f) {
            if (empty($data[$f])) return JsonResponse::error($res, "{$f} is required", 422);
        }
        try {
            $emp = $this->service->createEmployee($data, $tenantId);
            return JsonResponse::ok($res, $emp->toArray(), 'Employee created');
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function updateEmployee(Request $req, Response $res, array $args): Response
    {
        try {
            $emp = $this->service->updateEmployee($args['id'], (array) $req->getParsedBody());
            return JsonResponse::ok($res, $emp->toArray(), 'Employee updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 404);
        }
    }

    public function terminateEmployee(Request $req, Response $res, array $args): Response
    {
        $data = (array) $req->getParsedBody();
        if (empty($data['reason'])) return JsonResponse::error($res, 'Reason required', 422);
        try {
            $emp = $this->service->terminate($args['id'], $data['reason'], $data['termination_date'] ?? date('Y-m-d'));
            return JsonResponse::ok($res, $emp->toArray(), 'Employee terminated');
        } catch (\RuntimeException $e) {
            return JsonResponse::error($res, $e->getMessage(), 404);
        }
    }

    public function activeDirectory(Request $req, Response $res): Response
    {
        $propertyId = $req->getQueryParams()['property_id'] ?? null;
        if (!$propertyId) return JsonResponse::error($res, 'property_id required', 422);
        $employees = $this->service->getActiveByProperty($propertyId);
        return JsonResponse::ok($res, array_map(fn($e) => $e->toArray(), $employees));
    }
}
