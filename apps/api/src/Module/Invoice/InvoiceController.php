<?php

declare(strict_types=1);

namespace Lodgik\Module\Invoice;

use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Repository\FolioRepository;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class InvoiceController
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
        private readonly FolioRepository $folioRepo,
        private readonly ResponseHelper $response,
    ) {}

    /** GET /api/invoices */
    public function list(Request $request, Response $response): Response
    {
        $pagination = PaginationHelper::fromRequest($request);
        $filters = PaginationHelper::filtersFromRequest($request, ['property_id', 'status']);
        $result = $this->invoiceService->getByProperty($filters['property_id'] ?? '', $filters['status'] ?? null, $pagination['page'], $pagination['limit']);
        return $this->response->paginated($response, array_map(fn($i) => $i->toArray(), $result['items']), $result['total'], $pagination['page'], $pagination['limit']);
    }

    /** GET /api/invoices/{id} */
    public function detail(Request $request, Response $response, array $args): Response
    {
        $detail = $this->invoiceService->getDetail($args['id']);
        return $this->response->success($response, $detail);
    }

    /** GET /api/invoices/by-booking/{bookingId} */
    public function byBooking(Request $request, Response $response, array $args): Response
    {
        $invoice = $this->invoiceService->getByBooking($args['bookingId']);
        if ($invoice === null) return $this->response->success($response, null, 'No invoice generated yet');
        $detail = $this->invoiceService->getDetail($invoice->getId());
        return $this->response->success($response, $detail);
    }

    /** GET /api/invoices/{id}/pdf */
    public function pdf(Request $request, Response $response, array $args): Response
    {
        $html = $this->invoiceService->generatePdfHtml($args['id']);
        $response->getBody()->write($html);
        return $response->withHeader('Content-Type', 'text/html; charset=UTF-8');
    }

    /** POST /api/invoices/{id}/email */
    public function email(Request $request, Response $response, array $args): Response
    {
        try {
            $sent = $this->invoiceService->emailInvoice($args['id']);
            return $this->response->success($response, ['sent' => $sent], $sent ? 'Invoice emailed' : 'Failed to send');
        } catch (\InvalidArgumentException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }
    }

    /** POST /api/invoices/{id}/void */
    public function void(Request $request, Response $response, array $args): Response
    {
        $invoice = $this->invoiceService->voidInvoice($args['id']);
        return $this->response->success($response, $invoice->toArray(), 'Invoice voided');
    }

    public function pay(Request $request, Response $response, array $args): Response
    {
        try {
            $body = (array) ($request->getParsedBody() ?? []);
            $invoice = $this->invoiceService->markPaid($args['id'], $body['payment_method'] ?? 'bank_transfer', $body['reference'] ?? null);
            return $this->response->success($response, $invoice->toArray(), 'Invoice marked as paid');
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }


    /**
     * POST /api/invoices
     * Body: { folio_id: string }
     * Generates an invoice from a closed folio.
     * Returns 409 if invoice already exists for that folio.
     */
    public function generate(Request $request, Response $response): Response
    {
        $body     = (array) ($request->getParsedBody() ?? []);
        $folioId  = $body['folio_id'] ?? null;
        $tenantId = $request->getAttribute('auth.tenant_id');

        if (!$folioId) {
            return $this->response->error($response, 'folio_id is required', 400);
        }

        /** @var \Lodgik\Entity\Folio|null $folio */
        $folio = $this->folioRepo->find($folioId);

        if ($folio === null) {
            return $this->response->error($response, 'Folio not found', 404);
        }

        if ($folio->getTenantId() !== $tenantId) {
            return $this->response->error($response, 'Access denied', 403);
        }

        if (!in_array($folio->getStatus(), ['closed', 'settled'], true)) {
            return $this->response->error($response, 'Invoice can only be generated from a closed folio', 422);
        }

        try {
            $invoice = $this->invoiceService->generateFromFolio($folio);
            $detail  = $this->invoiceService->getDetail($invoice->getId());
            return $this->response->success($response, $detail, 'Invoice generated', 201);
        } catch (\RuntimeException $e) {
            // Invoice already exists
            return $this->response->error($response, $e->getMessage(), 409);
        }
    }

    /** GET /api/invoices/tax-config */
    public function taxConfig(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $taxes = $this->invoiceService->getTaxConfig($tenantId);
        return $this->response->success($response, $taxes);
    }
}
