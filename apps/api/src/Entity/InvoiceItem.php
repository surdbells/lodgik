<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;

#[ORM\Entity]
#[ORM\Table(name: 'invoice_items')]
#[ORM\Index(name: 'idx_inv_item_invoice', columns: ['tenant_id', 'invoice_id'])]
#[ORM\HasLifecycleCallbacks]
class InvoiceItem
{
    use HasUuid;
    use HasTenant;

    #[ORM\Column(name: 'invoice_id', type: 'string', length: 36)]
    private string $invoiceId;

    #[ORM\Column(name: 'description', type: 'string', length: 255)]
    private string $description;

    #[ORM\Column(name: 'category', type: 'string', length: 30, nullable: true)]
    private ?string $category = null;

    #[ORM\Column(name: 'quantity', type: 'integer', options: ['default' => 1])]
    private int $quantity = 1;

    #[ORM\Column(name: 'unit_price', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $unitPrice;

    #[ORM\Column(name: 'line_total', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $lineTotal;

    #[ORM\Column(name: 'tax_rate', type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $taxRate = '0.00';

    #[ORM\Column(name: 'tax_amount', type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $taxAmount = '0.00';

    #[ORM\Column(name: 'sort_order', type: 'integer', options: ['default' => 0])]
    private int $sortOrder = 0;

    public function __construct(string $invoiceId, string $description, int $quantity, string $unitPrice, string $tenantId)
    {
        $this->generateId();
        $this->invoiceId = $invoiceId;
        $this->description = $description;
        $this->quantity = $quantity;
        $this->unitPrice = $unitPrice;
        $this->lineTotal = number_format((float)$unitPrice * $quantity, 2, '.', '');
        $this->tenantId = $tenantId;
    }

    public function getInvoiceId(): string { return $this->invoiceId; }
    public function getDescription(): string { return $this->description; }
    public function getCategory(): ?string { return $this->category; }
    public function setCategory(?string $v): void { $this->category = $v; }
    public function getQuantity(): int { return $this->quantity; }
    public function getUnitPrice(): string { return $this->unitPrice; }
    public function getLineTotal(): string { return $this->lineTotal; }
    public function getTaxRate(): string { return $this->taxRate; }
    public function setTaxRate(string $v): void { $this->taxRate = $v; }
    public function getTaxAmount(): string { return $this->taxAmount; }
    public function setTaxAmount(string $v): void { $this->taxAmount = $v; }
    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $v): void { $this->sortOrder = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'invoice_id' => $this->invoiceId,
            'description' => $this->description,
            'category' => $this->category,
            'quantity' => $this->quantity,
            'unit_price' => $this->unitPrice,
            'line_total' => $this->lineTotal,
            'tax_rate' => $this->taxRate,
            'tax_amount' => $this->taxAmount,
            'sort_order' => $this->sortOrder,
        ];
    }
}
