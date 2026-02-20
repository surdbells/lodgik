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
#[ORM\Table(name: 'gym_class_bookings')]
#[ORM\UniqueConstraint(name: 'uq_gcb_member_class', columns: ['tenant_id', 'member_id', 'class_id'])]
#[ORM\Index(columns: ['tenant_id', 'class_id'], name: 'idx_gcb_class')]
#[ORM\HasLifecycleCallbacks]
class GymClassBooking implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'class_id', type: Types::STRING, length: 36)]
    private string $classId;

    #[ORM\Column(name: 'member_id', type: Types::STRING, length: 36)]
    private string $memberId;

    /** 'booked', 'attended', 'no_show', 'cancelled' */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'booked'])]
    private string $status = 'booked';

    #[ORM\Column(name: 'cancelled_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $cancelledAt = null;

    #[ORM\Column(name: 'attended_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $attendedAt = null;

    public function __construct(string $propertyId, string $classId, string $memberId, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->classId = $classId;
        $this->memberId = $memberId;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getClassId(): string { return $this->classId; }
    public function getMemberId(): string { return $this->memberId; }
    public function getStatus(): string { return $this->status; }
    public function cancel(): void { $this->status = 'cancelled'; $this->cancelledAt = new \DateTimeImmutable(); }
    public function markAttended(): void { $this->status = 'attended'; $this->attendedAt = new \DateTimeImmutable(); }
    public function markNoShow(): void { $this->status = 'no_show'; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'class_id' => $this->classId, 'member_id' => $this->memberId,
            'status' => $this->status,
            'cancelled_at' => $this->cancelledAt?->format('Y-m-d H:i:s'),
            'attended_at' => $this->attendedAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
