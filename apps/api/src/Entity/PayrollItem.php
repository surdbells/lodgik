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
#[ORM\Table(name: 'payroll_items')]
#[ORM\UniqueConstraint(name: 'uq_payroll_item', columns: ['payroll_period_id', 'employee_id'])]
#[ORM\Index(columns: ['payroll_period_id'], name: 'idx_pi_period')]
#[ORM\Index(columns: ['tenant_id', 'employee_id'], name: 'idx_pi_employee')]
#[ORM\HasLifecycleCallbacks]
class PayrollItem implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'payroll_period_id', type: Types::STRING, length: 36)]
    private string $payrollPeriodId;

    #[ORM\Column(name: 'employee_id', type: Types::STRING, length: 36)]
    private string $employeeId;

    // ─── Earnings (all in kobo) ─────────────────────────────────

    #[ORM\Column(name: 'basic_salary', type: Types::BIGINT, options: ['default' => 0])]
    private string $basicSalary = '0';

    #[ORM\Column(name: 'housing_allowance', type: Types::BIGINT, options: ['default' => 0])]
    private string $housingAllowance = '0';

    #[ORM\Column(name: 'transport_allowance', type: Types::BIGINT, options: ['default' => 0])]
    private string $transportAllowance = '0';

    #[ORM\Column(name: 'other_allowances', type: Types::BIGINT, options: ['default' => 0])]
    private string $otherAllowances = '0';

    #[ORM\Column(name: 'overtime_pay', type: Types::BIGINT, options: ['default' => 0])]
    private string $overtimePay = '0';

    #[ORM\Column(name: 'gross_pay', type: Types::BIGINT, options: ['default' => 0])]
    private string $grossPay = '0';

    // ─── PAYE Calculation ───────────────────────────────────────

    /** Consolidated Relief Allowance (CRA) = max(₦200k, 1% gross) + 20% gross annually */
    #[ORM\Column(type: Types::BIGINT, options: ['default' => 0])]
    private string $cra = '0';

    /** Employee pension contribution (8% of basic + housing + transport) */
    #[ORM\Column(name: 'pension_employee', type: Types::BIGINT, options: ['default' => 0])]
    private string $pensionEmployee = '0';

    /** NHF contribution (2.5% of basic) */
    #[ORM\Column(type: Types::BIGINT, options: ['default' => 0])]
    private string $nhf = '0';

    /** Taxable income = gross - CRA - pension - NHF (annualized) */
    #[ORM\Column(name: 'taxable_income', type: Types::BIGINT, options: ['default' => 0])]
    private string $taxableIncome = '0';

    /** PAYE tax (monthly portion) */
    #[ORM\Column(name: 'paye_tax', type: Types::BIGINT, options: ['default' => 0])]
    private string $payeTax = '0';

    // ─── Other Deductions ───────────────────────────────────────

    #[ORM\Column(name: 'other_deductions', type: Types::BIGINT, options: ['default' => 0])]
    private string $otherDeductions = '0';

    #[ORM\Column(name: 'total_deductions', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalDeductions = '0';

    #[ORM\Column(name: 'net_pay', type: Types::BIGINT, options: ['default' => 0])]
    private string $netPay = '0';

    // ─── Snapshot ───────────────────────────────────────────────

    #[ORM\Column(name: 'employee_name', type: Types::STRING, length: 200)]
    private string $employeeName;

    #[ORM\Column(name: 'employee_staff_id', type: Types::STRING, length: 30)]
    private string $employeeStaffId;

    #[ORM\Column(name: 'bank_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $bankName = null;

    /** Encrypted at rest with AES-256-GCM via EncryptionService */
    #[ORM\Column(name: 'bank_account_number', type: Types::TEXT, nullable: true)]
    private ?string $bankAccountNumber = null;

    #[ORM\Column(name: 'bank_account_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $bankAccountName = null;

    /** CBN bank code (e.g. "058" for GTBank) — required for Paystack transfer */
    #[ORM\Column(name: 'bank_code', type: Types::STRING, length: 10, nullable: true)]
    private ?string $bankCode = null;

    #[ORM\Column(name: 'payslip_emailed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $payslipEmailedAt = null;

    // ─── Paystack Transfer Tracking ─────────────────────────────

    /** Paystack transfer recipient code — reused across payroll runs */
    #[ORM\Column(name: 'transfer_recipient_code', type: Types::STRING, length: 50, nullable: true)]
    private ?string $transferRecipientCode = null;

    /** Paystack transfer reference for this specific disbursement */
    #[ORM\Column(name: 'transfer_reference', type: Types::STRING, length: 100, nullable: true)]
    private ?string $transferReference = null;

    /** pending | success | failed | reversed */
    #[ORM\Column(name: 'transfer_status', type: Types::STRING, length: 20, nullable: true)]
    private ?string $transferStatus = null;

    #[ORM\Column(name: 'transfer_initiated_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $transferInitiatedAt = null;

    #[ORM\Column(name: 'transfer_completed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $transferCompletedAt = null;

    #[ORM\Column(name: 'transfer_failure_reason', type: Types::TEXT, nullable: true)]
    private ?string $transferFailureReason = null;

    public function __construct(string $payrollPeriodId, string $employeeId, string $employeeName, string $employeeStaffId, string $tenantId)
    {
        $this->generateId();
        $this->payrollPeriodId = $payrollPeriodId;
        $this->employeeId = $employeeId;
        $this->employeeName = $employeeName;
        $this->employeeStaffId = $employeeStaffId;
        $this->setTenantId($tenantId);
    }

    // Getters & setters
    public function getPayrollPeriodId(): string { return $this->payrollPeriodId; }
    public function getEmployeeId(): string { return $this->employeeId; }
    public function getEmployeeName(): string { return $this->employeeName; }
    public function getEmployeeStaffId(): string { return $this->employeeStaffId; }
    public function getBasicSalary(): string { return $this->basicSalary; }
    public function setBasicSalary(string $v): void { $this->basicSalary = $v; }
    public function getHousingAllowance(): string { return $this->housingAllowance; }
    public function setHousingAllowance(string $v): void { $this->housingAllowance = $v; }
    public function getTransportAllowance(): string { return $this->transportAllowance; }
    public function setTransportAllowance(string $v): void { $this->transportAllowance = $v; }
    public function getOtherAllowances(): string { return $this->otherAllowances; }
    public function setOtherAllowances(string $v): void { $this->otherAllowances = $v; }
    public function getOvertimePay(): string { return $this->overtimePay; }
    public function setOvertimePay(string $v): void { $this->overtimePay = $v; }
    public function getGrossPay(): string { return $this->grossPay; }
    public function setGrossPay(string $v): void { $this->grossPay = $v; }
    public function getCra(): string { return $this->cra; }
    public function setCra(string $v): void { $this->cra = $v; }
    public function getPensionEmployee(): string { return $this->pensionEmployee; }
    public function setPensionEmployee(string $v): void { $this->pensionEmployee = $v; }
    public function getNhf(): string { return $this->nhf; }
    public function setNhf(string $v): void { $this->nhf = $v; }
    public function getTaxableIncome(): string { return $this->taxableIncome; }
    public function setTaxableIncome(string $v): void { $this->taxableIncome = $v; }
    public function getPayeTax(): string { return $this->payeTax; }
    public function setPayeTax(string $v): void { $this->payeTax = $v; }
    public function getOtherDeductions(): string { return $this->otherDeductions; }
    public function setOtherDeductions(string $v): void { $this->otherDeductions = $v; }
    public function getTotalDeductions(): string { return $this->totalDeductions; }
    public function setTotalDeductions(string $v): void { $this->totalDeductions = $v; }
    public function getNetPay(): string { return $this->netPay; }
    public function setNetPay(string $v): void { $this->netPay = $v; }
    public function getBankName(): ?string { return $this->bankName; }
    public function setBankName(?string $v): void { $this->bankName = $v; }
    public function getBankAccountNumber(): ?string { return $this->bankAccountNumber; }
    public function setBankAccountNumber(?string $v): void { $this->bankAccountNumber = $v; }
    public function getBankAccountName(): ?string { return $this->bankAccountName; }
    public function setBankAccountName(?string $v): void { $this->bankAccountName = $v; }
    public function getBankCode(): ?string { return $this->bankCode; }
    public function setBankCode(?string $v): void { $this->bankCode = $v; }
    public function getPayslipEmailedAt(): ?\DateTimeImmutable { return $this->payslipEmailedAt; }
    public function setPayslipEmailedAt(?\DateTimeImmutable $v): void { $this->payslipEmailedAt = $v; }

    // Transfer tracking
    public function getTransferRecipientCode(): ?string { return $this->transferRecipientCode; }
    public function setTransferRecipientCode(?string $v): void { $this->transferRecipientCode = $v; }
    public function getTransferReference(): ?string { return $this->transferReference; }
    public function setTransferReference(?string $v): void { $this->transferReference = $v; }
    public function getTransferStatus(): ?string { return $this->transferStatus; }
    public function setTransferStatus(?string $v): void { $this->transferStatus = $v; }
    public function getTransferInitiatedAt(): ?\DateTimeImmutable { return $this->transferInitiatedAt; }
    public function setTransferInitiatedAt(?\DateTimeImmutable $v): void { $this->transferInitiatedAt = $v; }
    public function getTransferCompletedAt(): ?\DateTimeImmutable { return $this->transferCompletedAt; }
    public function setTransferCompletedAt(?\DateTimeImmutable $v): void { $this->transferCompletedAt = $v; }
    public function getTransferFailureReason(): ?string { return $this->transferFailureReason; }
    public function setTransferFailureReason(?string $v): void { $this->transferFailureReason = $v; }

    /**
     * Record the result of a Paystack transfer initiation.
     */
    public function recordTransferInitiated(string $reference, string $recipientCode): void
    {
        $this->transferReference     = $reference;
        $this->transferRecipientCode = $recipientCode;
        $this->transferStatus        = 'pending';
        $this->transferInitiatedAt   = new \DateTimeImmutable();
    }

    public function recordTransferSuccess(): void
    {
        $this->transferStatus      = 'success';
        $this->transferCompletedAt = new \DateTimeImmutable();
    }

    public function recordTransferFailure(string $reason): void
    {
        $this->transferStatus        = 'failed';
        $this->transferFailureReason = $reason;
        $this->transferCompletedAt   = new \DateTimeImmutable();
    }

    public function toArray(): array
    {
        return [
            'id'                      => $this->getId(),
            'payroll_period_id'       => $this->payrollPeriodId,
            'employee_id'             => $this->employeeId,
            'employee_name'           => $this->employeeName,
            'employee_staff_id'       => $this->employeeStaffId,
            'basic_salary'            => $this->basicSalary,
            'housing_allowance'       => $this->housingAllowance,
            'transport_allowance'     => $this->transportAllowance,
            'other_allowances'        => $this->otherAllowances,
            'overtime_pay'            => $this->overtimePay,
            'gross_pay'               => $this->grossPay,
            'cra'                     => $this->cra,
            'pension_employee'        => $this->pensionEmployee,
            'nhf'                     => $this->nhf,
            'taxable_income'          => $this->taxableIncome,
            'paye_tax'                => $this->payeTax,
            'other_deductions'        => $this->otherDeductions,
            'total_deductions'        => $this->totalDeductions,
            'net_pay'                 => $this->netPay,
            'bank_name'               => $this->bankName,
            'bank_account_number'     => $this->bankAccountNumber,
            'bank_account_name'       => $this->bankAccountName,
            'bank_code'               => $this->bankCode,
            // Transfer
            'transfer_status'         => $this->transferStatus,
            'transfer_reference'      => $this->transferReference,
            'transfer_initiated_at'   => $this->transferInitiatedAt?->format('Y-m-d H:i:s'),
            'transfer_completed_at'   => $this->transferCompletedAt?->format('Y-m-d H:i:s'),
            'transfer_failure_reason' => $this->transferFailureReason,
            'payslip_emailed_at'      => $this->payslipEmailedAt?->format('Y-m-d H:i:s'),
            'created_at'              => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }

    // ─── PII Encryption Lifecycle ────────────────────────────────

    #[ORM\PrePersist]
    #[ORM\PreUpdate]
    public function encryptPii(): void
    {
        $enc = new \Lodgik\Service\EncryptionService();
        $this->bankAccountNumber = $enc->encrypt($this->bankAccountNumber);
    }

    #[ORM\PostLoad]
    public function decryptPii(): void
    {
        $enc = new \Lodgik\Service\EncryptionService();
        $this->bankAccountNumber = $enc->decrypt($this->bankAccountNumber);
    }
}
