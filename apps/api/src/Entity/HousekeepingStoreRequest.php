<?php
declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Status flow:
 *   pending → storekeeper_approved → admin_approved → fulfilled
 *   Any stage → rejected
 *
 * Admin approval step is optional; controlled by property setting
 * `require_admin_approval_for_consumables` (default: false).
 * When disabled, storekeeper_approved → fulfilled directly.
 */
#[ORM\Entity]
#[ORM\Table(name: 'housekeeping_store_requests')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_hk_requests_prop')]
#[ORM\HasLifecycleCallbacks]
class HousekeepingStoreRequest
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'requested_by', type: Types::STRING, length: 36)]
    private string $requestedBy;

    #[ORM\Column(name: 'requested_by_name', type: Types::STRING, length: 150)]
    private string $requestedByName;

    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'pending'])]
    private string $status = 'pending';

    #[ORM\Column(name: 'storekeeper_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $storekeeperId = null;

    #[ORM\Column(name: 'storekeeper_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $storekeeperName = null;

    #[ORM\Column(name: 'storekeeper_approved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $storekeeperApprovedAt = null;

    #[ORM\Column(name: 'admin_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $adminId = null;

    #[ORM\Column(name: 'admin_name', type: Types::STRING, length: 150, nullable: true)]
    private ?string $adminName = null;

    #[ORM\Column(name: 'admin_approved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $adminApprovedAt = null;

    #[ORM\Column(name: 'rejection_reason', type: Types::TEXT, nullable: true)]
    private ?string $rejectionReason = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'fulfilled_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $fulfilledAt = null;

    public function __construct(string $propertyId, string $requestedBy, string $requestedByName, string $tenantId)
    {
        $this->generateId();
        $this->propertyId      = $propertyId;
        $this->requestedBy     = $requestedBy;
        $this->requestedByName = $requestedByName;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getStatus(): string { return $this->status; }
    public function getRequestedBy(): string { return $this->requestedBy; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function approveByStorekeeper(string $userId, string $userName): void
    {
        if ($this->status !== 'pending') {
            throw new \DomainException("Request must be pending to approve (currently: {$this->status})");
        }
        $this->status                 = 'storekeeper_approved';
        $this->storekeeperId          = $userId;
        $this->storekeeperName        = $userName;
        $this->storekeeperApprovedAt  = new \DateTimeImmutable();
    }

    public function approveByAdmin(string $userId, string $userName): void
    {
        if ($this->status !== 'storekeeper_approved') {
            throw new \DomainException("Storekeeper must approve before admin approval");
        }
        $this->status           = 'admin_approved';
        $this->adminId          = $userId;
        $this->adminName        = $userName;
        $this->adminApprovedAt  = new \DateTimeImmutable();
    }

    public function reject(string $reason): void
    {
        if (in_array($this->status, ['fulfilled', 'rejected'], true)) {
            throw new \DomainException("Cannot reject a {$this->status} request");
        }
        $this->status          = 'rejected';
        $this->rejectionReason = $reason;
    }

    public function fulfill(): void
    {
        if (!in_array($this->status, ['storekeeper_approved', 'admin_approved'], true)) {
            throw new \DomainException("Request must be approved before fulfillment");
        }
        $this->status      = 'fulfilled';
        $this->fulfilledAt = new \DateTimeImmutable();
    }

    public function toArray(): array
    {
        return [
            'id'                       => $this->id,
            'property_id'              => $this->propertyId,
            'requested_by'             => $this->requestedBy,
            'requested_by_name'        => $this->requestedByName,
            'status'                   => $this->status,
            'storekeeper_id'           => $this->storekeeperId,
            'storekeeper_name'         => $this->storekeeperName,
            'storekeeper_approved_at'  => $this->storekeeperApprovedAt?->format('c'),
            'admin_id'                 => $this->adminId,
            'admin_name'               => $this->adminName,
            'admin_approved_at'        => $this->adminApprovedAt?->format('c'),
            'rejection_reason'         => $this->rejectionReason,
            'notes'                    => $this->notes,
            'fulfilled_at'             => $this->fulfilledAt?->format('c'),
            'created_at'               => $this->createdAt->format('c'),
            'updated_at'               => $this->updatedAt->format('c'),
        ];
    }
}
