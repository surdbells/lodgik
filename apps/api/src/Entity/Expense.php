<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'expenses')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_exp_status')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'expense_date'], name: 'idx_exp_date')]
#[ORM\HasLifecycleCallbacks]
class Expense implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;
    #[ORM\Column(name: 'category_id', type: Types::STRING, length: 36)]
    private string $categoryId;
    #[ORM\Column(name: 'category_name', type: Types::STRING, length: 100)]
    private string $categoryName;
    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $description;
    #[ORM\Column(type: Types::STRING, length: 150, nullable: true)]
    private ?string $vendor = null;
    /** Amount in kobo */
    #[ORM\Column(type: Types::BIGINT)]
    private string $amount;
    #[ORM\Column(name: 'expense_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $expenseDate;
    #[ORM\Column(name: 'receipt_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $receiptUrl = null;
    /** draft | submitted | approved | rejected | paid */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'draft'])]
    private string $status = 'draft';
    #[ORM\Column(name: 'submitted_by', type: Types::STRING, length: 36)]
    private string $submittedBy;
    #[ORM\Column(name: 'submitted_by_name', type: Types::STRING, length: 100)]
    private string $submittedByName;
    #[ORM\Column(name: 'approved_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $approvedBy = null;
    #[ORM\Column(name: 'approved_by_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $approvedByName = null;
    #[ORM\Column(name: 'rejection_reason', type: Types::TEXT, nullable: true)]
    private ?string $rejectionReason = null;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;
    #[ORM\Column(name: 'payment_method', type: Types::STRING, length: 30, nullable: true)]
    private ?string $paymentMethod = null;
    #[ORM\Column(name: 'reference_number', type: Types::STRING, length: 50, nullable: true)]
    private ?string $referenceNumber = null;

    // ── Phase 5: Walk-in / Market Purchase fields ─────────────────────

    /**
     * 'registered' = existing vendor module entry (default)
     * 'market'     = walk-in / informal market vendor
     * 'petty_cash' = small petty cash expense
     */
    #[ORM\Column(name: 'vendor_type', type: Types::STRING, length: 15, options: ['default' => 'registered'])]
    private string $vendorType = 'registered';

    /** Free-text vendor name used when vendor_type = 'market' */
    #[ORM\Column(name: 'market_vendor_name', type: Types::STRING, length: 200, nullable: true)]
    private ?string $marketVendorName = null;

    /**
     * URL of a photographed/scanned signed note (purchaser + manager signatures).
     * Accepted in place of a formal receipt for market purchases.
     */
    #[ORM\Column(name: 'signed_note_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $signedNoteUrl = null;

    /** Second approver (admin) for dual-approval flow */
    #[ORM\Column(name: 'second_approver_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $secondApproverId = null;

    #[ORM\Column(name: 'second_approver_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $secondApproverName = null;

    #[ORM\Column(name: 'second_approved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $secondApprovedAt = null;

    /**
     * Copied from property setting at submission time so approval flow
     * doesn't change if the setting changes later.
     */
    #[ORM\Column(name: 'second_approval_required', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $secondApprovalRequired = false;

    /** True if the submitted amount exceeds the property's spending limit */
    #[ORM\Column(name: 'spending_limit_breach', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $spendingLimitBreach = false;

    public function __construct(string $propertyId, string $categoryId, string $categoryName, string $description, string $amount, \DateTimeImmutable $expenseDate, string $submittedBy, string $submittedByName, string $tenantId)
    {
        $this->generateId(); $this->propertyId = $propertyId; $this->categoryId = $categoryId; $this->categoryName = $categoryName;
        $this->description = $description; $this->amount = $amount; $this->expenseDate = $expenseDate;
        $this->submittedBy = $submittedBy; $this->submittedByName = $submittedByName; $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getCategoryId(): string { return $this->categoryId; }
    public function getCategoryName(): string { return $this->categoryName; }
    public function getDescription(): string { return $this->description; }
    public function getVendor(): ?string { return $this->vendor; }
    public function setVendor(?string $v): void { $this->vendor = $v; }
    public function getAmount(): string { return $this->amount; }
    public function getExpenseDate(): \DateTimeImmutable { return $this->expenseDate; }
    public function getReceiptUrl(): ?string { return $this->receiptUrl; }
    public function setReceiptUrl(?string $v): void { $this->receiptUrl = $v; }
    public function getStatus(): string { return $this->status; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function setPaymentMethod(?string $v): void { $this->paymentMethod = $v; }
    public function setReferenceNumber(?string $v): void { $this->referenceNumber = $v; }

    // ── Phase 5 accessors ─────────────────────────────────────────────
    public function getVendorType(): string { return $this->vendorType; }
    public function setVendorType(string $v): void { $this->vendorType = $v; }
    public function getMarketVendorName(): ?string { return $this->marketVendorName; }
    public function setMarketVendorName(?string $v): void { $this->marketVendorName = $v; }
    public function getSignedNoteUrl(): ?string { return $this->signedNoteUrl; }
    public function setSignedNoteUrl(?string $v): void { $this->signedNoteUrl = $v; }
    public function getSecondApproverId(): ?string { return $this->secondApproverId; }
    public function getSecondApproverName(): ?string { return $this->secondApproverName; }
    public function getSecondApprovedAt(): ?\DateTimeImmutable { return $this->secondApprovedAt; }
    public function isSecondApprovalRequired(): bool { return $this->secondApprovalRequired; }
    public function setSecondApprovalRequired(bool $v): void { $this->secondApprovalRequired = $v; }
    public function isSpendingLimitBreach(): bool { return $this->spendingLimitBreach; }
    public function setSpendingLimitBreach(bool $v): void { $this->spendingLimitBreach = $v; }

    /**
     * Admin second-approval for market/walk-in purchases.
     * Can only be called after first-approval (status = 'approved').
     */
    public function secondApprove(string $userId, string $name): void
    {
        if ($this->status !== 'approved') {
            throw new \DomainException('First approval must be completed before admin second-approval');
        }
        if (!$this->secondApprovalRequired) {
            throw new \DomainException('Second approval is not required for this expense');
        }
        $this->secondApproverId   = $userId;
        $this->secondApproverName = $name;
        $this->secondApprovedAt   = new \DateTimeImmutable();
        // Status stays 'approved' — second approval is an additional sign-off,
        // not a separate status. Readiness for payment is determined by
        // secondApprovalRequired && secondApprovedAt !== null.
    }

    public function isFullyApproved(): bool
    {
        if ($this->status !== 'approved') return false;
        if ($this->secondApprovalRequired) return $this->secondApprovedAt !== null;
        return true;
    }

    public function submit(): void { $this->status = 'submitted'; }
    public function approve(string $userId, string $name): void { $this->status = 'approved'; $this->approvedBy = $userId; $this->approvedByName = $name; }
    public function reject(string $userId, string $name, ?string $reason = null): void { $this->status = 'rejected'; $this->approvedBy = $userId; $this->approvedByName = $name; $this->rejectionReason = $reason; }
    public function markPaid(string $method, ?string $ref = null): void { $this->status = 'paid'; $this->paymentMethod = $method; $this->referenceNumber = $ref; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId, 'category_id' => $this->categoryId,
            'category_name' => $this->categoryName, 'description' => $this->description, 'vendor' => $this->vendor,
            'amount' => $this->amount, 'expense_date' => $this->expenseDate->format('Y-m-d'),
            'receipt_url' => $this->receiptUrl, 'status' => $this->status,
            'submitted_by_name' => $this->submittedByName, 'approved_by_name' => $this->approvedByName,
            'rejection_reason' => $this->rejectionReason, 'notes' => $this->notes,
            'payment_method' => $this->paymentMethod, 'reference_number' => $this->referenceNumber,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
            // Phase 5: Market/walk-in purchase fields
            'vendor_type'              => $this->vendorType,
            'market_vendor_name'       => $this->marketVendorName,
            'signed_note_url'          => $this->signedNoteUrl,
            'second_approver_name'     => $this->secondApproverName,
            'second_approved_at'       => $this->secondApprovedAt?->format('c'),
            'second_approval_required' => $this->secondApprovalRequired,
            'spending_limit_breach'    => $this->spendingLimitBreach,
            'is_fully_approved'        => $this->isFullyApproved(),
        ];
    }
}
