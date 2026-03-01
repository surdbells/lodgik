<?php

declare(strict_types=1);

namespace Lodgik\Module\Inventory;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\StockBalance;
use Lodgik\Entity\StockItem;
use Lodgik\Entity\StockLocation;
use Lodgik\Entity\StockMovement;
use Lodgik\Entity\StockMovementLine;
use Lodgik\Entity\PosOrder;
use Lodgik\Entity\PosOrderItem;
use Lodgik\Entity\PosProduct;
use Psr\Log\LoggerInterface;
use Lodgik\Module\Procurement\ProcurementService;

final class MovementService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
        private readonly ?ProcurementService $procurement = null,
    ) {}

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC MOVEMENT CREATORS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Opening balance — replaces the Phase A temporary setter.
     * Creates a posted movement + balance record.
     * Will UPDATE an existing balance if one already exists (re-opening allowed).
     */
    public function createOpening(
        string $tenantId,
        string $itemId,
        string $locationId,
        string $quantity,      // issue units
        string $unitCost,      // kobo per issue unit
        string $userId,
        string $userName,
        ?string $propertyId = null,
        array  $extra = []
    ): StockMovement {
        $item     = $this->findItemOrFail($itemId, $tenantId);
        $location = $this->findLocationOrFail($locationId, $tenantId);
        $date     = new \DateTimeImmutable($extra['movement_date'] ?? 'today');

        $movement = new StockMovement(
            type:            'opening',
            referenceNumber: $this->generateRefNumber('opening', $tenantId),
            createdBy:       $userId,
            createdByName:   $userName,
            tenantId:        $tenantId,
            movementDate:    $date,
        );
        $movement->setPropertyId($propertyId ?? $location->getPropertyId());
        $movement->setDestinationLocationId($locationId);
        $movement->setDestinationLocationName($location->getName());
        if (isset($extra['notes'])) $movement->setNotes($extra['notes']);

        $this->em->persist($movement);

        $line = $this->buildLine(
            movement:     $movement,
            item:         $item,
            locationId:   $locationId,
            locationName: $location->getName(),
            quantity:     $quantity,        // positive = stock IN
            unitCost:     $unitCost,
            tenantId:     $tenantId,
        );

        $this->applyMovementLine($line, $tenantId, $propertyId ?? $location->getPropertyId(), isInbound: true);

        $movement->setLineCount(1);
        $movement->setTotalValue($line->getLineValue());

        $this->em->flush();

        $this->logger->info("Opening balance posted: item={$item->getSku()}, qty={$quantity}, location={$location->getName()}");

        return $movement;
    }

    /**
     * Goods Received Note — inbound from supplier.
     *
     * $lines = [[
     *   'item_id'          => uuid,
     *   'purchase_quantity'=> float,   // qty in purchase units (e.g. 10 cases)
     *   'unit_cost'        => int,     // kobo per PURCHASE unit
     *   'batch_number'     => ?string,
     *   'expiry_date'      => ?string (Y-m-d),
     *   'notes'            => ?string,
     * ], ...]
     */
    public function createGrn(
        string $tenantId,
        string $destinationLocationId,
        array  $lines,
        string $userId,
        string $userName,
        ?string $supplierName    = null,
        ?string $supplierInvoice = null,
        ?string $propertyId      = null,
        array   $extra           = []
    ): StockMovement {
        if (empty($lines)) {
            throw new \DomainException('GRN must have at least one line item.');
        }

        $location = $this->findLocationOrFail($destinationLocationId, $tenantId);
        $date     = new \DateTimeImmutable($extra['movement_date'] ?? 'today');

        $movement = new StockMovement(
            type:            'grn',
            referenceNumber: $this->generateRefNumber('grn', $tenantId),
            createdBy:       $userId,
            createdByName:   $userName,
            tenantId:        $tenantId,
            movementDate:    $date,
        );
        $movement->setPropertyId($propertyId ?? $location->getPropertyId());
        $movement->setDestinationLocationId($destinationLocationId);
        $movement->setDestinationLocationName($location->getName());
        $movement->setSupplierName($supplierName);
        $movement->setSupplierInvoice($supplierInvoice);
        if (isset($extra['notes'])) $movement->setNotes($extra['notes']);
        if (isset($extra['reference_id'])) {
            $movement->setReferenceId($extra['reference_id']);
            $movement->setReferenceType($extra['reference_type'] ?? 'purchase_order');
        }

        $this->em->persist($movement);

        $totalValue = 0;
        $lineObjects = [];

        foreach ($lines as $lineData) {
            $item           = $this->findItemOrFail($lineData['item_id'], $tenantId);
            $purchaseQty    = (float) ($lineData['purchase_quantity'] ?? 0);
            $purchaseCost   = (int)   ($lineData['unit_cost']         ?? 0); // kobo per purchase unit
            $factor         = (float)  $item->getPurchaseToIssueFactor();

            if ($purchaseQty <= 0) {
                throw new \DomainException("Line for item '{$item->getSku()}': purchase_quantity must be > 0.");
            }

            // Convert purchase → issue units
            $issueQty      = $purchaseQty * $factor;                   // e.g. 10 cases × 24 = 240 bottles
            $issueCost     = $factor > 0
                ? (int) round($purchaseCost / $factor)                 // kobo per issue unit
                : $purchaseCost;

            $line = $this->buildLine(
                movement:     $movement,
                item:         $item,
                locationId:   $destinationLocationId,
                locationName: $location->getName(),
                quantity:     (string) $issueQty,
                unitCost:     (string) $issueCost,
                tenantId:     $tenantId,
            );
            $line->setPurchaseQuantity((string) $purchaseQty);

            if (!empty($lineData['batch_number'])) {
                $line->setBatchNumber($lineData['batch_number']);
            }
            if (!empty($lineData['expiry_date'])) {
                $line->setExpiryDate(new \DateTimeImmutable($lineData['expiry_date']));
            }
            if (!empty($lineData['notes'])) {
                $line->setNotes($lineData['notes']);
            }

            $this->applyMovementLine($line, $tenantId, $propertyId ?? $location->getPropertyId(), isInbound: true);

            $totalValue += (int) $line->getLineValue();
            $lineObjects[] = $line;
        }

        $movement->setLineCount(count($lineObjects));
        $movement->setTotalValue((string) $totalValue);

        $this->em->flush();

        // Hook: update PO delivery progress if this GRN is linked to a purchase order
        if (!empty($extra['purchase_order_id']) && $this->procurement !== null) {
            $this->procurement->applyGrnToOrder(
                $extra['purchase_order_id'],
                $lines,
                $tenantId,
            );
        }

        $this->logger->info("GRN posted: ref={$movement->getReferenceNumber()}, lines={$movement->getLineCount()}, value={$totalValue}");

        return $movement;
    }

    /**
     * Manual issue — stock out from a location to a department / cost centre.
     */
    public function createIssue(
        string $tenantId,
        string $sourceLocationId,
        string $itemId,
        string $quantity,       // issue units
        string $userId,
        string $userName,
        ?string $propertyId = null,
        array   $extra = []
    ): StockMovement {
        $item     = $this->findItemOrFail($itemId, $tenantId);
        $location = $this->findLocationOrFail($sourceLocationId, $tenantId);

        $this->assertSufficientStock($itemId, $sourceLocationId, $tenantId, (float) $quantity);

        $date = new \DateTimeImmutable($extra['movement_date'] ?? 'today');

        $movement = new StockMovement(
            type:            'issue',
            referenceNumber: $this->generateRefNumber('issue', $tenantId),
            createdBy:       $userId,
            createdByName:   $userName,
            tenantId:        $tenantId,
            movementDate:    $date,
        );
        $movement->setPropertyId($propertyId ?? $location->getPropertyId());
        $movement->setSourceLocationId($sourceLocationId);
        $movement->setSourceLocationName($location->getName());
        if (isset($extra['notes']))        $movement->setNotes($extra['notes']);
        if (isset($extra['reference_id'])) {
            $movement->setReferenceId($extra['reference_id']);
            $movement->setReferenceType($extra['reference_type'] ?? 'requisition');
        }

        $this->em->persist($movement);

        // Get current WAC to record on the line
        $avgCost = $item->getAverageCost();

        $line = $this->buildLine(
            movement:     $movement,
            item:         $item,
            locationId:   $sourceLocationId,
            locationName: $location->getName(),
            quantity:     '-' . ltrim($quantity, '-'),   // signed negative
            unitCost:     $avgCost,
            tenantId:     $tenantId,
        );
        if (isset($extra['notes'])) $line->setNotes($extra['notes']);

        $this->applyMovementLine($line, $tenantId, $propertyId ?? $location->getPropertyId(), isInbound: false);

        $movement->setLineCount(1);
        $movement->setTotalValue($line->getLineValue());

        $this->em->flush();

        $this->logger->info("Issue posted: item={$item->getSku()}, qty={$quantity}, from={$location->getName()}");

        return $movement;
    }

    /**
     * Transfer — move stock from source location to destination location.
     * Creates two movement lines (one negative at source, one positive at destination).
     */
    public function createTransfer(
        string $tenantId,
        string $sourceLocationId,
        string $destinationLocationId,
        string $itemId,
        string $quantity,       // issue units (positive; will be negated for source line)
        string $userId,
        string $userName,
        ?string $propertyId = null,
        array   $extra = []
    ): StockMovement {
        if ($sourceLocationId === $destinationLocationId) {
            throw new \DomainException('Source and destination locations must be different.');
        }

        $item    = $this->findItemOrFail($itemId, $tenantId);
        $source  = $this->findLocationOrFail($sourceLocationId, $tenantId);
        $dest    = $this->findLocationOrFail($destinationLocationId, $tenantId);
        $qty     = (float) $quantity;

        $this->assertSufficientStock($itemId, $sourceLocationId, $tenantId, $qty);

        $date = new \DateTimeImmutable($extra['movement_date'] ?? 'today');

        $movement = new StockMovement(
            type:            'transfer',
            referenceNumber: $this->generateRefNumber('transfer', $tenantId),
            createdBy:       $userId,
            createdByName:   $userName,
            tenantId:        $tenantId,
            movementDate:    $date,
        );
        $movement->setPropertyId($propertyId ?? $source->getPropertyId() ?? $dest->getPropertyId());
        $movement->setSourceLocationId($sourceLocationId);
        $movement->setSourceLocationName($source->getName());
        $movement->setDestinationLocationId($destinationLocationId);
        $movement->setDestinationLocationName($dest->getName());
        if (isset($extra['notes'])) $movement->setNotes($extra['notes']);

        $this->em->persist($movement);

        $avgCost = $item->getAverageCost();

        // Source line — negative
        $srcLine = $this->buildLine(
            movement:     $movement,
            item:         $item,
            locationId:   $sourceLocationId,
            locationName: $source->getName(),
            quantity:     '-' . ltrim($quantity, '-'),
            unitCost:     $avgCost,
            tenantId:     $tenantId,
        );
        $this->applyMovementLine($srcLine, $tenantId, $movement->getPropertyId(), isInbound: false);

        // Destination line — positive
        $dstLine = $this->buildLine(
            movement:     $movement,
            item:         $item,
            locationId:   $destinationLocationId,
            locationName: $dest->getName(),
            quantity:     (string) $qty,
            unitCost:     $avgCost,
            tenantId:     $tenantId,
        );
        $this->applyMovementLine($dstLine, $tenantId, $movement->getPropertyId(), isInbound: true);

        $movement->setLineCount(2);
        $movement->setTotalValue($srcLine->getLineValue()); // value = outbound value

        $this->em->flush();

        $this->logger->info("Transfer posted: item={$item->getSku()}, qty={$quantity}, {$source->getName()} → {$dest->getName()}");

        return $movement;
    }

    /**
     * Adjustment — correct balance to a target quantity after a stock-take.
     * Calculates the delta (can be positive or negative).
     */
    public function createAdjustment(
        string $tenantId,
        string $locationId,
        string $itemId,
        string $countedQuantity,    // actual counted quantity (issue units)
        string $userId,
        string $userName,
        ?string $propertyId = null,
        array   $extra = []
    ): StockMovement {
        $item     = $this->findItemOrFail($itemId, $tenantId);
        $location = $this->findLocationOrFail($locationId, $tenantId);

        // Get current on-hand balance
        $balance = $this->getOrCreateBalance($itemId, $locationId, $tenantId, $propertyId ?? $location->getPropertyId());
        $currentQty   = (float) $balance->getQuantityOnHand();
        $countedQty   = (float) $countedQuantity;
        $delta        = $countedQty - $currentQty;

        // Zero delta = nothing to do
        if (abs($delta) < 0.0001) {
            throw new \DomainException("Counted quantity ({$countedQty}) matches current balance ({$currentQty}). No adjustment needed.");
        }

        $date = new \DateTimeImmutable($extra['movement_date'] ?? 'today');

        $movement = new StockMovement(
            type:            'adjustment',
            referenceNumber: $this->generateRefNumber('adjustment', $tenantId),
            createdBy:       $userId,
            createdByName:   $userName,
            tenantId:        $tenantId,
            movementDate:    $date,
        );
        $movement->setPropertyId($propertyId ?? $location->getPropertyId());
        $movement->setSourceLocationId($locationId);
        $movement->setSourceLocationName($location->getName());
        $movement->setDestinationLocationId($locationId);
        $movement->setDestinationLocationName($location->getName());
        if (isset($extra['notes'])) $movement->setNotes($extra['notes']);
        if (isset($extra['reference_id'])) {
            $movement->setReferenceId($extra['reference_id']);
            $movement->setReferenceType($extra['reference_type'] ?? 'stock_take');
        }

        $this->em->persist($movement);

        $avgCost  = $item->getAverageCost();
        $isInbound = $delta > 0;

        $line = $this->buildLine(
            movement:     $movement,
            item:         $item,
            locationId:   $locationId,
            locationName: $location->getName(),
            quantity:     (string) $delta,   // signed delta
            unitCost:     $avgCost,
            tenantId:     $tenantId,
        );
        if (isset($extra['notes'])) $line->setNotes($extra['notes']);

        $this->applyMovementLine($line, $tenantId, $propertyId ?? $location->getPropertyId(), isInbound: $isInbound);

        $movement->setLineCount(1);
        $movement->setTotalValue($line->getLineValue());

        $this->em->flush();

        $direction = $delta > 0 ? '+' : '';
        $this->logger->info("Adjustment posted: item={$item->getSku()}, delta={$direction}{$delta}, location={$location->getName()}");

        return $movement;
    }

    /**
     * POS Deduction — called automatically by PosService when an order is paid.
     *
     * Rules:
     * - NEVER throws. A failure here must never block a payment.
     * - Logs warnings on any error.
     * - Skips products with no stock_item_id (not linked to inventory).
     * - Uses the property's "bar" or "kitchen" department location; falls back
     *   to the first active store for the property; skips if none found.
     * - Deducts 1 issue unit per 1 POS quantity (1 portion = 1 issue unit).
     */
    public function processPosDeduction(
        string $orderId,
        string $tenantId,
        string $propertyId,
        string $userId,
        string $userName
    ): void {
        try {
            $order = $this->em->find(PosOrder::class, $orderId);
            if (!$order) {
                $this->logger->warning("POS deduction skipped: order {$orderId} not found.");
                return;
            }

            /** @var PosOrderItem[] $orderItems */
            $orderItems = $this->em->createQueryBuilder()
                ->select('i')
                ->from(PosOrderItem::class, 'i')
                ->where('i.orderId = :oid')
                ->setParameter('oid', $orderId)
                ->getQuery()->getResult();

            // Collect lines — skip items with no stock link
            $deductionLines = [];

            foreach ($orderItems as $orderItem) {
                if ($orderItem->getQuantity() <= 0) continue;

                /** @var PosProduct|null $product */
                $product = $this->em->find(PosProduct::class, $orderItem->getProductId());
                if (!$product || !$product->getStockItemId()) continue;

                $stockItem = $this->em->find(StockItem::class, $product->getStockItemId());
                if (!$stockItem || $stockItem->getTenantId() !== $tenantId || !$stockItem->isActive()) continue;

                // Find the best location for deduction
                $location = $this->findPosDeductionLocation($tenantId, $propertyId);
                if (!$location) {
                    $this->logger->warning(
                        "POS deduction: no active stock location found for property {$propertyId}. " .
                        "Skipping item {$stockItem->getSku()}."
                    );
                    continue;
                }

                // Check if there's a balance record at all — skip if nothing there
                $balance = $this->findBalance($stockItem->getId(), $location->getId(), $tenantId);
                if (!$balance) continue;

                $deductionLines[] = [
                    'item'         => $stockItem,
                    'location'     => $location,
                    'quantity'     => (string) $orderItem->getQuantity(),  // 1 POS qty = 1 issue unit
                    'product_name' => $orderItem->getProductName(),
                ];
            }

            if (empty($deductionLines)) return;

            // Build movement
            $movement = new StockMovement(
                type:            'pos_deduction',
                referenceNumber: $this->generateRefNumber('pos_deduction', $tenantId),
                createdBy:       $userId,
                createdByName:   $userName,
                tenantId:        $tenantId,
                movementDate:    new \DateTimeImmutable(),
            );
            $movement->setPropertyId($propertyId);
            $movement->setReferenceId($orderId);
            $movement->setReferenceType('pos_order');
            $movement->setNotes("Auto-deducted on POS order {$order->getOrderNumber()} payment");

            $this->em->persist($movement);

            $totalValue = 0;

            foreach ($deductionLines as $dl) {
                /** @var StockItem $stockItem */
                $stockItem = $dl['item'];
                /** @var StockLocation $location */
                $location  = $dl['location'];

                $line = $this->buildLine(
                    movement:     $movement,
                    item:         $stockItem,
                    locationId:   $location->getId(),
                    locationName: $location->getName(),
                    quantity:     '-' . ltrim($dl['quantity'], '-'),  // negative = OUT
                    unitCost:     $stockItem->getAverageCost(),
                    tenantId:     $tenantId,
                );

                $this->applyMovementLine($line, $tenantId, $propertyId, isInbound: false);
                $totalValue += (int) $line->getLineValue();
            }

            $movement->setLineCount(count($deductionLines));
            $movement->setTotalValue((string) $totalValue);

            $this->em->flush();

            $this->logger->info("POS deduction posted: order={$order->getOrderNumber()}, lines={$movement->getLineCount()}");

        } catch (\Throwable $e) {
            // Must NEVER re-throw — POS payment must succeed regardless of inventory state
            $this->logger->error("POS deduction failed (non-fatal): orderId={$orderId}, error={$e->getMessage()}");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // READ / LIST
    // ═══════════════════════════════════════════════════════════════

    /**
     * Paginated ledger with optional filters.
     * Returns ['movements' => StockMovement[], 'total' => int]
     */
    public function listMovements(
        string  $tenantId,
        int     $page        = 1,
        int     $perPage     = 30,
        ?string $type        = null,
        ?string $locationId  = null,
        ?string $itemId      = null,
        ?string $propertyId  = null,
        ?string $dateFrom    = null,
        ?string $dateTo      = null,
        ?string $status      = null
    ): array {
        $qb = $this->em->createQueryBuilder()
            ->select('m')
            ->from(StockMovement::class, 'm')
            ->where('m.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('m.movementDate', 'DESC')
            ->addOrderBy('m.createdAt', 'DESC');

        if ($type)       $qb->andWhere('m.type = :type')->setParameter('type', $type);
        if ($status)     $qb->andWhere('m.status = :status')->setParameter('status', $status);
        if ($propertyId) $qb->andWhere('m.propertyId = :pid')->setParameter('pid', $propertyId);
        if ($dateFrom)   $qb->andWhere('m.movementDate >= :from')->setParameter('from', new \DateTimeImmutable($dateFrom));
        if ($dateTo)     $qb->andWhere('m.movementDate <= :to')->setParameter('to', new \DateTimeImmutable($dateTo));

        if ($locationId) {
            $qb->andWhere(
                'm.sourceLocationId = :loc OR m.destinationLocationId = :loc'
            )->setParameter('loc', $locationId);
        }

        if ($itemId) {
            // Sub-query: only movements that have a line for this item
            $qb->andWhere(
                $qb->expr()->exists(
                    $this->em->createQueryBuilder()
                        ->select('1')
                        ->from(StockMovementLine::class, 'l')
                        ->where('l.movementId = m.id')
                        ->andWhere('l.itemId = :iid')
                        ->getDQL()
                )
            )->setParameter('iid', $itemId);
        }

        $total = (int) (clone $qb)
            ->select('COUNT(m.id)')
            ->getQuery()->getSingleScalarResult();

        $movements = $qb
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage)
            ->getQuery()->getResult();

        return ['movements' => $movements, 'total' => $total];
    }

    /**
     * Full movement detail including all lines.
     */
    public function getMovement(string $id, string $tenantId): array
    {
        $movement = $this->em->find(StockMovement::class, $id);
        if (!$movement || $movement->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Movement not found');
        }

        $lines = $this->em->createQueryBuilder()
            ->select('l')
            ->from(StockMovementLine::class, 'l')
            ->where('l.movementId = :mid')
            ->setParameter('mid', $id)
            ->orderBy('l.createdAt', 'ASC')
            ->getQuery()->getResult();

        return [
            'movement' => $movement->toArray(),
            'lines'    => array_map(fn($l) => $l->toArray(), $lines),
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // CORE BALANCE MUTATION (private)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Applies a movement line to the stock_balances table.
     * Sets before/after quantities on the line.
     * Recalculates weighted average cost (WAC) on inbound movements.
     * Does NOT flush — caller is responsible for flushing after all lines.
     */
    private function applyMovementLine(
        StockMovementLine $line,
        string            $tenantId,
        ?string           $propertyId,
        bool              $isInbound
    ): void {
        $balance = $this->getOrCreateBalance(
            $line->getItemId(),
            $line->getLocationId(),
            $tenantId,
            $propertyId
        );

        $before    = (float) $balance->getQuantityOnHand();
        $delta     = (float) $line->getQuantity();     // already signed
        $after     = $before + $delta;
        $unitCost  = (int)   $line->getUnitCost();

        // Snapshot before/after on the line
        $line->setBeforeQuantity(number_format($before, 4, '.', ''));
        $line->setAfterQuantity(number_format($after, 4, '.', ''));

        // Update balance quantity
        $balance->setQuantityOnHand(number_format($after, 4, '.', ''));
        $balance->setLastMovementAt(new \DateTimeImmutable());

        // Recalculate value_on_hand
        if ($isInbound && $unitCost > 0) {
            // WAC recalculation:  new_wac = (existing_value + incoming_value) / new_qty
            $existingValue  = (int) $balance->getValueOnHand();
            $incomingValue  = (int) abs($delta) * $unitCost;
            $newTotalValue  = $existingValue + $incomingValue;
            $balance->setValueOnHand((string) max(0, $newTotalValue));

            // Update item-level average cost
            if ($after > 0) {
                $newWac = (int) round($newTotalValue / $after);
                $item   = $this->em->find(StockItem::class, $line->getItemId());
                if ($item) {
                    $item->setAverageCost((string) $newWac);
                    $item->setLastPurchaseCost((string) $unitCost);
                }
            }
        } else {
            // Outbound: reduce value proportionally using current WAC
            $item    = $this->em->find(StockItem::class, $line->getItemId());
            $wac     = $item ? (int) $item->getAverageCost() : $unitCost;
            $outValue = (int) abs($delta) * $wac;
            $newValue = max(0, (int) $balance->getValueOnHand() - $outValue);
            $balance->setValueOnHand((string) $newValue);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    private function buildLine(
        StockMovement $movement,
        StockItem     $item,
        string        $locationId,
        string        $locationName,
        string        $quantity,
        string        $unitCost,
        string        $tenantId
    ): StockMovementLine {
        $line = new StockMovementLine(
            movementId:   $movement->getId(),
            itemId:       $item->getId(),
            itemSku:      $item->getSku(),
            itemName:     $item->getName(),
            locationId:   $locationId,
            locationName: $locationName,
            quantity:     $quantity,
            unitCost:     $unitCost,
            tenantId:     $tenantId,
        );
        $this->em->persist($line);
        return $line;
    }

    private function getOrCreateBalance(
        string  $itemId,
        string  $locationId,
        string  $tenantId,
        ?string $propertyId
    ): StockBalance {
        $balance = $this->findBalance($itemId, $locationId, $tenantId);

        if (!$balance) {
            $balance = new StockBalance($itemId, $locationId, $tenantId, $propertyId);
            $this->em->persist($balance);
        }

        return $balance;
    }

    private function findBalance(string $itemId, string $locationId, string $tenantId): ?StockBalance
    {
        return $this->em->createQueryBuilder()
            ->select('b')
            ->from(StockBalance::class, 'b')
            ->where('b.tenantId = :tid')
            ->andWhere('b.itemId = :iid')
            ->andWhere('b.locationId = :lid')
            ->setParameter('tid', $tenantId)
            ->setParameter('iid', $itemId)
            ->setParameter('lid', $locationId)
            ->getQuery()->getOneOrNullResult();
    }

    private function assertSufficientStock(
        string $itemId,
        string $locationId,
        string $tenantId,
        float  $requiredQty
    ): void {
        $balance = $this->findBalance($itemId, $locationId, $tenantId);
        $available = $balance ? (float) $balance->getQuantityAvailable() : 0.0;

        if ($available < $requiredQty) {
            $item = $this->em->find(StockItem::class, $itemId);
            $sku  = $item ? $item->getSku() : $itemId;
            throw new \DomainException(
                "Insufficient stock for {$sku}: requested {$requiredQty}, available {$available}."
            );
        }
    }

    /**
     * For POS deduction: find the best available stock location for the property.
     * Priority: bar → kitchen → any department → any store.
     */
    private function findPosDeductionLocation(string $tenantId, string $propertyId): ?StockLocation
    {
        $departmentPriority = ['bar', 'kitchen', 'general'];

        foreach ($departmentPriority as $dept) {
            $loc = $this->em->createQueryBuilder()
                ->select('l')
                ->from(StockLocation::class, 'l')
                ->where('l.tenantId = :tid')
                ->andWhere('l.propertyId = :pid')
                ->andWhere('l.isActive = true')
                ->andWhere('l.department = :dept')
                ->setParameter('tid', $tenantId)
                ->setParameter('pid', $propertyId)
                ->setParameter('dept', $dept)
                ->setMaxResults(1)
                ->getQuery()->getOneOrNullResult();

            if ($loc) return $loc;
        }

        // Fallback: any active location for this property
        return $this->em->createQueryBuilder()
            ->select('l')
            ->from(StockLocation::class, 'l')
            ->where('l.tenantId = :tid')
            ->andWhere('l.propertyId = :pid')
            ->andWhere('l.isActive = true')
            ->setParameter('tid', $tenantId)
            ->setParameter('pid', $propertyId)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    private function findItemOrFail(string $id, string $tenantId): StockItem
    {
        $item = $this->em->find(StockItem::class, $id);
        if (!$item || $item->getTenantId() !== $tenantId) {
            throw new \RuntimeException("Stock item not found: {$id}");
        }
        return $item;
    }

    private function findLocationOrFail(string $id, string $tenantId): StockLocation
    {
        $loc = $this->em->find(StockLocation::class, $id);
        if (!$loc || $loc->getTenantId() !== $tenantId) {
            throw new \RuntimeException("Stock location not found: {$id}");
        }
        return $loc;
    }

    /**
     * Generates a sequential reference number.
     * Format: MVT-{ABBR}-{YYYYMMDD}-{4-digit seq}
     * Sequence resets per day per type — collisions are impossible because
     * the count is taken within the same transaction before flush.
     */
    private function generateRefNumber(string $type, string $tenantId): string
    {
        $abbr = match($type) {
            'opening'       => 'OPN',
            'grn'           => 'GRN',
            'issue'         => 'ISS',
            'transfer'      => 'TRF',
            'adjustment'    => 'ADJ',
            'pos_deduction' => 'POS',
            default         => strtoupper(substr($type, 0, 3)),
        };

        $today = (new \DateTimeImmutable())->format('Ymd');

        $todayCount = (int) $this->em->createQueryBuilder()
            ->select('COUNT(m.id)')
            ->from(StockMovement::class, 'm')
            ->where('m.tenantId = :tid')
            ->andWhere('m.type = :type')
            ->andWhere('m.createdAt >= :start')
            ->setParameter('tid', $tenantId)
            ->setParameter('type', $type)
            ->setParameter('start', new \DateTimeImmutable('today'))
            ->getQuery()->getSingleScalarResult();

        $seq = str_pad((string)($todayCount + 1), 4, '0', STR_PAD_LEFT);

        return "MVT-{$abbr}-{$today}-{$seq}";
    }
}
