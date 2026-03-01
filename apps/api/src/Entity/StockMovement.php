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
 * Immutable header record for every stock movement.
 *
 * Types:
 *   opening     — Opening balance entry (Phase A replacement)
 *   grn         — Goods Received Note (inbound from supplier)
 *   issue       — Manual issue out to a department / cost centre
 *   transfer    — Stock moved between two locations
 *   adjustment  — Stock-take correction (positive or negative)
 *   pos_deduction — Auto-fired when a POS order is paid
 *
 * Status:
 *   draft       — Not yet posted (only GRN uses this for multi-step entry)
 *   posted      — Balances have been updated; record is immutable
 *   cancelled   — Voided before posting (only draft records can be cancelled)
 */
#[ORM\Entity]
#[ORM\Table(name: 'stock_movements')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'type'], name: 'stk_mvt_type')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'movement_date'], name: 'stk_mvt_date')]
#[ORM\Index(columns: ['tenant_id', 'source_location_id'], name: 'stk_mvt_src')]
#[ORM\Index(columns: ['tenant_id', 'destination_location_id'], name: 'stk_mvt_dst')]
#[ORM\Index(columns: ['tenant_id', 'reference_id'], name: 'stk_mvt_ref')]
#[ORM\HasLifecycleCallbacks]
class StockMovement implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $propertyId = null;

    /**
     * opening | grn | issue | transfer | adjustment | pos_deduction
     */
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $type;

    /**
     * draft | posted | cancelled
     */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'posted'])]
    private string $status = 'posted';

    /**
     * Human-readable reference number (auto-generated or from supplier).
     * Format: MVT-{TYPE}-{YYYYMMDD}-{SEQ}  e.g. MVT-GRN-20260301-0042
     */
    #[ORM\Column(name: 'reference_number', type: Types::STRING, length: 80)]
    private string $referenceNumber;

    /**
     * Optional external reference: PO number, invoice number, POS order ID, etc.
     */
    #[ORM\Column(name: 'reference_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $referenceId = null;

    #[ORM\Column(name: 'reference_type', type: Types::STRING, length: 30, nullable: true)]
    private ?string $referenceType = null;

    /** Source location (all types except opening & grn have a source) */
    #[ORM\Column(name: 'source_location_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $sourceLocationId = null;

    /** Destination location (grn, transfer, opening, adjustment) */
    #[ORM\Column(name: 'destination_location_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $destinationLocationId = null;

    /** Denormalised name for display without a join */
    #[ORM\Column(name: 'source_location_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $sourceLocationName = null;

    #[ORM\Column(name: 'destination_location_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $destinationLocationName = null;

    /** Date the movement was physically executed */
    #[ORM\Column(name: 'movement_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $movementDate;

    /** For GRN: supplier name */
    #[ORM\Column(name: 'supplier_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $supplierName = null;

    /** For GRN: supplier invoice number */
    #[ORM\Column(name: 'supplier_invoice', type: Types::STRING, length: 80, nullable: true)]
    private ?string $supplierInvoice = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    /** User who created/posted this movement */
    #[ORM\Column(name: 'created_by', type: Types::STRING, length: 36)]
    private string $createdBy;

    #[ORM\Column(name: 'created_by_name', type: Types::STRING, length: 100)]
    private string $createdByName;

    /** Total value of all lines in kobo (sum of qty × unit_cost per line) */
    #[ORM\Column(name: 'total_value', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalValue = '0';

    /** Number of line items */
    #[ORM\Column(name: 'line_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $lineCount = 0;

    public function __construct(
        string $type,
        string $referenceNumber,
        string $createdBy,
        string $createdByName,
        string $tenantId,
        \DateTimeImmutable $movementDate,
        string $status = 'posted'
    ) {
        $this->generateId();
        $this->type            = $type;
        $this->referenceNumber = $referenceNumber;
        $this->createdBy       = $createdBy;
        $this->createdByName   = $createdByName;
        $this->movementDate    = $movementDate;
        $this->status          = $status;
        $this->setTenantId($tenantId);
    }

    // ── Getters / setters ────────────────────────────────────────

    public function getPropertyId(): ?string { return $this->propertyId; }
    public function setPropertyId(?string $v): void { $this->propertyId = $v; }

    public function getType(): string { return $this->type; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): void { $this->status = $v; }
    public function post(): void { $this->status = 'posted'; }
    public function cancel(): void { $this->status = 'cancelled'; }

    public function getReferenceNumber(): string { return $this->referenceNumber; }
    public function setReferenceNumber(string $v): void { $this->referenceNumber = $v; }

    public function getReferenceId(): ?string { return $this->referenceId; }
    public function setReferenceId(?string $v): void { $this->referenceId = $v; }

    public function getReferenceType(): ?string { return $this->referenceType; }
    public function setReferenceType(?string $v): void { $this->referenceType = $v; }

    public function getSourceLocationId(): ?string { return $this->sourceLocationId; }
    public function setSourceLocationId(?string $v): void { $this->sourceLocationId = $v; }

    public function getDestinationLocationId(): ?string { return $this->destinationLocationId; }
    public function setDestinationLocationId(?string $v): void { $this->destinationLocationId = $v; }

    public function getSourceLocationName(): ?string { return $this->sourceLocationName; }
    public function setSourceLocationName(?string $v): void { $this->sourceLocationName = $v; }

    public function getDestinationLocationName(): ?string { return $this->destinationLocationName; }
    public function setDestinationLocationName(?string $v): void { $this->destinationLocationName = $v; }

    public function getMovementDate(): \DateTimeImmutable { return $this->movementDate; }
    public function setMovementDate(\DateTimeImmutable $v): void { $this->movementDate = $v; }

    public function getSupplierName(): ?string { return $this->supplierName; }
    public function setSupplierName(?string $v): void { $this->supplierName = $v; }

    public function getSupplierInvoice(): ?string { return $this->supplierInvoice; }
    public function setSupplierInvoice(?string $v): void { $this->supplierInvoice = $v; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function getCreatedBy(): string { return $this->createdBy; }
    public function getCreatedByName(): string { return $this->createdByName; }

    public function getTotalValue(): string { return $this->totalValue; }
    public function setTotalValue(string $v): void { $this->totalValue = $v; }

    public function getLineCount(): int { return $this->lineCount; }
    public function setLineCount(int $v): void { $this->lineCount = $v; }

    public function getTypeLabel(): string
    {
        return match($this->type) {
            'opening'       => 'Opening Balance',
            'grn'           => 'Goods Received',
            'issue'         => 'Issue',
            'transfer'      => 'Transfer',
            'adjustment'    => 'Adjustment',
            'pos_deduction' => 'POS Deduction',
            default         => ucfirst($this->type),
        };
    }

    public function getTypeColor(): string
    {
        return match($this->type) {
            'grn'           => 'green',
            'opening'       => 'blue',
            'issue'         => 'orange',
            'transfer'      => 'purple',
            'adjustment'    => 'yellow',
            'pos_deduction' => 'red',
            default         => 'gray',
        };
    }

    public function toArray(): array
    {
        return [
            'id'                       => $this->getId(),
            'tenant_id'                => $this->getTenantId(),
            'property_id'              => $this->propertyId,
            'type'                     => $this->type,
            'type_label'               => $this->getTypeLabel(),
            'type_color'               => $this->getTypeColor(),
            'status'                   => $this->status,
            'reference_number'         => $this->referenceNumber,
            'reference_id'             => $this->referenceId,
            'reference_type'           => $this->referenceType,
            'source_location_id'       => $this->sourceLocationId,
            'source_location_name'     => $this->sourceLocationName,
            'destination_location_id'  => $this->destinationLocationId,
            'destination_location_name'=> $this->destinationLocationName,
            'movement_date'            => $this->movementDate->format('Y-m-d'),
            'supplier_name'            => $this->supplierName,
            'supplier_invoice'         => $this->supplierInvoice,
            'notes'                    => $this->notes,
            'created_by'               => $this->createdBy,
            'created_by_name'          => $this->createdByName,
            'total_value'              => $this->totalValue,
            'line_count'               => $this->lineCount,
            'created_at'               => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at'               => $this->updatedAt->format('Y-m-d H:i:s'),
        ];
    }
}
