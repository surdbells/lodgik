<?php
declare(strict_types=1);
namespace Lodgik\Module\Merchant;

use Lodgik\Enum\CommissionScope;
use Lodgik\Helper\JsonResponse;
use Psr\Http\Message\{ResponseInterface as Response, ServerRequestInterface as Request};

final class MerchantController
{
    public function __construct(private readonly MerchantService $service) {}

    private function resolveMerchantId(Request $req): string
    {
        // Try direct merchant_id attribute first, then resolve from user_id
        $mid = $req->getAttribute('auth.merchant_id');
        if ($mid) return $mid;
        $userId = $req->getAttribute('auth.user_id');
        if ($userId) {
            $m = $this->service->getMerchantByUserId($userId);
            if ($m) return $m->getId();
        }
        throw new \RuntimeException('Merchant context not found');
    }

    // ─── Registration & Lifecycle ──────────────────────────────

    public function register(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $body['user_id'] = $req->getAttribute('user_id');
        $merchant = $this->service->registerMerchant($body);
        return JsonResponse::created($res, $merchant->toArray());
    }

    /** Admin-initiated merchant onboarding */
    public function adminRegister(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $required = ['legal_name', 'business_name', 'email'];
        foreach ($required as $f) {
            if (empty($body[$f])) {
                return JsonResponse::validationError($res, [$f => "$f is required"]);
            }
        }
        $body['user_id'] = $body['user_id'] ?? $req->getAttribute('auth.user_id');
        $merchant = $this->service->registerMerchant($body);
        return JsonResponse::created($res, $merchant->toArray());
    }

    public function list(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $data = $this->service->listMerchants($q['status'] ?? null, $q['search'] ?? null, (int) ($q['limit'] ?? 50), (int) ($q['offset'] ?? 0));
        return JsonResponse::ok($res, $data);
    }

    public function show(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->getMerchantProfile($args['id']));
    }

    public function approve(Request $req, Response $res, array $args): Response
    {
        $m = $this->service->approveMerchant($args['id']);
        return JsonResponse::ok($res, $m->toArray());
    }

    public function suspend(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $m = $this->service->suspendMerchant($args['id'], $body['reason'] ?? 'No reason provided');
        return JsonResponse::ok($res, $m->toArray());
    }

    public function terminate(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $m = $this->service->terminateMerchant($args['id'], $body['reason'] ?? 'No reason provided');
        return JsonResponse::ok($res, $m->toArray());
    }

    public function dashboard(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        return JsonResponse::ok($res, $this->service->getMerchantDashboard($merchantId));
    }

    public function profile(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        return JsonResponse::ok($res, $this->service->getMerchantProfile($merchantId));
    }

    // ─── Merchant Portal wrappers (resolve merchant from user) ──

    public function submitOwnKyc(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $merchantId = $this->resolveMerchantId($req);
        $kyc = $this->service->submitKyc($merchantId, $body);
        return JsonResponse::ok($res, $kyc->toArray());
    }

    public function ownKycStatus(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        $kyc = $this->service->getKycStatus($merchantId);
        return JsonResponse::ok($res, $kyc?->toArray() ?? ['status' => 'not_submitted']);
    }

    public function addOwnBank(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $merchantId = $this->resolveMerchantId($req);
        $bank = $this->service->addBankAccount($merchantId, $body);
        return JsonResponse::created($res, $bank->toArray());
    }

    // ─── KYC ───────────────────────────────────────────────────

    public function submitKyc(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $kyc = $this->service->submitKyc($args['id'], $body);
        return JsonResponse::ok($res, $kyc->toArray());
    }

    public function reviewKyc(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $kyc = $this->service->reviewKyc($args['id'], $body['status'], $body['reason'] ?? null, $req->getAttribute('user_id'));
        return JsonResponse::ok($res, $kyc->toArray());
    }

    public function kycStatus(Request $req, Response $res, array $args): Response
    {
        $kyc = $this->service->getKycStatus($args['id']);
        return JsonResponse::ok($res, $kyc?->toArray() ?? ['status' => 'not_submitted']);
    }

    public function pendingKyc(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, $this->service->listPendingKyc());
    }

    // ─── Bank Account ──────────────────────────────────────────

    public function addBank(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $bank = $this->service->addBankAccount($args['id'], $body);
        return JsonResponse::created($res, $bank->toArray());
    }

    public function updateBank(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $bank = $this->service->updateBankAccount($args['bank_id'], $body);
        return JsonResponse::ok($res, $bank->toArray());
    }

    public function approveBank(Request $req, Response $res, array $args): Response
    {
        $bank = $this->service->approveBankAccount($args['bank_id'], $req->getAttribute('user_id'));
        return JsonResponse::ok($res, $bank->toArray());
    }

    public function freezeBank(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $bank = $this->service->freezeBankAccount($args['bank_id'], $body['reason'] ?? '');
        return JsonResponse::ok($res, $bank->toArray());
    }

    // ─── Hotels ────────────────────────────────────────────────

    public function registerHotel(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $merchantId = $this->resolveMerchantId($req);
        $hotel = $this->service->registerHotel($merchantId, $body);
        return JsonResponse::created($res, $hotel->toArray());
    }

    public function listHotels(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, $this->service->listMerchantHotels($merchantId, $q['status'] ?? null));
    }

    public function hotelDetail(Request $req, Response $res, array $args): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        return JsonResponse::ok($res, $this->service->getHotelDetail($merchantId, $args['id']));
    }

    public function updateHotelStatus(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $h = $this->service->updateHotelOnboarding($args['id'], $body['status'], $body['tenant_id'] ?? null, $body['property_id'] ?? null);
        return JsonResponse::ok($res, $h->toArray());
    }

    // ─── Commissions ───────────────────────────────────────────

    public function listCommissions(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $merchantId = $this->resolveMerchantId($req) ?? ($q['merchant_id'] ?? null);
        if ($merchantId) {
            return JsonResponse::ok($res, $this->service->listCommissions($merchantId, $q['status'] ?? null, $q['hotel_id'] ?? null));
        }
        return JsonResponse::ok($res, $this->service->listAllCommissions($q['status'] ?? null));
    }

    public function earnings(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        return JsonResponse::ok($res, $this->service->getMerchantEarnings($merchantId));
    }

    public function approveCommission(Request $req, Response $res, array $args): Response
    {
        $c = $this->service->approveCommission($args['id']);
        return JsonResponse::ok($res, $c->toArray());
    }

    public function reverseCommission(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $c = $this->service->reverseCommission($args['id'], $body['reason'] ?? 'No reason');
        return JsonResponse::ok($res, $c->toArray());
    }

    public function calculateCommission(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $c = $this->service->calculateCommission(
            $body['merchant_id'], $body['hotel_id'], $body['tenant_id'],
            CommissionScope::from($body['scope']), $body['subscription_amount'],
            $body['subscription_id'] ?? null, $body['plan_name'] ?? null, $body['billing_cycle'] ?? null
        );
        return JsonResponse::created($res, $c->toArray());
    }

    // ─── Payouts ───────────────────────────────────────────────

    public function listPayouts(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        // Admin users won't have a merchant context
        $merchantId = $req->getAttribute('auth.merchant_id');
        if (!$merchantId) {
            $userId = $req->getAttribute('auth.user_id');
            if ($userId) {
                $m = $this->service->getMerchantByUserId($userId);
                if ($m) $merchantId = $m->getId();
            }
        }
        if ($merchantId) {
            return JsonResponse::ok($res, $this->service->listPayouts($merchantId));
        }
        // Admin: return all payouts
        return JsonResponse::ok($res, $this->service->listAllPayouts($q['status'] ?? null));
    }

    public function generatePayout(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $p = $this->service->generatePayout($body['merchant_id'], $body['period_start'], $body['period_end']);
        return JsonResponse::created($res, $p->toArray());
    }

    public function processPayout(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $p = $this->service->processPayout($args['id'], $body['payment_reference']);
        return JsonResponse::ok($res, $p->toArray());
    }

    // ─── Commission Tiers ──────────────────────────────────────

    public function listTiers(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, $this->service->listTiers());
    }

    public function createTier(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $t = $this->service->createTier($body);
        return JsonResponse::created($res, $t->toArray());
    }

    public function updateTier(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $t = $this->service->updateTier($args['id'], $body);
        return JsonResponse::ok($res, $t->toArray());
    }

    // ─── Resources ─────────────────────────────────────────────

    public function listResources(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, $this->service->listResources($q['visibility'] ?? null, $q['category'] ?? null));
    }

    public function createResource(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $r = $this->service->createResource($body, $req->getAttribute('user_id'));
        return JsonResponse::created($res, $r->toArray());
    }

    public function downloadResource(Request $req, Response $res, array $args): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        $r = $this->service->getResource($args['id']);
        $this->service->downloadResource($args['id'], $merchantId, $req->getServerParams()['REMOTE_ADDR'] ?? null, $req->getHeaderLine('User-Agent') ?: null);
        return JsonResponse::ok($res, ['file_url' => $r->getFileUrl(), 'title' => $r->getTitle()]);
    }

    public function archiveResource(Request $req, Response $res, array $args): Response
    {
        $r = $this->service->archiveResource($args['id']);
        return JsonResponse::ok($res, $r->toArray());
    }

    public function resourceAnalytics(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->getResourceAnalytics($args['id']));
    }

    // ─── Support ───────────────────────────────────────────────

    public function listTickets(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, $this->service->listTickets($merchantId, $q['status'] ?? null));
    }

    public function createTicket(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $merchantId = $this->resolveMerchantId($req);
        $t = $this->service->createTicket($merchantId, $body);
        return JsonResponse::created($res, $t->toArray());
    }

    public function updateTicket(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $t = $this->service->updateTicketStatus($args['id'], $body['status'], $body['notes'] ?? null);
        return JsonResponse::ok($res, $t->toArray());
    }

    public function assignTicket(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $t = $this->service->assignTicket($args['id'], $body['staff_id']);
        return JsonResponse::ok($res, $t->toArray());
    }

    // ─── Leads ─────────────────────────────────────────────────

    public function listLeads(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, $this->service->listLeads($merchantId, $q['status'] ?? null));
    }

    public function createLead(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $merchantId = $this->resolveMerchantId($req);
        $l = $this->service->createLead($merchantId, $body);
        return JsonResponse::created($res, $l->toArray());
    }

    public function updateLead(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $l = $this->service->updateLead($args['id'], $body['status'], $body['notes'] ?? null);
        return JsonResponse::ok($res, $l->toArray());
    }

    public function convertLead(Request $req, Response $res, array $args): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $hotel = $this->service->convertLead($args['id'], $body);
        return JsonResponse::created($res, $hotel->toArray());
    }

    // ─── Notifications ─────────────────────────────────────────

    public function listNotifications(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        $unread = ($req->getQueryParams()['unread'] ?? '') === '1';
        return JsonResponse::ok($res, $this->service->listNotifications($merchantId, $unread));
    }

    public function markRead(Request $req, Response $res, array $args): Response
    {
        $this->service->markNotificationRead($args['id']);
        return JsonResponse::ok($res, ['read' => true]);
    }

    public function markAllRead(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        $count = $this->service->markAllNotificationsRead($merchantId);
        return JsonResponse::ok($res, ['marked' => $count]);
    }

    // ─── Statements ────────────────────────────────────────────

    public function listStatements(Request $req, Response $res): Response
    {
        $merchantId = $this->resolveMerchantId($req);
        return JsonResponse::ok($res, $this->service->listStatements($merchantId));
    }

    public function generateStatement(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $merchantId = $this->resolveMerchantId($req) ?? $body['merchant_id'];
        $s = $this->service->generateStatement($merchantId, $body['period_start'], $body['period_end']);
        return JsonResponse::created($res, $s->toArray());
    }

    // ─── Audit Log ─────────────────────────────────────────────

    public function auditLog(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->getAuditLog($args['id']));
    }
}
