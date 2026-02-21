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
        ];
    }
}
