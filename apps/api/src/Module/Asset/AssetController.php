<?php
declare(strict_types=1);
namespace Lodgik\Module\Asset;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AssetController
{
    public function __construct(private readonly AssetService $svc) {}
    private function json(Response $r, mixed $d, int $s = 200): Response { $r->getBody()->write(json_encode($d)); return $r->withHeader('Content-Type', 'application/json')->withStatus($s); }
    private function body(Request $req): array { return (array)$req->getParsedBody(); }

    // Categories
    public function listCategories(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->listCategories($req->getAttribute('auth.tenant_id'))]); }
    public function createCategory(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createCategory($d['name'], $req->getAttribute('auth.tenant_id'), $d['parent_id'] ?? null, $d['icon'] ?? null, $d['description'] ?? null)->toArray()], 201); }

    // Assets
    public function listAssets(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listAssets($p['property_id'] ?? '', $p['status'] ?? null, $p['category_id'] ?? null, $p['search'] ?? null)]); }
    public function getAsset(Request $req, Response $res, array $args): Response { $a = $this->svc->getAsset($args['id']); return $a ? $this->json($res, ['success' => true, 'data' => $a->toArray()]) : $this->json($res, ['success' => false, 'error' => 'Not found'], 404); }
    public function getByQr(Request $req, Response $res): Response { $a = $this->svc->getByQrCode($req->getQueryParams()['qr'] ?? ''); return $a ? $this->json($res, ['success' => true, 'data' => $a->toArray()]) : $this->json($res, ['success' => false, 'error' => 'Not found'], 404); }
    public function createAsset(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createAsset($d['property_id'], $d['category_id'], $d['category_name'], $d['name'], $req->getAttribute('auth.tenant_id'), $d)->toArray()], 201); }
    public function updateAsset(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->updateAsset($args['id'], $this->body($req))->toArray()]); }
    public function statusCounts(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->getAssetStatusCounts($req->getQueryParams()['property_id'] ?? '')]); }

    // Engineers
    public function listEngineers(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listEngineers($p['property_id'] ?? '', isset($p['active']) ? $p['active'] === 'true' : null)]); }
    public function createEngineer(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createEngineer($d['property_id'], $d['name'], $d['engineer_type'], $d['specialization'], $d['phone'], $req->getAttribute('auth.tenant_id'), $d)->toArray()], 201); }
    public function updateEngineer(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->updateEngineer($args['id'], $this->body($req))->toArray()]); }

    // Incidents
    public function listIncidents(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listIncidents($p['property_id'] ?? '', $p['status'] ?? null, $p['asset_id'] ?? null)]); }
    public function reportIncident(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->reportIncident($d['property_id'], $d['asset_id'], $d['asset_name'], $d['incident_type'], $d['priority'] ?? 'medium', $d['description'], $req->getAttribute('auth.user_id'), $d['reporter_name'] ?? 'Staff', $req->getAttribute('auth.tenant_id'), $d)->toArray()], 201); }
    public function assignIncident(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->assignIncident($args['id'], $d['engineer_id'], $d['engineer_name'], $d['backup_id'] ?? null)->toArray()]); }
    public function startIncident(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->startIncidentProgress($args['id'])->toArray()]); }
    public function resolveIncident(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->resolveIncident($args['id'], $d['notes'] ?? null, isset($d['downtime']) ? (int)$d['downtime'] : null, $d['cost'] ?? null)->toArray()]); }
    public function closeIncident(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->closeIncident($args['id'])->toArray()]); }
    public function escalateIncident(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->escalateIncident($args['id'])->toArray()]); }
    public function incidentStats(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->getIncidentStats($req->getQueryParams()['property_id'] ?? '')]); }

    // Preventive Maintenance
    public function listPM(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listPM($p['property_id'] ?? '', $p['status'] ?? null)]); }
    public function createPM(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createPM($d['property_id'], $d['asset_id'], $d['asset_name'], $d['schedule_type'], $d['next_due'], $req->getAttribute('auth.tenant_id'), $d)->toArray()], 201); }
    public function completePM(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->completePM($args['id'])->toArray()]); }
    public function overduePM(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->getOverduePM($req->getQueryParams()['property_id'] ?? '')]); }

    // Maintenance Logs
    public function listLogs(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listLogs($p['property_id'] ?? '', $p['asset_id'] ?? null)]); }
    public function createLog(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createLog($d['property_id'], $d['asset_id'], $d['engineer_id'], $d['engineer_name'], $d['action_taken'], $d['log_date'] ?? date('Y-m-d'), $req->getAttribute('auth.tenant_id'), $d)->toArray()], 201); }

    // Reports
    public function costReport(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getCostReport($p['property_id'] ?? '', $p['from'] ?? date('Y-01-01'), $p['to'] ?? date('Y-m-d'))]); }
}
