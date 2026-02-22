<?php

declare(strict_types=1);

namespace Lodgik\Module\Gym;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class GymController
{
    public function __construct(private readonly GymService $service) {}

    // ─── Dashboard ──────────────────────────────────────────────

    public function dashboard(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? '';
        if (!$pid) return JsonResponse::error($res, 'property_id required', 422);
        return JsonResponse::ok($res, $this->service->getDashboard($pid));
    }

    // ─── Plans ──────────────────────────────────────────────────

    public function listPlans(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? '';
        $active = ($req->getQueryParams()['active'] ?? '1') === '1';
        return JsonResponse::ok($res, array_map(fn($p) => $p->toArray(), $this->service->listPlans($pid, $active)));
    }

    public function createPlan(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'name', 'duration_days', 'price'] as $f) {
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        }
        $p = $this->service->createPlan($d['property_id'], $d['name'], (int)$d['duration_days'], (string)$d['price'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $p->toArray(), 'Plan created', 201);
    }

    public function updatePlan(Request $req, Response $res, array $args): Response
    {
        try {
            $p = $this->service->updatePlan($args['id'], (array) $req->getParsedBody());
            return JsonResponse::ok($res, $p->toArray(), 'Plan updated');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    // ─── Members ────────────────────────────────────────────────

    public function listMembers(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $members = $this->service->listMembers($q['property_id'] ?? '', $q['search'] ?? null, ($q['active'] ?? '1') === '1');
        return JsonResponse::ok($res, array_map(fn($m) => $m->toArray(), $members));
    }

    public function getMember(Request $req, Response $res, array $args): Response
    {
        $m = $this->service->getMember($args['id']);
        if (!$m) return JsonResponse::error($res, 'Not found', 404);
        $data = $m->toArray();
        $ms = $this->service->getActiveMembership($m->getId());
        $data['active_membership'] = $ms?->toArray();
        return JsonResponse::ok($res, $data);
    }

    public function registerMember(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'first_name', 'last_name', 'phone'] as $f) {
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        }
        $m = $this->service->registerMember($d['property_id'], $d['first_name'], $d['last_name'], $d['phone'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $m->toArray(), 'Member registered', 201);
    }

    public function updateMember(Request $req, Response $res, array $args): Response
    {
        try {
            $m = $this->service->updateMember($args['id'], (array) $req->getParsedBody());
            return JsonResponse::ok($res, $m->toArray(), 'Member updated');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    // ─── Memberships ────────────────────────────────────────────

    public function listMemberships(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $list = $this->service->listMemberships($q['property_id'] ?? '', $q['status'] ?? null);
        return JsonResponse::ok($res, array_map(fn($ms) => $ms->toArray(), $list));
    }

    public function createMembership(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['member_id']) || empty($d['plan_id'])) return JsonResponse::error($res, 'member_id and plan_id required', 422);
        try {
            $result = $this->service->createMembership($d['member_id'], $d['plan_id'], $req->getAttribute('auth.tenant_id'), $d['payment_method'] ?? null, $req->getAttribute('auth.user_id'));
            return JsonResponse::ok($res, [
                'membership' => $result['membership']->toArray(),
                'payment' => $result['payment']->toArray(),
            ], 'Membership created', 201);
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function renewMembership(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        try {
            $result = $this->service->renewMembership($args['id'], $d['payment_method'] ?? null, $req->getAttribute('auth.user_id'));
            return JsonResponse::ok($res, [
                'membership' => $result['membership']->toArray(),
                'payment' => $result['payment']->toArray(),
            ], 'Membership renewed');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function suspendMembership(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->suspendMembership($args['id'])->toArray(), 'Suspended'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function cancelMembership(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->cancelMembership($args['id'])->toArray(), 'Cancelled'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function reactivateMembership(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->reactivateMembership($args['id'])->toArray(), 'Reactivated'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function expiringMemberships(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? '';
        $days = (int) ($req->getQueryParams()['days'] ?? 7);
        return JsonResponse::ok($res, array_map(fn($ms) => $ms->toArray(), $this->service->getExpiringMemberships($pid, $days)));
    }

    public function sendExpiryAlerts(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        $count = $this->service->sendExpiryAlerts($d['property_id'] ?? '');
        return JsonResponse::ok($res, ['alerts_sent' => $count], "Sent {$count} alerts");
    }

    // ─── Check-in ───────────────────────────────────────────────

    public function checkIn(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        try {
            if (!empty($d['qr_code'])) {
                $visit = $this->service->checkInByQr($d['qr_code'], $req->getAttribute('auth.tenant_id'), $req->getAttribute('auth.user_id'));
            } elseif (!empty($d['member_id'])) {
                $method = $d['method'] ?? 'name_search';
                $visit = $this->service->checkIn($d['member_id'], $method, $req->getAttribute('auth.tenant_id'), $req->getAttribute('auth.user_id'));
            } else {
                return JsonResponse::error($res, 'qr_code or member_id required', 422);
            }
            $member = $this->service->getMember($visit->getMemberId());
            $data = $visit->toArray();
            $data['member'] = $member?->toArray();
            return JsonResponse::ok($res, $data, 'Checked in');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function checkOut(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->checkOut($args['id'])->toArray(), 'Checked out'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function todayVisits(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? '';
        return JsonResponse::ok($res, array_map(fn($v) => $v->toArray(), $this->service->getTodayVisits($pid)));
    }

    public function visitsPerDay(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, $this->service->getVisitsPerDay($q['property_id'] ?? '', (int)($q['days'] ?? 30)));
    }

    // ─── Payments ───────────────────────────────────────────────

    public function listPayments(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $list = $this->service->listPayments($q['property_id'] ?? '', $q['member_id'] ?? null, (int)($q['limit'] ?? 50));
        return JsonResponse::ok($res, array_map(fn($p) => $p->toArray(), $list));
    }

    public function monthlyRevenue(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, $this->service->getMonthlyRevenue($q['property_id'] ?? '', (int)($q['months'] ?? 12)));
    }

    // ─── Classes ────────────────────────────────────────────────

    public function listClasses(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $list = $this->service->listClasses($q['property_id'] ?? '', $q['from'] ?? null, $q['to'] ?? null);
        return JsonResponse::ok($res, array_map(fn($c) => $c->toArray(), $list));
    }

    public function createClass(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'name', 'scheduled_at'] as $f) {
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        }
        $c = $this->service->createClass($d['property_id'], $d['name'], $d['scheduled_at'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $c->toArray(), 'Class created', 201);
    }

    public function bookClass(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['class_id']) || empty($d['member_id'])) return JsonResponse::error($res, 'class_id and member_id required', 422);
        try {
            $b = $this->service->bookClass($d['class_id'], $d['member_id'], $req->getAttribute('auth.tenant_id'));
            return JsonResponse::ok($res, $b->toArray(), 'Booked', 201);
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function cancelClassBooking(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->cancelClassBooking($args['id'])->toArray(), 'Cancelled'); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function classBookings(Request $req, Response $res, array $args): Response
    {
        $bookings = $this->service->getClassBookings($args['id']);
        return JsonResponse::ok($res, array_map(fn($b) => $b->toArray(), $bookings));
    }

    public function listCheckIns(Request $req, Response $res): Response { return $this->todayVisits($req, $res); }

    public function updateClass(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $cls = $this->service->updateClass($args['id'], $body);
        return JsonResponse::ok($res, $cls->toArray());
    }

    public function enroll(Request $req, Response $res, array $args): Response
    {
        return $this->bookClass($req, $res);
    }

    public function recordPayment(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $body['tenant_id'] = $req->getAttribute('tenant_id');
        $body['property_id'] = $req->getAttribute('property_id');
        $payment = $this->service->recordPayment($body);
        return JsonResponse::created($res, $payment->toArray());
    }
}
