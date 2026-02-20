<?php

declare(strict_types=1);

namespace Lodgik\Module\Security;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class SecurityController
{
    public function __construct(private readonly SecurityService $service) {}

    // Visitor codes
    public function createVisitorCode(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['booking_id', 'property_id', 'guest_id', 'visitor_name', 'valid_from', 'valid_until'] as $f)
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        $code = $this->service->createVisitorCode($d['booking_id'], $d['property_id'], $d['guest_id'], $d['visitor_name'], $d['valid_from'], $d['valid_until'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $code->toArray(), 'Visitor code created');
    }

    public function listVisitorCodes(Request $req, Response $res): Response
    {
        $bid = $req->getQueryParams()['booking_id'] ?? '';
        return JsonResponse::ok($res, array_map(fn($c) => $c->toArray(), $this->service->listVisitorCodes($bid)));
    }

    public function revokeVisitorCode(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->revokeVisitorCode($args['id'])->toArray());
    }

    public function validateVisitorCode(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        $vc = $this->service->validateVisitorCode($d['code'] ?? '', $d['property_id'] ?? '');
        return $vc ? JsonResponse::ok($res, $vc->toArray(), 'Valid') : JsonResponse::error($res, 'Invalid or expired code', 404);
    }

    // Gate passes
    public function createGatePass(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'booking_id', 'pass_type', 'person_name', 'guest_name'] as $f)
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        $gp = $this->service->createGatePass($d['property_id'], $d['booking_id'], $d['pass_type'], $d['person_name'], $d['guest_name'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $gp->toArray(), 'Gate pass created');
    }

    public function listGatePasses(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $passes = $q['booking_id'] ?? false ? $this->service->listGatePassesByBooking($q['booking_id']) : $this->service->listGatePasses($q['property_id'] ?? '', $q['status'] ?? null);
        return JsonResponse::ok($res, array_map(fn($p) => $p->toArray(), $passes));
    }

    public function approveGatePass(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->approveGatePass($args['id'], $req->getAttribute('auth.user_id', 'system'))->toArray());
    }

    public function denyGatePass(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        return JsonResponse::ok($res, $this->service->denyGatePass($args['id'], $req->getAttribute('auth.user_id', 'system'), $d['notes'] ?? null)->toArray());
    }

    public function gatePassCheckIn(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->gatePassCheckIn($args['id'])->toArray());
    }

    public function gatePassCheckOut(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->gatePassCheckOut($args['id'])->toArray());
    }

    // Guest movements
    public function recordMovement(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'booking_id', 'guest_id', 'guest_name', 'direction'] as $f)
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        $m = $this->service->recordMovement($d['property_id'], $d['booking_id'], $d['guest_id'], $d['guest_name'], $d['direction'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $m->toArray());
    }

    public function getMovements(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, array_map(fn($m) => $m->toArray(), $this->service->getMovements($q['property_id'] ?? '', $q['booking_id'] ?? null)));
    }

    public function getOnPremise(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, array_map(fn($m) => $m->toArray(), $this->service->getOnPremise($req->getQueryParams()['property_id'] ?? '')));
    }
}
