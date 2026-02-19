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
#[ORM\Table(name: 'leave_balances')]
#[ORM\UniqueConstraint(name: 'uq_leave_bal', columns: ['tenant_id', 'employee_id', 'leave_type_id', 'year'])]
#[ORM\Index(columns: ['tenant_id', 'employee_id'], name: 'idx_lb_employee')]
#[ORM\HasLifecycleCallbacks]
class LeaveBalance implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'employee_id', type: Types::STRING, length: 36)]
    private string $employeeId;

    #[ORM\Column(name: 'leave_type_id', type: Types::STRING, length: 36)]
    private string $leaveTypeId;

    #[ORM\Column(type: Types::INTEGER)]
    private int $year;

    #[ORM\Column(name: 'entitled_days', type: Types::DECIMAL, precision: 5, scale: 1)]
    private string $entitledDays;

    #[ORM\Column(name: 'used_days', type: Types::DECIMAL, precision: 5, scale: 1, options: ['default' => '0.0'])]
    private string $usedDays = '0.0';

    #[ORM\Column(name: 'carried_over', type: Types::DECIMAL, precision: 5, scale: 1, options: ['default' => '0.0'])]
    private string $carriedOver = '0.0';

    public function __construct(string $employeeId, string $leaveTypeId, int $year, string $entitledDays, string $tenantId)
    {
        $this->generateId();
        $this->employeeId = $employeeId;
        $this->leaveTypeId = $leaveTypeId;
        $this->year = $year;
        $this->entitledDays = $entitledDays;
        $this->setTenantId($tenantId);
    }

    public function getEmployeeId(): string { return $this->employeeId; }
    public function getLeaveTypeId(): string { return $this->leaveTypeId; }
    public function getYear(): int { return $this->year; }
    public function getEntitledDays(): string { return $this->entitledDays; }
    public function setEntitledDays(string $v): void { $this->entitledDays = $v; }
    public function getUsedDays(): string { return $this->usedDays; }
    public function setUsedDays(string $v): void { $this->usedDays = $v; }
    public function getCarriedOver(): string { return $this->carriedOver; }
    public function setCarriedOver(string $v): void { $this->carriedOver = $v; }

    public function getRemainingDays(): string
    {
        return number_format((float)$this->entitledDays + (float)$this->carriedOver - (float)$this->usedDays, 1, '.', '');
    }

    public function deduct(float $days): void
    {
        $this->usedDays = number_format((float)$this->usedDays + $days, 1, '.', '');
    }

    public function restore(float $days): void
    {
        $this->usedDays = number_format(max(0, (float)$this->usedDays - $days), 1, '.', '');
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'employee_id' => $this->employeeId,
            'leave_type_id' => $this->leaveTypeId,
            'year' => $this->year,
            'entitled_days' => $this->entitledDays,
            'used_days' => $this->usedDays,
            'carried_over' => $this->carriedOver,
            'remaining_days' => $this->getRemainingDays(),
        ];
    }
}
