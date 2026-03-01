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
 * One line item on a Purchase Request.
 *
 * quantities are in issue units (same as StockMovementLine).
 * estimated_unit_cost is kobo per issue unit — used for PR total_estimated_value.
 * The line is tenant-scoped so the tenant filter works transparently.
 */
#[ORM\Entity]
#[ORM\Table(name: 'purchase_request_lines')]
#[ORM\Index(columns: ['tenant_id', 'request_id'], name: 'pur_rql_req')]
#[ORM\Index(columns: ['tenant_id', 'item_id'],    name: 'pur_rql_item')]
#[ORM\HasLifecycleCallbacks]
class PurchaseRequestLine implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'request_id', type: Types::STRING, length: 36)]
    private string $requestId;

    #[ORM\Column(name: 'item_id', type: Types::STRING, length: 36)]
    private string $itemId;

    /** Denormalised — preserved for display even if item is later renamed */
    #[ORM\Column(name: 'item_sku', type: Types::STRING, length: 50)]
    private string $itemSku;

    #[ORM\Column(name: 'item_name', type: Types::STRING, length: 200)]
    private string $itemName;

    /** Quantity in issue units */
    #[ORM\Column(type: Types::DECIMAL, precision: 15, scale: 4)]
    private string $quantity;

    /** Symbol of the issue UOM (e.g. "Btl", "kg") — denormalised for display */
    #[ORM\Column(name: 'unit_of_measure', type: Types::STRING, length: 20, nullable: true)]
    private ?string $unitOfMeasure = null;

    /** kobo per issue unit — optional estimate for budgeting */
    #[ORM\Column(name: 'estimated_unit_cost', type: Types::BIGINT, options: ['default' => 0])]
    private string $estimatedUnitCost = '0';

    /** kobo — quantity × estimated_unit_cost */
    #[ORM\Column(name: 'estimated_line_value', type: Types::BIGINT, options: ['default' => 0])]
    private string $estimatedLineValue = '0';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    // ── Constructor ─────────────────────────────────────────────

    public function __construct(
        string $requestId,
        string $itemId,
        string $itemSku,
        string $itemName,
        string $quantity,
        string $tenantId,
    ) {
        $this->generateId();
        $this->requestId = $requestId;
        $this->itemId    = $itemId;
        $this->itemSku   = $itemSku;
        $this->itemName  = $itemName;
        $this->quantity  = $quantity;
        $this->setTenantId($tenantId);
        $this->recalc();
    }

    // ── Helpers ─────────────────────────────────────────────────

    private function recalc(): void
    {
        $this->estimatedLineValue = (string) (int) (
            (float) $this->quantity * (int) $this->estimatedUnitCost
        );
    }

    // ── Getters / Setters ───────────────────────────────────────

    public function getRequestId(): string { return $this->requestId; }
    public function getItemId(): string { return $this->itemId; }
    public function getItemSku(): string { return $this->itemSku; }
    public function getItemName(): string { return $this->itemName; }
    public function getQuantity(): string { return $this->quantity; }
    public function setQuantity(string $v): void { $this->quantity = $v; $this->recalc(); }
    public function getUnitOfMeasure(): ?string { return $this->unitOfMeasure; }
    public function setUnitOfMeasure(?string $v): void { $this->unitOfMeasure = $v; }
    public function getEstimatedUnitCost(): string { return $this->estimatedUnitCost; }
    public function setEstimatedUnitCost(string $v): void { $this->estimatedUnitCost = $v; $this->recalc(); }
    public function getEstimatedLineValue(): string { return $this->estimatedLineValue; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    // ── Serialise ────────────────────────────────────────────────

    public function toArray(): array
    {
        return [
            'id'                    => $this->getId(),
            'request_id'            => $this->requestId,
            'item_id'               => $this->itemId,
            'item_sku'              => $this->itemSku,
            'item_name'             => $this->itemName,
            'quantity'              => $this->quantity,
            'unit_of_measure'       => $this->unitOfMeasure,
            'estimated_unit_cost'   => $this->estimatedUnitCost,
            'estimated_line_value'  => $this->estimatedLineValue,
            'notes'                 => $this->notes,
            'created_at'            => $this->getCreatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
