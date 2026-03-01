<?php

declare(strict_types=1);

namespace Lodgik\Module\Procurement;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Helper\JsonResponse;

/**
 * Thin request/response layer for the Procurement module.
 * All business logic lives in ProcurementService.
 *
 * Auth attributes available on every request (set by AuthMiddleware):
 *   auth.tenant_id   string
 *   auth.user_id     string
 *   auth.property_id string|null
 *   auth.role        string
 */
final class ProcurementController
{
    public function __construct(private readonly ProcurementService $service) {}

    // ═══════════════════════════════════════════════════════════════
    // VENDORS
    // ═══════════════════════════════════════════════════════════════

    public function listVendors(Request $req, Response $res): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $q   = $req->getQueryParams();

        $vendors = $this->service->listVendors(
            tenantId:   $tid,
            activeOnly: isset($q['active_only']),
            search:     $q['search'] ?? null,
        );

        return JsonResponse::ok($res, array_map(fn($v) => $v->toArray(), $vendors));
    }

    public function getVendor(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            return JsonResponse::ok($res, $this->service->getVendor($args['id'], $tid)->toArray());
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        }
    }

    public function createVendor(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $vendor = $this->service->createVendor($tid, $d);
            return JsonResponse::created($res, $vendor->toArray(), 'Vendor created');
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function updateVendor(Request $req, Response $res, array $args): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $vendor = $this->service->updateVendor($args['id'], $tid, $d);
            return JsonResponse::ok($res, $vendor->toArray(), 'Vendor updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function deleteVendor(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $this->service->deleteVendor($args['id'], $tid);
            return JsonResponse::ok($res, null, 'Vendor deleted');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    /**
     * GET /api/procurement/vendors/{id}/comparison?item_id=xxx
     * Returns price history per vendor for the given stock item.
     */
    public function getVendorComparison(Request $req, Response $res, array $args): Response
    {
        $tid    = $req->getAttribute('auth.tenant_id');
        $itemId = $req->getQueryParams()['item_id'] ?? null;

        if (empty($itemId)) {
            return JsonResponse::error($res, 'item_id query parameter is required', 422);
        }

        try {
            $rows = $this->service->getVendorComparison($itemId, $tid);
            return JsonResponse::ok($res, $rows);
        } catch (\Throwable $e) {
            return JsonResponse::error($res, 'Failed to load vendor comparison: ' . $e->getMessage(), 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PURCHASE REQUESTS
    // ═══════════════════════════════════════════════════════════════

    public function listPurchaseRequests(Request $req, Response $res): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $q   = $req->getQueryParams();

        $page    = max(1, (int) ($q['page']    ?? 1));
        $perPage = min(100, max(1, (int) ($q['per_page'] ?? 30)));

        $result = $this->service->listPurchaseRequests(
            tenantId:    $tid,
            page:        $page,
            perPage:     $perPage,
            status:      $q['status']      ?? null,
            priority:    $q['priority']    ?? null,
            propertyId:  $q['property_id'] ?? null,
            requestedBy: $q['requested_by'] ?? null,
        );

        $total    = $result['total'];
        $lastPage = max(1, (int) ceil($total / $perPage));

        return JsonResponse::ok(
            $res,
            array_map(fn($r) => $r->toArray(), $result['requests']),
            '',
            ['total' => $total, 'page' => $page, 'per_page' => $perPage, 'last_page' => $lastPage]
        );
    }

    public function getPurchaseRequest(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            return JsonResponse::ok($res, $this->service->getPurchaseRequest($args['id'], $tid));
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        }
    }

    public function createPurchaseRequest(Request $req, Response $res): Response
    {
        $d    = (array) $req->getParsedBody();
        $tid  = $req->getAttribute('auth.tenant_id');
        $uid  = $req->getAttribute('auth.user_id');
        $pid  = $d['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';

        if (empty($pid)) {
            return JsonResponse::error($res, 'property_id is required', 422);
        }

        try {
            $pr = $this->service->createPurchaseRequest(
                tenantId:        $tid,
                propertyId:      $pid,
                requestedBy:     $uid,
                requestedByName: $d['requested_by_name'] ?? 'Staff',
                data:            $d,
            );
            return JsonResponse::created($res, $pr->toArray(), "Purchase request {$pr->getReferenceNumber()} created");
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function updatePurchaseRequest(Request $req, Response $res, array $args): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $pr = $this->service->updatePurchaseRequest($args['id'], $tid, $d);
            return JsonResponse::ok($res, $pr->toArray(), 'Purchase request updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function submitPurchaseRequest(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $pr = $this->service->submitPurchaseRequest($args['id'], $tid);
            return JsonResponse::ok($res, $pr->toArray(), 'Purchase request submitted for approval');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function approvePurchaseRequest(Request $req, Response $res, array $args): Response
    {
        $tid  = $req->getAttribute('auth.tenant_id');
        $uid  = $req->getAttribute('auth.user_id');
        $d    = (array) $req->getParsedBody();

        try {
            $pr = $this->service->approvePurchaseRequest(
                $args['id'], $tid, $uid,
                $d['approver_name'] ?? 'Manager',
            );
            return JsonResponse::ok($res, $pr->toArray(), 'Purchase request approved');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function rejectPurchaseRequest(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');
        $d   = (array) $req->getParsedBody();

        if (empty($d['reason'])) {
            return JsonResponse::error($res, 'reason is required to reject a purchase request', 422);
        }

        try {
            $pr = $this->service->rejectPurchaseRequest(
                $args['id'], $tid, $uid,
                $d['approver_name'] ?? 'Manager',
                $d['reason'],
            );
            return JsonResponse::ok($res, $pr->toArray(), 'Purchase request rejected');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function cancelPurchaseRequest(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $pr = $this->service->cancelPurchaseRequest($args['id'], $tid);
            return JsonResponse::ok($res, $pr->toArray(), 'Purchase request cancelled');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PURCHASE ORDERS
    // ═══════════════════════════════════════════════════════════════

    public function listPurchaseOrders(Request $req, Response $res): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $q   = $req->getQueryParams();

        $page    = max(1, (int) ($q['page']    ?? 1));
        $perPage = min(100, max(1, (int) ($q['per_page'] ?? 30)));

        $result = $this->service->listPurchaseOrders(
            tenantId:   $tid,
            page:       $page,
            perPage:    $perPage,
            status:     $q['status']      ?? null,
            vendorId:   $q['vendor_id']   ?? null,
            propertyId: $q['property_id'] ?? null,
            requestId:  $q['request_id']  ?? null,
        );

        $total    = $result['total'];
        $lastPage = max(1, (int) ceil($total / $perPage));

        return JsonResponse::ok(
            $res,
            array_map(fn($o) => $o->toArray(), $result['orders']),
            '',
            ['total' => $total, 'page' => $page, 'per_page' => $perPage, 'last_page' => $lastPage]
        );
    }

    public function getPurchaseOrder(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            return JsonResponse::ok($res, $this->service->getPurchaseOrder($args['id'], $tid));
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        }
    }

    public function createPurchaseOrder(Request $req, Response $res): Response
    {
        $d    = (array) $req->getParsedBody();
        $tid  = $req->getAttribute('auth.tenant_id');
        $uid  = $req->getAttribute('auth.user_id');
        $pid  = $d['property_id'] ?? $req->getAttribute('auth.property_id') ?? '';

        $errors = [];
        if (empty($pid))             $errors[] = 'property_id is required';
        if (empty($d['vendor_id']))  $errors[] = 'vendor_id is required';
        if (empty($d['lines']))      $errors[] = 'lines must be a non-empty array';
        if (!empty($errors)) {
            return JsonResponse::validationError($res, $errors);
        }

        try {
            $po = $this->service->createPurchaseOrder(
                tenantId:      $tid,
                propertyId:    $pid,
                vendorId:      $d['vendor_id'],
                createdBy:     $uid,
                createdByName: $d['created_by_name'] ?? 'Staff',
                data:          $d,
            );
            return JsonResponse::created($res, $po->toArray(), "Purchase order {$po->getReferenceNumber()} created");
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function updatePurchaseOrder(Request $req, Response $res, array $args): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $po = $this->service->updatePurchaseOrder($args['id'], $tid, $d);
            return JsonResponse::ok($res, $po->toArray(), 'Purchase order updated');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    /**
     * POST /api/procurement/orders/{id}/send
     * Body (optional): { override_email, hotel_name }
     * Sends (or re-sends) the PO to the vendor email.
     */
    public function sendPurchaseOrder(Request $req, Response $res, array $args): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');

        try {
            $po = $this->service->sendPurchaseOrder(
                id:            $args['id'],
                tenantId:      $tid,
                sentBy:        $uid,
                sentByName:    $d['sent_by_name']    ?? 'Staff',
                overrideEmail: $d['override_email']  ?? null,
                hotelName:     $d['hotel_name']      ?? null,
            );

            $msg = $po->getEmailedCount() > 1
                ? "Purchase order re-sent (#{$po->getEmailedCount()})"
                : 'Purchase order sent to vendor';

            return JsonResponse::ok($res, $po->toArray(), $msg);
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    public function cancelPurchaseOrder(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $po = $this->service->cancelPurchaseOrder($args['id'], $tid);
            return JsonResponse::ok($res, $po->toArray(), 'Purchase order cancelled');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }
}
