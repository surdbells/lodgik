<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * One line item on a Purchase Order.
 *
 * Quantities are in PURCHASE units (matching the GRN input convention).
 * The GRN → MovementService converts to issue units using the item's
 * purchase_to_issue_factor. received_quantity here stays in purchase units
 * so it can be directly compared against ordered_quantity.
 *
 * Status per line:
 *   pending   — nothing received yet
 *   partial   — some units received, not all
 *   received  — fully received (received_quantity >= ordered_quantity)
 *   cancelled — line was removed / zeroed before any delivery
 *
 * location_id / location_name — the StockLocation where this item should be
 * received into (defaults to the GRN destination location if not specified).
 */
#[ORM\Entity]
#[ORM\Table(name: 'purchase_order_lines')]
#[ORM\Index(columns: ['tenant_id', 'order_id'],  name: 'pur_orl_order')]
#[ORM\Index(columns: ['tenant_id', 'item_id'],   name: 'pur_orl_item')]
#[ORM\Index(columns: ['tenant_id', 'status'],    name: 'pur_orl_status')]
#[ORM\HasLifecycleCallbacks]
class PurchaseOrderLine implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'order_id', type: Types::STRING, length: 36)]
    private string $orderId;

    // ── Item (denormalised) ──────────────────────────────────────

    #[ORM\Column(name: 'item_id', type: Types::STRING, length: 36)]
    private string $itemId;

    #[ORM\Column(name: 'item_sku', type: Types::STRING, length: 50)]
    private string $itemSku;

    #[ORM\Column(name: 'item_name', type: Types::STRING, length: 200)]
    private string $itemName;

    // ── Destination location (denormalised) ──────────────────────

    #[ORM\Column(name: 'location_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $locationId = null;

    #[ORM\Column(name: 'location_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $locationName = null;

    // ── Quantities (purchase units) ──────────────────────────────

    /** Ordered quantity in purchase units (e.g. 10 Cases) */
    #[ORM\Column(name: 'ordered_quantity', type: Types::DECIMAL, precision: 15, scale: 4)]
    private string $orderedQuantity;

    /** Cumulative received quantity in purchase units — updated on each GRN post */
    #[ORM\Column(name: 'received_quantity', type: Types::DECIMAL, precision: 15, scale: 4, options: ['default' => '0.0000'])]
    private string $receivedQuantity = '0.0000';

    // ── Financials ───────────────────────────────────────────────

    /** kobo per purchase unit */
    #[ORM\Column(name: 'unit_cost', type: Types::BIGINT)]
    private string $unitCost;

    /** ordered_quantity × unit_cost in kobo */
    #[ORM\Column(name: 'line_total', type: Types::BIGINT, options: ['default' => 0])]
    private string $lineTotal = '0';

    // ── Status ───────────────────────────────────────────────────

    /** pending | partial | received | cancelled */
    #[ORM\Column(type: Types::STRING, length: 12, options: ['default' => 'pending'])]
    private string $status = 'pending';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    // ── Constructor ─────────────────────────────────────────────

    public function __construct(
        string $orderId,
        string $itemId,
        string $itemSku,
        string $itemName,
        string $orderedQuantity,
        string $unitCost,
        string $tenantId,
    ) {
        $this->generateId();
        $this->orderId         = $orderId;
        $this->itemId          = $itemId;
        $this->itemSku         = $itemSku;
        $this->itemName        = $itemName;
        $this->orderedQuantity = $orderedQuantity;
        $this->unitCost        = $unitCost;
        $this->setTenantId($tenantId);
        $this->recalcLineTotal();
    }

    // ── Helpers ─────────────────────────────────────────────────

    private function recalcLineTotal(): void
    {
        $this->lineTotal = (string)(int)(
            (float) $this->orderedQuantity * (int) $this->unitCost
        );
    }

    /**
     * Record a delivery of $receivedPurchaseQty against this line.
     * Updates received_quantity and advances status.
     * Returns true if the line is now fully received.
     */
    public function applyDelivery(float $receivedPurchaseQty): bool
    {
        $newReceived = (float) $this->receivedQuantity + $receivedPurchaseQty;
        $this->receivedQuantity = number_format($newReceived, 4, '.', '');

        $ordered = (float) $this->orderedQuantity;

        if ($newReceived >= $ordered) {
            $this->status = 'received';
            return true;
        }

        $this->status = 'partial';
        return false;
    }

    // ── Getters / Setters ───────────────────────────────────────

    public function getOrderId(): string { return $this->orderId; }
    public function getItemId(): string { return $this->itemId; }
    public function getItemSku(): string { return $this->itemSku; }
    public function getItemName(): string { return $this->itemName; }
    public function getLocationId(): ?string { return $this->locationId; }
    public function setLocationId(?string $v): void { $this->locationId = $v; }
    public function getLocationName(): ?string { return $this->locationName; }
    public function setLocationName(?string $v): void { $this->locationName = $v; }
    public function getOrderedQuantity(): string { return $this->orderedQuantity; }
    public function setOrderedQuantity(string $v): void { $this->orderedQuantity = $v; $this->recalcLineTotal(); }
    public function getReceivedQuantity(): string { return $this->receivedQuantity; }
    public function getUnitCost(): string { return $this->unitCost; }
    public function setUnitCost(string $v): void { $this->unitCost = $v; $this->recalcLineTotal(); }
    public function getLineTotal(): string { return $this->lineTotal; }
    public function getStatus(): string { return $this->status; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    /** Quantity still outstanding (ordered - received), clamped to 0 */
    public function getOutstandingQuantity(): float
    {
        return max(0.0, (float) $this->orderedQuantity - (float) $this->receivedQuantity);
    }

    public function isFullyReceived(): bool
    {
        return $this->status === 'received';
    }

    // ── Serialise ────────────────────────────────────────────────

    public function toArray(): array
    {
        return [
            'id'                  => $this->getId(),
            'order_id'            => $this->orderId,
            'item_id'             => $this->itemId,
            'item_sku'            => $this->itemSku,
            'item_name'           => $this->itemName,
            'location_id'         => $this->locationId,
            'location_name'       => $this->locationName,
            'ordered_quantity'    => $this->orderedQuantity,
            'received_quantity'   => $this->receivedQuantity,
            'outstanding_quantity'=> number_format($this->getOutstandingQuantity(), 4, '.', ''),
            'unit_cost'           => $this->unitCost,
            'line_total'          => $this->lineTotal,
            'status'              => $this->status,
            'notes'               => $this->notes,
            'created_at'          => $this->getCreatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
