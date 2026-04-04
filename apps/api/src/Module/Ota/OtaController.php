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

    // ── iCal Feed (public, no auth) ─────────────────────────────────────────

    /**
     * GET /api/ota/feed/{token}.ics
     * Returns an RFC 5545 iCal file for all confirmed bookings on the property
     * linked to the channel identified by {token}.
     * Hotels paste this URL into Booking.com / Expedia extranet.
     */
    public function icalFeed(Request $req, Response $res, array $args): Response
    {
        $token   = pathinfo($args['token'], PATHINFO_FILENAME); // strip .ics extension
        $channel = $this->svc->getChannelByIcalToken($token);

        if (!$channel) {
            $res->getBody()->write('Channel not found');
            return $res->withStatus(404)->withHeader('Content-Type', 'text/plain');
        }

        $hotelName = $req->getQueryParams()['name'] ?? 'Hotel';
        $ical      = $this->svc->generateIcalFeed(
            propertyId: $channel->getPropertyId(),
            tenantId:   $channel->getTenantId(),
            hotelName:  $hotelName,
        );

        $res->getBody()->write($ical);
        return $res
            ->withHeader('Content-Type', 'text/calendar; charset=utf-8')
            ->withHeader('Content-Disposition', 'inline; filename="lodgik-bookings.ics"');
    }

    /**
     * POST /api/ota/webhook/{channelId}
     * Receives inbound reservation notifications from OTA platforms.
     * Validates optional HMAC signature and ingests/updates reservations.
     */
    public function webhook(Request $req, Response $res, array $args): Response
    {
        $payload   = (array) $req->getParsedBody();
        $signature = $req->getHeaderLine('X-OTA-Signature') ?: $req->getHeaderLine('X-Hub-Signature-256');

        try {
            $result = $this->svc->handleWebhook($args['channelId'], $payload, $signature ?: null);
            return $this->json($res, ['success' => true, 'data' => $result]);
        } catch (\InvalidArgumentException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            $code = str_contains($e->getMessage(), 'HMAC') ? 401 : 404;
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $code);
        }
    }

    /**
     * POST /api/ota/channels/{id}/rotate-ical-token (authenticated)
     * Invalidates the current iCal feed URL and issues a new one.
     */
    public function rotateIcalToken(Request $req, Response $res, array $args): Response
    {
        try {
            $channel = $this->svc->rotateIcalToken($args['id']);
            return $this->json($res, ['success' => true, 'data' => $channel->toArray()]);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 404);
        }
    }
}
