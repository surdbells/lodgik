<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;

#[ORM\Entity]
#[ORM\Table(name: 'daily_snapshots')]
#[ORM\UniqueConstraint(name: 'uq_snapshot_property_date', columns: ['tenant_id', 'property_id', 'snapshot_date'])]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_snapshots_tenant_property')]
class DailySnapshot implements TenantAware
{
    use HasUuid;
    use HasTenant;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'snapshot_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $snapshotDate;

    #[ORM\Column(name: 'total_rooms', type: Types::INTEGER, options: ['default' => 0])]
    private int $totalRooms = 0;

    #[ORM\Column(name: 'rooms_sold', type: Types::INTEGER, options: ['default' => 0])]
    private int $roomsSold = 0;

    #[ORM\Column(name: 'occupancy_rate', type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $occupancyRate = '0.00';

    #[ORM\Column(name: 'total_revenue', type: Types::DECIMAL, precision: 14, scale: 2, options: ['default' => '0.00'])]
    private string $totalRevenue = '0.00';

    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $adr = '0.00';

    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $revpar = '0.00';

    #[ORM\Column(name: 'check_ins', type: Types::INTEGER, options: ['default' => 0])]
    private int $checkIns = 0;

    #[ORM\Column(name: 'check_outs', type: Types::INTEGER, options: ['default' => 0])]
    private int $checkOuts = 0;

    #[ORM\Column(name: 'new_bookings', type: Types::INTEGER, options: ['default' => 0])]
    private int $newBookings = 0;

    #[ORM\Column(name: 'cancellations', type: Types::INTEGER, options: ['default' => 0])]
    private int $cancellations = 0;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $propertyId, string $tenantId, \DateTimeImmutable $date)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->setTenantId($tenantId);
        $this->snapshotDate = $date;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getSnapshotDate(): \DateTimeImmutable { return $this->snapshotDate; }
    public function getTotalRooms(): int { return $this->totalRooms; }
    public function setTotalRooms(int $v): void { $this->totalRooms = $v; }
    public function getRoomsSold(): int { return $this->roomsSold; }
    public function setRoomsSold(int $v): void { $this->roomsSold = $v; }
    public function getOccupancyRate(): string { return $this->occupancyRate; }
    public function setOccupancyRate(string $v): void { $this->occupancyRate = $v; }
    public function getTotalRevenue(): string { return $this->totalRevenue; }
    public function setTotalRevenue(string $v): void { $this->totalRevenue = $v; }
    public function getAdr(): string { return $this->adr; }
    public function setAdr(string $v): void { $this->adr = $v; }
    public function getRevpar(): string { return $this->revpar; }
    public function setRevpar(string $v): void { $this->revpar = $v; }
    public function getCheckIns(): int { return $this->checkIns; }
    public function setCheckIns(int $v): void { $this->checkIns = $v; }
    public function getCheckOuts(): int { return $this->checkOuts; }
    public function setCheckOuts(int $v): void { $this->checkOuts = $v; }
    public function getNewBookings(): int { return $this->newBookings; }
    public function setNewBookings(int $v): void { $this->newBookings = $v; }
    public function getCancellations(): int { return $this->cancellations; }
    public function setCancellations(int $v): void { $this->cancellations = $v; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
