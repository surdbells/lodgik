<?php

declare(strict_types=1);

namespace Lodgik\Module\Invoice;

use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class InvoiceController
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
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
        if ($invoice === null) return $this->response->error($response, 'No invoice found', 404);
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

    /** GET /api/invoices/tax-config */
    public function taxConfig(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('tenant_id');
        $taxes = $this->invoiceService->getTaxConfig($tenantId);
        return $this->response->success($response, $taxes);
    }
}
