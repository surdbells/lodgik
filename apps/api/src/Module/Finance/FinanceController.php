<?php
declare(strict_types=1);
namespace Lodgik\Module\Finance;
use Lodgik\Service\ZeptoMailService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class FinanceController
{
    public function __construct(
        private readonly FinanceService $svc,
        private readonly ZeptoMailService $mailer,
    ) {}
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

    // Phase 5: Market/walk-in purchase actions
    public function secondApproveExpense(Request $req, Response $res, array $args): Response
    {
        $d = $this->body($req);
        try {
            $e = $this->svc->secondApproveExpense($args['id'], $req->getAttribute('auth.user_id'), $d['approver_name'] ?? 'Admin');
            return $this->json($res, ['success' => true, 'data' => $e->toArray()]);
        } catch (\DomainException $ex) {
            return $this->json($res, ['success' => false, 'message' => $ex->getMessage()], 422);
        }
    }
    public function pendingSecondApproval(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';
        return $this->json($res, ['success' => true, 'data' => $this->svc->listPendingSecondApproval($pid)]);
    }

    // Night Audit
    public function listAudits(Request $req, Response $res): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->listNightAudits($req->getQueryParams()['property_id'] ?? '')]); }
    public function generateAudit(Request $req, Response $res): Response { $d = $this->body($req); $pid = $d['property_id'] ?? $req->getQueryParams()['property_id'] ?? $req->getAttribute('auth.property_id') ?? ''; if (!$pid) return $this->json($res, ['success' => false, 'message' => 'property_id is required'], 422); return $this->json($res, ['success' => true, 'data' => $this->svc->generateNightAudit($pid, $d['date'] ?? date('Y-m-d'), $req->getAttribute('auth.tenant_id'))->toArray()], 201); }
    public function closeAudit(Request $req, Response $res, array $args): Response { $d = $this->body($req); return $this->json($res, ['success' => true, 'data' => $this->svc->closeNightAudit($args['id'], $req->getAttribute('auth.user_id'), $d['closer_name'] ?? '', $d['notes'] ?? null)->toArray()]); }

    // Police Reports
    public function listReports(Request $req, Response $res): Response { $p = $req->getQueryParams(); $pid = $p['property_id'] ?? $req->getAttribute('auth.property_id') ?? ''; return $this->json($res, ['success' => true, 'data' => $this->svc->listPoliceReports($pid, $p['from'] ?? null, $p['to'] ?? null)]); }
    public function createReport(Request $req, Response $res): Response { $d = $this->body($req); $r = $this->svc->createPoliceReport($d['property_id'], $d['booking_id'], $d['guest_id'], $d['guest_name'], $d['arrival_date'], $req->getAttribute('auth.tenant_id'), $d); return $this->json($res, ['success' => true, 'data' => $r->toArray()], 201); }
    public function submitReport(Request $req, Response $res, array $args): Response { $r = $this->svc->submitPoliceReport($args['id']); return $this->json($res, ['success' => true, 'data' => $r->toArray()]); }

    // Performance Reviews
    public function listReviews(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listReviews($p['property_id'] ?? '', $p['employee_id'] ?? null)]); }
    public function createReview(Request $req, Response $res): Response { $d = $this->body($req); $r = $this->svc->createReview($d['property_id'], $d['employee_id'], $d['employee_name'], $req->getAttribute('auth.user_id'), $d['reviewer_name'] ?? '', $d['period'], (int)$d['year'], (int)$d['overall_rating'], $req->getAttribute('auth.tenant_id'), $d); return $this->json($res, ['success' => true, 'data' => $r->toArray()], 201); }
    public function submitReview(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->submitReview($args['id'])->toArray()]); }
    public function acknowledgeReview(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->acknowledgeReview($args['id'])->toArray()]); }

    // Pricing Rules
    public function listPricingRules(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listPricingRules($p['property_id'] ?? '', isset($p['active']) ? $p['active'] === 'true' : null)]); }
    public function createPricingRule(Request $req, Response $res): Response { $d = $this->body($req); $r = $this->svc->createPricingRule($d['property_id'], $d['name'], $d['rule_type'], $d['adjustment_type'], $d['adjustment_value'], $req->getAttribute('auth.tenant_id'), $d); return $this->json($res, ['success' => true, 'data' => $r->toArray()], 201); }
    public function updatePricingRule(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->updatePricingRule($args['id'], $this->body($req))->toArray()]); }
    public function deletePricingRule(Request $req, Response $res, array $args): Response { $this->svc->deletePricingRule($args['id']); return $this->json($res, ['success' => true, 'message' => 'Pricing rule deleted']); }
    public function calculateRate(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->calculateDynamicRate($p['property_id'] ?? '', $p['room_type_id'] ?? null, $p['base_rate'] ?? '0', new \DateTimeImmutable($p['date'] ?? 'today'), isset($p['nights']) ? (int)$p['nights'] : null, isset($p['occupancy']) ? (float)$p['occupancy'] : null)]); }

    // Group Bookings
    public function listGroups(Request $req, Response $res): Response { $p = $req->getQueryParams(); return $this->json($res, ['success' => true, 'data' => $this->svc->listGroupBookings($p['property_id'] ?? '', $p['status'] ?? null)]); }
    public function createGroup(Request $req, Response $res): Response { $d = $this->body($req); $pid = $d['property_id'] ?? $req->getQueryParams()['property_id'] ?? $req->getAttribute('auth.property_id') ?? null; if (!$pid) return $this->json($res, ['success' => false, 'message' => 'property_id is required'], 422); $g = $this->svc->createGroupBooking($pid, $d['name'] ?? '', $d['booking_type'] ?? 'overnight', $d['contact_name'] ?? '', $d['check_in'] ?? '', $d['check_out'] ?? '', $req->getAttribute('auth.tenant_id'), $d); return $this->json($res, ['success' => true, 'data' => $g->toArray()], 201); }
    public function confirmGroup(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->confirmGroupBooking($args['id'])->toArray()]); }
    public function cancelGroup(Request $req, Response $res, array $args): Response { return $this->json($res, ['success' => true, 'data' => $this->svc->cancelGroupBooking($args['id'])->toArray()]); }

    // Phase 3: Corporate Folio endpoints
    public function getGroupCorporateSummary(Request $req, Response $res, array $args): Response
    {
        return $this->json($res, ['success' => true, 'data' => $this->svc->getCorporateSummary($args['id'])]);
    }
    public function setCorporateSettings(Request $req, Response $res, array $args): Response
    {
        $d = $this->body($req);
        $g = $this->svc->updateCorporateSettings(
            $args['id'],
            $req->getAttribute('auth.tenant_id'),
            isset($d['is_corporate']) ? (bool)$d['is_corporate'] : null,
            isset($d['credit_limit_type']) ? (string)$d['credit_limit_type'] : null,
            isset($d['credit_limit_ngn']) ? (float)$d['credit_limit_ngn'] : null,
            $d['corporate_contact_email'] ?? null,
            $d['corporate_ref_number'] ?? null,
            isset($d['allow_checkout_without_payment']) ? (bool)$d['allow_checkout_without_payment'] : null,
        );
        return $this->json($res, ['success' => true, 'data' => $g->toArray()]);
    }
    public function sendCorporateInvoice(Request $req, Response $res, array $args): Response
    {
        $result = $this->svc->sendCorporateInvoice($args['id'], $req->getAttribute('auth.tenant_id'));
        return $this->json($res, ['success' => true, 'message' => $result]);
    }

    /** POST /api/expenses/{id}/share-receipt */
    public function shareExpenseReceipt(Request $req, Response $res, array $args): Response
    {
        $body  = $this->body($req);
        $email = trim($body['email'] ?? '');
        $name  = trim($body['name'] ?? 'Recipient');

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json($res, ['success' => false, 'message' => 'A valid email address is required'], 422);
        }

        $expense = $this->svc->getExpenseById($args['id']);
        if ($expense === null) {
            return $this->json($res, ['success' => false, 'message' => 'Expense not found'], 404);
        }

        $data = $expense->toArray();
        $receiptUrl     = $data['receipt_url'] ?? null;
        $signedNoteUrl  = $data['signed_note_url'] ?? null;

        if (!$receiptUrl && !$signedNoteUrl) {
            return $this->json($res, ['success' => false, 'message' => 'No receipt attached to this expense'], 422);
        }

        $html = $this->buildExpenseReceiptEmail($name, $data, $receiptUrl, $signedNoteUrl);
        $sent = $this->mailer->send($email, $name, 'Expense Receipt — ' . ($data['category_name'] ?? 'Expense'), $html);

        if (!$sent) {
            return $this->json($res, ['success' => false, 'message' => 'Failed to send email. Please try again.'], 500);
        }

        return $this->json($res, ['success' => true, 'message' => 'Receipt sent to ' . $email]);
    }

    private function buildExpenseReceiptEmail(string $recipientName, array $e, ?string $receiptUrl, ?string $signedNoteUrl): string
    {
        $amount   = '₦' . number_format((float)($e['amount'] ?? 0), 2);
        $category = htmlspecialchars($e['category_name'] ?? '', ENT_QUOTES);
        $desc     = htmlspecialchars($e['description'] ?? '', ENT_QUOTES);
        $date     = $e['expense_date'] ?? '';
        $vendor   = htmlspecialchars($e['vendor'] ?? $e['market_vendor_name'] ?? '', ENT_QUOTES);
        $vendorRow = $vendor ? "<tr><td style='padding:6px 0;color:#6b7280;font-size:13px'>Vendor</td><td style='padding:6px 0;font-size:13px'>{$vendor}</td></tr>" : '';

        $btns = '';
        if ($receiptUrl) {
            $u = htmlspecialchars($receiptUrl, ENT_QUOTES);
            $btns .= "<a href='{$u}' style='display:inline-block;background:#1a3c34;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-right:8px'>View Receipt</a>";
        }
        if ($signedNoteUrl) {
            $u = htmlspecialchars($signedNoteUrl, ENT_QUOTES);
            $btns .= "<a href='{$u}' style='display:inline-block;background:#374151;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600'>View Signed Note</a>";
        }

        return "
        <div style='font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden'>
          <div style='background:#1a3c34;padding:28px 32px'>
            <h1 style='color:#fff;margin:0;font-size:20px;font-weight:700'>Expense Receipt</h1>
            <p style='color:#a7f3d0;margin:4px 0 0;font-size:13px'>{$category}</p>
          </div>
          <div style='padding:28px 32px'>
            <p style='margin:0 0 20px;color:#374151;font-size:14px'>Hi {$recipientName},</p>
            <p style='margin:0 0 24px;color:#6b7280;font-size:14px'>Please find the expense receipt(s) below.</p>
            <table style='width:100%;border-collapse:collapse;margin-bottom:24px'>
              <tr><td style='padding:6px 0;color:#6b7280;font-size:13px'>Amount</td><td style='padding:6px 0;font-size:13px;font-weight:700;color:#1a3c34'>{$amount}</td></tr>
              <tr><td style='padding:6px 0;color:#6b7280;font-size:13px'>Description</td><td style='padding:6px 0;font-size:13px'>{$desc}</td></tr>
              <tr><td style='padding:6px 0;color:#6b7280;font-size:13px'>Date</td><td style='padding:6px 0;font-size:13px'>{$date}</td></tr>
              {$vendorRow}
            </table>
            <div style='display:flex;gap:8px;flex-wrap:wrap'>{$btns}</div>
          </div>
        </div>";
    }
}

