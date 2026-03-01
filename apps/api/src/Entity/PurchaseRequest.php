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
 * Purchase Request — the approval-gated requisition raised by staff.
 *
 * Status lifecycle:
 *   draft      → submitted (by requester)
 *   submitted  → approved  (by property_admin / manager)
 *   submitted  → rejected  (by property_admin / manager)
 *   approved   → converted (when a PO is created from this PR)
 *   draft | submitted | approved → cancelled (by requester or admin)
 *
 * On approval the PR may be converted to one PurchaseOrder (po_id is set).
 * A rejected PR may be re-submitted after editing (status resets to draft).
 *
 * Priority: low | normal | urgent
 */
#[ORM\Entity]
#[ORM\Table(name: 'purchase_requests')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'pur_req_status')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'created_at'], name: 'pur_req_date')]
#[ORM\Index(columns: ['tenant_id', 'requested_by'], name: 'pur_req_requester')]
#[ORM\HasLifecycleCallbacks]
class PurchaseRequest implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    // ── Header ──────────────────────────────────────────────────

    /** PR-YYYYMMDD-0001 */
    #[ORM\Column(name: 'reference_number', type: Types::STRING, length: 30)]
    private string $referenceNumber;

    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $title;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    /**
     * draft | submitted | approved | rejected | cancelled | converted
     */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'draft'])]
    private string $status = 'draft';

    /** low | normal | urgent */
    #[ORM\Column(type: Types::STRING, length: 10, options: ['default' => 'normal'])]
    private string $priority = 'normal';

    #[ORM\Column(name: 'required_by_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $requiredByDate = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    // ── Requester ───────────────────────────────────────────────

    #[ORM\Column(name: 'requested_by', type: Types::STRING, length: 36)]
    private string $requestedBy;

    #[ORM\Column(name: 'requested_by_name', type: Types::STRING, length: 100)]
    private string $requestedByName;

    // ── Approval ────────────────────────────────────────────────

    #[ORM\Column(name: 'approved_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $approvedBy = null;

    #[ORM\Column(name: 'approved_by_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $approvedByName = null;

    #[ORM\Column(name: 'approved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $approvedAt = null;

    #[ORM\Column(name: 'rejection_reason', type: Types::TEXT, nullable: true)]
    private ?string $rejectionReason = null;

    // ── Totals & linkage ────────────────────────────────────────

    /** Sum of (line.quantity × line.estimated_unit_cost) in kobo */
    #[ORM\Column(name: 'total_estimated_value', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalEstimatedValue = '0';

    #[ORM\Column(name: 'line_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $lineCount = 0;

    /** Set when this PR is converted to a PO */
    #[ORM\Column(name: 'po_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $poId = null;

    // ── Constructor ─────────────────────────────────────────────

    public function __construct(
        string $referenceNumber,
        string $title,
        string $propertyId,
        string $requestedBy,
        string $requestedByName,
        string $tenantId,
    ) {
        $this->generateId();
        $this->referenceNumber  = $referenceNumber;
        $this->title            = $title;
        $this->propertyId       = $propertyId;
        $this->requestedBy      = $requestedBy;
        $this->requestedByName  = $requestedByName;
        $this->setTenantId($tenantId);
    }

    // ── State machine ───────────────────────────────────────────

    public function submit(): void
    {
        if (!in_array($this->status, ['draft', 'rejected'])) {
            throw new \DomainException("Cannot submit a PR in '{$this->status}' status.");
        }
        $this->status = 'submitted';
        $this->rejectionReason = null;
    }

    public function approve(string $userId, string $userName): void
    {
        if ($this->status !== 'submitted') {
            throw new \DomainException("Only submitted PRs can be approved.");
        }
        $this->status          = 'approved';
        $this->approvedBy      = $userId;
        $this->approvedByName  = $userName;
        $this->approvedAt      = new \DateTimeImmutable();
    }

    public function reject(string $userId, string $userName, string $reason): void
    {
        if ($this->status !== 'submitted') {
            throw new \DomainException("Only submitted PRs can be rejected.");
        }
        $this->status          = 'rejected';
        $this->approvedBy      = $userId;
        $this->approvedByName  = $userName;
        $this->rejectionReason = $reason;
    }

    public function cancel(): void
    {
        if (in_array($this->status, ['converted', 'cancelled'])) {
            throw new \DomainException("Cannot cancel a PR that is already '{$this->status}'.");
        }
        $this->status = 'cancelled';
    }

    public function convert(string $poId): void
    {
        if ($this->status !== 'approved') {
            throw new \DomainException("Only approved PRs can be converted to a PO.");
        }
        $this->status = 'converted';
        $this->poId   = $poId;
    }

    // ── Getters / Setters ───────────────────────────────────────

    public function getReferenceNumber(): string { return $this->referenceNumber; }
    public function getTitle(): string { return $this->title; }
    public function setTitle(string $v): void { $this->title = $v; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getStatus(): string { return $this->status; }
    public function getPriority(): string { return $this->priority; }
    public function setPriority(string $v): void { $this->priority = $v; }
    public function getRequiredByDate(): ?\DateTimeImmutable { return $this->requiredByDate; }
    public function setRequiredByDate(?\DateTimeImmutable $v): void { $this->requiredByDate = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getRequestedBy(): string { return $this->requestedBy; }
    public function getRequestedByName(): string { return $this->requestedByName; }
    public function getApprovedBy(): ?string { return $this->approvedBy; }
    public function getApprovedByName(): ?string { return $this->approvedByName; }
    public function getApprovedAt(): ?\DateTimeImmutable { return $this->approvedAt; }
    public function getRejectionReason(): ?string { return $this->rejectionReason; }
    public function getTotalEstimatedValue(): string { return $this->totalEstimatedValue; }
    public function setTotalEstimatedValue(string $v): void { $this->totalEstimatedValue = $v; }
    public function getLineCount(): int { return $this->lineCount; }
    public function setLineCount(int $v): void { $this->lineCount = $v; }
    public function getPoId(): ?string { return $this->poId; }

    // ── Priority helpers ─────────────────────────────────────────

    public function getPriorityLabel(): string
    {
        return match ($this->priority) {
            'urgent' => 'Urgent',
            'low'    => 'Low',
            default  => 'Normal',
        };
    }

    public function getPriorityColor(): string
    {
        return match ($this->priority) {
            'urgent' => 'red',
            'low'    => 'gray',
            default  => 'blue',
        };
    }

    // ── Serialise ────────────────────────────────────────────────

    public function toArray(): array
    {
        return [
            'id'                     => $this->getId(),
            'reference_number'       => $this->referenceNumber,
            'title'                  => $this->title,
            'property_id'            => $this->propertyId,
            'status'                 => $this->status,
            'priority'               => $this->priority,
            'priority_label'         => $this->getPriorityLabel(),
            'priority_color'         => $this->getPriorityColor(),
            'required_by_date'       => $this->requiredByDate?->format('Y-m-d'),
            'notes'                  => $this->notes,
            'requested_by'           => $this->requestedBy,
            'requested_by_name'      => $this->requestedByName,
            'approved_by_name'       => $this->approvedByName,
            'approved_at'            => $this->approvedAt?->format('Y-m-d H:i:s'),
            'rejection_reason'       => $this->rejectionReason,
            'total_estimated_value'  => $this->totalEstimatedValue,
            'line_count'             => $this->lineCount,
            'po_id'                  => $this->poId,
            'created_at'             => $this->getCreatedAt()->format('Y-m-d H:i:s'),
            'updated_at'             => $this->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
