<?php
declare(strict_types=1);
namespace Lodgik\Module\Ota;
use Psr\Http\Message\ResponseInterface as Response; use Psr\Http\Message\ServerRequestInterface as Request;

final class OtaController
{
    public function __construct(private readonly OtaService $svc) {}
    private function json(Response $r, mixed $d, int $s = 200): Response { $r->getBody()->write(json_encode($d)); return $r->withHeader('Content-Type', 'application/json')->withStatus($s); }
    private function body(Request $req): array { return (array)$req->getParsedBody(); }

    public function listChannels(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->listChannels($req->getQueryParams()['property_id'] ?? '')]); }
    public function createChannel(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->createChannel($d['property_id'], $d['channel_name'], $d['display_name'], $req->getAttribute('auth.tenant_id'), $d)->toArray()], 201); }
    public function updateChannel(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->updateChannel($args['id'], $d)->toArray()]); }
    public function activateChannel(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->activateChannel($args['id'])->toArray()]); }
    public function pauseChannel(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->pauseChannel($args['id'])->toArray()]); }
    public function disconnectChannel(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->disconnectChannel($args['id'])->toArray()]); }
    public function syncChannel(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->syncChannel($args['id'])->toArray()]); }

    public function listReservations(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listReservations($req->getAttribute('auth.tenant_id'), $p['channel_id'] ?? null, $p['status'] ?? null)]); }
    public function ingestReservation(Request $req, Response $res): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->ingestReservation($d['channel_id'], $d['channel_name'], $d['external_id'], $d['guest_name'], $d['check_in'], $d['check_out'], $d['amount'], $req->getAttribute('auth.tenant_id'), $d['raw_data'] ?? null, $d['commission'] ?? null)->toArray()], 201); }
    public function confirmReservation(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->confirmReservation($args['id'], $d['booking_id'] ?? null)->toArray()]); }
    public function cancelReservation(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->cancelReservation($args['id'])->toArray()]); }
    public function channelRevenue(Request $req, Response $res): Response {
        $p    = $req->getQueryParams();
        $rows = $this->svc->getRevenueByChannel(
            $req->getAttribute('auth.tenant_id'),
            $p['from'] ?? date('Y-01-01'),
            $p['to']   ?? date('Y-m-d'),
        );
        $totalRevenue  = array_sum(array_column($rows, 'revenue'));
        $totalBookings = array_sum(array_column($rows, 'bookings'));
        return $this->json($res, ['success' => true, 'data' => [
            'total_revenue'  => (float) $totalRevenue,
            'total_bookings' => (int)   $totalBookings,
            'by_channel'     => array_map(fn($r) => [
                'channel_name' => $r['channelName'] ?? $r['channel_name'] ?? '',
                'revenue'      => (float) ($r['revenue']    ?? 0),
                'bookings'     => (int)   ($r['bookings']   ?? 0),
                'commission'   => (float) ($r['commission'] ?? 0),
            ], $rows),
        ]]);
    }
}
