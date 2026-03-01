<?php

declare(strict_types=1);

namespace Lodgik\Module\Inventory;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Helper\JsonResponse;

/**
 * Thin request/response layer for stock movements.
 * All business logic lives in MovementService.
 */
final class MovementController
{
    public function __construct(private readonly MovementService $service) {}

    // ═══════════════════════════════════════════════════════════════
    // LIST & DETAIL
    // ═══════════════════════════════════════════════════════════════

    public function listMovements(Request $req, Response $res): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $q   = $req->getQueryParams();

        $page    = max(1, (int) ($q['page']    ?? 1));
        $perPage = min(100, max(1, (int) ($q['per_page'] ?? 30)));

        $result = $this->service->listMovements(
            tenantId:   $tid,
            page:       $page,
            perPage:    $perPage,
            type:       $q['type']        ?? null,
            locationId: $q['location_id'] ?? null,
            itemId:     $q['item_id']     ?? null,
            propertyId: $q['property_id'] ?? null,
            dateFrom:   $q['date_from']   ?? null,
            dateTo:     $q['date_to']     ?? null,
            status:     $q['status']      ?? null,
        );

        $total    = $result['total'];
        $lastPage = (int) ceil($total / $perPage);

        return JsonResponse::ok($res,
            array_map(fn($m) => $m->toArray(), $result['movements']),
            '',
            ['total' => $total, 'page' => $page, 'per_page' => $perPage, 'last_page' => max(1, $lastPage)]
        );
    }

    public function getMovement(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');

        try {
            $detail = $this->service->getMovement($args['id'], $tid);
            return JsonResponse::ok($res, $detail);
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // OPENING BALANCE
    // ═══════════════════════════════════════════════════════════════

    public function createOpening(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');

        $errors = [];
        if (empty($d['item_id']))     $errors[] = 'item_id is required';
        if (empty($d['location_id'])) $errors[] = 'location_id is required';
        if (!isset($d['quantity']) || (float) $d['quantity'] < 0) {
            $errors[] = 'quantity must be >= 0';
        }
        if (!isset($d['unit_cost']) || (int) $d['unit_cost'] < 0) {
            $errors[] = 'unit_cost must be >= 0 (kobo)';
        }
        if (!empty($errors)) {
            return JsonResponse::validationError($res, $errors);
        }

        try {
            $movement = $this->service->createOpening(
                tenantId:   $tid,
                itemId:     $d['item_id'],
                locationId: $d['location_id'],
                quantity:   (string) $d['quantity'],
                unitCost:   (string) (int) $d['unit_cost'],
                userId:     $uid,
                userName:   $d['created_by_name'] ?? 'Staff',
                propertyId: $d['property_id'] ?? null,
                extra:      $d,
            );
            return JsonResponse::created($res, $movement->toArray(), 'Opening balance posted');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // GRN
    // ═══════════════════════════════════════════════════════════════

    public function createGrn(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');

        $errors = [];
        if (empty($d['destination_location_id'])) $errors[] = 'destination_location_id is required';
        if (empty($d['lines']) || !is_array($d['lines'])) $errors[] = 'lines must be a non-empty array';
        if (!empty($errors)) {
            return JsonResponse::validationError($res, $errors);
        }

        // Validate each line minimally
        foreach ($d['lines'] as $i => $line) {
            if (empty($line['item_id'])) {
                $errors[] = "lines[{$i}].item_id is required";
            }
            if (!isset($line['purchase_quantity']) || (float) $line['purchase_quantity'] <= 0) {
                $errors[] = "lines[{$i}].purchase_quantity must be > 0";
            }
            if (!isset($line['unit_cost']) || (int) $line['unit_cost'] < 0) {
                $errors[] = "lines[{$i}].unit_cost must be >= 0 (kobo)";
            }
        }
        if (!empty($errors)) {
            return JsonResponse::validationError($res, $errors);
        }

        try {
            $movement = $this->service->createGrn(
                tenantId:              $tid,
                destinationLocationId: $d['destination_location_id'],
                lines:                 $d['lines'],
                userId:                $uid,
                userName:              $d['created_by_name']  ?? 'Staff',
                supplierName:          $d['supplier_name']    ?? null,
                supplierInvoice:       $d['supplier_invoice'] ?? null,
                propertyId:            $d['property_id']      ?? null,
                extra:                 $d,
            );
            return JsonResponse::created($res, $movement->toArray(), 'GRN posted successfully');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ISSUE
    // ═══════════════════════════════════════════════════════════════

    public function createIssue(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');

        $errors = [];
        if (empty($d['source_location_id'])) $errors[] = 'source_location_id is required';
        if (empty($d['item_id']))             $errors[] = 'item_id is required';
        if (!isset($d['quantity']) || (float) $d['quantity'] <= 0) {
            $errors[] = 'quantity must be > 0';
        }
        if (!empty($errors)) {
            return JsonResponse::validationError($res, $errors);
        }

        try {
            $movement = $this->service->createIssue(
                tenantId:         $tid,
                sourceLocationId: $d['source_location_id'],
                itemId:           $d['item_id'],
                quantity:         (string) $d['quantity'],
                userId:           $uid,
                userName:         $d['created_by_name'] ?? 'Staff',
                propertyId:       $d['property_id']     ?? null,
                extra:            $d,
            );
            return JsonResponse::created($res, $movement->toArray(), 'Issue posted successfully');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TRANSFER
    // ═══════════════════════════════════════════════════════════════

    public function createTransfer(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');

        $errors = [];
        if (empty($d['source_location_id']))      $errors[] = 'source_location_id is required';
        if (empty($d['destination_location_id'])) $errors[] = 'destination_location_id is required';
        if (empty($d['item_id']))                 $errors[] = 'item_id is required';
        if (!isset($d['quantity']) || (float) $d['quantity'] <= 0) {
            $errors[] = 'quantity must be > 0';
        }
        if (!empty($errors)) {
            return JsonResponse::validationError($res, $errors);
        }

        try {
            $movement = $this->service->createTransfer(
                tenantId:              $tid,
                sourceLocationId:      $d['source_location_id'],
                destinationLocationId: $d['destination_location_id'],
                itemId:                $d['item_id'],
                quantity:              (string) $d['quantity'],
                userId:                $uid,
                userName:              $d['created_by_name'] ?? 'Staff',
                propertyId:            $d['property_id']     ?? null,
                extra:                 $d,
            );
            return JsonResponse::created($res, $movement->toArray(), 'Transfer posted successfully');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ADJUSTMENT
    // ═══════════════════════════════════════════════════════════════

    public function createAdjustment(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');

        $errors = [];
        if (empty($d['location_id'])) $errors[] = 'location_id is required';
        if (empty($d['item_id']))     $errors[] = 'item_id is required';
        if (!isset($d['counted_quantity']) || (float) $d['counted_quantity'] < 0) {
            $errors[] = 'counted_quantity must be >= 0';
        }
        if (!empty($errors)) {
            return JsonResponse::validationError($res, $errors);
        }

        try {
            $movement = $this->service->createAdjustment(
                tenantId:        $tid,
                locationId:      $d['location_id'],
                itemId:          $d['item_id'],
                countedQuantity: (string) $d['counted_quantity'],
                userId:          $uid,
                userName:        $d['created_by_name'] ?? 'Staff',
                propertyId:      $d['property_id']     ?? null,
                extra:           $d,
            );
            return JsonResponse::created($res, $movement->toArray(), 'Adjustment posted successfully');
        } catch (\RuntimeException $e) {
            return JsonResponse::notFound($res, $e->getMessage());
        } catch (\DomainException $e) {
            return JsonResponse::error($res, $e->getMessage(), 422);
        }
    }
}
