<?php

declare(strict_types=1);

namespace Lodgik\Module\Folio;

use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Entity\FolioCharge;
use Lodgik\Entity\FolioPayment;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class FolioController
{
    public function __construct(
        private readonly FolioService $folioService,
        private readonly ResponseHelper $response,
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
}
