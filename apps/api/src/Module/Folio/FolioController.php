<?php

declare(strict_types=1);

namespace Lodgik\Module\Folio;

use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Entity\FolioCharge;
use Lodgik\Entity\FolioPayment;
use Lodgik\Service\ZeptoMailService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class FolioController
{
    public function __construct(
        private readonly FolioService $folioService,
        private readonly ResponseHelper $response,
        private readonly ZeptoMailService $mailer,
    ) {}

    /** GET /api/folios */
    public function list(Request $request, Response $response): Response
    {
        $pagination = PaginationHelper::fromRequest($request);
        $filters = PaginationHelper::filtersFromRequest($request, ['property_id', 'status']);
        $result = $this->folioService->getByProperty($filters['property_id'] ?? '', $filters['status'] ?? null, $pagination['page'], $pagination['limit']);
        return $this->response->paginated($response, array_map(fn($f) => $f->toArray(), $result['items']), $result['total'], $pagination['page'], $pagination['limit']);
    }

    /** GET /api/folios/{id} */
    public function detail(Request $request, Response $response, array $args): Response
    {
        $detail = $this->folioService->getDetail($args['id']);
        return $this->response->success($response, $detail);
    }

    /** GET /api/folios/by-booking/{bookingId} */
    public function byBooking(Request $request, Response $response, array $args): Response
    {
        $folio = $this->folioService->getByBooking($args['bookingId']);
        if ($folio === null) return $this->response->error($response, 'No folio found', 404);
        $detail = $this->folioService->getDetail($folio->getId());
        return $this->response->success($response, $detail);
    }

    /** POST /api/folios/{id}/charges */
    public function addCharge(Request $request, Response $response, array $args): Response
    {
        $body = $request->getParsedBody() ?? [];
        $userId = $request->getAttribute('auth.user_id');
        try {
            $charge = $this->folioService->addCharge(
                $args['id'], $body['category'] ?? 'other', $body['description'] ?? '', $body['amount'] ?? '0', (int)($body['quantity'] ?? 1), $userId, $body['notes'] ?? null,
            );
            return $this->response->success($response, $charge->toArray(), 'Charge added', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
    }

    /** POST /api/folios/{id}/payments */
    public function recordPayment(Request $request, Response $response, array $args): Response
    {
        $body = $request->getParsedBody() ?? [];
        $userId = $request->getAttribute('auth.user_id');
        try {
            $payment = $this->folioService->recordPayment(
                $args['id'], $body['payment_method'] ?? 'cash', $body['amount'] ?? '0',
                $body['sender_name'] ?? null, $body['transfer_reference'] ?? null, $body['proof_image_url'] ?? null,
                $userId, $body['notes'] ?? null,
            );
            return $this->response->success($response, $payment->toArray(), 'Payment recorded', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
    }

    /** POST /api/folios/payments/{paymentId}/confirm */
    public function confirmPayment(Request $request, Response $response, array $args): Response
    {
        $userId = $request->getAttribute('auth.user_id');
        try {
            $payment = $this->folioService->confirmPayment($args['paymentId'], $userId);
            return $this->response->success($response, $payment->toArray(), 'Payment confirmed');
        } catch (\InvalidArgumentException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
    }

    /** POST /api/folios/payments/{paymentId}/reject */
    public function rejectPayment(Request $request, Response $response, array $args): Response
    {
        $body = $request->getParsedBody() ?? [];
        $userId = $request->getAttribute('auth.user_id');
        try {
            $payment = $this->folioService->rejectPayment($args['paymentId'], $body['reason'] ?? null, $userId);
            return $this->response->success($response, $payment->toArray(), 'Payment rejected');
        } catch (\InvalidArgumentException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
    }

    /** POST /api/folios/{id}/adjustments */
    public function addAdjustment(Request $request, Response $response, array $args): Response
    {
        $body = $request->getParsedBody() ?? [];
        $userId = $request->getAttribute('auth.user_id');
        try {
            $adj = $this->folioService->addAdjustment(
                $args['id'], $body['type'] ?? 'discount', $body['description'] ?? '', $body['amount'] ?? '0', $userId, $body['reason'] ?? null,
            );
            return $this->response->success($response, $adj->toArray(), 'Adjustment added', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
    }

    /** POST /api/folios/{id}/close */
    public function close(Request $request, Response $response, array $args): Response
    {
        $userId = $request->getAttribute('auth.user_id');
        try {
            $folio = $this->folioService->close($args['id'], $userId);
            return $this->response->success($response, $folio->toArray(), 'Folio closed');
        } catch (\InvalidArgumentException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
    }

    /** POST /api/folios/{id}/void */
    public function void(Request $request, Response $response, array $args): Response
    {
        $userId = $request->getAttribute('auth.user_id');
        try {
            $folio = $this->folioService->voidFolio($args['id'], $userId);
            return $this->response->success($response, $folio->toArray(), 'Folio voided');
        } catch (\InvalidArgumentException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
    }

    /** GET /api/folios/pending-payments */
    public function pendingPayments(Request $request, Response $response): Response
    {
        $filters = PaginationHelper::filtersFromRequest($request, ['property_id']);
        $payments = $this->folioService->getPendingPayments($filters['property_id'] ?? '');
        return $this->response->success($response, array_map(fn(FolioPayment $p) => $p->toArray(), $payments));
    }

    /** POST /api/folios/payments/{paymentId}/share-receipt */
    public function shareReceipt(Request $request, Response $response, array $args): Response
    {
        $body    = $request->getParsedBody() ?? [];
        $email   = trim($body['email'] ?? '');
        $name    = trim($body['name'] ?? 'Valued Guest');

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->response->error($response, 'A valid email address is required', 422);
        }

        try {
            $context = $this->folioService->getPaymentReceiptContext($args['paymentId']);
        } catch (\InvalidArgumentException $e) {
            return $this->response->error($response, $e->getMessage(), 404);
        }

        if (empty($context['receipt_url'])) {
            return $this->response->error($response, 'No receipt attached to this payment', 422);
        }

        $html = $this->buildReceiptEmail($name, $context);
        $sent = $this->mailer->send($email, $name, 'Payment Receipt — ' . $context['folio_number'], $html);

        if (!$sent) {
            return $this->response->error($response, 'Failed to send email. Please try again.', 500);
        }

        return $this->response->success($response, [], 'Receipt sent to ' . $email);
    }

    private function buildReceiptEmail(string $recipientName, array $ctx): string
    {
        $amount   = '₦' . number_format((float)($ctx['amount'] ?? 0), 2);
        $method   = $ctx['payment_method_label'] ?? '';
        $date     = $ctx['payment_date'] ?? '';
        $folio    = $ctx['folio_number'] ?? '';
        $ref      = $ctx['transfer_reference'] ?? '';
        $sender   = $ctx['sender_name'] ?? '';
        $url      = htmlspecialchars($ctx['receipt_url'] ?? '', ENT_QUOTES);
        $refRow   = $ref ? "<tr><td style='padding:6px 0;color:#6b7280;font-size:13px'>Reference</td><td style='padding:6px 0;font-size:13px;font-weight:600'>{$ref}</td></tr>" : '';
        $senderRow = $sender ? "<tr><td style='padding:6px 0;color:#6b7280;font-size:13px'>From</td><td style='padding:6px 0;font-size:13px'>{$sender}</td></tr>" : '';

        return "
        <div style='font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden'>
          <div style='background:#1a3c34;padding:28px 32px'>
            <h1 style='color:#fff;margin:0;font-size:20px;font-weight:700'>Payment Receipt</h1>
            <p style='color:#a7f3d0;margin:4px 0 0;font-size:13px'>Folio #{$folio}</p>
          </div>
          <div style='padding:28px 32px'>
            <p style='margin:0 0 20px;color:#374151;font-size:14px'>Hi {$recipientName},</p>
            <p style='margin:0 0 24px;color:#6b7280;font-size:14px'>Please find your payment receipt below. You can view or download the attached document using the button.</p>
            <table style='width:100%;border-collapse:collapse;margin-bottom:24px'>
              <tr><td style='padding:6px 0;color:#6b7280;font-size:13px'>Amount</td><td style='padding:6px 0;font-size:13px;font-weight:700;color:#1a3c34'>{$amount}</td></tr>
              <tr><td style='padding:6px 0;color:#6b7280;font-size:13px'>Method</td><td style='padding:6px 0;font-size:13px'>{$method}</td></tr>
              <tr><td style='padding:6px 0;color:#6b7280;font-size:13px'>Date</td><td style='padding:6px 0;font-size:13px'>{$date}</td></tr>
              {$senderRow}
              {$refRow}
            </table>
            <a href='{$url}' style='display:inline-block;background:#1a3c34;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600'>View / Download Receipt</a>
            <p style='margin:24px 0 0;color:#9ca3af;font-size:12px'>If the button doesn't work, copy this link: {$url}</p>
          </div>
        </div>";
    }
}
