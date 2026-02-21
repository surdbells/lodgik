<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'maintenance_logs')]
#[ORM\Index(columns: ['tenant_id', 'asset_id'], name: 'idx_ml_asset')] #[ORM\HasLifecycleCallbacks]
class MaintenanceLog implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(name: 'asset_id', type: Types::STRING, length: 36)] private string $assetId;
    #[ORM\Column(name: 'incident_id', type: Types::STRING, length: 36, nullable: true)] private ?string $incidentId = null;
    #[ORM\Column(name: 'pm_id', type: Types::STRING, length: 36, nullable: true)] private ?string $pmId = null;
    #[ORM\Column(name: 'engineer_id', type: Types::STRING, length: 36)] private string $engineerId;
    #[ORM\Column(name: 'engineer_name', type: Types::STRING, length: 100)] private string $engineerName;
    #[ORM\Column(name: 'action_taken', type: Types::TEXT)] private string $actionTaken;
    #[ORM\Column(name: 'parts_replaced', type: Types::TEXT, nullable: true)] private ?string $partsReplaced = null;
    #[ORM\Column(type: Types::BIGINT, nullable: true)] private ?string $cost = null;
    #[ORM\Column(name: 'downtime_minutes', type: Types::INTEGER, nullable: true)] private ?int $downtimeMinutes = null;
    #[ORM\Column(name: 'log_date', type: Types::DATE_IMMUTABLE)] private \DateTimeImmutable $logDate;

    public function __construct(string $propertyId, string $assetId, string $engineerId, string $engineerName, string $actionTaken, \DateTimeImmutable $logDate, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->assetId = $assetId; $this->engineerId = $engineerId; $this->engineerName = $engineerName; $this->actionTaken = $actionTaken; $this->logDate = $logDate; $this->setTenantId($tenantId); }

    public function setIncidentId(?string $v): void { $this->incidentId = $v; } public function setPmId(?string $v): void { $this->pmId = $v; }
    public function setPartsReplaced(?string $v): void { $this->partsReplaced = $v; } public function setCost(?string $v): void { $this->cost = $v; }
    public function setDowntimeMinutes(?int $v): void { $this->downtimeMinutes = $v; }

    public function toArray(): array
    { return ['id' => $this->getId(), 'asset_id' => $this->assetId, 'incident_id' => $this->incidentId, 'pm_id' => $this->pmId,
        'engineer_name' => $this->engineerName, 'action_taken' => $this->actionTaken, 'parts_replaced' => $this->partsReplaced,
        'cost' => $this->cost, 'downtime_minutes' => $this->downtimeMinutes, 'log_date' => $this->logDate->format('Y-m-d'),
        'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s')]; }
}
