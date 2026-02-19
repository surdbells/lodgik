<?php

declare(strict_types=1);

namespace Lodgik\Module\Invoice;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Invoice;
use Lodgik\Entity\InvoiceItem;
use Lodgik\Entity\Folio;
use Lodgik\Entity\FolioCharge;
use Lodgik\Entity\Guest;
use Lodgik\Entity\Property;
use Lodgik\Entity\PropertyBankAccount;
use Lodgik\Entity\Tenant;
use Lodgik\Repository\InvoiceRepository;
use Lodgik\Repository\InvoiceItemRepository;
use Lodgik\Repository\FolioChargeRepository;
use Lodgik\Repository\FolioPaymentRepository;
use Lodgik\Repository\TaxConfigurationRepository;
use Lodgik\Repository\PropertyBankAccountRepository;
use Lodgik\Service\ZeptoMailService;
use Lodgik\Enum\PaymentStatus;
use Psr\Log\LoggerInterface;

final class InvoiceService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly InvoiceRepository $invoiceRepo,
        private readonly InvoiceItemRepository $itemRepo,
        private readonly FolioChargeRepository $chargeRepo,
        private readonly FolioPaymentRepository $paymentRepo,
        private readonly TaxConfigurationRepository $taxRepo,
        private readonly ZeptoMailService $mail,
        private readonly LoggerInterface $logger,
    ) {}

    // ═══ Generate Invoice from Folio ══════════════════════════

    public function generateFromFolio(Folio $folio): Invoice
    {
        // Check if invoice already exists
        $existing = $this->invoiceRepo->findByFolio($folio->getId());
        if ($existing !== null) {
            return $existing;
        }

        $tenantId = $folio->getTenantId();
        $guest = $this->em->find(Guest::class, $folio->getGuestId());
        $property = $this->em->find(Property::class, $folio->getPropertyId());

        $invoiceNumber = $this->invoiceRepo->generateInvoiceNumber($tenantId);
        $invoice = new Invoice(
            $folio->getPropertyId(),
            $folio->getId(),
            $folio->getBookingId(),
            $folio->getGuestId(),
            $invoiceNumber,
            $guest ? $guest->getFullName() : 'Guest',
            $tenantId,
        );

        // Guest details snapshot
        if ($guest) {
            $invoice->setGuestEmail($guest->getEmail());
            $invoice->setGuestPhone($guest->getPhone());
            $address = array_filter([$guest->getAddress(), $guest->getCity(), $guest->getState(), $guest->getCountry()]);
            $invoice->setGuestAddress(implode(', ', $address) ?: null);
        }

        // Bank details snapshot
        $bankAccounts = $this->em->getRepository(PropertyBankAccount::class)->findBy(['propertyId' => $folio->getPropertyId(), 'isPrimary' => true]);
        if (!empty($bankAccounts)) {
            $bank = $bankAccounts[0];
            $invoice->setBankName($bank->getBankName());
            $invoice->setBankAccountNumber($bank->getAccountNumber());
            $invoice->setBankAccountName($bank->getAccountName());
        }

        $this->em->persist($invoice);

        // Get charges and create invoice items
        $charges = $this->chargeRepo->findByFolio($folio->getId());
        $taxes = $this->taxRepo->findActiveTaxes($tenantId);
        $vatRate = '0.00';
        foreach ($taxes as $tax) {
            if ($tax->getTaxKey() === 'vat') {
                $vatRate = $tax->getRate();
                break;
            }
        }

        $subtotal = 0.0;
        $taxTotal = 0.0;
        $sort = 0;

        foreach ($charges as $charge) {
            if ($charge->isVoided()) continue;

            $item = new InvoiceItem(
                $invoice->getId(),
                $charge->getDescription(),
                $charge->getQuantity(),
                $charge->getAmount(),
                $tenantId,
            );
            $item->setCategory($charge->getCategory()->value);
            $item->setSortOrder(++$sort);

            // Apply VAT
            $lineTotal = (float)$charge->getLineTotal();
            $taxAmt = $lineTotal * (float)$vatRate / 100;
            $item->setTaxRate($vatRate);
            $item->setTaxAmount(number_format($taxAmt, 2, '.', ''));

            $subtotal += $lineTotal;
            $taxTotal += $taxAmt;

            $this->em->persist($item);
        }

        // Set totals
        $invoice->setSubtotal(number_format($subtotal, 2, '.', ''));
        $invoice->setTaxTotal(number_format($taxTotal, 2, '.', ''));
        $invoice->setDiscountTotal($folio->getTotalAdjustments());
        $grand = $subtotal + $taxTotal - (float)$folio->getTotalAdjustments();
        $invoice->setGrandTotal(number_format($grand, 2, '.', ''));
        $invoice->setAmountPaid($folio->getTotalPayments());

        // If fully paid, mark as paid
        if ((float)$folio->getTotalPayments() >= $grand) {
            $invoice->setStatus('paid');
        }

        $this->em->flush();
        $this->logger->info("Invoice generated: {$invoiceNumber}");

        return $invoice;
    }

    // ═══ Get ═══════════════════════════════════════════════════

    public function getById(string $invoiceId): Invoice
    {
        return $this->invoiceRepo->findOrFail($invoiceId);
    }

    public function getByBooking(string $bookingId): ?Invoice
    {
        return $this->invoiceRepo->findByBooking($bookingId);
    }

    public function getByProperty(string $propertyId, ?string $status = null, int $page = 1, int $limit = 20): array
    {
        return $this->invoiceRepo->findByProperty($propertyId, $status, $page, $limit);
    }

    public function getDetail(string $invoiceId): array
    {
        $invoice = $this->invoiceRepo->findOrFail($invoiceId);
        $items = $this->itemRepo->findByInvoice($invoiceId);

        return [
            'invoice' => $invoice->toArray(),
            'items' => array_map(fn(InvoiceItem $i) => $i->toArray(), $items),
        ];
    }

    // ═══ Void ═════════════════════════════════════════════════

    public function voidInvoice(string $invoiceId): Invoice
    {
        $invoice = $this->invoiceRepo->findOrFail($invoiceId);
        $invoice->setStatus('void');
        $this->em->flush();
        return $invoice;
    }

    // ═══ PDF Generation ═══════════════════════════════════════

    public function generatePdfHtml(string $invoiceId): string
    {
        $invoice = $this->invoiceRepo->findOrFail($invoiceId);
        $items = $this->itemRepo->findByInvoice($invoiceId);
        $inv = $invoice->toArray();
        $itemsArr = array_map(fn(InvoiceItem $i) => $i->toArray(), $items);

        $tenant = $this->em->find(Tenant::class, $invoice->getTenantId());
        $property = $this->em->find(Property::class, $invoice->getPropertyId());
        $hotelName = $property?->getName() ?? ($tenant?->getName() ?? 'Hotel');
        $hotelAddr = array_filter([$property?->getAddress(), $property?->getCity(), $property?->getState()]);

        $itemRows = '';
        foreach ($itemsArr as $item) {
            $itemRows .= "<tr><td>{$item['description']}</td><td style=\"text-align:center\">{$item['quantity']}</td><td style=\"text-align:right\">₦" . number_format((float)$item['unit_price'], 2) . "</td><td style=\"text-align:right\">₦" . number_format((float)$item['line_total'], 2) . "</td><td style=\"text-align:right\">₦" . number_format((float)$item['tax_amount'], 2) . "</td></tr>";
        }

        $bankSection = '';
        if ($inv['bank_name']) {
            $bankSection = "<div style=\"margin-top:20px;padding:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px\"><strong>Bank Details for Payment</strong><br>Bank: {$inv['bank_name']}<br>Account: {$inv['bank_account_number']}<br>Name: {$inv['bank_account_name']}</div>";
        }

        return <<<HTML
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;font-size:12px;color:#333;margin:30px}
h1{font-size:20px;margin:0}
table{width:100%;border-collapse:collapse;margin-top:15px}
th,td{border:1px solid #ddd;padding:8px;font-size:11px}
th{background:#f8fafc;font-weight:600;text-align:left}
.totals td{border:none;padding:4px 8px}
.totals .label{text-align:right;font-weight:600}
.totals .grand{font-size:14px;font-weight:bold;color:#059669}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:start">
<div><h1>{$hotelName}</h1><p style="color:#666;margin:4px 0">{$this->implodeAddr($hotelAddr)}</p></div>
<div style="text-align:right"><h2 style="color:#1e40af;margin:0">INVOICE</h2><p style="margin:4px 0"><strong>{$inv['invoice_number']}</strong></p><p style="margin:4px 0">Date: {$inv['invoice_date']}</p></div>
</div>
<hr style="border:none;border-top:2px solid #1e40af;margin:15px 0">
<div style="display:flex;justify-content:space-between">
<div><strong>Bill To:</strong><br>{$inv['guest_name']}<br>{$inv['guest_email']}<br>{$inv['guest_phone']}</div>
<div style="text-align:right"><strong>Currency:</strong> {$inv['currency']}<br><strong>Status:</strong> {$inv['status']}</div>
</div>
<table><thead><tr><th>Description</th><th style="width:60px;text-align:center">Qty</th><th style="width:100px;text-align:right">Unit Price</th><th style="width:100px;text-align:right">Amount</th><th style="width:80px;text-align:right">VAT</th></tr></thead>
<tbody>{$itemRows}</tbody></table>
<table class="totals" style="width:300px;margin-left:auto;margin-top:10px">
<tr><td class="label">Subtotal:</td><td style="text-align:right">₦{$this->fmt($inv['subtotal'])}</td></tr>
<tr><td class="label">VAT (7.5%):</td><td style="text-align:right">₦{$this->fmt($inv['tax_total'])}</td></tr>
<tr><td class="label">Discount:</td><td style="text-align:right">-₦{$this->fmt($inv['discount_total'])}</td></tr>
<tr style="border-top:2px solid #333"><td class="label grand">TOTAL:</td><td style="text-align:right" class="grand">₦{$this->fmt($inv['grand_total'])}</td></tr>
<tr><td class="label">Paid:</td><td style="text-align:right">₦{$this->fmt($inv['amount_paid'])}</td></tr>
</table>
{$bankSection}
<p style="margin-top:30px;font-size:10px;color:#999;text-align:center">Thank you for staying with us! · Generated by Lodgik</p>
</body></html>
HTML;
    }

    private function fmt(string $v): string { return number_format((float)$v, 2); }
    private function implodeAddr(array $a): string { return implode(', ', array_filter($a)); }

    // ═══ Email Invoice ═══════════════════════════════════════

    public function emailInvoice(string $invoiceId): bool
    {
        $invoice = $this->invoiceRepo->findOrFail($invoiceId);
        if (!$invoice->getGuestEmail()) {
            throw new \InvalidArgumentException('Guest has no email address');
        }

        $html = $this->generatePdfHtml($invoiceId);
        $subject = "Invoice {$invoice->getInvoiceNumber()} from your stay";

        $sent = $this->mail->send(
            $invoice->getGuestEmail(),
            $invoice->getGuestName(),
            $subject,
            $html,
        );

        if ($sent) {
            $invoice->setEmailedAt(new \DateTimeImmutable());
            $this->em->flush();
        }

        return $sent;
    }

    // ═══ Tax Config ═══════════════════════════════════════════

    public function getTaxConfig(string $tenantId): array
    {
        $taxes = $this->taxRepo->findActiveTaxes($tenantId);
        return array_map(fn($t) => $t->toArray(), $taxes);
    }
}
