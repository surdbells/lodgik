<?php
declare(strict_types=1);

namespace Lodgik\Module\Housekeeping;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class ConsumableController
{
    public function __construct(private readonly ConsumableService $svc) {}

    private function json(Response $res, mixed $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_THROW_ON_ERROR));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
    private function body(Request $req): array { return (array)($req->getParsedBody() ?? []); }

    // ── Consumable Catalogue ────────────────────────────────────────────
    public function listConsumables(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        $pid = $p['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
        $tid = $req->getAttribute('auth.tenant_id');
        return $this->json($res, ['success' => true, 'data' => $this->svc->listConsumables($pid, $tid)]);
    }

    public function createConsumable(Request $req, Response $res): Response
    {
        $d   = $this->body($req);
        $pid = $d['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
        $tid = $req->getAttribute('auth.tenant_id');

        if (empty($d['name'])) {
            return $this->json($res, ['success' => false, 'message' => 'name is required'], 422);
        }

        $c = $this->svc->createConsumable(
            $pid, $d['name'], $d['unit'] ?? 'piece',
            (string)($d['expected_per_room'] ?? '1'), (string)($d['reorder_threshold'] ?? '10'),
            $tid, $d['notes'] ?? null
        );
        return $this->json($res, ['success' => true, 'data' => $c->toArray()], 201);
    }

    public function updateConsumable(Request $req, Response $res, array $args): Response
    {
        try {
            $c = $this->svc->updateConsumable($args['id'], $this->body($req));
            return $this->json($res, ['success' => true, 'data' => $c->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    public function deleteConsumable(Request $req, Response $res, array $args): Response
    {
        $this->svc->deleteConsumable($args['id']);
        return $this->json($res, ['success' => true, 'message' => 'Consumable deactivated']);
    }

    // ── Store Requests ──────────────────────────────────────────────────
    public function listRequests(Request $req, Response $res): Response
    {
        $p   = $req->getQueryParams();
        $pid = $p['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
        return $this->json($res, ['success' => true, 'data' => $this->svc->listRequests($pid, $p['status'] ?? null)]);
    }

    public function createRequest(Request $req, Response $res): Response
    {
        $d   = $this->body($req);
        $pid = $d['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');

        if (empty($d['items']) || !is_array($d['items'])) {
            return $this->json($res, ['success' => false, 'message' => 'items array is required'], 422);
        }

        try {
            $request = $this->svc->createRequest(
                $pid, $uid, $d['requested_by_name'] ?? 'Housekeeping',
                $d['items'], $tid, $d['notes'] ?? null
            );
            return $this->json($res, ['success' => true, 'data' => $request->toArray()], 201);
        } catch (\InvalidArgumentException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function storekeeperApprove(Request $req, Response $res, array $args): Response
    {
        $d = $this->body($req);
        try {
            $r = $this->svc->approveByStorekeeper(
                $args['id'],
                $req->getAttribute('auth.user_id'),
                $d['approver_name'] ?? 'Storekeeper',
                $d['issued_quantities'] ?? []
            );
            return $this->json($res, ['success' => true, 'data' => $r->toArray()]);
        } catch (\DomainException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function adminApprove(Request $req, Response $res, array $args): Response
    {
        $d = $this->body($req);
        try {
            $r = $this->svc->approveByAdmin(
                $args['id'],
                $req->getAttribute('auth.user_id'),
                $d['approver_name'] ?? 'Admin'
            );
            return $this->json($res, ['success' => true, 'data' => $r->toArray()]);
        } catch (\DomainException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function reject(Request $req, Response $res, array $args): Response
    {
        $d = $this->body($req);
        if (empty($d['reason'])) {
            return $this->json($res, ['success' => false, 'message' => 'reason is required'], 422);
        }
        try {
            $r = $this->svc->reject($args['id'], $d['reason']);
            return $this->json($res, ['success' => true, 'data' => $r->toArray()]);
        } catch (\DomainException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function fulfill(Request $req, Response $res, array $args): Response
    {
        try {
            $r = $this->svc->fulfill($args['id'], $req->getAttribute('auth.tenant_id'));
            return $this->json($res, ['success' => true, 'data' => $r->toArray()]);
        } catch (\DomainException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Discrepancies ───────────────────────────────────────────────────
    public function listDiscrepancies(Request $req, Response $res): Response
    {
        $p   = $req->getQueryParams();
        $pid = $p['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
        $unresolvedOnly = ($p['unresolved'] ?? 'true') === 'true';
        return $this->json($res, ['success' => true, 'data' => $this->svc->listDiscrepancies($pid, $unresolvedOnly)]);
    }

    public function resolveDiscrepancy(Request $req, Response $res, array $args): Response
    {
        $d = $this->body($req);
        try {
            $disc = $this->svc->resolveDiscrepancy($args['id'], $req->getAttribute('auth.user_id'), $d['notes'] ?? null);
            return $this->json($res, ['success' => true, 'data' => $disc->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    public function runDiscrepancyCheck(Request $req, Response $res): Response
    {
        $d   = $this->body($req);
        $p   = $req->getQueryParams();
        $pid = $d['property_id'] ?? $p['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
        $tid = $req->getAttribute('auth.tenant_id');
        $from = $d['from'] ?? $p['from'] ?? date('Y-m-d', strtotime('-7 days'));
        $to   = $d['to']   ?? $p['to']   ?? date('Y-m-d');

        $result = $this->svc->runDiscrepancyCheck($pid, $tid, $from, $to);
        return $this->json($res, ['success' => true, 'data' => $result]);
    }
}
