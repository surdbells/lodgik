<?php

declare(strict_types=1);

namespace Lodgik\Module\Procurement;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\PurchaseOrder;
use Lodgik\Entity\PurchaseOrderLine;
use Lodgik\Entity\PurchaseRequest;
use Lodgik\Entity\PurchaseRequestLine;
use Lodgik\Entity\Vendor;
use Lodgik\Service\ZeptoMailService;
use Psr\Log\LoggerInterface;

final class ProcurementService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ZeptoMailService       $mailer,
        private readonly LoggerInterface        $logger,
    ) {}

    // ═══════════════════════════════════════════════════════════════
    // VENDOR CRUD
    // ═══════════════════════════════════════════════════════════════

    public function createVendor(string $tenantId, array $data): Vendor
    {
        if (empty($data['name'])) {
            throw new \DomainException('Vendor name is required.');
        }

        $vendor = new Vendor($data['name'], $tenantId);
        $this->applyVendorFields($vendor, $data);
        $this->em->persist($vendor);
        $this->em->flush();

        $this->logger->info("Vendor created: {$vendor->getName()} [{$vendor->getId()}]");

        return $vendor;
    }

    public function updateVendor(string $id, string $tenantId, array $data): Vendor
    {
        $vendor = $this->findVendorOrFail($id, $tenantId);
        if (isset($data['name'])) {
            if (empty($data['name'])) throw new \DomainException('Vendor name cannot be empty.');
            $vendor->setName($data['name']);
        }
        $this->applyVendorFields($vendor, $data);
        $this->em->flush();

        return $vendor;
    }

    public function deleteVendor(string $id, string $tenantId): void
    {
        $vendor = $this->findVendorOrFail($id, $tenantId);

        // Block if any POs reference this vendor
        $poCount = (int) $this->em->createQueryBuilder()
            ->select('COUNT(po.id)')
            ->from(PurchaseOrder::class, 'po')
            ->where('po.vendorId = :vid')
            ->andWhere('po.tenantId = :tid')
            ->setParameter('vid', $id)
            ->setParameter('tid', $tenantId)
            ->getQuery()->getSingleScalarResult();

        if ($poCount > 0) {
            throw new \DomainException("Cannot delete vendor with {$poCount} purchase order(s) on record.");
        }

        $this->em->remove($vendor);
        $this->em->flush();
    }

    /** @return Vendor[] */
    public function listVendors(string $tenantId, bool $activeOnly = false, ?string $search = null): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('v')
            ->from(Vendor::class, 'v')
            ->where('v.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('v.name', 'ASC');

        if ($activeOnly) {
            $qb->andWhere('v.isActive = true');
        }
        if ($search) {
            $qb->andWhere('LOWER(v.name) LIKE :q OR LOWER(v.email) LIKE :q')
               ->setParameter('q', '%' . strtolower($search) . '%');
        }

        return $qb->getQuery()->getResult();
    }

    public function getVendor(string $id, string $tenantId): Vendor
    {
        return $this->findVendorOrFail($id, $tenantId);
    }

    // ═══════════════════════════════════════════════════════════════
    // PURCHASE REQUEST LIFECYCLE
    // ═══════════════════════════════════════════════════════════════

    public function createPurchaseRequest(
        string $tenantId,
        string $propertyId,
        string $requestedBy,
        string $requestedByName,
        array  $data,
    ): PurchaseRequest {
        if (empty($data['title'])) {
            throw new \DomainException('Purchase request title is required.');
        }
        if (empty($data['lines']) || !is_array($data['lines'])) {
            throw new \DomainException('Purchase request must have at least one line item.');
        }

        $ref = $this->generateRefNumber('PR', $tenantId);

        $pr = new PurchaseRequest(
            referenceNumber:   $ref,
            title:             $data['title'],
            propertyId:        $propertyId,
            requestedBy:       $requestedBy,
            requestedByName:   $requestedByName,
            tenantId:          $tenantId,
        );

        if (!empty($data['priority']))       $pr->setPriority($data['priority']);
        if (!empty($data['notes']))          $pr->setNotes($data['notes']);
        if (!empty($data['required_by_date'])) {
            $pr->setRequiredByDate(new \DateTimeImmutable($data['required_by_date']));
        }

        $this->em->persist($pr);

        // Lines
        $totalEstimated = 0;
        foreach ($data['lines'] as $lineData) {
            $line = $this->buildPrLine($pr, $lineData, $tenantId);
            $totalEstimated += (int) $line->getEstimatedLineValue();
        }

        $pr->setTotalEstimatedValue((string) $totalEstimated);
        $pr->setLineCount(count($data['lines']));

        $this->em->flush();

        $this->logger->info("PR created: {$ref} by {$requestedByName}");

        return $pr;
    }

    public function updatePurchaseRequest(string $id, string $tenantId, array $data): PurchaseRequest
    {
        $pr = $this->findPrOrFail($id, $tenantId);

        if (!in_array($pr->getStatus(), ['draft', 'rejected'])) {
            throw new \DomainException('Only draft or rejected purchase requests can be edited.');
        }

        if (isset($data['title']))   $pr->setTitle($data['title']);
        if (isset($data['priority'])) $pr->setPriority($data['priority']);
        if (isset($data['notes']))   $pr->setNotes($data['notes']);
        if (isset($data['required_by_date'])) {
            $pr->setRequiredByDate($data['required_by_date']
                ? new \DateTimeImmutable($data['required_by_date'])
                : null
            );
        }

        // Replace lines if provided
        if (!empty($data['lines']) && is_array($data['lines'])) {
            // Delete existing lines
            $existing = $this->em->createQueryBuilder()
                ->select('l')
                ->from(PurchaseRequestLine::class, 'l')
                ->where('l.requestId = :rid')
                ->setParameter('rid', $id)
                ->getQuery()->getResult();

            foreach ($existing as $l) {
                $this->em->remove($l);
            }

            $totalEstimated = 0;
            foreach ($data['lines'] as $lineData) {
                $line = $this->buildPrLine($pr, $lineData, $tenantId);
                $totalEstimated += (int) $line->getEstimatedLineValue();
            }

            $pr->setTotalEstimatedValue((string) $totalEstimated);
            $pr->setLineCount(count($data['lines']));
        }

        $this->em->flush();

        return $pr;
    }

    public function submitPurchaseRequest(string $id, string $tenantId): PurchaseRequest
    {
        $pr = $this->findPrOrFail($id, $tenantId);
        $pr->submit();
        $this->em->flush();

        $this->logger->info("PR submitted: {$pr->getReferenceNumber()}");

        return $pr;
    }

    public function approvePurchaseRequest(
        string $id,
        string $tenantId,
        string $approverId,
        string $approverName,
    ): PurchaseRequest {
        $pr = $this->findPrOrFail($id, $tenantId);
        $pr->approve($approverId, $approverName);
        $this->em->flush();

        $this->logger->info("PR approved: {$pr->getReferenceNumber()} by {$approverName}");

        return $pr;
    }

    public function rejectPurchaseRequest(
        string $id,
        string $tenantId,
        string $approverId,
        string $approverName,
        string $reason,
    ): PurchaseRequest {
        if (empty($reason)) {
            throw new \DomainException('A rejection reason is required.');
        }
        $pr = $this->findPrOrFail($id, $tenantId);
        $pr->reject($approverId, $approverName, $reason);
        $this->em->flush();

        $this->logger->info("PR rejected: {$pr->getReferenceNumber()} by {$approverName}");

        return $pr;
    }

    public function cancelPurchaseRequest(string $id, string $tenantId): PurchaseRequest
    {
        $pr = $this->findPrOrFail($id, $tenantId);
        $pr->cancel();
        $this->em->flush();

        return $pr;
    }

    /**
     * @return array{requests: PurchaseRequest[], total: int}
     */
    public function listPurchaseRequests(
        string  $tenantId,
        int     $page     = 1,
        int     $perPage  = 30,
        ?string $status   = null,
        ?string $priority = null,
        ?string $propertyId = null,
        ?string $requestedBy = null,
    ): array {
        $qb = $this->em->createQueryBuilder()
            ->select('pr')
            ->from(PurchaseRequest::class, 'pr')
            ->where('pr.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('pr.createdAt', 'DESC');

        if ($status)      $qb->andWhere('pr.status = :status')->setParameter('status', $status);
        if ($priority)    $qb->andWhere('pr.priority = :priority')->setParameter('priority', $priority);
        if ($propertyId)  $qb->andWhere('pr.propertyId = :pid')->setParameter('pid', $propertyId);
        if ($requestedBy) $qb->andWhere('pr.requestedBy = :reqBy')->setParameter('reqBy', $requestedBy);

        $total = (int) (clone $qb)
            ->select('COUNT(pr.id)')
            ->resetDQLPart('orderBy')  // PostgreSQL: ORDER BY not allowed in aggregate SELECT without GROUP BY
            ->getQuery()->getSingleScalarResult();

        $requests = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()->getResult();

        return ['requests' => $requests, 'total' => $total];
    }

    public function getPurchaseRequest(string $id, string $tenantId): array
    {
        $pr = $this->findPrOrFail($id, $tenantId);

        $lines = $this->em->createQueryBuilder()
            ->select('l')
            ->from(PurchaseRequestLine::class, 'l')
            ->where('l.requestId = :rid')
            ->setParameter('rid', $id)
            ->orderBy('l.createdAt', 'ASC')
            ->getQuery()->getResult();

        return [
            'request' => $pr->toArray(),
            'lines'   => array_map(fn($l) => $l->toArray(), $lines),
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // PURCHASE ORDER LIFECYCLE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a PO directly (without a PR) or from an approved PR.
     * If request_id is given the PR is validated and will be marked converted
     * after the PO is flushed.
     */
    // Open-market threshold: POs above this kobo value require second approval.
    // 50,000 NGN = 5,000,000 kobo
    private const OPEN_MARKET_SECOND_APPROVAL_THRESHOLD = 5_000_000;

    public function createPurchaseOrder(
        string  $tenantId,
        string  $propertyId,
        ?string $vendorId,
        string  $createdBy,
        string  $createdByName,
        array   $data,
    ): PurchaseOrder {
        if (empty($data['lines']) || !is_array($data['lines'])) {
            throw new \DomainException('Purchase order must have at least one line item.');
        }

        $isOpenMarket = !empty($data['is_open_market']) && (bool) $data['is_open_market'];

        if ($isOpenMarket) {
            // Open-market path — no registered vendor required
            if (empty($data['open_market_vendor_name'])) {
                throw new \DomainException('Supplier name is required for open-market purchases.');
            }
            if (empty($data['open_market_reason'])) {
                throw new \DomainException('Reason is required for open-market purchases.');
            }
            $resolvedVendorId   = null;
            $resolvedVendorName = trim($data['open_market_vendor_name']);
        } else {
            // Standard path — must have a registered vendor
            if (empty($vendorId)) {
                throw new \DomainException('vendor_id is required for standard purchase orders.');
            }
            $vendor             = $this->findVendorOrFail($vendorId, $tenantId);
            $resolvedVendorId   = $vendorId;
            $resolvedVendorName = $vendor->getName();
        }

        $ref = $this->generateRefNumber('PO', $tenantId);

        $po = new PurchaseOrder(
            referenceNumber: $ref,
            propertyId:      $propertyId,
            vendorId:        $resolvedVendorId,
            vendorName:      $resolvedVendorName,
            createdBy:       $createdBy,
            createdByName:   $createdByName,
            tenantId:        $tenantId,
        );

        if ($isOpenMarket) {
            $po->setIsOpenMarket(true);
            $po->setOpenMarketVendorName(trim($data['open_market_vendor_name']));
            $po->setOpenMarketReason(trim($data['open_market_reason']));
        } else {
            // Snapshot vendor contact details for standard POs
            $po->setVendorEmail($vendor->getEmail());
            $po->setVendorContactPerson($vendor->getContactPerson());
            $po->setPaymentTerms($data['payment_terms'] ?? $vendor->getPaymentTerms());
        }

        if (!empty($data['payment_terms'])) $po->setPaymentTerms($data['payment_terms']);
        if (!empty($data['expected_delivery_date'])) {
            $po->setExpectedDeliveryDate(new \DateTimeImmutable($data['expected_delivery_date']));
        }
        if (!empty($data['delivery_address']))  $po->setDeliveryAddress($data['delivery_address']);
        if (!empty($data['delivery_notes']))    $po->setDeliveryNotes($data['delivery_notes']);
        if (!empty($data['notes']))             $po->setNotes($data['notes']);
        if (!empty($data['tax_value']))         $po->setTaxValue((string)(int)$data['tax_value']);

        // Link back to PR (optional)
        $pr = null;
        if (!empty($data['request_id'])) {
            $pr = $this->findPrOrFail($data['request_id'], $tenantId);
            if ($pr->getStatus() !== 'approved') {
                throw new \DomainException('Only approved purchase requests can be converted to a PO.');
            }
            $po->setRequestId($pr->getId());
        }

        $this->em->persist($po);

        // Lines
        $subtotal = 0;
        foreach ($data['lines'] as $lineData) {
            $line = $this->buildPoLine($po, $lineData, $tenantId);
            $subtotal += (int) $line->getLineTotal();
        }

        $po->setSubtotalValue((string) $subtotal);
        $po->recalcTotal();
        $po->setLineCount(count($data['lines']));

        // Fraud prevention: open-market POs above threshold require second approval
        if ($isOpenMarket && (int) $po->getTotalValue() >= self::OPEN_MARKET_SECOND_APPROVAL_THRESHOLD) {
            $po->setSecondApprovalRequired(true);
        }

        // Convert PR
        if ($pr !== null) {
            $pr->convert($po->getId());
        }

        $this->em->flush();

        $label = $isOpenMarket ? "OPEN MARKET" : "vendor={$resolvedVendorName}";
        $this->logger->info("PO created: {$ref} {$label} by {$createdByName}");

        return $po;
    }

    /**
     * Grant second approval on an open-market PO.
     * Only property_admin may perform this action (enforced in controller/route).
     */
    public function secondApprovePurchaseOrder(string $id, string $tenantId, string $userId, string $userName): PurchaseOrder
    {
        $po = $this->findPoOrFail($id, $tenantId);
        $po->secondApprove($userId, $userName);
        $this->em->flush();

        $this->logger->info("PO second-approved: {$po->getReferenceNumber()} by {$userName}");

        return $po;
    }

    public function updatePurchaseOrder(string $id, string $tenantId, array $data): PurchaseOrder
    {
        $po = $this->findPoOrFail($id, $tenantId);

        if ($po->getStatus() !== 'draft') {
            throw new \DomainException('Only draft purchase orders can be edited. Cancel and re-create to amend a sent PO.');
        }

        if (!empty($data['expected_delivery_date'])) {
            $po->setExpectedDeliveryDate(new \DateTimeImmutable($data['expected_delivery_date']));
        }
        if (array_key_exists('delivery_address', $data)) $po->setDeliveryAddress($data['delivery_address'] ?: null);
        if (array_key_exists('delivery_notes', $data))   $po->setDeliveryNotes($data['delivery_notes'] ?: null);
        if (array_key_exists('notes', $data))            $po->setNotes($data['notes'] ?: null);
        if (isset($data['payment_terms']))               $po->setPaymentTerms($data['payment_terms']);
        if (isset($data['tax_value']))                   { $po->setTaxValue((string)(int)$data['tax_value']); $po->recalcTotal(); }

        // Replace lines if provided
        if (!empty($data['lines']) && is_array($data['lines'])) {
            $existing = $this->em->createQueryBuilder()
                ->select('l')
                ->from(PurchaseOrderLine::class, 'l')
                ->where('l.orderId = :oid')
                ->setParameter('oid', $id)
                ->getQuery()->getResult();

            foreach ($existing as $l) {
                $this->em->remove($l);
            }

            $subtotal = 0;
            foreach ($data['lines'] as $lineData) {
                $line = $this->buildPoLine($po, $lineData, $tenantId);
                $subtotal += (int) $line->getLineTotal();
            }

            $po->setSubtotalValue((string) $subtotal);
            $po->recalcTotal();
            $po->setLineCount(count($data['lines']));
        }

        $this->em->flush();

        return $po;
    }

    /**
     * Send (or re-send) the PO to the vendor by email.
     * Advances status draft → sent; always increments emailed_count.
     */
    public function sendPurchaseOrder(
        string $id,
        string $tenantId,
        string $sentBy,
        string $sentByName,
        ?string $overrideEmail = null,
        ?string $hotelName     = null,
    ): PurchaseOrder {
        $po = $this->findPoOrFail($id, $tenantId);

        if (in_array($po->getStatus(), ['delivered', 'cancelled'])) {
            throw new \DomainException("Cannot send a PO in '{$po->getStatus()}' status.");
        }

        if ($po->isPendingSecondApproval()) {
            throw new \DomainException('This open-market purchase order requires a second approval before it can be sent.');
        }

        $toEmail = $overrideEmail ?? $po->getVendorEmail();
        if (empty($toEmail)) {
            throw new \DomainException('No vendor email address on record. Please update the vendor or provide an override email.');
        }

        // Load lines for the email
        $lines = $this->em->createQueryBuilder()
            ->select('l')
            ->from(PurchaseOrderLine::class, 'l')
            ->where('l.orderId = :oid')
            ->setParameter('oid', $id)
            ->orderBy('l.createdAt', 'ASC')
            ->getQuery()->getResult();

        $html = $this->buildPoEmailHtml($po, $lines, $hotelName ?? 'Hotel');

        $subject = "Purchase Order {$po->getReferenceNumber()} — " . ($hotelName ?? 'Hotel');

        $sent = $this->mailer->send(
            toEmail:  $toEmail,
            toName:   $po->getVendorContactPerson() ?? $po->getVendorName(),
            subject:  $subject,
            htmlBody: $html,
        );

        if (!$sent) {
            $this->logger->warning("PO email delivery failed or skipped: {$po->getReferenceNumber()} → {$toEmail}");
        }

        $po->markSent($sentBy, $sentByName);
        $this->em->flush();

        $this->logger->info("PO sent: {$po->getReferenceNumber()} → {$toEmail} (emailed #{$po->getEmailedCount()})");

        return $po;
    }

    public function cancelPurchaseOrder(string $id, string $tenantId): PurchaseOrder
    {
        $po = $this->findPoOrFail($id, $tenantId);
        $po->cancel();
        $this->em->flush();

        $this->logger->info("PO cancelled: {$po->getReferenceNumber()}");

        return $po;
    }

    /**
     * @return array{orders: PurchaseOrder[], total: int}
     */
    public function listPurchaseOrders(
        string  $tenantId,
        int     $page         = 1,
        int     $perPage      = 30,
        ?string $status       = null,
        ?string $vendorId     = null,
        ?string $propertyId   = null,
        ?string $requestId    = null,
        ?bool   $isOpenMarket = null,
    ): array {
        $qb = $this->em->createQueryBuilder()
            ->select('po')
            ->from(PurchaseOrder::class, 'po')
            ->where('po.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('po.createdAt', 'DESC');

        if ($status)              $qb->andWhere('po.status = :status')->setParameter('status', $status);
        if ($vendorId)            $qb->andWhere('po.vendorId = :vid')->setParameter('vid', $vendorId);
        if ($propertyId)          $qb->andWhere('po.propertyId = :pid')->setParameter('pid', $propertyId);
        if ($requestId)           $qb->andWhere('po.requestId = :rid')->setParameter('rid', $requestId);
        if ($isOpenMarket !== null) $qb->andWhere('po.isOpenMarket = :om')->setParameter('om', $isOpenMarket);

        $total = (int) (clone $qb)
            ->select('COUNT(po.id)')
            ->resetDQLPart('orderBy')  // PostgreSQL: ORDER BY not allowed in aggregate SELECT without GROUP BY
            ->getQuery()->getSingleScalarResult();

        $orders = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()->getResult();

        return ['orders' => $orders, 'total' => $total];
    }

    public function getPurchaseOrder(string $id, string $tenantId): array
    {
        $po = $this->findPoOrFail($id, $tenantId);

        $lines = $this->em->createQueryBuilder()
            ->select('l')
            ->from(PurchaseOrderLine::class, 'l')
            ->where('l.orderId = :oid')
            ->setParameter('oid', $id)
            ->orderBy('l.createdAt', 'ASC')
            ->getQuery()->getResult();

        return [
            'order' => $po->toArray(),
            'lines' => array_map(fn($l) => $l->toArray(), $lines),
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // GRN → PO DELIVERY HOOK
    // ═══════════════════════════════════════════════════════════════

    /**
     * Called by MovementService::createGrn() after a GRN is posted
     * against a purchase order.
     *
     * $grnLines: the raw GRN line data array passed to createGrn()
     *   each entry must have: item_id, purchase_quantity
     *
     * Updates received_quantity on matching PO lines, then advances
     * PO status (sent|partially_delivered → partially_delivered|delivered).
     *
     * Non-fatal: errors are logged and swallowed so GRN is never blocked.
     */
    public function applyGrnToOrder(string $poId, array $grnLines, string $tenantId): void
    {
        try {
            $po = $this->findPoOrFail($poId, $tenantId);

            /** @var PurchaseOrderLine[] $poLines */
            $poLines = $this->em->createQueryBuilder()
                ->select('l')
                ->from(PurchaseOrderLine::class, 'l')
                ->where('l.orderId = :oid')
                ->setParameter('oid', $poId)
                ->getQuery()->getResult();

            // Index PO lines by item_id for O(1) lookup
            $lineByItem = [];
            foreach ($poLines as $poLine) {
                $lineByItem[$poLine->getItemId()] = $poLine;
            }

            foreach ($grnLines as $grnLine) {
                $itemId = $grnLine['item_id'] ?? null;
                $qty    = (float) ($grnLine['purchase_quantity'] ?? 0);

                if (!$itemId || $qty <= 0) continue;
                if (!isset($lineByItem[$itemId])) continue; // item not on this PO

                $lineByItem[$itemId]->applyDelivery($qty);
            }

            // Check if all lines are fully received
            $allReceived = array_reduce(
                $poLines,
                fn(bool $carry, PurchaseOrderLine $l) => $carry && $l->isFullyReceived(),
                true
            );

            $po->recordDelivery($allReceived);
            $this->em->flush();

            $this->logger->info(
                "GRN applied to PO {$po->getReferenceNumber()}: status={$po->getStatus()}"
            );

        } catch (\Throwable $e) {
            $this->logger->error(
                "applyGrnToOrder failed for PO {$poId}: {$e->getMessage()}",
                ['exception' => $e]
            );
            // Never re-throw — GRN must not be blocked by procurement update failure
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // VENDOR COMPARISON
    // ═══════════════════════════════════════════════════════════════

    /**
     * Returns a comparison table of vendors who have supplied a given stock item,
     * based on historical PO data.
     *
     * Each row:
     *   vendor_id, vendor_name, order_count, last_unit_cost (kobo),
     *   avg_unit_cost (kobo), min_unit_cost (kobo), max_unit_cost (kobo),
     *   last_ordered_at (date string), total_ordered_quantity
     *
     * Rows are ordered by avg_unit_cost ASC (cheapest supplier first).
     */
    public function getVendorComparison(string $itemId, string $tenantId): array
    {
        // Use native SQL for aggregate + subquery (last_unit_cost)
        $conn = $this->em->getConnection();

        $sql = <<<'SQL'
            SELECT
                po.vendor_id,
                po.vendor_name,
                COUNT(DISTINCT po.id)             AS order_count,
                AVG(pol.unit_cost)::BIGINT        AS avg_unit_cost,
                MIN(pol.unit_cost)                AS min_unit_cost,
                MAX(pol.unit_cost)                AS max_unit_cost,
                MAX(po.created_at)                AS last_ordered_at,
                SUM(pol.ordered_quantity)         AS total_ordered_quantity,
                (
                    SELECT pol2.unit_cost
                    FROM   purchase_order_lines pol2
                    JOIN   purchase_orders po2 ON po2.id = pol2.order_id
                    WHERE  pol2.item_id  = pol.item_id
                      AND  po2.vendor_id = po.vendor_id
                      AND  po2.tenant_id = :tid
                    ORDER  BY po2.created_at DESC
                    LIMIT  1
                ) AS last_unit_cost
            FROM  purchase_order_lines pol
            JOIN  purchase_orders po ON po.id = pol.order_id
            WHERE pol.item_id   = :iid
              AND po.tenant_id  = :tid
              AND po.status    != 'cancelled'
            GROUP BY po.vendor_id, po.vendor_name, pol.item_id
            ORDER BY avg_unit_cost ASC
        SQL;

        $rows = $conn->executeQuery($sql, ['iid' => $itemId, 'tid' => $tenantId])->fetchAllAssociative();

        return array_map(fn($row) => [
            'vendor_id'               => $row['vendor_id'],
            'vendor_name'             => $row['vendor_name'],
            'order_count'             => (int)   $row['order_count'],
            'last_unit_cost'          => (string) ($row['last_unit_cost'] ?? '0'),
            'avg_unit_cost'           => (string)  $row['avg_unit_cost'],
            'min_unit_cost'           => (string)  $row['min_unit_cost'],
            'max_unit_cost'           => (string)  $row['max_unit_cost'],
            'last_ordered_at'         => $row['last_ordered_at']
                ? (new \DateTimeImmutable($row['last_ordered_at']))->format('Y-m-d')
                : null,
            'total_ordered_quantity'  => $row['total_ordered_quantity'],
        ], $rows);
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE — BUILDERS
    // ═══════════════════════════════════════════════════════════════

    private function buildPrLine(PurchaseRequest $pr, array $data, string $tenantId): PurchaseRequestLine
    {
        if (empty($data['item_id'])) throw new \DomainException('Line item_id is required.');
        if (empty($data['item_name'])) throw new \DomainException('Line item_name is required.');

        $line = new PurchaseRequestLine(
            requestId: $pr->getId(),
            itemId:    $data['item_id'],
            itemSku:   $data['item_sku'] ?? '',
            itemName:  $data['item_name'],
            quantity:  (string) ($data['quantity'] ?? 1),
            tenantId:  $tenantId,
        );

        if (!empty($data['unit_of_measure']))       $line->setUnitOfMeasure($data['unit_of_measure']);
        if (isset($data['estimated_unit_cost']))    $line->setEstimatedUnitCost((string)(int)$data['estimated_unit_cost']);
        if (!empty($data['notes']))                 $line->setNotes($data['notes']);

        $this->em->persist($line);

        return $line;
    }

    private function buildPoLine(PurchaseOrder $po, array $data, string $tenantId): PurchaseOrderLine
    {
        if (empty($data['item_id'])) throw new \DomainException('Line item_id is required.');
        if (empty($data['item_name'])) throw new \DomainException('Line item_name is required.');
        if (!isset($data['ordered_quantity']) || (float)$data['ordered_quantity'] <= 0) {
            throw new \DomainException("Line for '{$data['item_name']}': ordered_quantity must be > 0.");
        }
        if (!isset($data['unit_cost']) || (int)$data['unit_cost'] < 0) {
            throw new \DomainException("Line for '{$data['item_name']}': unit_cost must be >= 0 (kobo).");
        }

        $line = new PurchaseOrderLine(
            orderId:         $po->getId(),
            itemId:          $data['item_id'],
            itemSku:         $data['item_sku'] ?? '',
            itemName:        $data['item_name'],
            orderedQuantity: (string) $data['ordered_quantity'],
            unitCost:        (string)(int) $data['unit_cost'],
            tenantId:        $tenantId,
        );

        if (!empty($data['location_id']))   $line->setLocationId($data['location_id']);
        if (!empty($data['location_name'])) $line->setLocationName($data['location_name']);
        if (!empty($data['notes']))         $line->setNotes($data['notes']);

        $this->em->persist($line);

        return $line;
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE — EMAIL TEMPLATE
    // ═══════════════════════════════════════════════════════════════

    /** @param PurchaseOrderLine[] $lines */
    private function buildPoEmailHtml(PurchaseOrder $po, array $lines, string $hotelName): string
    {
        $refNum   = htmlspecialchars($po->getReferenceNumber());
        $vendor   = htmlspecialchars($po->getVendorName());
        $contact  = htmlspecialchars($po->getVendorContactPerson() ?? $vendor);
        $hotel    = htmlspecialchars($hotelName);
        $terms    = htmlspecialchars($po->getPaymentTerms());
        $delivery = $po->getExpectedDeliveryDate()?->format('d M Y') ?? 'To be confirmed';
        $address  = nl2br(htmlspecialchars($po->getDeliveryAddress() ?? ''));
        $notes    = $po->getNotes() ? nl2br(htmlspecialchars($po->getNotes())) : '';

        // Build line rows
        $lineRows = '';
        foreach ($lines as $line) {
            $name   = htmlspecialchars($line->getItemName());
            $sku    = htmlspecialchars($line->getItemSku());
            $qty    = number_format((float) $line->getOrderedQuantity(), 4);
            $cost   = $this->formatKobo((int) $line->getUnitCost());
            $total  = $this->formatKobo((int) $line->getLineTotal());
            $loc    = $line->getLocationName() ? htmlspecialchars($line->getLocationName()) : '—';

            $lineRows .= <<<HTML
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px 8px;font-size:13px;">{$name}<br><small style="color:#888;">{$sku}</small></td>
                    <td style="padding:10px 8px;text-align:right;font-size:13px;">{$qty}</td>
                    <td style="padding:10px 8px;text-align:right;font-size:13px;">{$cost}</td>
                    <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:600;">{$total}</td>
                    <td style="padding:10px 8px;font-size:12px;color:#666;">{$loc}</td>
                </tr>
            HTML;
        }

        $subtotal = $this->formatKobo((int) $po->getSubtotalValue());
        $tax      = $this->formatKobo((int) $po->getTaxValue());
        $total    = $this->formatKobo((int) $po->getTotalValue());

        $notesSection = $notes
            ? "<p style='margin:16px 0 0;font-size:13px;color:#555;'><strong>Notes:</strong> {$notes}</p>"
            : '';

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
            <tr><td align="center">
                <table width="620" cellpadding="0" cellspacing="0"
                       style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

                    <!-- Header -->
                    <tr>
                        <td style="background:#1a3c2e;padding:24px 32px;color:#fff;">
                            <h1 style="margin:0;font-size:20px;font-weight:700;">{$hotel}</h1>
                            <p style="margin:6px 0 0;font-size:14px;opacity:.85;">Purchase Order</p>
                        </td>
                    </tr>

                    <!-- Meta block -->
                    <tr>
                        <td style="padding:24px 32px;border-bottom:1px solid #eee;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="width:50%;vertical-align:top;">
                                        <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Purchase Order</p>
                                        <p style="margin:0;font-size:20px;font-weight:700;color:#1a3c2e;">{$refNum}</p>
                                        <p style="margin:8px 0 0;font-size:13px;color:#555;">
                                            Expected delivery: <strong>{$delivery}</strong><br>
                                            Payment terms: <strong>{$terms}</strong>
                                        </p>
                                    </td>
                                    <td style="width:50%;vertical-align:top;text-align:right;">
                                        <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">To</p>
                                        <p style="margin:0;font-size:15px;font-weight:600;">{$contact}</p>
                                        <p style="margin:4px 0 0;font-size:13px;color:#555;">{$vendor}</p>
                                    </td>
                                </tr>
                            </table>
                            {$notesSection}
                        </td>
                    </tr>

                    <!-- Line items -->
                    <tr>
                        <td style="padding:0 32px 24px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                                <thead>
                                    <tr style="background:#f8f8f8;">
                                        <th style="padding:10px 8px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Item</th>
                                        <th style="padding:10px 8px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Qty</th>
                                        <th style="padding:10px 8px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Unit Price</th>
                                        <th style="padding:10px 8px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Total</th>
                                        <th style="padding:10px 8px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Deliver To</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {$lineRows}
                                </tbody>
                            </table>

                            <!-- Totals -->
                            <table width="100%" cellpadding="0" cellspacing="0"
                                   style="margin-top:16px;border-top:2px solid #eee;">
                                <tr>
                                    <td style="padding:8px 8px 4px;font-size:13px;color:#555;">Subtotal</td>
                                    <td style="padding:8px 8px 4px;text-align:right;font-size:13px;">{$subtotal}</td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 8px;font-size:13px;color:#555;">Tax / VAT</td>
                                    <td style="padding:4px 8px;text-align:right;font-size:13px;">{$tax}</td>
                                </tr>
                                <tr style="background:#1a3c2e;">
                                    <td style="padding:12px 8px;font-size:14px;font-weight:700;color:#fff;">Total</td>
                                    <td style="padding:12px 8px;text-align:right;font-size:16px;font-weight:700;color:#fff;">{$total}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Delivery address -->
                    {$this->deliveryAddressBlock($po)}

                    <!-- Footer -->
                    <tr>
                        <td style="background:#f8f8f8;padding:16px 32px;text-align:center;">
                            <p style="margin:0;font-size:11px;color:#aaa;">
                                This purchase order was generated by Lodgik — Hotel Management Platform.<br>
                                Please do not reply to this email. Contact {$hotel} directly for queries.
                            </p>
                        </td>
                    </tr>

                </table>
            </td></tr>
        </table>
        </body>
        </html>
        HTML;
    }

    private function deliveryAddressBlock(PurchaseOrder $po): string
    {
        if (!$po->getDeliveryAddress()) return '';
        $addr = nl2br(htmlspecialchars($po->getDeliveryAddress()));
        $notes = $po->getDeliveryNotes() ? '<br><em>' . htmlspecialchars($po->getDeliveryNotes()) . '</em>' : '';
        return <<<HTML
            <tr>
                <td style="padding:16px 32px;border-top:1px solid #eee;border-bottom:1px solid #eee;background:#fafff8;">
                    <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Delivery Address</p>
                    <p style="margin:0;font-size:13px;color:#333;">{$addr}{$notes}</p>
                </td>
            </tr>
        HTML;
    }

    private function formatKobo(int $kobo): string
    {
        return '₦' . number_format($kobo / 100, 2, '.', ',');
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE — REFERENCE NUMBER GENERATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generates sequential reference numbers:
     *   PR → PR-20260301-0001
     *   PO → PO-20260301-0001
     *
     * Sequence is per-day, per-type, per-tenant.
     */
    private function generateRefNumber(string $type, string $tenantId): string
    {
        $today   = (new \DateTimeImmutable())->format('Ymd');
        $prefix  = strtoupper($type) . '-' . $today . '-';
        $table   = $type === 'PR' ? 'purchase_requests' : 'purchase_orders';
        $column  = 'reference_number';

        $count = (int) $this->em->getConnection()->executeQuery(
            "SELECT COUNT(*) FROM {$table}
             WHERE tenant_id = ?
               AND {$column} LIKE ?",
            [$tenantId, $prefix . '%']
        )->fetchOne();

        return $prefix . str_pad((string) ($count + 1), 4, '0', STR_PAD_LEFT);
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE — FINDERS
    // ═══════════════════════════════════════════════════════════════

    private function findVendorOrFail(string $id, string $tenantId): Vendor
    {
        $vendor = $this->em->find(Vendor::class, $id);
        if (!$vendor || $vendor->getTenantId() !== $tenantId) {
            throw new \RuntimeException("Vendor not found: {$id}");
        }
        return $vendor;
    }

    private function findPrOrFail(string $id, string $tenantId): PurchaseRequest
    {
        $pr = $this->em->find(PurchaseRequest::class, $id);
        if (!$pr || $pr->getTenantId() !== $tenantId) {
            throw new \RuntimeException("Purchase request not found: {$id}");
        }
        return $pr;
    }

    private function findPoOrFail(string $id, string $tenantId): PurchaseOrder
    {
        $po = $this->em->find(PurchaseOrder::class, $id);
        if (!$po || $po->getTenantId() !== $tenantId) {
            throw new \RuntimeException("Purchase order not found: {$id}");
        }
        return $po;
    }

    // ── Vendor field helper ──────────────────────────────────────

    private function applyVendorFields(Vendor $vendor, array $data): void
    {
        if (array_key_exists('email', $data))               $vendor->setEmail($data['email'] ?: null);
        if (array_key_exists('phone', $data))               $vendor->setPhone($data['phone'] ?: null);
        if (array_key_exists('contact_person', $data))      $vendor->setContactPerson($data['contact_person'] ?: null);
        if (array_key_exists('address', $data))             $vendor->setAddress($data['address'] ?: null);
        if (array_key_exists('city', $data))                $vendor->setCity($data['city'] ?: null);
        if (array_key_exists('country', $data))             $vendor->setCountry($data['country'] ?: null);
        if (array_key_exists('payment_terms', $data))       $vendor->setPaymentTerms($data['payment_terms'] ?: 'net30');
        if (array_key_exists('bank_name', $data))           $vendor->setBankName($data['bank_name'] ?: null);
        if (array_key_exists('bank_account_number', $data)) $vendor->setBankAccountNumber($data['bank_account_number'] ?: null);
        if (array_key_exists('bank_sort_code', $data))      $vendor->setBankSortCode($data['bank_sort_code'] ?: null);
        if (array_key_exists('tax_id', $data))              $vendor->setTaxId($data['tax_id'] ?: null);
        if (array_key_exists('notes', $data))               $vendor->setNotes($data['notes'] ?: null);
        if (array_key_exists('is_active', $data))           $vendor->setIsActive((bool) $data['is_active']);
        if (array_key_exists('preferred_items', $data))     $vendor->setPreferredItems($data['preferred_items'] ?: null);
    }
}
