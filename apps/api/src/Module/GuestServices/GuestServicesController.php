<?php

declare(strict_types=1);

namespace Lodgik\Module\GuestServices;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class GuestServicesController
{
    public function __construct(private readonly GuestServicesService $service) {}

    // Vouchers
    public function createVoucher(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['booking_id', 'property_id', 'guest_id', 'amenity_type', 'amenity_name', 'valid_date'] as $f)
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        return JsonResponse::ok($res, $this->service->createVoucher($d['booking_id'], $d['property_id'], $d['guest_id'], $d['amenity_type'], $d['amenity_name'], $d['valid_date'], $req->getAttribute('auth.tenant_id'), $d)->toArray(), 'Voucher created');
    }

    public function redeemVoucher(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        try { return JsonResponse::ok($res, $this->service->redeemVoucher($d['code'] ?? '', $d['property_id'] ?? '')->toArray(), 'Redeemed'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 400); }
    }

    public function listVouchers(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, array_map(fn($v) => $v->toArray(), $this->service->listVouchers($req->getQueryParams()['booking_id'] ?? '')));
    }

    // Waitlist
    public function joinWaitlist(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'booking_id', 'guest_id', 'guest_name', 'waitlist_type', 'requested_item'] as $f)
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        return JsonResponse::ok($res, $this->service->joinWaitlist($d['property_id'], $d['booking_id'], $d['guest_id'], $d['guest_name'], $d['waitlist_type'], $d['requested_item'], $req->getAttribute('auth.tenant_id'), $d)->toArray());
    }

    public function listWaitlist(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $items = $q['booking_id'] ?? false ? $this->service->guestWaitlist($q['booking_id']) : $this->service->listWaitlist($q['property_id'] ?? '', $q['status'] ?? null);
        return JsonResponse::ok($res, array_map(fn($w) => $w->toArray(), $items));
    }

    public function notifyWaitlist(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->notifyWaitlist($args['id'])->toArray());
    }

    public function fulfillWaitlist(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->fulfillWaitlist($args['id'])->toArray());
    }

    public function cancelWaitlist(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->cancelWaitlist($args['id'])->toArray());
    }

    // Charge transfers
    public function requestTransfer(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'from_booking_id', 'from_room_number', 'to_booking_id', 'to_room_number', 'requested_by', 'requested_by_name', 'description', 'amount'] as $f)
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        return JsonResponse::ok($res, $this->service->requestTransfer($d['property_id'], $d['from_booking_id'], $d['from_room_number'], $d['to_booking_id'], $d['to_room_number'], $d['requested_by'], $d['requested_by_name'], $d['description'], $d['amount'], $req->getAttribute('auth.tenant_id'), $d['reason'] ?? null)->toArray());
    }

    public function listTransfers(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $items = $q['booking_id'] ?? false ? $this->service->guestTransfers($q['booking_id']) : $this->service->listTransfers($q['property_id'] ?? '', $q['status'] ?? null);
        return JsonResponse::ok($res, array_map(fn($ct) => $ct->toArray(), $items));
    }

    public function approveTransfer(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        return JsonResponse::ok($res, $this->service->approveTransfer($args['id'], $d['user_id'] ?? '', $d['user_name'] ?? '')->toArray());
    }

    public function rejectTransfer(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        return JsonResponse::ok($res, $this->service->rejectTransfer($args['id'], $d['user_id'] ?? '', $d['user_name'] ?? '', $d['reason'] ?? null)->toArray());
    }

    // Booking extensions
    public function checkExtension(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        try { return JsonResponse::ok($res, $this->service->checkExtensionAvailability($q['booking_id'] ?? '', (int)($q['extra_nights'] ?? 1))); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 400); }
    }

    public function requestExtension(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        try { return JsonResponse::ok($res, $this->service->requestExtension($d['booking_id'] ?? '', (int)($d['extra_nights'] ?? 1), $req->getAttribute('auth.tenant_id'), $d['reason'] ?? null)); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 400); }
    }
}
