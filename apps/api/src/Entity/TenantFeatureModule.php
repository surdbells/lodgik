<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Per-tenant module overrides.
 *
 * If a row exists, the override takes precedence over the plan's included_modules.
 * This allows super admin to grant/revoke individual modules for specific tenants.
 */
#[ORM\Entity]
#[ORM\Table(name: 'tenant_feature_modules')]
#[ORM\UniqueConstraint(name: 'uq_tenant_module', columns: ['tenant_id', 'module_key'])]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_tfm_tenant')]
#[ORM\HasLifecycleCallbacks]
class TenantFeatureModule
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36)]
    private string $tenantId;

    #[ORM\Column(name: 'module_key', type: Types::STRING, length: 50)]
    private string $moduleKey;

    /** true = force-enabled, false = force-disabled, regardless of plan. */
    #[ORM\Column(name: 'is_enabled', type: Types::BOOLEAN)]
    private bool $isEnabled;

    /** Who made this override. */
    #[ORM\Column(name: 'changed_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $changedBy = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $reason = null;

    public function __construct(string $tenantId, string $moduleKey, bool $isEnabled)
    {
        $this->generateId();
        $this->tenantId = $tenantId;
        $this->moduleKey = $moduleKey;
        $this->isEnabled = $isEnabled;
    }

    public function getTenantId(): string { return $this->tenantId; }
    public function getModuleKey(): string { return $this->moduleKey; }
    public function isEnabled(): bool { return $this->isEnabled; }
    public function setIsEnabled(bool $enabled): void { $this->isEnabled = $enabled; }
    public function getChangedBy(): ?string { return $this->changedBy; }
    public function setChangedBy(?string $userId): void { $this->changedBy = $userId; }
    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $reason): void { $this->reason = $reason; }
}
