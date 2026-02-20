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
#[ORM\Table(name: 'gym_visit_logs')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'checked_in_at'], name: 'idx_gvl_date')]
#[ORM\Index(columns: ['tenant_id', 'member_id'], name: 'idx_gvl_member')]
#[ORM\HasLifecycleCallbacks]
class GymVisitLog implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'member_id', type: Types::STRING, length: 36)]
    private string $memberId;

    #[ORM\Column(name: 'membership_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $membershipId = null;

    /** 'qr_scan', 'name_search', 'guest_access' */
    #[ORM\Column(name: 'check_in_method', type: Types::STRING, length: 20)]
    private string $checkInMethod;

    #[ORM\Column(name: 'checked_in_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $checkedInAt;

    #[ORM\Column(name: 'checked_out_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $checkedOutAt = null;

    #[ORM\Column(name: 'checked_in_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $checkedInBy = null;

    public function __construct(string $propertyId, string $memberId, string $checkInMethod, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->memberId = $memberId;
        $this->checkInMethod = $checkInMethod;
        $this->checkedInAt = new \DateTimeImmutable();
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getMemberId(): string { return $this->memberId; }
    public function getMembershipId(): ?string { return $this->membershipId; }
    public function setMembershipId(?string $v): void { $this->membershipId = $v; }
    public function getCheckInMethod(): string { return $this->checkInMethod; }
    public function getCheckedInAt(): \DateTimeImmutable { return $this->checkedInAt; }
    public function getCheckedOutAt(): ?\DateTimeImmutable { return $this->checkedOutAt; }
    public function getCheckedInBy(): ?string { return $this->checkedInBy; }
    public function setCheckedInBy(?string $v): void { $this->checkedInBy = $v; }

    public function checkOut(): void { $this->checkedOutAt = new \DateTimeImmutable(); }

    public function getDurationMinutes(): ?int
    {
        if (!$this->checkedOutAt) return null;
        return (int) round(($this->checkedOutAt->getTimestamp() - $this->checkedInAt->getTimestamp()) / 60);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'member_id' => $this->memberId, 'membership_id' => $this->membershipId,
            'check_in_method' => $this->checkInMethod,
            'checked_in_at' => $this->checkedInAt->format('Y-m-d H:i:s'),
            'checked_out_at' => $this->checkedOutAt?->format('Y-m-d H:i:s'),
            'checked_in_by' => $this->checkedInBy,
            'duration_minutes' => $this->getDurationMinutes(),
        ];
    }
}
