<?php
declare(strict_types=1);
namespace Lodgik\Module\Spa;
use Psr\Http\Message\ResponseInterface as Response; use Psr\Http\Message\ServerRequestInterface as Request;

final class SpaController
{
    public function __construct(private readonly SpaService $svc) {}
    private function json(Response $r, mixed $d, int $s = 200): Response { $r->getBody()->write(json_encode($d)); return $r->withHeader('Content-Type', 'application/json')->withStatus($s); }
    private function body(Request $req): array { return (array)$req->getParsedBody(); }

    public function listServices(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listServices($p['property_id'] ?? '', isset($p['active']) ? $p['active'] === 'true' : null)]); }
    public function createService(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createService($d['property_id'], $d['name'], $d['category'], (int)$d['duration_minutes'], $d['price'], $req->getAttribute('auth.tenant_id'), $d['description'] ?? null)->toArray()], 201); }
    public function updateService(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->updateService($args['id'], $this->body($req))->toArray()]); }

    public function listBookings(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listBookings($p['property_id'] ?? '', $p['date'] ?? null, $p['status'] ?? null)]); }
    public function createBooking(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createBooking($d['property_id'], $d['service_id'], $d['service_name'], $d['guest_id'], $d['guest_name'], $d['date'], $d['start_time'], $d['price'], $req->getAttribute('auth.tenant_id'), $d['therapist_name'] ?? null)->toArray()], 201); }
    public function startBooking(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->startBooking($args['id'])->toArray()]); }
    public function completeBooking(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->completeBooking($args['id'])->toArray()]); }
    public function cancelBooking(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->cancelBooking($args['id'])->toArray()]); }

    public function listPoolAccess(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listPoolAccess($p['property_id'] ?? '', $p['date'] ?? null)]); }
    public function poolCheckIn(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->poolCheckIn($d['property_id'], $d['guest_id'], $d['guest_name'], $d['time'], $req->getAttribute('auth.tenant_id'), $d['area'] ?? 'main_pool')->toArray()], 201); }
    public function poolCheckOut(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->poolCheckOut($args['id'], $d['time'])->toArray()]); }
    public function poolOccupancy(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => ['current_occupancy' => $this->svc->getPoolOccupancy($req->getQueryParams()['property_id'] ?? '')]]); }
}
