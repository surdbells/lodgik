<?php

declare(strict_types=1);

namespace Lodgik\Module\RoomControl;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class RoomControlController
{
    public function __construct(private readonly RoomControlService $service) {}

    public function toggleDnd(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        $r = $this->service->toggleDnd($d['property_id'], $d['booking_id'], $d['guest_id'], $d['room_id'], $d['room_number'], (bool)($d['active'] ?? true), $req->getAttribute('auth.tenant_id'));
        return JsonResponse::ok($res, $r->toArray());
    }

    public function toggleMakeUp(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        $r = $this->service->toggleMakeUpRoom($d['property_id'], $d['booking_id'], $d['guest_id'], $d['room_id'], $d['room_number'], (bool)($d['active'] ?? true), $req->getAttribute('auth.tenant_id'));
        return JsonResponse::ok($res, $r->toArray());
    }

    public function reportMaintenance(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['description'])) return JsonResponse::error($res, 'description required', 422);
        $r = $this->service->reportMaintenance($d['property_id'], $d['booking_id'], $d['guest_id'], $d['room_id'], $d['room_number'], $d['description'], $req->getAttribute('auth.tenant_id'), $d['photo_url'] ?? null);
        return JsonResponse::ok($res, $r->toArray(), 'Maintenance reported');
    }

    public function assignMaintenance(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        return JsonResponse::ok($res, $this->service->assignMaintenance($args['id'], $d['user_id'], $d['user_name'])->toArray());
    }

    public function resolveMaintenance(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        return JsonResponse::ok($res, $this->service->resolveMaintenance($args['id'], $d['staff_notes'] ?? null)->toArray());
    }

    public function getRoomStatus(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, $this->service->getRoomStatus($req->getQueryParams()['booking_id'] ?? ''));
    }

    public function listRequests(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, array_map(fn($r) => $r->toArray(), $this->service->listRequests($q['property_id'] ?? '', $q['type'] ?? null, $q['status'] ?? null)));
    }
}
