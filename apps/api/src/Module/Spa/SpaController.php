<?php
declare(strict_types=1);
namespace Lodgik\Module\Spa;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class SpaController
{
    public function __construct(private readonly SpaService $svc) {}

    private function pid(Request $req): string
    {
        return $req->getQueryParams()['property_id']
            ?? $req->getAttribute('auth.property_id')
            ?? '';
    }

    // ── Services ──────────────────────────────────────────────────────────

    public function listServices(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        $active = isset($p['active']) ? $p['active'] === 'true' : null;
        return JsonResponse::ok($res, $this->svc->listServices($this->pid($req), $active));
    }

    public function createService(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['name']) || empty($d['category']) || empty($d['price'])) {
            return JsonResponse::error($res, 'name, category, and price are required', 422);
        }
        $svc = $this->svc->createService(
            $this->pid($req), trim($d['name']), $d['category'],
            (int) ($d['duration_minutes'] ?? 60), (string) $d['price'],
            $req->getAttribute('auth.tenant_id'),
            $d['description'] ?? null
        );
        return JsonResponse::created($res, $svc->toArray(), 'Service created');
    }

    public function updateService(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        return JsonResponse::ok($res, $this->svc->updateService($args['id'], $d)->toArray(), 'Service updated');
    }

    // ── Bookings ──────────────────────────────────────────────────────────

    public function listBookings(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        return JsonResponse::ok($res, $this->svc->listBookings($this->pid($req), $p['date'] ?? null, $p['status'] ?? null));
    }

    public function createBooking(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        $required = ['service_id', 'service_name', 'guest_name', 'booking_date', 'start_time', 'price'];
        foreach ($required as $key) {
            if (empty($d[$key])) return JsonResponse::error($res, "$key is required", 422);
        }
        $bk = $this->svc->createBooking(
            $this->pid($req),
            $d['service_id'], $d['service_name'],
            $d['guest_id'] ?? null, $d['guest_name'],
            $d['booking_date'], $d['start_time'],
            (string) $d['price'],
            $req->getAttribute('auth.tenant_id'),
            $d['therapist_name'] ?? null
        );
        return JsonResponse::created($res, $bk->toArray(), 'Booking created');
    }

    public function startBooking(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->svc->startBooking($args['id'])->toArray(), 'Booking started');
    }

    public function completeBooking(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->svc->completeBooking($args['id'])->toArray(), 'Booking completed');
    }

    public function cancelBooking(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->svc->cancelBooking($args['id'])->toArray(), 'Booking cancelled');
    }

    // ── Pool ──────────────────────────────────────────────────────────────

    public function listPoolAccess(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        return JsonResponse::ok($res, $this->svc->listPoolAccess($this->pid($req), $p['date'] ?? null));
    }

    public function poolCheckIn(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['guest_name']) || empty($d['check_in_time'])) {
            return JsonResponse::error($res, 'guest_name and check_in_time are required', 422);
        }
        $log = $this->svc->poolCheckIn(
            $this->pid($req),
            $d['guest_id'] ?? null,
            $d['guest_name'],
            $d['check_in_time'],
            $req->getAttribute('auth.tenant_id'),
            $d['area'] ?? 'main_pool'
        );
        return JsonResponse::created($res, $log->toArray(), 'Guest checked in to pool');
    }

    public function poolCheckOut(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        $time = $d['check_out_time'] ?? date('H:i');
        return JsonResponse::ok($res, $this->svc->poolCheckOut($args['id'], $time)->toArray(), 'Guest checked out of pool');
    }

    public function poolOccupancy(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, ['current_occupancy' => $this->svc->getPoolOccupancy($this->pid($req))]);
    }
}
