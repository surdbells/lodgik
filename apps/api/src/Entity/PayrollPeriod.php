<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\PayrollStatus;

#[ORM\Entity]
#[ORM\Table(name: 'payroll_periods')]
#[ORM\UniqueConstraint(name: 'uq_payroll_period', columns: ['tenant_id', 'property_id', 'year', 'month'])]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_pp_tenant')]
#[ORM\HasLifecycleCallbacks]
class PayrollPeriod implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(type: Types::INTEGER)]
    private int $year;

    #[ORM\Column(type: Types::INTEGER)]
    private int $month;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: PayrollStatus::class)]
    private PayrollStatus $status = PayrollStatus::DRAFT;

    #[ORM\Column(name: 'total_gross', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalGross = '0';

    #[ORM\Column(name: 'total_net', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalNet = '0';

    #[ORM\Column(name: 'total_tax', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalTax = '0';

    #[ORM\Column(name: 'total_pension', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalPension = '0';

    #[ORM\Column(name: 'total_nhf', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalNhf = '0';

    #[ORM\Column(name: 'employee_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $employeeCount = 0;

    #[ORM\Column(name: 'calculated_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $calculatedAt = null;

    #[ORM\Column(name: 'approved_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $approvedBy = null;

    #[ORM\Column(name: 'approved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $approvedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $propertyId, int $year, int $month, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->year = $year;
        $this->month = $month;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getYear(): int { return $this->year; }
    public function getMonth(): int { return $this->month; }
    public function getPeriodLabel(): string { return date('F Y', mktime(0, 0, 0, $this->month, 1, $this->year)); }
    public function getStatus(): PayrollStatus { return $this->status; }
    public function setStatus(PayrollStatus $v): void { $this->status = $v; }
    public function getTotalGross(): string { return $this->totalGross; }
    public function setTotalGross(string $v): void { $this->totalGross = $v; }
    public function getTotalNet(): string { return $this->totalNet; }
    public function setTotalNet(string $v): void { $this->totalNet = $v; }
    public function getTotalTax(): string { return $this->totalTax; }
    public function setTotalTax(string $v): void { $this->totalTax = $v; }
    public function getTotalPension(): string { return $this->totalPension; }
    public function setTotalPension(string $v): void { $this->totalPension = $v; }
    public function getTotalNhf(): string { return $this->totalNhf; }
    public function setTotalNhf(string $v): void { $this->totalNhf = $v; }
    public function getEmployeeCount(): int { return $this->employeeCount; }
    public function setEmployeeCount(int $v): void { $this->employeeCount = $v; }
    public function getCalculatedAt(): ?\DateTimeImmutable { return $this->calculatedAt; }
    public function setCalculatedAt(?\DateTimeImmutable $v): void { $this->calculatedAt = $v; }
    public function getApprovedBy(): ?string { return $this->approvedBy; }
    public function setApprovedBy(?string $v): void { $this->approvedBy = $v; }
    public function getApprovedAt(): ?\DateTimeImmutable { return $this->approvedAt; }
    public function setApprovedAt(?\DateTimeImmutable $v): void { $this->approvedAt = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'property_id' => $this->propertyId,
            'year' => $this->year,
            'month' => $this->month,
            'period_label' => $this->getPeriodLabel(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'total_gross' => $this->totalGross,
            'total_net' => $this->totalNet,
            'total_tax' => $this->totalTax,
            'total_pension' => $this->totalPension,
            'total_nhf' => $this->totalNhf,
            'employee_count' => $this->employeeCount,
            'calculated_at' => $this->calculatedAt?->format('Y-m-d H:i:s'),
            'approved_by' => $this->approvedBy,
            'approved_at' => $this->approvedAt?->format('Y-m-d H:i:s'),
            'notes' => $this->notes,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
