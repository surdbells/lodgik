<?php
declare(strict_types=1);
namespace Lodgik\Module\Analytics;
use Psr\Http\Message\ResponseInterface as Response; use Psr\Http\Message\ServerRequestInterface as Request;

final class AnalyticsController
{
    public function __construct(private readonly AnalyticsService $svc) {}
    private function json(Response $r, mixed $d, int $s = 200): Response { $r->getBody()->write(json_encode($d)); return $r->withHeader('Content-Type', 'application/json')->withStatus($s); }

    public function revparTrend(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getRevparTrend($p['property_id'] ?? '', $p['from'] ?? date('Y-01-01'), $p['to'] ?? date('Y-m-d'), $p['group_by'] ?? 'daily')]); }
    public function adrByDay(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getAdrByDayOfWeek($p['property_id'] ?? '', $p['from'] ?? date('Y-01-01'), $p['to'] ?? date('Y-m-d'))]); }
    public function occupancyTrend(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getOccupancyTrend($p['property_id'] ?? '', $p['from'] ?? date('Y-01-01'), $p['to'] ?? date('Y-m-d'))]); }
    public function revenueBreakdown(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getRevenueBreakdown($p['property_id'] ?? '', $p['from'] ?? date('Y-01-01'), $p['to'] ?? date('Y-m-d'))]); }
    public function bookingSources(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getBookingSourceBreakdown($p['property_id'] ?? '', $p['from'] ?? date('Y-01-01'), $p['to'] ?? date('Y-m-d'))]); }
    public function topRooms(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getTopRoomsByRevenue($p['property_id'] ?? '', $p['from'] ?? date('Y-01-01'), $p['to'] ?? date('Y-m-d'))]); }
    public function profitLoss(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getProfitLossSummary($p['property_id'] ?? '', $p['from'] ?? date('Y-01-01'), $p['to'] ?? date('Y-m-d'))]); }
    public function guestDemographics(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getGuestDemographics($p['property_id'] ?? '', $p['from'] ?? date('Y-01-01'), $p['to'] ?? date('Y-m-d'))]); }
    public function monthlySummary(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->getMonthlySummary($p['property_id'] ?? '', (int)($p['months'] ?? 12))]); }
}
