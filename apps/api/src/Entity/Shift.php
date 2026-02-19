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
#[ORM\Table(name: 'shifts')]
#[ORM\UniqueConstraint(name: 'uq_shift_tenant_name', columns: ['tenant_id', 'name'])]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_shift_tenant')]
#[ORM\HasLifecycleCallbacks]
class Shift implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $name;

    /** HH:MM format */
    #[ORM\Column(name: 'start_time', type: Types::STRING, length: 5)]
    private string $startTime;

    #[ORM\Column(name: 'end_time', type: Types::STRING, length: 5)]
    private string $endTime;

    /** Grace period in minutes before marking late */
    #[ORM\Column(name: 'grace_minutes', type: Types::INTEGER, options: ['default' => 15])]
    private int $graceMinutes = 15;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $name, string $startTime, string $endTime, string $tenantId)
    {
        $this->generateId();
        $this->name = $name;
        $this->startTime = $startTime;
        $this->endTime = $endTime;
        $this->setTenantId($tenantId);
    }

    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getStartTime(): string { return $this->startTime; }
    public function setStartTime(string $v): void { $this->startTime = $v; }
    public function getEndTime(): string { return $this->endTime; }
    public function setEndTime(string $v): void { $this->endTime = $v; }
    public function getGraceMinutes(): int { return $this->graceMinutes; }
    public function setGraceMinutes(int $v): void { $this->graceMinutes = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'name' => $this->name,
            'start_time' => $this->startTime,
            'end_time' => $this->endTime,
            'grace_minutes' => $this->graceMinutes,
            'is_active' => $this->isActive,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
