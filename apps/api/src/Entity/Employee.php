<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Entity\Traits\SoftDeletable;
use Lodgik\Enum\EmploymentStatus;
use Lodgik\Enum\EmploymentType;

#[ORM\Entity]
#[ORM\Table(name: 'employees')]
#[ORM\UniqueConstraint(name: 'uq_emp_tenant_staff_id', columns: ['tenant_id', 'staff_id'])]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_emp_tenant')]
#[ORM\Index(columns: ['tenant_id', 'department_id'], name: 'idx_emp_dept')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_emp_property')]
#[ORM\Index(columns: ['user_id'], name: 'idx_emp_user')]
#[ORM\HasLifecycleCallbacks]
class Employee implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;
    use SoftDeletable;

    // ─── Linkage ────────────────────────────────────────────────

    /** User account (optional — some employees may not have app access) */
    #[ORM\Column(name: 'user_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $userId = null;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'department_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $departmentId = null;

    // ─── Identity ───────────────────────────────────────────────

    #[ORM\Column(name: 'first_name', type: Types::STRING, length: 100)]
    private string $firstName;

    #[ORM\Column(name: 'last_name', type: Types::STRING, length: 100)]
    private string $lastName;

    #[ORM\Column(type: Types::STRING, length: 320, nullable: true)]
    private ?string $email = null;

    /** Encrypted at rest with AES-256-GCM via EncryptionService */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(name: 'staff_id', type: Types::STRING, length: 30)]
    private string $staffId;

    // ─── Employment ─────────────────────────────────────────────

    #[ORM\Column(name: 'job_title', type: Types::STRING, length: 100)]
    private string $jobTitle;

    #[ORM\Column(name: 'employment_status', type: Types::STRING, length: 20, enumType: EmploymentStatus::class)]
    private EmploymentStatus $employmentStatus = EmploymentStatus::ACTIVE;

    #[ORM\Column(name: 'hire_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $hireDate;

    #[ORM\Column(name: 'termination_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $terminationDate = null;

    #[ORM\Column(name: 'employment_type', type: Types::STRING, length: 20, enumType: EmploymentType::class, options: ['default' => 'permanent'])]
    private EmploymentType $employmentType = EmploymentType::PERMANENT;

    #[ORM\Column(name: 'contract_start', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $contractStart = null;

    #[ORM\Column(name: 'contract_end', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $contractEnd = null;

    #[ORM\Column(name: 'notice_period_days', type: Types::SMALLINT, options: ['default' => 30])]
    private int $noticePeriodDays = 30;

    #[ORM\Column(name: 'reporting_to', type: Types::STRING, length: 36, nullable: true)]
    private ?string $reportingTo = null;

    #[ORM\Column(name: 'work_location', type: Types::STRING, length: 100, nullable: true)]
    private ?string $workLocation = null;

    #[ORM\Column(name: 'work_schedule', type: Types::STRING, length: 50, options: ['default' => 'full_time'])]
    private string $workSchedule = 'full_time';

    // ─── Compensation ───────────────────────────────────────────

    /** Monthly gross salary in kobo (NGN cents) */
    #[ORM\Column(name: 'gross_salary', type: Types::BIGINT, options: ['default' => 0])]
    private string $grossSalary = '0';

    #[ORM\Column(name: 'bank_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $bankName = null;

    /** Encrypted at rest with AES-256-GCM via EncryptionService */
    #[ORM\Column(name: 'bank_account_number', type: Types::TEXT, nullable: true)]
    private ?string $bankAccountNumber = null;

    #[ORM\Column(name: 'bank_account_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $bankAccountName = null;

    // ─── Personal ───────────────────────────────────────────────

    #[ORM\Column(name: 'date_of_birth', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $dateOfBirth = null;

    #[ORM\Column(type: Types::STRING, length: 10, nullable: true)]
    private ?string $gender = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $address = null;

    #[ORM\Column(name: 'emergency_contact_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $emergencyContactName = null;

    #[ORM\Column(name: 'emergency_contact_phone', type: Types::STRING, length: 30, nullable: true)]
    private ?string $emergencyContactPhone = null;

    // ─── Tax IDs ────────────────────────────────────────────────

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $nin = null;

    #[ORM\Column(name: 'tax_id', type: Types::STRING, length: 30, nullable: true)]
    private ?string $taxId = null;

    #[ORM\Column(name: 'pension_pin', type: Types::STRING, length: 30, nullable: true)]
    private ?string $pensionPin = null;

    #[ORM\Column(name: 'nhf_id', type: Types::STRING, length: 30, nullable: true)]
    private ?string $nhfId = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    // ─── Constructor ────────────────────────────────────────────

    public function __construct(
        string $propertyId,
        string $firstName,
        string $lastName,
        string $staffId,
        string $jobTitle,
        \DateTimeImmutable $hireDate,
        string $tenantId,
    ) {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->staffId = $staffId;
        $this->jobTitle = $jobTitle;
        $this->hireDate = $hireDate;
        $this->setTenantId($tenantId);
    }

    // ─── Getters & Setters ──────────────────────────────────────

    public function getUserId(): ?string { return $this->userId; }
    public function setUserId(?string $v): void { $this->userId = $v; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getDepartmentId(): ?string { return $this->departmentId; }
    public function setDepartmentId(?string $v): void { $this->departmentId = $v; }
    public function getFirstName(): string { return $this->firstName; }
    public function setFirstName(string $v): void { $this->firstName = $v; }
    public function getLastName(): string { return $this->lastName; }
    public function setLastName(string $v): void { $this->lastName = $v; }
    public function getFullName(): string { return $this->firstName . ' ' . $this->lastName; }
    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $v): void { $this->email = $v; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $v): void { $this->phone = $v; }
    public function getStaffId(): string { return $this->staffId; }
    public function getJobTitle(): string { return $this->jobTitle; }
    public function setJobTitle(string $v): void { $this->jobTitle = $v; }
    public function getEmploymentStatus(): EmploymentStatus { return $this->employmentStatus; }
    public function setEmploymentStatus(EmploymentStatus $v): void { $this->employmentStatus = $v; }
    public function getHireDate(): \DateTimeImmutable { return $this->hireDate; }
    public function getTerminationDate(): ?\DateTimeImmutable { return $this->terminationDate; }
    public function setTerminationDate(?\DateTimeImmutable $v): void { $this->terminationDate = $v; }
    public function getGrossSalary(): string { return $this->grossSalary; }
    public function setGrossSalary(string $v): void { $this->grossSalary = $v; }
    public function getBankName(): ?string { return $this->bankName; }
    public function setBankName(?string $v): void { $this->bankName = $v; }
    public function getBankAccountNumber(): ?string { return $this->bankAccountNumber; }
    public function setBankAccountNumber(?string $v): void { $this->bankAccountNumber = $v; }
    public function getBankAccountName(): ?string { return $this->bankAccountName; }
    public function setBankAccountName(?string $v): void { $this->bankAccountName = $v; }
    public function getDateOfBirth(): ?\DateTimeImmutable { return $this->dateOfBirth; }
    public function setDateOfBirth(?\DateTimeImmutable $v): void { $this->dateOfBirth = $v; }
    public function getGender(): ?string { return $this->gender; }
    public function setGender(?string $v): void { $this->gender = $v; }
    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $v): void { $this->address = $v; }
    public function getEmergencyContactName(): ?string { return $this->emergencyContactName; }
    public function setEmergencyContactName(?string $v): void { $this->emergencyContactName = $v; }
    public function getEmergencyContactPhone(): ?string { return $this->emergencyContactPhone; }
    public function setEmergencyContactPhone(?string $v): void { $this->emergencyContactPhone = $v; }
    public function getNin(): ?string { return $this->nin; }
    public function setNin(?string $v): void { $this->nin = $v; }
    public function getTaxId(): ?string { return $this->taxId; }
    public function setTaxId(?string $v): void { $this->taxId = $v; }
    public function getPensionPin(): ?string { return $this->pensionPin; }
    public function setPensionPin(?string $v): void { $this->pensionPin = $v; }
    public function getNhfId(): ?string { return $this->nhfId; }
    public function setNhfId(?string $v): void { $this->nhfId = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getEmploymentType(): EmploymentType { return $this->employmentType; }
    public function setEmploymentType(EmploymentType $v): void { $this->employmentType = $v; }
    public function getContractStart(): ?\DateTimeImmutable { return $this->contractStart; }
    public function setContractStart(?\DateTimeImmutable $v): void { $this->contractStart = $v; }
    public function getContractEnd(): ?\DateTimeImmutable { return $this->contractEnd; }
    public function setContractEnd(?\DateTimeImmutable $v): void { $this->contractEnd = $v; }
    public function getNoticePeriodDays(): int { return $this->noticePeriodDays; }
    public function setNoticePeriodDays(int $v): void { $this->noticePeriodDays = $v; }
    public function getReportingTo(): ?string { return $this->reportingTo; }
    public function setReportingTo(?string $v): void { $this->reportingTo = $v; }
    public function getWorkLocation(): ?string { return $this->workLocation; }
    public function setWorkLocation(?string $v): void { $this->workLocation = $v; }
    public function getWorkSchedule(): string { return $this->workSchedule; }
    public function setWorkSchedule(string $v): void { $this->workSchedule = $v; }

    public function isContractExpiring(int $withinDays = 30): bool
    {
        if ($this->contractEnd === null) return false;
        $threshold = (new \DateTimeImmutable())->modify("+{$withinDays} days");
        return $this->contractEnd <= $threshold && $this->contractEnd >= new \DateTimeImmutable();
    }

    // ─── Serialization ──────────────────────────────────────────

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'user_id' => $this->userId,
            'property_id' => $this->propertyId,
            'department_id' => $this->departmentId,
            'first_name' => $this->firstName,
            'last_name' => $this->lastName,
            'full_name' => $this->getFullName(),
            'email' => $this->email,
            'phone' => $this->phone,
            'staff_id' => $this->staffId,
            'job_title' => $this->jobTitle,
            'employment_status' => $this->employmentStatus->value,
            'employment_status_label' => $this->employmentStatus->label(),
            'employment_status_color' => $this->employmentStatus->color(),
            'hire_date' => $this->hireDate->format('Y-m-d'),
            'termination_date' => $this->terminationDate?->format('Y-m-d'),
            'gross_salary' => $this->grossSalary,
            'bank_name' => $this->bankName,
            'bank_account_number' => $this->bankAccountNumber,
            'bank_account_name' => $this->bankAccountName,
            'date_of_birth' => $this->dateOfBirth?->format('Y-m-d'),
            'gender' => $this->gender,
            'address' => $this->address,
            'emergency_contact_name' => $this->emergencyContactName,
            'emergency_contact_phone' => $this->emergencyContactPhone,
            'nin' => $this->nin,
            'tax_id' => $this->taxId,
            'pension_pin' => $this->pensionPin,
            'nhf_id' => $this->nhfId,
            'notes' => $this->notes,
            'employment_type' => $this->employmentType->value,
            'employment_type_label' => $this->employmentType->label(),
            'employment_type_color' => $this->employmentType->color(),
            'employment_type_bg' => $this->employmentType->bgColor(),
            'contract_start' => $this->contractStart?->format('Y-m-d'),
            'contract_end' => $this->contractEnd?->format('Y-m-d'),
            'notice_period_days' => $this->noticePeriodDays,
            'reporting_to' => $this->reportingTo,
            'work_location' => $this->workLocation,
            'work_schedule' => $this->workSchedule,
            'contract_expiring_soon' => $this->isContractExpiring(30),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }

    // ─── PII Encryption Lifecycle ────────────────────────────────

    #[ORM\PrePersist]
    #[ORM\PreUpdate]
    public function encryptPii(): void
    {
        $enc = new \Lodgik\Service\EncryptionService();
        $this->phone             = $enc->encrypt($this->phone);
        $this->bankAccountNumber = $enc->encrypt($this->bankAccountNumber);
    }

    #[ORM\PostLoad]
    public function decryptPii(): void
    {
        $enc = new \Lodgik\Service\EncryptionService();
        $this->phone             = $enc->decrypt($this->phone);
        $this->bankAccountNumber = $enc->decrypt($this->bankAccountNumber);
    }
}
