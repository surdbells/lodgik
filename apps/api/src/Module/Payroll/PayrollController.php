<?php

declare(strict_types=1);

namespace Lodgik\Module\Payroll;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class PayrollController
{
    public function __construct(private readonly PayrollService $service) {}

    public function listPeriods(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        if (empty($q['property_id'])) return JsonResponse::error($res, 'property_id required', 422);
        $periods = $this->service->listPeriods($q['property_id'], isset($q['year']) ? (int)$q['year'] : null);
        return JsonResponse::ok($res, array_map(fn($p) => $p->toArray(), $periods));
    }

    public function getPeriod(Request $req, Response $res, array $args): Response
    {
        $period = $this->service->getPeriod($args['id']);
        if (!$period) return JsonResponse::error($res, 'Not found', 404);
        $items = $this->service->getPayslips($period->getId());
        return JsonResponse::ok($res, ['period' => $period->toArray(), 'items' => array_map(fn($i) => $i->toArray(), $items)]);
    }

    public function createPeriod(Request $req, Response $res): Response
    {
        $d = (array)$req->getParsedBody();
        foreach (['property_id', 'year', 'month'] as $f) { if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422); }
        try {
            $period = $this->service->createPeriod($d['property_id'], (int)$d['year'], (int)$d['month'], $req->getAttribute('auth.tenant_id'));
            return JsonResponse::ok($res, $period->toArray(), 'Payroll period created');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function calculate(Request $req, Response $res, array $args): Response
    {
        try {
            $period = $this->service->calculate($args['id']);
            return JsonResponse::ok($res, $period->toArray(), 'Payroll calculated');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function review(Request $req, Response $res, array $args): Response
    {
        try {
            return JsonResponse::ok($res, $this->service->review($args['id'])->toArray(), 'Payroll marked as reviewed');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function approve(Request $req, Response $res, array $args): Response
    {
        try {
            return JsonResponse::ok($res, $this->service->approve($args['id'], $req->getAttribute('auth.user_id'))->toArray(), 'Payroll approved');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function markPaid(Request $req, Response $res, array $args): Response
    {
        try {
            return JsonResponse::ok($res, $this->service->markPaid($args['id'])->toArray(), 'Payroll marked as paid');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function getPayslip(Request $req, Response $res, array $args): Response
    {
        $item = $this->service->getPayslip($args['id']);
        if (!$item) return JsonResponse::error($res, 'Not found', 404);
        return JsonResponse::ok($res, $item->toArray());
    }

    public function payslipPdf(Request $req, Response $res, array $args): Response
    {
        $item = $this->service->getPayslip($args['id']);
        if (!$item) return JsonResponse::error($res, 'Not found', 404);
        $period = $this->service->getPeriod($item->getPayrollPeriodId());
        $hotelName = $req->getQueryParams()['hotel_name'] ?? 'Hotel';
        $html = $this->service->generatePayslipHtml($item, $period, $hotelName);
        $res->getBody()->write($html);
        return $res->withHeader('Content-Type', 'text/html');
    }

    public function emailPayslip(Request $req, Response $res, array $args): Response
    {
        $hotelName = ((array)$req->getParsedBody())['hotel_name'] ?? 'Hotel';
        try {
            $this->service->emailPayslip($args['id'], $hotelName);
            return JsonResponse::ok($res, null, 'Payslip emailed');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    public function taxBrackets(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, array_map(fn($b) => $b->toArray(), $this->service->getTaxBrackets()));
    }
    /** GET /api/payroll/{id}/payslips */
    public function listPayslips(Request $req, Response $res, array $args): Response
    {
        $period = $this->service->getPeriod($args['id']);
        if ($period === null) {
            return JsonResponse::error($res, 'Payroll period not found', 404);
        }
        $items = $this->service->getPayslips($period->getId());
        return JsonResponse::ok($res, array_map(fn($i) => $i->toArray(), $items));
    }


}