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
 * One line item within a StockMovement.
 *
 * Quantities are always in ISSUE units.
 * quantity is signed:
 *   positive = stock IN  (grn, opening, transfer-destination, positive adjustment)
 *   negative = stock OUT (issue, transfer-source, negative adjustment, pos_deduction)
 *
 * before_quantity / after_quantity snapshot the balance at the affected location
 * at the moment this line was posted — providing a full point-in-time audit trail.
 */
#[ORM\Entity]
#[ORM\Table(name: 'stock_movement_lines')]
#[ORM\Index(columns: ['tenant_id', 'movement_id'], name: 'stk_mvl_movement')]
#[ORM\Index(columns: ['tenant_id', 'item_id'], name: 'stk_mvl_item')]
#[ORM\Index(columns: ['tenant_id', 'location_id'], name: 'stk_mvl_location')]
#[ORM\HasLifecycleCallbacks]
class StockMovementLine implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'movement_id', type: Types::STRING, length: 36)]
    private string $movementId;

    #[ORM\Column(name: 'item_id', type: Types::STRING, length: 36)]
    private string $itemId;

    /** Denormalised for display without a join */
    #[ORM\Column(name: 'item_sku', type: Types::STRING, length: 50)]
    private string $itemSku;

    #[ORM\Column(name: 'item_name', type: Types::STRING, length: 150)]
    private string $itemName;

    /**
     * The location whose balance is affected by this line.
     * For a transfer this entity is written TWICE — once for the source
     * (negative qty) and once for the destination (positive qty).
     */
    #[ORM\Column(name: 'location_id', type: Types::STRING, length: 36)]
    private string $locationId;

    #[ORM\Column(name: 'location_name', type: Types::STRING, length: 100)]
    private string $locationName;

    /**
     * Signed quantity in ISSUE units.
     * Positive = stock IN, Negative = stock OUT.
     */
    #[ORM\Column(type: Types::DECIMAL, precision: 15, scale: 4)]
    private string $quantity;

    /**
     * Unit cost at the time of this movement, in kobo per ISSUE unit.
     * For outbound movements this is the weighted average cost at time of issue.
     * For GRN this is the purchase cost converted to per-issue-unit.
     */
    #[ORM\Column(name: 'unit_cost', type: Types::BIGINT, options: ['default' => 0])]
    private string $unitCost = '0';

    /** quantity × unit_cost in kobo (always positive) */
    #[ORM\Column(name: 'line_value', type: Types::BIGINT, options: ['default' => 0])]
    private string $lineValue = '0';

    /** Balance at this location BEFORE this line was applied */
    #[ORM\Column(name: 'before_quantity', type: Types::DECIMAL, precision: 15, scale: 4, options: ['default' => '0.0000'])]
    private string $beforeQuantity = '0.0000';

    /** Balance at this location AFTER this line was applied */
    #[ORM\Column(name: 'after_quantity', type: Types::DECIMAL, precision: 15, scale: 4, options: ['default' => '0.0000'])]
    private string $afterQuantity = '0.0000';

    /**
     * For GRN: the qty entered was in PURCHASE units; this records the purchase qty
     * before conversion so the GRN document can display the original supplier qty.
     */
    #[ORM\Column(name: 'purchase_quantity', type: Types::DECIMAL, precision: 15, scale: 4, nullable: true)]
    private ?string $purchaseQuantity = null;

    /** For perishable items: batch/lot number */
    #[ORM\Column(name: 'batch_number', type: Types::STRING, length: 80, nullable: true)]
    private ?string $batchNumber = null;

    /** For perishable items: expiry date */
    #[ORM\Column(name: 'expiry_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $expiryDate = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(
        string $movementId,
        string $itemId,
        string $itemSku,
        string $itemName,
        string $locationId,
        string $locationName,
        string $quantity,
        string $unitCost,
        string $tenantId
    ) {
        $this->generateId();
        $this->movementId   = $movementId;
        $this->itemId       = $itemId;
        $this->itemSku      = $itemSku;
        $this->itemName     = $itemName;
        $this->locationId   = $locationId;
        $this->locationName = $locationName;
        $this->quantity     = $quantity;
        $this->unitCost     = $unitCost;
        $this->lineValue    = (string)(int)(abs((float)$quantity) * (int)$unitCost);
        $this->setTenantId($tenantId);
    }

    public function getMovementId(): string { return $this->movementId; }
    public function getItemId(): string { return $this->itemId; }
    public function getItemSku(): string { return $this->itemSku; }
    public function getItemName(): string { return $this->itemName; }
    public function getLocationId(): string { return $this->locationId; }
    public function getLocationName(): string { return $this->locationName; }

    public function getQuantity(): string { return $this->quantity; }
    public function setQuantity(string $v): void
    {
        $this->quantity  = $v;
        $this->lineValue = (string)(int)(abs((float)$v) * (int)$this->unitCost);
    }

    public function getUnitCost(): string { return $this->unitCost; }
    public function setUnitCost(string $v): void
    {
        $this->unitCost  = $v;
        $this->lineValue = (string)(int)(abs((float)$this->quantity) * (int)$v);
    }

    public function getLineValue(): string { return $this->lineValue; }

    public function getBeforeQuantity(): string { return $this->beforeQuantity; }
    public function setBeforeQuantity(string $v): void { $this->beforeQuantity = $v; }

    public function getAfterQuantity(): string { return $this->afterQuantity; }
    public function setAfterQuantity(string $v): void { $this->afterQuantity = $v; }

    public function getPurchaseQuantity(): ?string { return $this->purchaseQuantity; }
    public function setPurchaseQuantity(?string $v): void { $this->purchaseQuantity = $v; }

    public function getBatchNumber(): ?string { return $this->batchNumber; }
    public function setBatchNumber(?string $v): void { $this->batchNumber = $v; }

    public function getExpiryDate(): ?\DateTimeImmutable { return $this->expiryDate; }
    public function setExpiryDate(?\DateTimeImmutable $v): void { $this->expiryDate = $v; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function toArray(): array
    {
        return [
            'id'               => $this->getId(),
            'movement_id'      => $this->movementId,
            'item_id'          => $this->itemId,
            'item_sku'         => $this->itemSku,
            'item_name'        => $this->itemName,
            'location_id'      => $this->locationId,
            'location_name'    => $this->locationName,
            'quantity'         => $this->quantity,
            'unit_cost'        => $this->unitCost,
            'line_value'       => $this->lineValue,
            'before_quantity'  => $this->beforeQuantity,
            'after_quantity'   => $this->afterQuantity,
            'purchase_quantity'=> $this->purchaseQuantity,
            'batch_number'     => $this->batchNumber,
            'expiry_date'      => $this->expiryDate?->format('Y-m-d'),
            'notes'            => $this->notes,
            'created_at'       => $this->createdAt->format('Y-m-d H:i:s'),
        ];
    }
}
