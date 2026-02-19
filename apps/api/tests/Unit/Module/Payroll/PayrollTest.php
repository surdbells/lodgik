<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Payroll;

use Lodgik\Entity\TaxBracket;
use Lodgik\Entity\PayrollPeriod;
use Lodgik\Entity\PayrollItem;
use Lodgik\Enum\PayrollStatus;
use PHPUnit\Framework\TestCase;

final class PayrollTest extends TestCase
{
    // ─── TaxBracket Entity ──────────────────────────────────────

    public function testTaxBracket(): void
    {
        $b = new TaxBracket('0', '300000', '7.00', 1, 't1');
        $this->assertEquals('0', $b->getLowerBound());
        $this->assertEquals('300000', $b->getUpperBound());
        $this->assertEquals('7.00', $b->getRate());
        $this->assertEquals(1, $b->getSortOrder());
    }

    public function testTaxBracketToArray(): void
    {
        $b = new TaxBracket('300000', '600000', '11.00', 2, 't1');
        $arr = $b->toArray();
        $this->assertEquals('300000', $arr['lower_bound']);
        $this->assertEquals('11.00', $arr['rate']);
    }

    // ─── PayrollPeriod Entity ───────────────────────────────────

    public function testPayrollPeriodCreation(): void
    {
        $pp = new PayrollPeriod('p1', 2026, 2, 't1');
        $this->assertEquals(2026, $pp->getYear());
        $this->assertEquals(2, $pp->getMonth());
        $this->assertEquals(PayrollStatus::DRAFT, $pp->getStatus());
        $this->assertEquals('February 2026', $pp->getPeriodLabel());
    }

    public function testPayrollPeriodWorkflow(): void
    {
        $pp = new PayrollPeriod('p1', 2026, 1, 't1');
        $this->assertEquals(PayrollStatus::DRAFT, $pp->getStatus());

        $pp->setStatus(PayrollStatus::CALCULATED);
        $this->assertEquals(PayrollStatus::CALCULATED, $pp->getStatus());

        $pp->setStatus(PayrollStatus::REVIEWED);
        $this->assertEquals(PayrollStatus::REVIEWED, $pp->getStatus());

        $pp->setStatus(PayrollStatus::APPROVED);
        $pp->setApprovedBy('user-1');
        $pp->setApprovedAt(new \DateTimeImmutable());
        $this->assertEquals(PayrollStatus::APPROVED, $pp->getStatus());
        $this->assertNotNull($pp->getApprovedAt());

        $pp->setStatus(PayrollStatus::PAID);
        $this->assertEquals(PayrollStatus::PAID, $pp->getStatus());
    }

    public function testPayrollPeriodTotals(): void
    {
        $pp = new PayrollPeriod('p1', 2026, 3, 't1');
        $pp->setTotalGross('100000000'); // ₦1,000,000
        $pp->setTotalNet('75000000');
        $pp->setTotalTax('15000000');
        $pp->setTotalPension('8000000');
        $pp->setTotalNhf('2000000');
        $pp->setEmployeeCount(5);
        $this->assertEquals('100000000', $pp->getTotalGross());
        $this->assertEquals(5, $pp->getEmployeeCount());
    }

    // ─── PayrollItem Entity ─────────────────────────────────────

    public function testPayrollItemCreation(): void
    {
        $pi = new PayrollItem('pp-1', 'emp-1', 'Adebayo Ogunlesi', 'EMP-0001', 't1');
        $this->assertEquals('Adebayo Ogunlesi', $pi->getEmployeeName());
        $this->assertEquals('EMP-0001', $pi->getEmployeeStaffId());
        $this->assertEquals('0', $pi->getGrossPay());
    }

    public function testPayrollItemSalaryBreakdown(): void
    {
        $pi = new PayrollItem('pp-1', 'emp-1', 'Test', 'EMP-0001', 't1');
        // ₦350,000/mo gross = 35,000,000 kobo
        $gross = 35000000;
        $pi->setBasicSalary((string)(int)($gross * 0.40)); // 14,000,000
        $pi->setHousingAllowance((string)(int)($gross * 0.20)); // 7,000,000
        $pi->setTransportAllowance((string)(int)($gross * 0.15)); // 5,250,000
        $pi->setOtherAllowances((string)($gross - 14000000 - 7000000 - 5250000));
        $pi->setGrossPay((string)$gross);

        $this->assertEquals('14000000', $pi->getBasicSalary());
        $this->assertEquals('7000000', $pi->getHousingAllowance());
        $this->assertEquals('5250000', $pi->getTransportAllowance());
        $this->assertEquals('35000000', $pi->getGrossPay());
    }

    public function testPayrollItemPAYECalculation(): void
    {
        $pi = new PayrollItem('pp-1', 'emp-1', 'Test', 'EMP-0001', 't1');

        // Simulate PAYE for ₦350,000/mo gross
        $grossKobo = 35000000;
        $annualGross = $grossKobo * 12; // 420,000,000 kobo = ₦4,200,000

        // Pension: 8% of (basic + housing + transport) = 8% of 75% of gross
        $pensionable = (int)($grossKobo * 0.75);
        $pensionMonthly = (int)round($pensionable * 0.08);
        $this->assertEquals(2100000, $pensionMonthly); // ₦21,000

        // NHF: 2.5% of basic (40% of gross)
        $basic = (int)($grossKobo * 0.40);
        $nhfMonthly = (int)round($basic * 0.025);
        $this->assertEquals(350000, $nhfMonthly); // ₦3,500

        // CRA: max(1% of gross, ₦200k) + 20% of gross (annually)
        $onePercent = (int)round($annualGross * 0.01); // 4,200,000 kobo = ₦42,000
        $twoHundredK = 20000000; // ₦200,000 in kobo
        $craAnnual = max($onePercent, $twoHundredK) + (int)round($annualGross * 0.20);
        $this->assertEquals(104000000, $craAnnual); // ₦1,040,000

        // Taxable = Annual Gross - CRA - Pension*12 - NHF*12
        $taxable = max(0, $annualGross - $craAnnual - ($pensionMonthly * 12) - ($nhfMonthly * 12));
        $this->assertEquals(286600000, $taxable); // ₦2,866,000

        // Apply brackets to ₦2,866,000 annual taxable
        $taxableNaira = $taxable / 100; // 2,866,000
        $tax = 0;
        $remaining = $taxableNaira;

        // First ₦300k @ 7% = ₦21,000
        $amt = min($remaining, 300000); $tax += $amt * 0.07; $remaining -= $amt;
        // Next ₦300k @ 11% = ₦33,000
        $amt = min($remaining, 300000); $tax += $amt * 0.11; $remaining -= $amt;
        // Next ₦500k @ 15% = ₦75,000
        $amt = min($remaining, 500000); $tax += $amt * 0.15; $remaining -= $amt;
        // Next ₦500k @ 19% = ₦95,000
        $amt = min($remaining, 500000); $tax += $amt * 0.19; $remaining -= $amt;
        // Remaining ₦1,266,000 @ 21% = ₦265,860
        $amt = min($remaining, 1600000); $tax += $amt * 0.21; $remaining -= $amt;
        // Total annual tax: ₦489,860
        $this->assertEqualsWithDelta(489860, $tax, 1);
        $monthlyTax = (int)round($tax / 12 * 100); // back to kobo, monthly
        $this->assertEqualsWithDelta(4082167, $monthlyTax, 100); // ~₦40,822/mo
    }

    public function testPayrollItemNetPay(): void
    {
        $pi = new PayrollItem('pp-1', 'emp-1', 'Test', 'EMP-0001', 't1');
        $pi->setGrossPay('35000000');
        $pi->setPensionEmployee('2100000');
        $pi->setNhf('350000');
        $pi->setPayeTax('4082167');
        $totalDed = 2100000 + 350000 + 4082167;
        $pi->setTotalDeductions((string)$totalDed);
        $pi->setNetPay((string)(35000000 - $totalDed));
        $this->assertEquals((string)(35000000 - $totalDed), $pi->getNetPay());
        // ~₦284,678 net
    }

    public function testPayrollItemBankSnapshot(): void
    {
        $pi = new PayrollItem('pp-1', 'emp-1', 'Test', 'EMP-0001', 't1');
        $pi->setBankName('GTBank');
        $pi->setBankAccountNumber('0123456789');
        $pi->setBankAccountName('Adebayo Ogunlesi');
        $this->assertEquals('GTBank', $pi->getBankName());
        $this->assertEquals('0123456789', $pi->getBankAccountNumber());
    }

    public function testPayrollItemToArray(): void
    {
        $pi = new PayrollItem('pp-1', 'emp-1', 'Test User', 'EMP-0001', 't1');
        $pi->setGrossPay('35000000');
        $pi->setNetPay('30000000');
        $pi->onPrePersist();
        $arr = $pi->toArray();
        $this->assertArrayHasKey('gross_pay', $arr);
        $this->assertArrayHasKey('net_pay', $arr);
        $this->assertArrayHasKey('paye_tax', $arr);
        $this->assertArrayHasKey('cra', $arr);
        $this->assertEquals('Test User', $arr['employee_name']);
    }

    // ─── PayrollStatus Enum ─────────────────────────────────────

    public function testPayrollStatusEnum(): void
    {
        $this->assertCount(5, PayrollStatus::values());
        $this->assertEquals('Draft', PayrollStatus::DRAFT->label());
        $this->assertEquals('#22c55e', PayrollStatus::APPROVED->color());
    }

    public function testPayrollStatusWorkflowOrder(): void
    {
        $expected = ['draft', 'calculated', 'reviewed', 'approved', 'paid'];
        $this->assertEquals($expected, PayrollStatus::values());
    }
}
