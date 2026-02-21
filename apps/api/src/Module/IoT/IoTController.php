<?php
declare(strict_types=1);
namespace Lodgik\Module\IoT;
use Psr\Http\Message\ResponseInterface as Response; use Psr\Http\Message\ServerRequestInterface as Request;

final class IoTController
{
    public function __construct(private readonly IoTService $svc) {}
    private function json(Response $r, mixed $d, int $s = 200): Response { $r->getBody()->write(json_encode($d)); return $r->withHeader('Content-Type', 'application/json')->withStatus($s); }
    private function body(Request $req): array { return (array)$req->getParsedBody(); }

    public function listDevices(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listDevices($p['property_id'] ?? '', $p['room_id'] ?? null, $p['type'] ?? null)]); }
    public function registerDevice(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->registerDevice($d['property_id'], $d['device_type'], $d['name'], $req->getAttribute('auth.tenant_id'), $d)->toArray()], 201); }
    public function updateState(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->updateDeviceState($args['id'], $this->body($req)['state'] ?? [])->toArray()]); }
    public function control(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, $this->svc->controlDevice($args['id'], $d['action'], $d['params'] ?? [])); }
    public function roomDevices(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getRoomDevices($p['property_id'] ?? '', $p['room_id'] ?? '')]); }
    public function energyReport(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getEnergyReport($p['property_id'] ?? '', $p['room_id'] ?? null)]); }
    public function statusSummary(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->getDeviceStatusSummary($req->getQueryParams()['property_id'] ?? '')]); }

    public function listAutomations(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listAutomations($p['property_id'] ?? '', isset($p['active']) ? $p['active'] === 'true' : null)]); }
    public function createAutomation(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createAutomation($d['property_id'], $d['name'], $d['trigger_type'], $d['trigger_config'], $d['actions'], $req->getAttribute('auth.tenant_id'))->toArray()], 201); }
    public function toggleAutomation(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->toggleAutomation($args['id'], (bool)$d['active'])->toArray()]); }
    public function triggerEvent(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->triggerEvent($d['property_id'], $d['event_type'], $d['context'] ?? [])]); }
}
