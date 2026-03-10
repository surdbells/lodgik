<?php
declare(strict_types=1);
namespace Lodgik\Module\Event;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class EventController
{
    public function __construct(private readonly EventService $svc) {}

    private function json(Response $r, mixed $d, int $s = 200): Response
    {
        $r->getBody()->write(json_encode($d));
        return $r->withHeader('Content-Type', 'application/json')->withStatus($s);
    }

    private function body(Request $req): array { return (array) $req->getParsedBody(); }
    private function tid(Request $req): string  { return $req->getAttribute('auth.tenant_id'); }
    private function pid(Request $req): string
    {
        $p = $req->getQueryParams();
        return $p['property_id'] ?? (string) $req->getAttribute('auth.property_id') ?? '';
    }

    // ── Dashboard ──────────────────────────────────────────────────────────

    public function dashboard(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        return $this->json($res, ['success' => true, 'data' => $this->svc->getDashboard($this->tid($req), $p['property_id'] ?? '')]);
    }

    // ── Event Spaces ───────────────────────────────────────────────────────

    public function listSpaces(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        $active = isset($p['active']) ? ($p['active'] === 'true') : null;
        return $this->json($res, ['success' => true, 'data' => $this->svc->listSpaces($this->tid($req), $p['property_id'] ?? '', $active)]);
    }

    public function createSpace(Request $req, Response $res): Response
    {
        try {
            $d = $this->body($req);
            $pid = $d['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
            if (!$pid) return $this->json($res, ['success' => false, 'message' => 'property_id required'], 422);
            return $this->json($res, ['success' => true, 'data' => $this->svc->createSpace($this->tid($req), $pid, $d)->toArray()], 201);
        } catch (\InvalidArgumentException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function updateSpace(Request $req, Response $res, array $args): Response
    {
        try {
            return $this->json($res, ['success' => true, 'data' => $this->svc->updateSpace($args['id'], $this->body($req))->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function deleteSpace(Request $req, Response $res, array $args): Response
    {
        try {
            $this->svc->deleteSpace($args['id']);
            return $this->json($res, ['success' => true, 'message' => 'Event space deleted']);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    // ── Event Bookings ──────────────────────────────────────────────────────

    public function list(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        return $this->json($res, ['success' => true, 'data' => $this->svc->list(
            $this->tid($req),
            $p['property_id'] ?? '',
            array_filter([
                'status'     => $p['status'] ?? null,
                'event_type' => $p['event_type'] ?? null,
                'from'       => $p['from'] ?? null,
                'to'         => $p['to'] ?? null,
            ])
        )]);
    }

    public function get(Request $req, Response $res, array $args): Response
    {
        try {
            $event = $this->svc->find($args['id']);
            return $this->json($res, ['success' => true, 'data' => $event->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function create(Request $req, Response $res): Response
    {
        try {
            $d   = $this->body($req);
            $pid = $d['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
            if (!$pid) return $this->json($res, ['success' => false, 'message' => 'property_id required'], 422);
            $event = $this->svc->create($this->tid($req), $pid, $d, $req->getAttribute('auth.user_id'));
            return $this->json($res, ['success' => true, 'data' => $event->toArray()], 201);
        } catch (\InvalidArgumentException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function update(Request $req, Response $res, array $args): Response
    {
        try {
            return $this->json($res, ['success' => true, 'data' => $this->svc->update($args['id'], $this->body($req))->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function confirm(Request $req, Response $res, array $args): Response
    {
        try {
            return $this->json($res, ['success' => true, 'data' => $this->svc->confirm($args['id'])->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function cancel(Request $req, Response $res, array $args): Response
    {
        try {
            return $this->json($res, ['success' => true, 'data' => $this->svc->cancel($args['id'])->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function complete(Request $req, Response $res, array $args): Response
    {
        try {
            return $this->json($res, ['success' => true, 'data' => $this->svc->complete($args['id'])->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function recordDeposit(Request $req, Response $res, array $args): Response
    {
        try {
            $d = $this->body($req);
            $kobo = isset($d['amount_ngn']) ? (int) round((float) $d['amount_ngn'] * 100) : (int) ($d['amount_kobo'] ?? 0);
            if ($kobo <= 0) return $this->json($res, ['success' => false, 'message' => 'amount must be greater than 0'], 422);
            return $this->json($res, ['success' => true, 'data' => $this->svc->recordDeposit($args['id'], $kobo)->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function calendar(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        $from = $p['from'] ?? date('Y-m-01');
        $to   = $p['to']   ?? date('Y-m-t');
        $events = $this->svc->getCalendar($this->tid($req), $p['property_id'] ?? '', $from, $to);
        return $this->json($res, ['success' => true, 'data' => array_map(fn($e) => $e->toArray(), $events)]);
    }
}
