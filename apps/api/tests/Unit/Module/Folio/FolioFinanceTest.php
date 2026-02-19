<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Folio;

use Lodgik\Entity\Folio;
use Lodgik\Entity\FolioCharge;
use Lodgik\Entity\FolioPayment;
use Lodgik\Entity\FolioAdjustment;
use Lodgik\Entity\Invoice;
use Lodgik\Entity\InvoiceItem;
use Lodgik\Entity\TaxConfiguration;
use Lodgik\Enum\FolioStatus;
use Lodgik\Enum\ChargeCategory;
use Lodgik\Enum\PaymentMethod;
use Lodgik\Enum\PaymentStatus;
use PHPUnit\Framework\TestCase;

final class FolioFinanceTest extends TestCase
{
    // ─── Folio Entity ─────────────────────────────────────────

    public function testFolioCreation(): void
    {
        $folio = new Folio('prop-1', 'bk-1', 'guest-1', 'FL-20260219-001', 'tenant-1');
        $this->assertEquals('prop-1', $folio->getPropertyId());
        $this->assertEquals('bk-1', $folio->getBookingId());
        $this->assertEquals('guest-1', $folio->getGuestId());
        $this->assertEquals('FL-20260219-001', $folio->getFolioNumber());
        $this->assertEquals(FolioStatus::OPEN, $folio->getStatus());
        $this->assertEquals('0.00', $folio->getBalance());
    }

    public function testFolioRecalculate(): void
    {
        $folio = new Folio('p', 'b', 'g', 'FL-001', 't');
        $folio->recalculate('50000.00', '30000.00', '5000.00');
        $this->assertEquals('50000.00', $folio->getTotalCharges());
        $this->assertEquals('30000.00', $folio->getTotalPayments());
        $this->assertEquals('5000.00', $folio->getTotalAdjustments());
        $this->assertEquals('15000.00', $folio->getBalance()); // 50000 - 30000 - 5000
    }

    public function testFolioZeroBalance(): void
    {
        $folio = new Folio('p', 'b', 'g', 'FL-001', 't');
        $folio->recalculate('25000.00', '25000.00', '0.00');
        $this->assertEquals('0.00', $folio->getBalance());
    }

    public function testFolioNegativeBalance(): void
    {
        $folio = new Folio('p', 'b', 'g', 'FL-001', 't');
        $folio->recalculate('20000.00', '25000.00', '0.00');
        $this->assertEquals('-5000.00', $folio->getBalance()); // overpayment
    }

    // ─── Charge Entity ────────────────────────────────────────

    public function testChargeLineTotal(): void
    {
        $charge = new FolioCharge('folio-1', ChargeCategory::ROOM, 'Room 101', '25000.00', 2, 't');
        $this->assertEquals('50000.00', $charge->getLineTotal());
        $this->assertEquals(ChargeCategory::ROOM, $charge->getCategory());
    }

    public function testChargeSingleQuantity(): void
    {
        $charge = new FolioCharge('folio-1', ChargeCategory::MINIBAR, 'Coca Cola', '1500.00', 1, 't');
        $this->assertEquals('1500.00', $charge->getLineTotal());
    }

    public function testChargeVoid(): void
    {
        $charge = new FolioCharge('folio-1', ChargeCategory::BAR, 'Beer', '2000.00', 3, 't');
        $this->assertFalse($charge->isVoided());
        $charge->setIsVoided(true);
        $this->assertTrue($charge->isVoided());
    }

    // ─── Payment Entity ───────────────────────────────────────

    public function testPaymentCreation(): void
    {
        $payment = new FolioPayment('folio-1', PaymentMethod::CASH, '50000.00', 't');
        $this->assertEquals(PaymentStatus::PENDING, $payment->getStatus());
        $this->assertEquals(PaymentMethod::CASH, $payment->getPaymentMethod());
        $this->assertEquals('50000.00', $payment->getAmount());
    }

    public function testBankTransferPayment(): void
    {
        $payment = new FolioPayment('folio-1', PaymentMethod::BANK_TRANSFER, '100000.00', 't');
        $payment->setSenderName('Adebayo Ogunlesi');
        $payment->setTransferReference('TRF-123456');
        $payment->setProofImageUrl('https://storage.example.com/proof.jpg');
        $this->assertEquals('Adebayo Ogunlesi', $payment->getSenderName());
        $this->assertEquals('TRF-123456', $payment->getTransferReference());
        $this->assertNotNull($payment->getProofImageUrl());
    }

    public function testPaymentConfirmation(): void
    {
        $payment = new FolioPayment('folio-1', PaymentMethod::POS_CARD, '75000.00', 't');
        $this->assertEquals(PaymentStatus::PENDING, $payment->getStatus());
        $payment->setStatus(PaymentStatus::CONFIRMED);
        $payment->setConfirmedBy('staff-1');
        $payment->setConfirmedAt(new \DateTimeImmutable());
        $this->assertEquals(PaymentStatus::CONFIRMED, $payment->getStatus());
        $this->assertNotNull($payment->getConfirmedAt());
    }

    public function testPaymentRejection(): void
    {
        $payment = new FolioPayment('folio-1', PaymentMethod::BANK_TRANSFER, '50000.00', 't');
        $payment->setStatus(PaymentStatus::REJECTED);
        $payment->setRejectionReason('Transfer not found in bank statement');
        $this->assertEquals(PaymentStatus::REJECTED, $payment->getStatus());
        $this->assertEquals('Transfer not found in bank statement', $payment->getRejectionReason());
    }

    // ─── Adjustment Entity ────────────────────────────────────

    public function testAdjustment(): void
    {
        $adj = new FolioAdjustment('folio-1', 'discount', 'Loyalty discount', '5000.00', 't');
        $this->assertEquals('discount', $adj->getType());
        $this->assertEquals('5000.00', $adj->getAmount());
    }

    // ─── Enums ────────────────────────────────────────────────

    public function testFolioStatusEnum(): void
    {
        $this->assertEquals(['open', 'closed', 'void'], FolioStatus::values());
        $this->assertEquals('Open', FolioStatus::OPEN->label());
    }

    public function testChargeCategoryEnum(): void
    {
        $this->assertCount(8, ChargeCategory::values());
        $this->assertEquals('Room Charge', ChargeCategory::ROOM->label());
        $this->assertEquals('Minibar', ChargeCategory::MINIBAR->label());
    }

    public function testPaymentMethodEnum(): void
    {
        $this->assertEquals(['cash', 'bank_transfer', 'pos_card'], PaymentMethod::values());
        $this->assertEquals('Bank Transfer', PaymentMethod::BANK_TRANSFER->label());
    }

    public function testPaymentStatusEnum(): void
    {
        $this->assertEquals(['pending', 'confirmed', 'rejected'], PaymentStatus::values());
        $this->assertEquals('#22c55e', PaymentStatus::CONFIRMED->color());
    }

    // ─── Invoice Entity ───────────────────────────────────────

    public function testInvoiceCreation(): void
    {
        $inv = new Invoice('prop-1', 'folio-1', 'bk-1', 'guest-1', 'INV-20260219-001', 'Chinua Achebe', 'tenant-1');
        $this->assertEquals('INV-20260219-001', $inv->getInvoiceNumber());
        $this->assertEquals('issued', $inv->getStatus());
        $this->assertEquals('NGN', $inv->getCurrency());
        $this->assertEquals('Chinua Achebe', $inv->getGuestName());
    }

    public function testInvoiceBankDetails(): void
    {
        $inv = new Invoice('p', 'f', 'b', 'g', 'INV-001', 'Guest', 't');
        $inv->setBankName('GTBank');
        $inv->setBankAccountNumber('0123456789');
        $inv->setBankAccountName('Grand Palace Hotel');
        $this->assertEquals('GTBank', $inv->getBankName());
        $this->assertEquals('0123456789', $inv->getBankAccountNumber());
    }

    public function testInvoiceTotals(): void
    {
        $inv = new Invoice('p', 'f', 'b', 'g', 'INV-001', 'Guest', 't');
        $inv->setSubtotal('100000.00');
        $inv->setTaxTotal('7500.00'); // 7.5% VAT
        $inv->setDiscountTotal('5000.00');
        $inv->setGrandTotal('102500.00'); // 100000 + 7500 - 5000
        $this->assertEquals('102500.00', $inv->getGrandTotal());
    }

    // ─── Invoice Item ─────────────────────────────────────────

    public function testInvoiceItemLineTotal(): void
    {
        $item = new InvoiceItem('inv-1', 'Room 101 — 3 nights', 3, '25000.00', 't');
        $this->assertEquals('75000.00', $item->getLineTotal());
    }

    public function testInvoiceItemWithVat(): void
    {
        $item = new InvoiceItem('inv-1', 'Room charge', 1, '50000.00', 't');
        $item->setTaxRate('7.50');
        $item->setTaxAmount('3750.00');
        $this->assertEquals('7.50', $item->getTaxRate());
        $this->assertEquals('3750.00', $item->getTaxAmount());
    }

    // ─── Tax Configuration ────────────────────────────────────

    public function testTaxConfig(): void
    {
        $tax = new TaxConfiguration('vat', 'Value Added Tax', '7.50', 't');
        $this->assertEquals('vat', $tax->getTaxKey());
        $this->assertEquals('7.50', $tax->getRate());
        $this->assertTrue($tax->isActive());
    }

    // ─── toArray serialization ────────────────────────────────

    public function testFolioToArray(): void
    {
        $folio = new Folio('p', 'b', 'g', 'FL-001', 't');
        $folio->onPrePersist();
        $arr = $folio->toArray();
        $this->assertArrayHasKey('folio_number', $arr);
        $this->assertArrayHasKey('balance', $arr);
        $this->assertEquals('open', $arr['status']);
    }

    public function testChargeToArray(): void
    {
        $charge = new FolioCharge('f', ChargeCategory::LAUNDRY, 'Shirt ironing', '500.00', 2, 't');
        $charge->onPrePersist();
        $arr = $charge->toArray();
        $this->assertEquals('laundry', $arr['category']);
        $this->assertEquals('Laundry', $arr['category_label']);
        $this->assertEquals('1000.00', $arr['line_total']);
    }

    public function testPaymentToArray(): void
    {
        $p = new FolioPayment('f', PaymentMethod::CASH, '10000.00', 't');
        $p->onPrePersist();
        $arr = $p->toArray();
        $this->assertEquals('cash', $arr['payment_method']);
        $this->assertEquals('pending', $arr['status']);
    }
}
