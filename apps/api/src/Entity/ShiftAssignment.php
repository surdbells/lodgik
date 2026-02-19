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
#[ORM\Table(name: 'shift_assignments')]
#[ORM\UniqueConstraint(name: 'uq_shift_assign', columns: ['tenant_id', 'employee_id', 'shift_date'])]
#[ORM\Index(columns: ['tenant_id', 'shift_date'], name: 'idx_sa_date')]
#[ORM\Index(columns: ['tenant_id', 'employee_id'], name: 'idx_sa_employee')]
#[ORM\HasLifecycleCallbacks]
class ShiftAssignment implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'employee_id', type: Types::STRING, length: 36)]
    private string $employeeId;

    #[ORM\Column(name: 'shift_id', type: Types::STRING, length: 36)]
    private string $shiftId;

    #[ORM\Column(name: 'shift_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $shiftDate;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $employeeId, string $shiftId, \DateTimeImmutable $shiftDate, string $tenantId)
    {
        $this->generateId();
        $this->employeeId = $employeeId;
        $this->shiftId = $shiftId;
        $this->shiftDate = $shiftDate;
        $this->setTenantId($tenantId);
    }

    public function getEmployeeId(): string { return $this->employeeId; }
    public function getShiftId(): string { return $this->shiftId; }
    public function getShiftDate(): \DateTimeImmutable { return $this->shiftDate; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'employee_id' => $this->employeeId,
            'shift_id' => $this->shiftId,
            'shift_date' => $this->shiftDate->format('Y-m-d'),
            'notes' => $this->notes,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
