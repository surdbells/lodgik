<?php
declare(strict_types=1);
namespace Lodgik\Module\Corporate;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class CorporateController
{
    public function __construct(private readonly CorporateService $svc) {}

    private function json(Response $r, mixed $d, int $s = 200): Response
    {
        $r->getBody()->write(json_encode($d));
        return $r->withHeader('Content-Type', 'application/json')->withStatus($s);
    }

    private function body(Request $req): array { return (array) $req->getParsedBody(); }

    public function list(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        $active = isset($p['active']) ? ($p['active'] === 'true') : null;
        $data = $this->svc->list(
            $req->getAttribute('auth.tenant_id'),
            $p['property_id'] ?? '',
            $active
        );
        return $this->json($res, ['success' => true, 'data' => $data]);
    }

    public function get(Request $req, Response $res, array $args): Response
    {
        return $this->json($res, ['success' => true, 'data' => $this->svc->find($args['id'])->toArray()]);
    }

    public function create(Request $req, Response $res): Response
    {
        $d = $this->body($req);
        if (empty($d['company_name'])) {
            return $this->json($res, ['success' => false, 'message' => 'company_name is required'], 422);
        }
        if (empty($d['contact_name'])) {
            return $this->json($res, ['success' => false, 'message' => 'contact_name is required'], 422);
        }
        $propertyId = $d['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
        if (!$propertyId) {
            return $this->json($res, ['success' => false, 'message' => 'property_id is required'], 422);
        }
        $profile = $this->svc->create($req->getAttribute('auth.tenant_id'), $propertyId, $d);
        return $this->json($res, ['success' => true, 'data' => $profile->toArray()], 201);
    }

    public function update(Request $req, Response $res, array $args): Response
    {
        try {
            $profile = $this->svc->update($args['id'], $this->body($req));
            return $this->json($res, ['success' => true, 'data' => $profile->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function delete(Request $req, Response $res, array $args): Response
    {
        try {
            $this->svc->delete($args['id']);
            return $this->json($res, ['success' => true, 'message' => 'Corporate profile deleted']);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function toggleActive(Request $req, Response $res, array $args): Response
    {
        try {
            $profile = $this->svc->toggleActive($args['id']);
            return $this->json($res, ['success' => true, 'data' => $profile->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function intelligence(Request $req, Response $res, array $args): Response
    {
        try {
            return $this->json($res, ['success' => true, 'data' => $this->svc->getIntelligence($args['id'])]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }
}
