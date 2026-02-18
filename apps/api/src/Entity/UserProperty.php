<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Maps a user to the properties they can access.
 *
 * A user always has a "primary" property (User::propertyId), but
 * can be granted access to additional properties via this pivot.
 * This enables multi-property staff (e.g. a manager overseeing 3 hotels).
 */
#[ORM\Entity]
#[ORM\Table(name: 'user_properties')]
#[ORM\UniqueConstraint(name: 'uq_user_property', columns: ['user_id', 'property_id'])]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_user_properties_tenant')]
#[ORM\Index(columns: ['user_id'], name: 'idx_user_properties_user')]
#[ORM\Index(columns: ['property_id'], name: 'idx_user_properties_property')]
#[ORM\HasLifecycleCallbacks]
class UserProperty implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'user_id', type: Types::STRING, length: 36)]
    private string $userId;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    /** Optional override role for this specific property (null = use user's default role). */
    #[ORM\Column(name: 'role_override', type: Types::STRING, length: 30, nullable: true)]
    private ?string $roleOverride = null;

    #[ORM\Column(name: 'is_primary', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isPrimary = false;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $userId, string $propertyId, string $tenantId)
    {
        $this->generateId();
        $this->userId = $userId;
        $this->propertyId = $propertyId;
        $this->setTenantId($tenantId);
    }

    public function getUserId(): string { return $this->userId; }

    public function getPropertyId(): string { return $this->propertyId; }

    public function getRoleOverride(): ?string { return $this->roleOverride; }
    public function setRoleOverride(?string $role): void { $this->roleOverride = $role; }

    public function isPrimary(): bool { return $this->isPrimary; }
    public function setIsPrimary(bool $primary): void { $this->isPrimary = $primary; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }
}
