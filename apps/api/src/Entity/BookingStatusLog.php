<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Enum\BookingStatus;

#[ORM\Entity]
#[ORM\Table(name: 'booking_status_logs')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_booking_status_logs_booking')]
class BookingStatusLog implements TenantAware
{
    use HasUuid;
    use HasTenant;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'old_status', type: Types::STRING, length: 20, enumType: BookingStatus::class)]
    private BookingStatus $oldStatus;

    #[ORM\Column(name: 'new_status', type: Types::STRING, length: 20, enumType: BookingStatus::class)]
    private BookingStatus $newStatus;

    #[ORM\Column(name: 'changed_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $changedBy = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $bookingId, BookingStatus $oldStatus, BookingStatus $newStatus, string $tenantId)
    {
        $this->generateId();
        $this->bookingId = $bookingId;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
        $this->setTenantId($tenantId);
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getBookingId(): string { return $this->bookingId; }
    public function getOldStatus(): BookingStatus { return $this->oldStatus; }
    public function getNewStatus(): BookingStatus { return $this->newStatus; }
    public function getChangedBy(): ?string { return $this->changedBy; }
    public function setChangedBy(?string $v): void { $this->changedBy = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
