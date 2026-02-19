<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Enum\RoomStatus;

#[ORM\Entity]
#[ORM\Table(name: 'room_status_logs')]
#[ORM\Index(columns: ['tenant_id', 'room_id'], name: 'idx_room_status_logs_room')]
#[ORM\HasLifecycleCallbacks]
class RoomStatusLog implements TenantAware
{
    use HasUuid;
    use HasTenant;

    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36)]
    private string $roomId;

    #[ORM\Column(name: 'old_status', type: Types::STRING, length: 20, enumType: RoomStatus::class)]
    private RoomStatus $oldStatus;

    #[ORM\Column(name: 'new_status', type: Types::STRING, length: 20, enumType: RoomStatus::class)]
    private RoomStatus $newStatus;

    #[ORM\Column(name: 'changed_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $changedBy = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $roomId, RoomStatus $oldStatus, RoomStatus $newStatus, string $tenantId)
    {
        $this->generateId();
        $this->roomId = $roomId;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
        $this->setTenantId($tenantId);
        $this->createdAt = new \DateTimeImmutable();
    }

    // ─── Getters ─────────────────────────────────────────────

    public function getRoomId(): string { return $this->roomId; }
    public function getOldStatus(): RoomStatus { return $this->oldStatus; }
    public function getNewStatus(): RoomStatus { return $this->newStatus; }
    public function getChangedBy(): ?string { return $this->changedBy; }
    public function setChangedBy(?string $userId): void { $this->changedBy = $userId; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $notes): void { $this->notes = $notes; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
