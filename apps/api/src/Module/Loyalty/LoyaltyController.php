<?php
declare(strict_types=1);
namespace Lodgik\Module\Loyalty;
use Psr\Http\Message\ResponseInterface as Response; use Psr\Http\Message\ServerRequestInterface as Request;

final class LoyaltyController
{
    public function __construct(private readonly LoyaltyService $svc) {}
    private function json(Response $r, mixed $d, int $s = 200): Response { $r->getBody()->write(json_encode($d)); return $r->withHeader('Content-Type', 'application/json')->withStatus($s); }
    private function body(Request $req): array { return (array)$req->getParsedBody(); }

    public function listTiers(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->listTiers($req->getAttribute('auth.tenant_id'))]); }
    public function createTier(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createTier($d['name'], (int)$d['min_points'], $d['discount_percentage'], $req->getAttribute('auth.tenant_id'), $d)->toArray()], 201); }
    public function updateTier(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->updateTier($args['id'], $this->body($req))->toArray()]); }

    public function getGuestPoints(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => ['points' => $this->svc->getGuestPoints($args['guestId'], $req->getAttribute('auth.tenant_id'))]]); }
    public function getGuestTier(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->getGuestTier($args['guestId'], $req->getAttribute('auth.tenant_id'))]); }
    public function earnPoints(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->earnPoints($d['guest_id'], $d['property_id'], (int)$d['points'], $d['source'], $req->getAttribute('auth.tenant_id'), $d['reference_id'] ?? null, $d['notes'] ?? null)->toArray()], 201); }
    public function redeemPoints(Request $req, Response $res): Response { $d = $this->body($req); try { return $this->json($res, ['success' => true, 'data' => $this->svc->redeemPoints($d['guest_id'], $d['property_id'], (int)$d['points'], $req->getAttribute('auth.tenant_id'), $d['reference_id'] ?? null, $d['notes'] ?? null)->toArray()]); } catch (\RuntimeException $e) { return $this->json($res, ['success' => false, 'error' => $e->getMessage()], 400); } }
    public function pointsHistory(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->getPointsHistory($args['guestId'], $req->getAttribute('auth.tenant_id'))]); }

    public function listPromotions(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listPromotions($p['property_id'] ?? '', isset($p['active']) ? $p['active'] === 'true' : null)]); }
    public function createPromotion(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createPromotion($d['property_id'], $d['code'], $d['name'], $d['type'], $d['value'], $d['start_date'], $d['end_date'], $req->getAttribute('auth.tenant_id'), $d)->toArray()], 201); }
    public function validatePromo(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, $this->svc->validatePromoCode($d['code'], $d['property_id'], $d['amount'] ?? null)); }
    public function applyPromo(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->applyPromotion($args['id'])->toArray()]); }

    public function getPreferences(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->getPreferences($args['guestId'], $req->getAttribute('auth.tenant_id'))]); }
    public function setPreferences(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->setPreferences($args['guestId'], $req->getAttribute('auth.tenant_id'), $this->body($req))->toArray()]); }
}
