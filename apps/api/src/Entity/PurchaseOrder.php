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
 * Purchase Order — the formal order sent to a vendor.
 *
 * Status lifecycle:
 *   draft               → sent        (when emailed to vendor)
 *   draft               → cancelled
 *   sent                → partially_delivered  (first GRN posted against this PO)
 *   sent                → delivered            (all lines fully received)
 *   sent                → cancelled
 *   partially_delivered → delivered            (remaining lines received)
 *   partially_delivered → cancelled
 *
 * A PO can be created:
 *   (a) directly (vendor, items, quantities chosen manually), or
 *   (b) from an approved PurchaseRequest (request_id set, lines pre-populated).
 *
 * Vendor name/email are denormalised at creation time so historical records
 * remain stable even if the Vendor record is later edited.
 */
#[ORM\Entity]
#[ORM\Table(name: 'purchase_orders')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'],    name: 'pur_ord_status')]
#[ORM\Index(columns: ['tenant_id', 'vendor_id'],                name: 'pur_ord_vendor')]
#[ORM\Index(columns: ['tenant_id', 'request_id'],               name: 'pur_ord_req')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'created_at'], name: 'pur_ord_date')]
#[ORM\HasLifecycleCallbacks]
class PurchaseOrder implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    // ── Header ──────────────────────────────────────────────────

    /** PO-YYYYMMDD-0001 */
    #[ORM\Column(name: 'reference_number', type: Types::STRING, length: 30)]
    private string $referenceNumber;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    /**
     * draft | sent | partially_delivered | delivered | cancelled
     */
    #[ORM\Column(type: Types::STRING, length: 25, options: ['default' => 'draft'])]
    private string $status = 'draft';

    // ── Vendor (denormalised snapshot) ──────────────────────────

    /** Nullable — open-market POs have no registered vendor */
    #[ORM\Column(name: 'vendor_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $vendorId = null;

    /** Snapshot of registered vendor name — null for open-market POs */
    #[ORM\Column(name: 'vendor_name', type: Types::STRING, length: 150)]
    private string $vendorName;

    // ── Open-Market Purchase ─────────────────────────────────────

    /** True when raised without a registered vendor */
    #[ORM\Column(name: 'is_open_market', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isOpenMarket = false;

    /** Informal supplier name for open-market purchases */
    #[ORM\Column(name: 'open_market_vendor_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $openMarketVendorName = null;

    /** Why this purchase is being made outside the vendor registry */
    #[ORM\Column(name: 'open_market_reason', type: Types::TEXT, nullable: true)]
    private ?string $openMarketReason = null;

    // ── Second Approval (fraud prevention) ──────────────────────

    /** True when this PO requires a second sign-off (open-market above threshold) */
    #[ORM\Column(name: 'second_approval_required', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $secondApprovalRequired = false;

    #[ORM\Column(name: 'second_approved_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $secondApprovedBy = null;

    #[ORM\Column(name: 'second_approved_by_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $secondApprovedByName = null;

    #[ORM\Column(name: 'second_approved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $secondApprovedAt = null;

    /** Snapshot of vendor email at time of PO send — used for re-send too */
    #[ORM\Column(name: 'vendor_email', type: Types::STRING, length: 150, nullable: true)]
    private ?string $vendorEmail = null;

    #[ORM\Column(name: 'vendor_contact_person', type: Types::STRING, length: 100, nullable: true)]
    private ?string $vendorContactPerson = null;

    // ── Back-reference to PR ─────────────────────────────────────

    /** Nullable — POs can be raised without a PR */
    #[ORM\Column(name: 'request_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $requestId = null;

    // ── Creator ──────────────────────────────────────────────────

    #[ORM\Column(name: 'created_by', type: Types::STRING, length: 36)]
    private string $createdBy;

    #[ORM\Column(name: 'created_by_name', type: Types::STRING, length: 100)]
    private string $createdByName;

    // ── Send tracking ────────────────────────────────────────────

    #[ORM\Column(name: 'sent_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $sentAt = null;

    #[ORM\Column(name: 'sent_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $sentBy = null;

    #[ORM\Column(name: 'sent_by_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $sentByName = null;

    /** How many times this PO has been emailed (including the first send) */
    #[ORM\Column(name: 'emailed_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $emailedCount = 0;

    // ── Delivery ─────────────────────────────────────────────────

    #[ORM\Column(name: 'expected_delivery_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $expectedDeliveryDate = null;

    #[ORM\Column(name: 'delivery_address', type: Types::TEXT, nullable: true)]
    private ?string $deliveryAddress = null;

    #[ORM\Column(name: 'delivery_notes', type: Types::TEXT, nullable: true)]
    private ?string $deliveryNotes = null;

    // ── Financial ────────────────────────────────────────────────

    /** Payment terms snapshot from vendor — net7 | net15 | net30 | cod */
    #[ORM\Column(name: 'payment_terms', type: Types::STRING, length: 10, options: ['default' => 'net30'])]
    private string $paymentTerms = 'net30';

    /** Sum of all line_totals in kobo (before tax) */
    #[ORM\Column(name: 'subtotal_value', type: Types::BIGINT, options: ['default' => 0])]
    private string $subtotalValue = '0';

    /** Tax in kobo (if applicable) */
    #[ORM\Column(name: 'tax_value', type: Types::BIGINT, options: ['default' => 0])]
    private string $taxValue = '0';

    /** subtotal_value + tax_value in kobo */
    #[ORM\Column(name: 'total_value', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalValue = '0';

    // ── Misc ─────────────────────────────────────────────────────

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'line_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $lineCount = 0;

    // ── Constructor ─────────────────────────────────────────────

    public function __construct(
        string  $referenceNumber,
        string  $propertyId,
        ?string $vendorId,
        string  $vendorName,
        string  $createdBy,
        string  $createdByName,
        string  $tenantId,
    ) {
        $this->generateId();
        $this->referenceNumber = $referenceNumber;
        $this->propertyId      = $propertyId;
        $this->vendorId        = $vendorId;
        $this->vendorName      = $vendorName;
        $this->createdBy       = $createdBy;
        $this->createdByName   = $createdByName;
        $this->setTenantId($tenantId);
    }

    // ── State machine ───────────────────────────────────────────

    /**
     * Mark as sent — called after the email is dispatched.
     */
    public function markSent(string $userId, string $userName): void
    {
        if (!in_array($this->status, ['draft', 'sent'])) {
            throw new \DomainException("Cannot send a PO in '{$this->status}' status.");
        }
        $this->status      = 'sent';
        $this->sentAt    ??= new \DateTimeImmutable();
        $this->sentBy      = $userId;
        $this->sentByName  = $userName;
        $this->emailedCount++;
    }

    /**
     * Called by ProcurementService after a GRN is posted against this PO.
     * $allDelivered: true when every line's received_quantity >= ordered_quantity.
     */
    public function recordDelivery(bool $allDelivered): void
    {
        if (!in_array($this->status, ['sent', 'partially_delivered'])) {
            return; // silently ignore — already completed or cancelled
        }
        $this->status = $allDelivered ? 'delivered' : 'partially_delivered';
    }

    public function cancel(): void
    {
        if (in_array($this->status, ['delivered', 'cancelled'])) {
            throw new \DomainException("Cannot cancel a PO that is already '{$this->status}'.");
        }
        $this->status = 'cancelled';
    }

    // ── Getters / Setters ───────────────────────────────────────

    public function getReferenceNumber(): string { return $this->referenceNumber; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getStatus(): string { return $this->status; }
    public function getVendorId(): ?string { return $this->vendorId; }
    public function getVendorName(): string { return $this->vendorName; }
    public function getVendorEmail(): ?string { return $this->vendorEmail; }
    public function setVendorEmail(?string $v): void { $this->vendorEmail = $v; }
    public function getVendorContactPerson(): ?string { return $this->vendorContactPerson; }
    public function setVendorContactPerson(?string $v): void { $this->vendorContactPerson = $v; }

    // Open-market
    public function isOpenMarket(): bool { return $this->isOpenMarket; }
    public function setIsOpenMarket(bool $v): void { $this->isOpenMarket = $v; }
    public function getOpenMarketVendorName(): ?string { return $this->openMarketVendorName; }
    public function setOpenMarketVendorName(?string $v): void { $this->openMarketVendorName = $v; }
    public function getOpenMarketReason(): ?string { return $this->openMarketReason; }
    public function setOpenMarketReason(?string $v): void { $this->openMarketReason = $v; }

    // Second approval
    public function isSecondApprovalRequired(): bool { return $this->secondApprovalRequired; }
    public function setSecondApprovalRequired(bool $v): void { $this->secondApprovalRequired = $v; }
    public function getSecondApprovedBy(): ?string { return $this->secondApprovedBy; }
    public function getSecondApprovedByName(): ?string { return $this->secondApprovedByName; }
    public function getSecondApprovedAt(): ?\DateTimeImmutable { return $this->secondApprovedAt; }
    public function isSecondApproved(): bool { return $this->secondApprovedAt !== null; }

    /**
     * Grant second approval. Throws if already approved or not required.
     */
    public function secondApprove(string $userId, string $userName): void
    {
        if (!$this->secondApprovalRequired) {
            throw new \DomainException('This purchase order does not require a second approval.');
        }
        if ($this->secondApprovedAt !== null) {
            throw new \DomainException('This purchase order has already been second-approved.');
        }
        if (in_array($this->status, ['delivered', 'cancelled'])) {
            throw new \DomainException("Cannot approve a PO in '{$this->status}' status.");
        }
        $this->secondApprovedBy     = $userId;
        $this->secondApprovedByName = $userName;
        $this->secondApprovedAt     = new \DateTimeImmutable();
    }

    /**
     * Whether this open-market PO is blocked pending second approval.
     * A PO in this state cannot be sent to a vendor.
     */
    public function isPendingSecondApproval(): bool
    {
        return $this->secondApprovalRequired && $this->secondApprovedAt === null;
    }
    public function getRequestId(): ?string { return $this->requestId; }
    public function setRequestId(?string $v): void { $this->requestId = $v; }
    public function getCreatedBy(): string { return $this->createdBy; }
    public function getCreatedByName(): string { return $this->createdByName; }
    public function getSentAt(): ?\DateTimeImmutable { return $this->sentAt; }
    public function getSentByName(): ?string { return $this->sentByName; }
    public function getEmailedCount(): int { return $this->emailedCount; }
    public function getExpectedDeliveryDate(): ?\DateTimeImmutable { return $this->expectedDeliveryDate; }
    public function setExpectedDeliveryDate(?\DateTimeImmutable $v): void { $this->expectedDeliveryDate = $v; }
    public function getDeliveryAddress(): ?string { return $this->deliveryAddress; }
    public function setDeliveryAddress(?string $v): void { $this->deliveryAddress = $v; }
    public function getDeliveryNotes(): ?string { return $this->deliveryNotes; }
    public function setDeliveryNotes(?string $v): void { $this->deliveryNotes = $v; }
    public function getPaymentTerms(): string { return $this->paymentTerms; }
    public function setPaymentTerms(string $v): void { $this->paymentTerms = $v; }
    public function getSubtotalValue(): string { return $this->subtotalValue; }
    public function setSubtotalValue(string $v): void { $this->subtotalValue = $v; }
    public function getTaxValue(): string { return $this->taxValue; }
    public function setTaxValue(string $v): void { $this->taxValue = $v; }
    public function getTotalValue(): string { return $this->totalValue; }
    public function setTotalValue(string $v): void { $this->totalValue = $v; }
    public function recalcTotal(): void {
        $this->totalValue = (string)((int)$this->subtotalValue + (int)$this->taxValue);
    }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getLineCount(): int { return $this->lineCount; }
    public function setLineCount(int $v): void { $this->lineCount = $v; }

    // ── Status helpers ───────────────────────────────────────────

    public function getStatusLabel(): string
    {
        return match ($this->status) {
            'draft'                => 'Draft',
            'sent'                 => 'Sent',
            'partially_delivered'  => 'Partially Delivered',
            'delivered'            => 'Delivered',
            'cancelled'            => 'Cancelled',
            default                => ucfirst($this->status),
        };
    }

    public function getStatusColor(): string
    {
        return match ($this->status) {
            'draft'                => 'gray',
            'sent'                 => 'blue',
            'partially_delivered'  => 'orange',
            'delivered'            => 'green',
            'cancelled'            => 'red',
            default                => 'gray',
        };
    }

    // ── Serialise ────────────────────────────────────────────────

    public function toArray(): array
    {
        return [
            'id'                       => $this->getId(),
            'reference_number'         => $this->referenceNumber,
            'property_id'              => $this->propertyId,
            'status'                   => $this->status,
            'status_label'             => $this->getStatusLabel(),
            'status_color'             => $this->getStatusColor(),
            // Vendor
            'vendor_id'                => $this->vendorId,
            'vendor_name'              => $this->vendorName,
            'vendor_email'             => $this->vendorEmail,
            'vendor_contact_person'    => $this->vendorContactPerson,
            // Open-market
            'is_open_market'           => $this->isOpenMarket,
            'open_market_vendor_name'  => $this->openMarketVendorName,
            'open_market_reason'       => $this->openMarketReason,
            // Second approval
            'second_approval_required' => $this->secondApprovalRequired,
            'second_approved_by_name'  => $this->secondApprovedByName,
            'second_approved_at'       => $this->secondApprovedAt?->format('Y-m-d H:i:s'),
            'is_pending_second_approval' => $this->isPendingSecondApproval(),
            // Back-ref
            'request_id'               => $this->requestId,
            'created_by_name'          => $this->createdByName,
            'sent_at'                  => $this->sentAt?->format('Y-m-d H:i:s'),
            'sent_by_name'             => $this->sentByName,
            'emailed_count'            => $this->emailedCount,
            'expected_delivery_date'   => $this->expectedDeliveryDate?->format('Y-m-d'),
            'delivery_address'         => $this->deliveryAddress,
            'delivery_notes'           => $this->deliveryNotes,
            'payment_terms'            => $this->paymentTerms,
            'subtotal_value'           => $this->subtotalValue,
            'tax_value'                => $this->taxValue,
            'total_value'              => $this->totalValue,
            'notes'                    => $this->notes,
            'line_count'               => $this->lineCount,
            'created_at'               => $this->getCreatedAt()->format('Y-m-d H:i:s'),
            'updated_at'               => $this->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
