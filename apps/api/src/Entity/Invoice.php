<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'invoices')]
#[ORM\Index(name: 'idx_invoice_tenant', columns: ['tenant_id'])]
#[ORM\Index(name: 'idx_invoice_folio', columns: ['tenant_id', 'folio_id'])]
#[ORM\Index(name: 'idx_invoice_booking', columns: ['tenant_id', 'booking_id'])]
#[ORM\UniqueConstraint(name: 'uq_invoice_number', columns: ['tenant_id', 'invoice_number'])]
#[ORM\HasLifecycleCallbacks]
class Invoice
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: 'string', length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'folio_id', type: 'string', length: 36)]
    private string $folioId;

    #[ORM\Column(name: 'booking_id', type: 'string', length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'guest_id', type: 'string', length: 36)]
    private string $guestId;

    #[ORM\Column(name: 'invoice_number', type: 'string', length: 30)]
    private string $invoiceNumber;

    #[ORM\Column(name: 'status', type: 'string', length: 20, options: ['default' => 'issued'])]
    private string $status = 'issued'; // issued, paid, void

    #[ORM\Column(name: 'invoice_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $invoiceDate;

    #[ORM\Column(name: 'due_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $dueDate = null;

    #[ORM\Column(name: 'subtotal', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $subtotal = '0.00';

    #[ORM\Column(name: 'tax_total', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $taxTotal = '0.00';

    #[ORM\Column(name: 'discount_total', type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $discountTotal = '0.00';

    #[ORM\Column(name: 'grand_total', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $grandTotal = '0.00';

    #[ORM\Column(name: 'amount_paid', type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $amountPaid = '0.00';

    #[ORM\Column(name: 'currency', type: 'string', length: 3, options: ['default' => 'NGN'])]
    private string $currency = 'NGN';

    // Guest details snapshot (for PDF)
    #[ORM\Column(name: 'guest_name', type: 'string', length: 255)]
    private string $guestName;

    #[ORM\Column(name: 'guest_email', type: 'string', length: 255, nullable: true)]
    private ?string $guestEmail = null;

    #[ORM\Column(name: 'guest_phone', type: 'string', length: 50, nullable: true)]
    private ?string $guestPhone = null;

    #[ORM\Column(name: 'guest_address', type: Types::TEXT, nullable: true)]
    private ?string $guestAddress = null;

    // Hotel bank details snapshot
    #[ORM\Column(name: 'bank_name', type: 'string', length: 100, nullable: true)]
    private ?string $bankName = null;

    #[ORM\Column(name: 'bank_account_number', type: 'string', length: 20, nullable: true)]
    private ?string $bankAccountNumber = null;

    #[ORM\Column(name: 'bank_account_name', type: 'string', length: 255, nullable: true)]
    private ?string $bankAccountName = null;

    #[ORM\Column(name: 'emailed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $emailedAt = null;

    #[ORM\Column(name: 'notes', type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $propertyId, string $folioId, string $bookingId, string $guestId, string $invoiceNumber, string $guestName, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->folioId = $folioId;
        $this->bookingId = $bookingId;
        $this->guestId = $guestId;
        $this->invoiceNumber = $invoiceNumber;
        $this->guestName = $guestName;
        $this->tenantId = $tenantId;
        $this->invoiceDate = new \DateTimeImmutable();
    }

    // Getters
    public function getPropertyId(): string { return $this->propertyId; }
    public function getFolioId(): string { return $this->folioId; }
    public function getBookingId(): string { return $this->bookingId; }
    public function getGuestId(): string { return $this->guestId; }
    public function getInvoiceNumber(): string { return $this->invoiceNumber; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): void { $this->status = $v; }
    public function getInvoiceDate(): \DateTimeImmutable { return $this->invoiceDate; }
    public function getDueDate(): ?\DateTimeImmutable { return $this->dueDate; }
    public function setDueDate(?\DateTimeImmutable $v): void { $this->dueDate = $v; }
    public function getSubtotal(): string { return $this->subtotal; }
    public function setSubtotal(string $v): void { $this->subtotal = $v; }
    public function getTaxTotal(): string { return $this->taxTotal; }
    public function setTaxTotal(string $v): void { $this->taxTotal = $v; }
    public function getDiscountTotal(): string { return $this->discountTotal; }
    public function setDiscountTotal(string $v): void { $this->discountTotal = $v; }
    public function getGrandTotal(): string { return $this->grandTotal; }
    public function setGrandTotal(string $v): void { $this->grandTotal = $v; }
    public function getAmountPaid(): string { return $this->amountPaid; }
    public function setAmountPaid(string $v): void { $this->amountPaid = $v; }
    public function getCurrency(): string { return $this->currency; }
    public function getGuestName(): string { return $this->guestName; }
    public function getGuestEmail(): ?string { return $this->guestEmail; }
    public function setGuestEmail(?string $v): void { $this->guestEmail = $v; }
    public function getGuestPhone(): ?string { return $this->guestPhone; }
    public function setGuestPhone(?string $v): void { $this->guestPhone = $v; }
    public function getGuestAddress(): ?string { return $this->guestAddress; }
    public function setGuestAddress(?string $v): void { $this->guestAddress = $v; }
    public function getBankName(): ?string { return $this->bankName; }
    public function setBankName(?string $v): void { $this->bankName = $v; }
    public function getBankAccountNumber(): ?string { return $this->bankAccountNumber; }
    public function setBankAccountNumber(?string $v): void { $this->bankAccountNumber = $v; }
    public function getBankAccountName(): ?string { return $this->bankAccountName; }
    public function setBankAccountName(?string $v): void { $this->bankAccountName = $v; }
    public function getEmailedAt(): ?\DateTimeImmutable { return $this->emailedAt; }
    public function setEmailedAt(?\DateTimeImmutable $v): void { $this->emailedAt = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->propertyId,
            'folio_id' => $this->folioId,
            'booking_id' => $this->bookingId,
            'guest_id' => $this->guestId,
            'invoice_number' => $this->invoiceNumber,
            'status' => $this->status,
            'invoice_date' => $this->invoiceDate->format('Y-m-d'),
            'due_date' => $this->dueDate?->format('Y-m-d'),
            'subtotal' => $this->subtotal,
            'tax_total' => $this->taxTotal,
            'discount_total' => $this->discountTotal,
            'grand_total' => $this->grandTotal,
            'amount_paid' => $this->amountPaid,
            'currency' => $this->currency,
            'guest_name' => $this->guestName,
            'guest_email' => $this->guestEmail,
            'guest_phone' => $this->guestPhone,
            'bank_name' => $this->bankName,
            'bank_account_number' => $this->bankAccountNumber,
            'bank_account_name' => $this->bankAccountName,
            'emailed_at' => $this->emailedAt?->format('c'),
            'notes' => $this->notes,
            'created_at' => $this->createdAt->format('c'),
        ];
    }
}
