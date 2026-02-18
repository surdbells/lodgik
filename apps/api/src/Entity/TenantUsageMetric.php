<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Periodic snapshot of tenant resource usage.
 * Recorded daily by a cron job, used for limit enforcement and usage dashboards.
 */
#[ORM\Entity]
#[ORM\Table(name: 'tenant_usage_metrics')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_tum_tenant')]
#[ORM\Index(columns: ['recorded_at'], name: 'idx_tum_recorded')]
#[ORM\UniqueConstraint(name: 'uq_tum_tenant_date', columns: ['tenant_id', 'recorded_date'])]
#[ORM\HasLifecycleCallbacks]
class TenantUsageMetric
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36)]
    private string $tenantId;

    #[ORM\Column(name: 'recorded_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $recordedDate;

    #[ORM\Column(name: 'recorded_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $recordedAt;

    // ─── Resource Counts ───────────────────────────────────────

    #[ORM\Column(name: 'rooms_used', type: Types::INTEGER, options: ['default' => 0])]
    private int $roomsUsed = 0;

    #[ORM\Column(name: 'rooms_limit', type: Types::INTEGER)]
    private int $roomsLimit;

    #[ORM\Column(name: 'staff_used', type: Types::INTEGER, options: ['default' => 0])]
    private int $staffUsed = 0;

    #[ORM\Column(name: 'staff_limit', type: Types::INTEGER)]
    private int $staffLimit;

    #[ORM\Column(name: 'properties_used', type: Types::INTEGER, options: ['default' => 0])]
    private int $propertiesUsed = 0;

    #[ORM\Column(name: 'properties_limit', type: Types::INTEGER)]
    private int $propertiesLimit;

    // ─── Activity Metrics ──────────────────────────────────────

    #[ORM\Column(name: 'bookings_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $bookingsCount = 0;

    #[ORM\Column(name: 'guests_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $guestsCount = 0;

    #[ORM\Column(name: 'active_modules_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $activeModulesCount = 0;

    #[ORM\Column(name: 'api_calls_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $apiCallsCount = 0;

    /** Storage used in bytes. */
    #[ORM\Column(name: 'storage_bytes', type: Types::BIGINT, options: ['default' => 0])]
    private int $storageBytes = 0;

    public function __construct(string $tenantId, \DateTimeImmutable $date, int $roomsLimit, int $staffLimit, int $propertiesLimit)
    {
        $this->generateId();
        $this->tenantId = $tenantId;
        $this->recordedDate = $date;
        $this->recordedAt = new \DateTimeImmutable();
        $this->roomsLimit = $roomsLimit;
        $this->staffLimit = $staffLimit;
        $this->propertiesLimit = $propertiesLimit;
    }

    public function getTenantId(): string { return $this->tenantId; }
    public function getRecordedDate(): \DateTimeImmutable { return $this->recordedDate; }
    public function getRecordedAt(): \DateTimeImmutable { return $this->recordedAt; }

    public function getRoomsUsed(): int { return $this->roomsUsed; }
    public function setRoomsUsed(int $v): void { $this->roomsUsed = $v; }
    public function getRoomsLimit(): int { return $this->roomsLimit; }

    public function getStaffUsed(): int { return $this->staffUsed; }
    public function setStaffUsed(int $v): void { $this->staffUsed = $v; }
    public function getStaffLimit(): int { return $this->staffLimit; }

    public function getPropertiesUsed(): int { return $this->propertiesUsed; }
    public function setPropertiesUsed(int $v): void { $this->propertiesUsed = $v; }
    public function getPropertiesLimit(): int { return $this->propertiesLimit; }

    public function getBookingsCount(): int { return $this->bookingsCount; }
    public function setBookingsCount(int $v): void { $this->bookingsCount = $v; }
    public function getGuestsCount(): int { return $this->guestsCount; }
    public function setGuestsCount(int $v): void { $this->guestsCount = $v; }
    public function getActiveModulesCount(): int { return $this->activeModulesCount; }
    public function setActiveModulesCount(int $v): void { $this->activeModulesCount = $v; }
    public function getApiCallsCount(): int { return $this->apiCallsCount; }
    public function setApiCallsCount(int $v): void { $this->apiCallsCount = $v; }
    public function getStorageBytes(): int { return $this->storageBytes; }
    public function setStorageBytes(int $v): void { $this->storageBytes = $v; }

    public function getRoomsPercent(): float { return $this->roomsLimit > 0 ? round($this->roomsUsed / $this->roomsLimit * 100, 1) : 0; }
    public function getStaffPercent(): float { return $this->staffLimit > 0 ? round($this->staffUsed / $this->staffLimit * 100, 1) : 0; }
    public function getPropertiesPercent(): float { return $this->propertiesLimit > 0 ? round($this->propertiesUsed / $this->propertiesLimit * 100, 1) : 0; }
}
