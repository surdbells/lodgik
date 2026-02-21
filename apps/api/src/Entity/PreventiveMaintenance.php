<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'preventive_maintenance')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'next_due'], name: 'idx_pm_due')] #[ORM\HasLifecycleCallbacks]
class PreventiveMaintenance implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(name: 'asset_id', type: Types::STRING, length: 36)] private string $assetId;
    #[ORM\Column(name: 'asset_name', type: Types::STRING, length: 200)] private string $assetName;
    /** daily|weekly|monthly|quarterly|annual */
    #[ORM\Column(name: 'schedule_type', type: Types::STRING, length: 15)] private string $scheduleType;
    #[ORM\Column(name: 'last_performed', type: Types::DATE_IMMUTABLE, nullable: true)] private ?\DateTimeImmutable $lastPerformed = null;
    #[ORM\Column(name: 'next_due', type: Types::DATE_IMMUTABLE)] private \DateTimeImmutable $nextDue;
    #[ORM\Column(name: 'assigned_engineer_id', type: Types::STRING, length: 36, nullable: true)] private ?string $assignedEngineerId = null;
    #[ORM\Column(name: 'assigned_engineer_name', type: Types::STRING, length: 100, nullable: true)] private ?string $assignedEngineerName = null;
    #[ORM\Column(type: Types::JSON, nullable: true)] private ?array $checklist = null;
    /** scheduled|overdue|completed */
    #[ORM\Column(type: Types::STRING, length: 12, options: ['default' => 'scheduled'])] private string $status = 'scheduled';
    #[ORM\Column(type: Types::TEXT, nullable: true)] private ?string $notes = null;

    public function __construct(string $propertyId, string $assetId, string $assetName, string $scheduleType, \DateTimeImmutable $nextDue, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->assetId = $assetId; $this->assetName = $assetName; $this->scheduleType = $scheduleType; $this->nextDue = $nextDue; $this->setTenantId($tenantId); }

    public function getStatus(): string { return $this->status; }
    public function getNextDue(): \DateTimeImmutable { return $this->nextDue; }
    public function setAssignedEngineerId(?string $v): void { $this->assignedEngineerId = $v; }
    public function setAssignedEngineerName(?string $v): void { $this->assignedEngineerName = $v; }
    public function setChecklist(?array $v): void { $this->checklist = $v; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function complete(): void { $this->status = 'completed'; $this->lastPerformed = new \DateTimeImmutable();
        $interval = match($this->scheduleType) { 'daily' => '+1 day', 'weekly' => '+1 week', 'monthly' => '+1 month', 'quarterly' => '+3 months', 'annual' => '+1 year', default => '+1 month' };
        $this->nextDue = new \DateTimeImmutable($interval); $this->status = 'scheduled'; }
    public function markOverdue(): void { $this->status = 'overdue'; }

    public function toArray(): array
    { return ['id' => $this->getId(), 'asset_id' => $this->assetId, 'asset_name' => $this->assetName, 'schedule_type' => $this->scheduleType,
        'last_performed' => $this->lastPerformed?->format('Y-m-d'), 'next_due' => $this->nextDue->format('Y-m-d'),
        'assigned_engineer_name' => $this->assignedEngineerName, 'checklist' => $this->checklist, 'status' => $this->status, 'notes' => $this->notes]; }
}
