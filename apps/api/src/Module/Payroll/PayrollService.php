<?php

declare(strict_types=1);

namespace Lodgik\Module\Payroll;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\PayrollPeriod;
use Lodgik\Entity\PayrollItem;
use Lodgik\Entity\TaxBracket;
use Lodgik\Enum\PayrollStatus;
use Lodgik\Repository\PayrollPeriodRepository;
use Lodgik\Repository\PayrollItemRepository;
use Lodgik\Repository\TaxBracketRepository;
use Lodgik\Repository\EmployeeRepository;
use Lodgik\Service\ZeptoMailService;
use Lodgik\Service\PaystackService;
use Psr\Log\LoggerInterface;

final class PayrollService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PayrollPeriodRepository $periodRepo,
        private readonly PayrollItemRepository $itemRepo,
        private readonly TaxBracketRepository $bracketRepo,
        private readonly EmployeeRepository $empRepo,
        private readonly ZeptoMailService $mailer,
        private readonly LoggerInterface $logger,
        private readonly ?PaystackService $paystack = null,
    ) {}

    // ─── Payroll Period CRUD ────────────────────────────────────

    /** @return PayrollPeriod[] */
    public function listPeriods(string $propertyId, ?int $year = null): array
    {
        return $this->periodRepo->findByProperty($propertyId, $year);
    }

    public function getPeriod(string $id): ?PayrollPeriod
    {
        return $this->periodRepo->find($id);
    }

    public function createPeriod(string $propertyId, int $year, int $month, string $tenantId): PayrollPeriod
    {
        $existing = $this->periodRepo->findByPeriod($propertyId, $year, $month);
        if ($existing) throw new \RuntimeException("Payroll period already exists for {$month}/{$year}");

        $period = new PayrollPeriod($propertyId, $year, $month, $tenantId);
        $this->em->persist($period);
        $this->em->flush();
        return $period;
    }

    // ─── Calculate Payroll ──────────────────────────────────────

    /**
     * Calculate payroll for all active employees.
     * Draft/Calculated → recalculate allowed. Reviewed+ → locked.
     */
    public function calculate(string $periodId): PayrollPeriod
    {
        $period = $this->periodRepo->find($periodId);
        if (!$period) throw new \RuntimeException('Payroll period not found');
        if (!in_array($period->getStatus(), [PayrollStatus::DRAFT, PayrollStatus::CALCULATED], true)) {
            throw new \RuntimeException('Cannot recalculate a reviewed/approved payroll');
        }

        // Clear existing items for recalculation
        $this->itemRepo->deleteByPeriod($periodId);

        $employees = $this->empRepo->findActiveByProperty($period->getPropertyId());
        $brackets = $this->bracketRepo->findAllOrdered();

        $totalGross = 0;
        $totalNet = 0;
        $totalTax = 0;
        $totalPension = 0;
        $totalNhf = 0;

        foreach ($employees as $emp) {
            $grossKobo = (int) $emp->getGrossSalary();
            if ($grossKobo <= 0) continue;

            $item = new PayrollItem($periodId, $emp->getId(), $emp->getFullName(), $emp->getStaffId(), $period->getTenantId());

            // ─── Salary breakdown (standard Nigerian split) ─────
            // Basic: 40%, Housing: 20%, Transport: 15%, Other: 25%
            $basic     = (int) round($grossKobo * 0.40);
            $housing   = (int) round($grossKobo * 0.20);
            $transport = (int) round($grossKobo * 0.15);
            $other     = $grossKobo - $basic - $housing - $transport;

            $item->setBasicSalary((string) $basic);
            $item->setHousingAllowance((string) $housing);
            $item->setTransportAllowance((string) $transport);
            $item->setOtherAllowances((string) $other);
            $item->setGrossPay((string) $grossKobo);

            // ─── PAYE Calculation (all in kobo, annualized) ─────
            $annualGross = $grossKobo * 12;

            // 1. Pension: 8% of (basic + housing + transport) — employee contribution
            $pensionable = $basic + $housing + $transport;
            $pensionMonthly = (int) round($pensionable * 0.08);
            $pensionAnnual = $pensionMonthly * 12;

            // 2. NHF: 2.5% of basic
            $nhfMonthly = (int) round($basic * 0.025);
            $nhfAnnual = $nhfMonthly * 12;

            // 3. CRA: higher of (1% of gross income OR ₦200,000) + 20% of gross income
            // All in kobo: ₦200,000 = 20,000,000 kobo
            $onePercent = (int) round($annualGross * 0.01);
            $twoHundredK = 20000000; // ₦200,000 in kobo
            $craAnnual = max($onePercent, $twoHundredK) + (int) round($annualGross * 0.20);

            // 4. Taxable Income = Annual Gross - CRA - Pension - NHF
            $taxableAnnual = max(0, $annualGross - $craAnnual - $pensionAnnual - $nhfAnnual);

            // 5. Apply PAYE tax brackets
            $annualTax = $this->calculatePAYE($taxableAnnual, $brackets);
            $monthlyTax = (int) round($annualTax / 12);

            $item->setCra((string) (int) round($craAnnual / 12));
            $item->setPensionEmployee((string) $pensionMonthly);
            $item->setNhf((string) $nhfMonthly);
            $item->setTaxableIncome((string) (int) round($taxableAnnual / 12));
            $item->setPayeTax((string) $monthlyTax);

            // Total deductions
            $totalDed = $pensionMonthly + $nhfMonthly + $monthlyTax;
            $item->setTotalDeductions((string) $totalDed);
            $item->setNetPay((string) ($grossKobo - $totalDed));

            // Snapshot bank details
            $item->setBankName($emp->getBankName());
            $item->setBankAccountNumber($emp->getBankAccountNumber());
            $item->setBankAccountName($emp->getBankAccountName());

            $this->em->persist($item);

            $totalGross   += $grossKobo;
            $totalNet     += ($grossKobo - $totalDed);
            $totalTax     += $monthlyTax;
            $totalPension += $pensionMonthly;
            $totalNhf     += $nhfMonthly;
        }

        $period->setTotalGross((string) $totalGross);
        $period->setTotalNet((string) $totalNet);
        $period->setTotalTax((string) $totalTax);
        $period->setTotalPension((string) $totalPension);
        $period->setTotalNhf((string) $totalNhf);
        $period->setEmployeeCount(count($employees));
        $period->setStatus(PayrollStatus::CALCULATED);
        $period->setCalculatedAt(new \DateTimeImmutable());

        $this->em->flush();
        $this->logger->info("Payroll calculated: period=$periodId, employees={$period->getEmployeeCount()}");
        return $period;
    }

    /**
     * Apply Nigeria PAYE graduated tax brackets to annual taxable income (in kobo).
     * @param TaxBracket[] $brackets
     */
    private function calculatePAYE(int $taxableAnnualKobo, array $brackets): int
    {
        if ($taxableAnnualKobo <= 0) return 0;

        // Convert to naira for bracket comparison, then back to kobo
        $taxableNaira = $taxableAnnualKobo / 100;
        $totalTaxNaira = 0;
        $remaining = $taxableNaira;

        foreach ($brackets as $bracket) {
            if ($remaining <= 0) break;
            $lower = (int) $bracket->getLowerBound();
            $upper = (int) $bracket->getUpperBound();
            $rate = (float) $bracket->getRate() / 100;

            $bracketWidth = ($upper > 0) ? ($upper - $lower) : PHP_INT_MAX;
            $amountInBracket = min($remaining, $bracketWidth);
            $totalTaxNaira += $amountInBracket * $rate;
            $remaining -= $amountInBracket;
        }

        // Minimum tax: 1% of gross if PAYE < 1% of gross (Nigeria Finance Act)
        return (int) round($totalTaxNaira * 100); // back to kobo
    }

    // ─── Workflow: review → approve → paid ──────────────────────

    public function review(string $periodId): PayrollPeriod
    {
        $period = $this->periodRepo->find($periodId);
        if (!$period) throw new \RuntimeException('Not found');
        if ($period->getStatus() !== PayrollStatus::CALCULATED) throw new \RuntimeException('Must be calculated first');
        $period->setStatus(PayrollStatus::REVIEWED);
        $this->em->flush();
        return $period;
    }

    public function approve(string $periodId, string $approvedBy): PayrollPeriod
    {
        $period = $this->periodRepo->find($periodId);
        if (!$period) throw new \RuntimeException('Not found');
        if ($period->getStatus() !== PayrollStatus::REVIEWED) throw new \RuntimeException('Must be reviewed first');
        $period->setStatus(PayrollStatus::APPROVED);
        $period->setApprovedBy($approvedBy);
        $period->setApprovedAt(new \DateTimeImmutable());
        $this->em->flush();
        return $period;
    }

    public function markPaid(string $periodId): PayrollPeriod
    {
        $period = $this->periodRepo->find($periodId);
        if (!$period) throw new \RuntimeException('Not found');
        if ($period->getStatus() !== PayrollStatus::APPROVED) throw new \RuntimeException('Must be approved first');
        $period->setStatus(PayrollStatus::PAID);
        $this->em->flush();
        return $period;
    }

    // ─── Payslip ────────────────────────────────────────────────

    /** @return PayrollItem[] */
    public function getPayslips(string $periodId): array
    {
        return $this->itemRepo->findByPeriod($periodId);
    }

    public function getPayslip(string $itemId): ?PayrollItem
    {
        return $this->itemRepo->find($itemId);
    }

    /** @return TaxBracket[] */
    public function getTaxBrackets(): array
    {
        return $this->bracketRepo->findAllOrdered();
    }

    public function generatePayslipHtml(PayrollItem $item, PayrollPeriod $period, string $hotelName): string
    {
        $fmt = fn(string $kobo) => '₦' . number_format((int) $kobo / 100, 2);

        return <<<HTML
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:auto;padding:20px}
.header{text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:10px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin:10px 0}
th,td{padding:8px;text-align:left;border-bottom:1px solid #eee}
.section{font-weight:bold;background:#f8f9fa;padding:10px;margin:15px 0 5px}
.total{font-weight:bold;font-size:1.1em;border-top:2px solid #333}
.net{color:#22c55e;font-size:1.3em}</style></head>
<body>
<div class="header"><h2>{$hotelName}</h2><h3>PAYSLIP — {$period->getPeriodLabel()}</h3></div>
<table><tr><td><strong>Employee:</strong> {$item->getEmployeeName()}</td><td><strong>Staff ID:</strong> {$item->getEmployeeStaffId()}</td></tr>
<tr><td><strong>Bank:</strong> {$item->getBankName()}</td><td><strong>Account:</strong> {$item->getBankAccountNumber()}</td></tr></table>
<div class="section">EARNINGS</div>
<table>
<tr><td>Basic Salary</td><td>{$fmt($item->getBasicSalary())}</td></tr>
<tr><td>Housing Allowance</td><td>{$fmt($item->getHousingAllowance())}</td></tr>
<tr><td>Transport Allowance</td><td>{$fmt($item->getTransportAllowance())}</td></tr>
<tr><td>Other Allowances</td><td>{$fmt($item->getOtherAllowances())}</td></tr>
<tr class="total"><td>GROSS PAY</td><td>{$fmt($item->getGrossPay())}</td></tr>
</table>
<div class="section">DEDUCTIONS</div>
<table>
<tr><td>PAYE Tax</td><td>{$fmt($item->getPayeTax())}</td></tr>
<tr><td>Pension (8% employee)</td><td>{$fmt($item->getPensionEmployee())}</td></tr>
<tr><td>NHF (2.5%)</td><td>{$fmt($item->getNhf())}</td></tr>
<tr class="total"><td>TOTAL DEDUCTIONS</td><td>{$fmt($item->getTotalDeductions())}</td></tr>
</table>
<div class="section">PAYE CALCULATION</div>
<table>
<tr><td>Monthly CRA</td><td>{$fmt($item->getCra())}</td></tr>
<tr><td>Monthly Taxable Income</td><td>{$fmt($item->getTaxableIncome())}</td></tr>
</table>
<table><tr class="total net"><td>NET PAY</td><td>{$fmt($item->getNetPay())}</td></tr></table>
<p style="text-align:center;color:#999;margin-top:30px;font-size:0.8em">Generated by Lodgik — {$hotelName}</p>
</body></html>
HTML;
    }

    public function emailPayslip(string $itemId, string $hotelName): bool
    {
        $item = $this->itemRepo->find($itemId);
        if (!$item) throw new \RuntimeException('Payslip not found');

        $period = $this->periodRepo->find($item->getPayrollPeriodId());
        if (!$period) throw new \RuntimeException('Period not found');

        $emp = $this->empRepo->find($item->getEmployeeId());
        if (!$emp || !$emp->getEmail()) throw new \RuntimeException('Employee email not available');

        $html = $this->generatePayslipHtml($item, $period, $hotelName);
        $subject = "Payslip — {$period->getPeriodLabel()} — {$hotelName}";

        $sent = $this->mailer->send($emp->getEmail(), $emp->getFullName(), $subject, $html);
        if ($sent) {
            $item->setPayslipEmailedAt(new \DateTimeImmutable());
            $this->em->flush();
        }
        return $sent;
    }

    // ─── Paystack Salary Disbursement ────────────────────────────

    /**
     * Disburse salaries for an approved payroll period via Paystack Transfers.
     *
     * Rules:
     * - Period must be in APPROVED status
     * - Paystack must be configured
     * - Each payslip must have bank_account_number and bank_code
     * - Already-successful transfers are skipped (idempotent)
     * - On completion, period status is set to PAID
     *
     * Returns a summary array with per-employee results.
     *
     * @throws \RuntimeException if Paystack is not configured or period is wrong status
     */
    public function disbursePayroll(string $periodId): array
    {
        if ($this->paystack === null || !$this->paystack->isConfigured()) {
            throw new \RuntimeException('Paystack is not configured. Please set PAYSTACK_SECRET_KEY in your environment.');
        }

        $period = $this->periodRepo->find($periodId);
        if (!$period) throw new \RuntimeException('Payroll period not found');

        if ($period->getStatus() !== PayrollStatus::APPROVED) {
            throw new \DomainException(
                "Payroll must be in 'approved' status before disbursement. Current status: {$period->getStatus()->value}"
            );
        }

        $items = $this->itemRepo->findByPeriod($periodId);
        if (empty($items)) {
            throw new \RuntimeException('No payslips found for this period');
        }

        $results   = [];
        $allPassed = true;

        foreach ($items as $item) {
            // Skip already-successful transfers
            if ($item->getTransferStatus() === 'success') {
                $results[] = [
                    'employee_id'   => $item->getEmployeeId(),
                    'employee_name' => $item->getEmployeeName(),
                    'status'        => 'skipped',
                    'reason'        => 'Already disbursed',
                    'reference'     => $item->getTransferReference(),
                ];
                continue;
            }

            $accountNumber = $item->getBankAccountNumber();
            $accountName   = $item->getBankAccountName();
            $bankCode      = $item->getBankCode();
            $netPayKobo    = (int) $item->getNetPay();

            if (empty($accountNumber) || empty($bankCode)) {
                $results[] = [
                    'employee_id'   => $item->getEmployeeId(),
                    'employee_name' => $item->getEmployeeName(),
                    'status'        => 'skipped',
                    'reason'        => 'Missing bank account number or bank code',
                ];
                $allPassed = false;
                continue;
            }

            if ($netPayKobo <= 0) {
                $results[] = [
                    'employee_id'   => $item->getEmployeeId(),
                    'employee_name' => $item->getEmployeeName(),
                    'status'        => 'skipped',
                    'reason'        => 'Net pay is zero',
                ];
                continue;
            }

            try {
                // Create or reuse transfer recipient
                $recipientCode = $item->getTransferRecipientCode();
                if (empty($recipientCode)) {
                    $recipientCode = $this->paystack->createTransferRecipient(
                        accountName:   $accountName ?? $item->getEmployeeName(),
                        accountNumber: $accountNumber,
                        bankCode:      $bankCode,
                        description:   "Salary — {$item->getEmployeeName()}",
                    );
                    $item->setTransferRecipientCode($recipientCode);
                }

                // Unique reference: period + employee
                $reference = 'SAL-' . strtoupper(substr($periodId, 0, 8))
                    . '-' . strtoupper(substr($item->getEmployeeId(), 0, 8))
                    . '-' . time();

                $transfer = $this->paystack->initiateTransfer(
                    recipientCode: $recipientCode,
                    amountKobo:    $netPayKobo,
                    reference:     $reference,
                    reason:        "Salary payment — {$period->getPeriodLabel()}",
                );

                $item->recordTransferInitiated($reference, $recipientCode);

                // Paystack may complete immediately (OTP-disabled accounts)
                if (($transfer['status'] ?? '') === 'success') {
                    $item->recordTransferSuccess();
                }

                $results[] = [
                    'employee_id'   => $item->getEmployeeId(),
                    'employee_name' => $item->getEmployeeName(),
                    'status'        => $item->getTransferStatus(),
                    'reference'     => $reference,
                    'amount_kobo'   => $netPayKobo,
                ];

                $this->logger->info("Transfer initiated for {$item->getEmployeeName()} ref={$reference}");

            } catch (\Throwable $e) {
                $item->recordTransferFailure($e->getMessage());
                $allPassed = false;

                $results[] = [
                    'employee_id'   => $item->getEmployeeId(),
                    'employee_name' => $item->getEmployeeName(),
                    'status'        => 'failed',
                    'reason'        => $e->getMessage(),
                ];

                $this->logger->error("Transfer failed for {$item->getEmployeeName()}: {$e->getMessage()}");
            }
        }

        $this->em->flush();

        // Mark period as paid only when all items succeeded or were skipped for legitimate reasons
        $anyPending = array_filter($results, fn($r) => $r['status'] === 'pending');
        $anyFailed  = array_filter($results, fn($r) => $r['status'] === 'failed');

        if (empty($anyFailed) && empty($anyPending)) {
            $period->setStatus(PayrollStatus::PAID);
            $this->em->flush();
        }

        return [
            'period_id'    => $periodId,
            'total_items'  => count($items),
            'results'      => $results,
            'all_passed'   => $allPassed && empty($anyFailed),
            'period_status' => $period->getStatus()->value,
        ];
    }
}
    }
}
