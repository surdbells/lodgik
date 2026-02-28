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
#[ORM\Table(name: 'night_audits')]
#[ORM\UniqueConstraint(name: 'uq_na_date', columns: ['tenant_id', 'property_id', 'audit_date'])]
#[ORM\HasLifecycleCallbacks]
class NightAudit implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;
    #[ORM\Column(name: 'audit_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $auditDate;
    #[ORM\Column(name: 'rooms_occupied', type: Types::INTEGER, options: ['default' => 0])]
    private int $roomsOccupied = 0;
    #[ORM\Column(name: 'rooms_available', type: Types::INTEGER, options: ['default' => 0])]
    private int $roomsAvailable = 0;
    #[ORM\Column(name: 'total_rooms', type: Types::INTEGER, options: ['default' => 0])]
    private int $totalRooms = 0;
    #[ORM\Column(name: 'check_ins', type: Types::INTEGER, options: ['default' => 0])]
    private int $checkIns = 0;
    #[ORM\Column(name: 'check_outs', type: Types::INTEGER, options: ['default' => 0])]
    private int $checkOuts = 0;
    #[ORM\Column(name: 'no_shows', type: Types::INTEGER, options: ['default' => 0])]
    private int $noShows = 0;
    /** Revenue in kobo */
    #[ORM\Column(name: 'room_revenue', type: Types::BIGINT, options: ['default' => 0])]
    private string $roomRevenue = '0';
    #[ORM\Column(name: 'fnb_revenue', type: Types::BIGINT, options: ['default' => 0])]
    private string $fnbRevenue = '0';
    #[ORM\Column(name: 'other_revenue', type: Types::BIGINT, options: ['default' => 0])]
    private string $otherRevenue = '0';
    #[ORM\Column(name: 'total_revenue', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalRevenue = '0';
    #[ORM\Column(name: 'total_expenses', type: Types::BIGINT, options: ['default' => 0])]
    private string $totalExpenses = '0';
    #[ORM\Column(name: 'outstanding_balance', type: Types::BIGINT, options: ['default' => 0])]
    private string $outstandingBalance = '0';
    #[ORM\Column(name: 'cash_collected', type: Types::BIGINT, options: ['default' => 0])]
    private string $cashCollected = '0';
    #[ORM\Column(name: 'card_collected', type: Types::BIGINT, options: ['default' => 0])]
    private string $cardCollected = '0';
    #[ORM\Column(name: 'transfer_collected', type: Types::BIGINT, options: ['default' => 0])]
    private string $transferCollected = '0';
    #[ORM\Column(name: 'occupancy_rate', type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $occupancyRate = '0.00';
    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $adr = '0.00';
    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $revpar = '0.00';
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $discrepancies = null;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;
    /** open | closed */
    #[ORM\Column(type: Types::STRING, length: 10, options: ['default' => 'open'])]
    private string $status = 'open';
    #[ORM\Column(name: 'closed_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $closedBy = null;
    #[ORM\Column(name: 'closed_by_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $closedByName = null;
    #[ORM\Column(name: 'closed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $closedAt = null;

    public function __construct(string $propertyId, \DateTimeImmutable $auditDate, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->auditDate = $auditDate; $this->setTenantId($tenantId); }

    // Setters for all numeric fields
    public function setRoomsOccupied(int $v): void { $this->roomsOccupied = $v; }
    public function setRoomsAvailable(int $v): void { $this->roomsAvailable = $v; }
    public function setTotalRooms(int $v): void { $this->totalRooms = $v; }
    public function setCheckIns(int $v): void { $this->checkIns = $v; }
    public function setCheckOuts(int $v): void { $this->checkOuts = $v; }
    public function setNoShows(int $v): void { $this->noShows = $v; }
    public function setRoomRevenue(string $v): void { $this->roomRevenue = $v; }
    public function setFnbRevenue(string $v): void { $this->fnbRevenue = $v; }
    public function setOtherRevenue(string $v): void { $this->otherRevenue = $v; }
    public function setTotalRevenue(string $v): void { $this->totalRevenue = $v; }
    public function setTotalExpenses(string $v): void { $this->totalExpenses = $v; }
    public function setOutstandingBalance(string $v): void { $this->outstandingBalance = $v; }
    public function setCashCollected(string $v): void { $this->cashCollected = $v; }
    public function setCardCollected(string $v): void { $this->cardCollected = $v; }
    public function setTransferCollected(string $v): void { $this->transferCollected = $v; }
    public function setOccupancyRate(string $v): void { $this->occupancyRate = $v; }
    public function setAdr(string $v): void { $this->adr = $v; }
    public function setRevpar(string $v): void { $this->revpar = $v; }
    public function setDiscrepancies(?array $v): void { $this->discrepancies = $v; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function close(string $userId, string $name): void { $this->status = 'closed'; $this->closedBy = $userId; $this->closedByName = $name; $this->closedAt = new \DateTimeImmutable(); }
    public function getStatus(): string { return $this->status; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getAuditDate(): \DateTimeImmutable { return $this->auditDate; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId, 'audit_date' => $this->auditDate->format('Y-m-d'),
            'rooms_occupied' => $this->roomsOccupied, 'rooms_available' => $this->roomsAvailable, 'total_rooms' => $this->totalRooms,
            'check_ins' => $this->checkIns, 'check_outs' => $this->checkOuts, 'no_shows' => $this->noShows,
            'room_revenue' => $this->roomRevenue, 'fnb_revenue' => $this->fnbRevenue, 'other_revenue' => $this->otherRevenue,
            'total_revenue' => $this->totalRevenue, 'total_expenses' => $this->totalExpenses,
            'outstanding_balance' => $this->outstandingBalance,
            'cash_collected' => $this->cashCollected, 'card_collected' => $this->cardCollected, 'transfer_collected' => $this->transferCollected,
            'occupancy_rate' => $this->occupancyRate, 'adr' => $this->adr, 'revpar' => $this->revpar,
            'discrepancies' => $this->discrepancies, 'notes' => $this->notes,
            'status' => $this->status, 'closed_by_name' => $this->closedByName,
            'auditor_name' => $this->closedByName, // alias used by frontend
            'closed_at' => $this->closedAt?->format('Y-m-d H:i:s'),
        ];
    }
}
