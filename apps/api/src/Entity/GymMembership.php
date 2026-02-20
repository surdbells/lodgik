<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\GymMembershipStatus;

#[ORM\Entity]
#[ORM\Table(name: 'gym_memberships')]
#[ORM\Index(columns: ['tenant_id', 'member_id'], name: 'idx_gms_member')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_gms_status')]
#[ORM\Index(columns: ['tenant_id', 'expires_at'], name: 'idx_gms_expiry')]
#[ORM\HasLifecycleCallbacks]
class GymMembership implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'member_id', type: Types::STRING, length: 36)]
    private string $memberId;

    #[ORM\Column(name: 'plan_id', type: Types::STRING, length: 36)]
    private string $planId;

    /** Snapshot of plan name at time of purchase */
    #[ORM\Column(name: 'plan_name', type: Types::STRING, length: 100)]
    private string $planName;

    /** Price paid in kobo */
    #[ORM\Column(name: 'price_paid', type: Types::BIGINT)]
    private string $pricePaid;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: GymMembershipStatus::class)]
    private GymMembershipStatus $status;

    #[ORM\Column(name: 'starts_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $startsAt;

    #[ORM\Column(name: 'expires_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(name: 'suspended_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $suspendedAt = null;

    #[ORM\Column(name: 'cancelled_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $cancelledAt = null;

    /** Track remaining freeze days */
    #[ORM\Column(name: 'freeze_days_used', type: Types::INTEGER, options: ['default' => 0])]
    private int $freezeDaysUsed = 0;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    /** Has expiry alert been sent? */
    #[ORM\Column(name: 'expiry_alert_sent', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $expiryAlertSent = false;

    public function __construct(string $propertyId, string $memberId, string $planId, string $planName, string $pricePaid, \DateTimeImmutable $startsAt, \DateTimeImmutable $expiresAt, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->memberId = $memberId;
        $this->planId = $planId;
        $this->planName = $planName;
        $this->pricePaid = $pricePaid;
        $this->startsAt = $startsAt;
        $this->expiresAt = $expiresAt;
        $this->status = GymMembershipStatus::ACTIVE;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getMemberId(): string { return $this->memberId; }
    public function getPlanId(): string { return $this->planId; }
    public function getPlanName(): string { return $this->planName; }
    public function getPricePaid(): string { return $this->pricePaid; }
    public function getStatus(): GymMembershipStatus { return $this->status; }
    public function getStartsAt(): \DateTimeImmutable { return $this->startsAt; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function isExpiryAlertSent(): bool { return $this->expiryAlertSent; }
    public function setExpiryAlertSent(bool $v): void { $this->expiryAlertSent = $v; }

    public function isExpired(): bool { return $this->expiresAt < new \DateTimeImmutable(); }
    public function isActive(): bool { return $this->status === GymMembershipStatus::ACTIVE && !$this->isExpired(); }
    public function daysRemaining(): int { return max(0, (int) (new \DateTimeImmutable())->diff($this->expiresAt)->days * ($this->isExpired() ? -1 : 1)); }

    public function expire(): void { $this->status = GymMembershipStatus::EXPIRED; }
    public function suspend(): void { $this->status = GymMembershipStatus::SUSPENDED; $this->suspendedAt = new \DateTimeImmutable(); }
    public function cancel(): void { $this->status = GymMembershipStatus::CANCELLED; $this->cancelledAt = new \DateTimeImmutable(); }

    public function reactivate(): void
    {
        $this->status = GymMembershipStatus::ACTIVE;
        $this->suspendedAt = null;
    }

    public function renew(\DateTimeImmutable $newExpiry): void
    {
        $this->expiresAt = $newExpiry;
        $this->status = GymMembershipStatus::ACTIVE;
        $this->expiryAlertSent = false;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'member_id' => $this->memberId, 'plan_id' => $this->planId,
            'plan_name' => $this->planName, 'price_paid' => $this->pricePaid,
            'status' => $this->status->value, 'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'starts_at' => $this->startsAt->format('Y-m-d'),
            'expires_at' => $this->expiresAt->format('Y-m-d'),
            'is_active' => $this->isActive(), 'days_remaining' => $this->daysRemaining(),
            'suspended_at' => $this->suspendedAt?->format('Y-m-d H:i:s'),
            'cancelled_at' => $this->cancelledAt?->format('Y-m-d H:i:s'),
            'freeze_days_used' => $this->freezeDaysUsed,
            'expiry_alert_sent' => $this->expiryAlertSent,
            'notes' => $this->notes,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
