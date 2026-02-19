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
#[ORM\Table(name: 'leave_types')]
#[ORM\UniqueConstraint(name: 'uq_leave_type_tenant_key', columns: ['tenant_id', 'type_key'])]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_lt_tenant')]
#[ORM\HasLifecycleCallbacks]
class LeaveType implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'type_key', type: Types::STRING, length: 30)]
    private string $typeKey;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $name;

    /** Default annual entitlement in days */
    #[ORM\Column(name: 'default_days', type: Types::INTEGER)]
    private int $defaultDays;

    #[ORM\Column(name: 'is_paid', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isPaid = true;

    #[ORM\Column(name: 'requires_approval', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $requiresApproval = true;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::STRING, length: 7, options: ['default' => '#3b82f6'])]
    private string $color = '#3b82f6';

    public function __construct(string $typeKey, string $name, int $defaultDays, string $tenantId)
    {
        $this->generateId();
        $this->typeKey = $typeKey;
        $this->name = $name;
        $this->defaultDays = $defaultDays;
        $this->setTenantId($tenantId);
    }

    public function getTypeKey(): string { return $this->typeKey; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getDefaultDays(): int { return $this->defaultDays; }
    public function setDefaultDays(int $v): void { $this->defaultDays = $v; }
    public function isPaid(): bool { return $this->isPaid; }
    public function setIsPaid(bool $v): void { $this->isPaid = $v; }
    public function requiresApproval(): bool { return $this->requiresApproval; }
    public function setRequiresApproval(bool $v): void { $this->requiresApproval = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function getColor(): string { return $this->color; }
    public function setColor(string $v): void { $this->color = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'type_key' => $this->typeKey,
            'name' => $this->name,
            'default_days' => $this->defaultDays,
            'is_paid' => $this->isPaid,
            'requires_approval' => $this->requiresApproval,
            'is_active' => $this->isActive,
            'color' => $this->color,
        ];
    }
}
