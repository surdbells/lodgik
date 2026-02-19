<?php

declare(strict_types=1);

namespace Lodgik\Module\ServiceRequest;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class ServiceRequestController
{
    public function __construct(private readonly ServiceRequestService $service) {}

    /** POST /service-requests — Guest creates a request */
    public function create(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'booking_id', 'guest_id', 'category', 'title'] as $f) {
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        }
        $sr = $this->service->create($d['property_id'], $d['booking_id'], $d['guest_id'], $d['category'], $d['title'], $req->getAttribute('auth.tenant_id'), $d['description'] ?? null, $d['room_id'] ?? null, (int)($d['priority'] ?? 2), $d['photo_url'] ?? null);
        return JsonResponse::ok($res, $sr->toArray(), 'Request submitted');
    }

    /** GET /service-requests — List by property (staff view) */
    public function list(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        if (empty($q['property_id'])) return JsonResponse::error($res, 'property_id required', 422);
        $items = $this->service->listByProperty($q['property_id'], $q['status'] ?? null);
        return JsonResponse::ok($res, array_map(fn($i) => $i->toArray(), $items));
    }

    /** GET /service-requests/active — Active requests (staff dashboard) */
    public function listActive(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? '';
        if (empty($pid)) return JsonResponse::error($res, 'property_id required', 422);
        return JsonResponse::ok($res, array_map(fn($i) => $i->toArray(), $this->service->listActive($pid)));
    }

    /** GET /service-requests/summary — Count by status */
    public function summary(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? '';
        if (empty($pid)) return JsonResponse::error($res, 'property_id required', 422);
        return JsonResponse::ok($res, $this->service->summarize($pid));
    }

    /** GET /service-requests/booking/{bookingId} — Requests for a booking (guest view) */
    public function byBooking(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, array_map(fn($i) => $i->toArray(), $this->service->listByBooking($args['bookingId'])));
    }

    /** GET /service-requests/{id} */
    public function get(Request $req, Response $res, array $args): Response
    {
        $sr = $this->service->getById($args['id']);
        return $sr ? JsonResponse::ok($res, $sr->toArray()) : JsonResponse::error($res, 'Not found', 404);
    }

    /** POST /service-requests/{id}/acknowledge */
    public function acknowledge(Request $req, Response $res, array $args): Response
    {
        try {
            $staffId = $req->getAttribute('auth.user_id');
            return JsonResponse::ok($res, $this->service->acknowledge($args['id'], $staffId)->toArray(), 'Acknowledged');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    /** POST /service-requests/{id}/progress */
    public function startProgress(Request $req, Response $res, array $args): Response
    {
        try {
            return JsonResponse::ok($res, $this->service->startProgress($args['id'], $req->getAttribute('auth.user_id'))->toArray(), 'In progress');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    /** POST /service-requests/{id}/complete */
    public function complete(Request $req, Response $res, array $args): Response
    {
        try {
            return JsonResponse::ok($res, $this->service->complete($args['id'], ((array)$req->getParsedBody())['notes'] ?? null)->toArray(), 'Completed');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    /** POST /service-requests/{id}/cancel */
    public function cancel(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->cancel($args['id'])->toArray(), 'Cancelled'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    /** POST /service-requests/{id}/assign */
    public function assign(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['staff_id'])) return JsonResponse::error($res, 'staff_id required', 422);
        try { return JsonResponse::ok($res, $this->service->assign($args['id'], $d['staff_id'])->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    /** POST /service-requests/{id}/rate — Guest rates completed request */
    public function rate(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['rating'])) return JsonResponse::error($res, 'rating required', 422);
        try { return JsonResponse::ok($res, $this->service->rate($args['id'], (int)$d['rating'], $d['feedback'] ?? null)->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }
}
