<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'property_role_permissions')]
#[ORM\UniqueConstraint(name: 'uq_prp_property_role_perm', columns: ['property_id', 'role', 'permission_id'])]
#[ORM\Index(columns: ['property_id', 'role'], name: 'idx_prp_property_role')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_prp_tenant')]
class PropertyRolePermission
{
    #[ORM\Id]
    #[ORM\Column(type: 'guid')]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: \Lodgik\Helper\UuidGenerator::class)]
    private string $id;

    #[ORM\Column(name: 'property_id', type: 'guid')]
    private string $propertyId;

    #[ORM\Column(name: 'tenant_id', type: 'guid')]
    private string $tenantId;

    #[ORM\Column(type: 'string', length: 40)]
    private string $role;

    #[ORM\Column(name: 'permission_id', type: 'guid')]
    private string $permissionId;

    #[ORM\Column(type: 'boolean')]
    private bool $granted;

    #[ORM\Column(name: 'updated_by', type: 'guid', nullable: true)]
    private ?string $updatedBy;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        string $propertyId,
        string $tenantId,
        string $role,
        string $permissionId,
        bool $granted,
        ?string $updatedBy,
    ) {
        $this->propertyId   = $propertyId;
        $this->tenantId     = $tenantId;
        $this->role         = $role;
        $this->permissionId = $permissionId;
        $this->granted      = $granted;
        $this->updatedBy    = $updatedBy;
        $this->updatedAt    = new \DateTimeImmutable();
    }

    public function getId(): string { return $this->id; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getTenantId(): string { return $this->tenantId; }
    public function getRole(): string { return $this->role; }
    public function getPermissionId(): string { return $this->permissionId; }
    public function isGranted(): bool { return $this->granted; }

    public function update(bool $granted, ?string $updatedBy): void
    {
        $this->granted   = $granted;
        $this->updatedBy = $updatedBy;
        $this->updatedAt = new \DateTimeImmutable();
    }
}
