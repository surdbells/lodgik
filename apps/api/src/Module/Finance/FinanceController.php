<?php
declare(strict_types=1);
namespace Lodgik\Module\Finance;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class FinanceController
{
    public function __construct(private readonly FinanceService $svc) {}
    private function json(Response $r, mixed $d, int $s = 200): Response { $r->getBody()->write(json_encode($d)); return $r->withHeader('Content-Type', 'application/json')->withStatus($s); }
    private function body(Request $req): array { return (array)$req->getParsedBody(); }

    // Expense categories
    public function listCategories(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->listCategories($req->getAttribute('auth.tenant_id'))]); }
    public function createCategory(Request $req, Response $res): Response { $d = $this->body($req); $c = $this->svc->createCategory($d['name'], $req->getAttribute('auth.tenant_id'), $d['parent_id'] ?? null, $d['description'] ?? null); return $this->json($res, ['success' => true, 'data' => $c->toArray()], 201); }

    // Expenses
    public function listExpenses(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listExpenses($p['property_id'] ?? '', $p['status'] ?? null, $p['from'] ?? null, $p['to'] ?? null)]); }
    public function createExpense(Request $req, Response $res): Response { $d = $this->body($req); $e = $this->svc->createExpense($d['property_id'], $d['category_id'], $d['category_name'], $d['description'], $d['amount'], $d['expense_date'], $req->getAttribute('auth.user_id'), $d['submitted_by_name'] ?? 'Staff', $req->getAttribute('auth.tenant_id'), $d); return $this->json($res, ['success' => true, 'data' => $e->toArray()], 201); }
    public function submitExpense(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->submitExpense($args['id'])->toArray()]); }
    public function approveExpense(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->approveExpense($args['id'], $req->getAttribute('auth.user_id'), $d['approver_name'] ?? 'Manager')->toArray()]); }
    public function rejectExpense(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->rejectExpense($args['id'], $req->getAttribute('auth.user_id'), $d['approver_name'] ?? '', $d['reason'] ?? null)->toArray()]); }
    public function markExpensePaid(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->markExpensePaid($args['id'], $d['payment_method'] ?? 'cash', $d['reference'] ?? null)->toArray()]); }

    // Night Audit
    public function listAudits(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->listNightAudits($req->getQueryParams()['property_id'] ?? '')]); }
    public function generateAudit(Request $req, Response $res): Response { $d = $this->body($req); $pid = $d['property_id'] ?? $req->getQueryParams()['property_id'] ?? $req->getAttribute('auth.property_id') ?? ''; if (!$pid) return $this->json($res, ['success' => false, 'message' => 'property_id is required'], 422); return $this->json($res, ['success' => true, 'data' => $this->svc->generateNightAudit($pid, $d['date'] ?? date('Y-m-d'), $req->getAttribute('auth.tenant_id'))->toArray()], 201); }
    public function closeAudit(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->closeNightAudit($args['id'], $req->getAttribute('auth.user_id'), $d['closer_name'] ?? '', $d['notes'] ?? null)->toArray()]); }

    // Police Reports
    public function listReports(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listPoliceReports($p['property_id'] ?? '', $p['from'] ?? null, $p['to'] ?? null)]); }
    public function createReport(Request $req, Response $res): Response { $d = $this->body($req); $r = $this->svc->createPoliceReport($d['property_id'], $d['booking_id'], $d['guest_id'], $d['guest_name'], $d['arrival_date'], $req->getAttribute('auth.tenant_id'), $d); return $this->json($res, ['success' => true, 'data' => $r->toArray()], 201); }

    // Performance Reviews
    public function listReviews(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listReviews($p['property_id'] ?? '', $p['employee_id'] ?? null)]); }
    public function createReview(Request $req, Response $res): Response { $d = $this->body($req); $r = $this->svc->createReview($d['property_id'], $d['employee_id'], $d['employee_name'], $req->getAttribute('auth.user_id'), $d['reviewer_name'] ?? '', $d['period'], (int)$d['year'], (int)$d['overall_rating'], $req->getAttribute('auth.tenant_id'), $d); return $this->json($res, ['success' => true, 'data' => $r->toArray()], 201); }
    public function submitReview(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->submitReview($args['id'])->toArray()]); }
    public function acknowledgeReview(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->acknowledgeReview($args['id'])->toArray()]); }

    // Pricing Rules
    public function listPricingRules(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listPricingRules($p['property_id'] ?? '', isset($p['active']) ? $p['active'] === 'true' : null)]); }
    public function createPricingRule(Request $req, Response $res): Response { $d = $this->body($req); $r = $this->svc->createPricingRule($d['property_id'], $d['name'], $d['rule_type'], $d['adjustment_type'], $d['adjustment_value'], $req->getAttribute('auth.tenant_id'), $d); return $this->json($res, ['success' => true, 'data' => $r->toArray()], 201); }
    public function updatePricingRule(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->updatePricingRule($args['id'], $this->body($req))->toArray()]); }
    public function calculateRate(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->calculateDynamicRate($p['property_id'] ?? '', $p['room_type_id'] ?? null, $p['base_rate'] ?? '0', new \DateTimeImmutable($p['date'] ?? 'today'), isset($p['nights']) ? (int)$p['nights'] : null, isset($p['occupancy']) ? (float)$p['occupancy'] : null)]); }

    // Group Bookings
    public function listGroups(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listGroupBookings($p['property_id'] ?? '', $p['status'] ?? null)]); }
    public function createGroup(Request $req, Response $res): Response { $d = $this->body($req); $g = $this->svc->createGroupBooking($d['property_id'], $d['name'], $d['booking_type'], $d['contact_name'], $d['check_in'], $d['check_out'], $req->getAttribute('auth.tenant_id'), $d); return $this->json($res, ['success' => true, 'data' => $g->toArray()], 201); }
    public function confirmGroup(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->confirmGroupBooking($args['id'])->toArray()]); }
    public function cancelGroup(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->cancelGroupBooking($args['id'])->toArray()]); }
}
