<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'asset_incidents')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_ai_status')]
#[ORM\Index(columns: ['tenant_id', 'asset_id'], name: 'idx_ai_asset')] #[ORM\HasLifecycleCallbacks]
class AssetIncident implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(name: 'asset_id', type: Types::STRING, length: 36)] private string $assetId;
    #[ORM\Column(name: 'asset_name', type: Types::STRING, length: 200)] private string $assetName;
    #[ORM\Column(name: 'location_description', type: Types::STRING, length: 200, nullable: true)] private ?string $locationDescription = null;
    /** breakdown|leakage|noise|electrical|fire|safety|other */
    #[ORM\Column(name: 'incident_type', type: Types::STRING, length: 20)] private string $incidentType;
    /** auto from asset criticality: low|medium|high|critical */
    #[ORM\Column(type: Types::STRING, length: 10)] private string $priority;
    #[ORM\Column(name: 'photo_urls', type: Types::TEXT)] private string $description;
    #[ORM\Column(name: 'photo_urls', type: Types::JSON, nullable: true)] private ?array $photoUrls = null;
    #[ORM\Column(name: 'reporter_id', type: Types::STRING, length: 36)] private string $reporterId;
    #[ORM\Column(name: 'reporter_name', type: Types::STRING, length: 100)] private string $reporterName;
    #[ORM\Column(name: 'assigned_engineer_id', type: Types::STRING, length: 36, nullable: true)] private ?string $assignedEngineerId = null;
    #[ORM\Column(name: 'assigned_engineer_name', type: Types::STRING, length: 100, nullable: true)] private ?string $assignedEngineerName = null;
    #[ORM\Column(name: 'backup_engineer_id', type: Types::STRING, length: 36, nullable: true)] private ?string $backupEngineerId = null;
    /** new|assigned|in_progress|resolved|closed */
    #[ORM\Column(name: 'escalation_level', type: Types::STRING, length: 15, options: ['default' => 'new'])] private string $status = 'new';
    #[ORM\Column(name: 'escalation_level', type: Types::INTEGER, options: ['default' => 0])] private int $escalationLevel = 0;
    #[ORM\Column(name: 'resolution_notes', type: Types::TEXT, nullable: true)] private ?string $resolutionNotes = null;
    #[ORM\Column(name: 'downtime_minutes', type: Types::INTEGER, nullable: true)] private ?int $downtimeMinutes = null;
    #[ORM\Column(name: 'repair_cost', type: Types::BIGINT, nullable: true)] private ?string $repairCost = null;
    #[ORM\Column(name: 'assigned_at', type: Types::DATETIME_IMMUTABLE, nullable: true)] private ?\DateTimeImmutable $assignedAt = null;
    #[ORM\Column(name: 'resolved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)] private ?\DateTimeImmutable $resolvedAt = null;

    public function __construct(string $propertyId, string $assetId, string $assetName, string $incidentType, string $priority, string $description, string $reporterId, string $reporterName, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->assetId = $assetId; $this->assetName = $assetName; $this->incidentType = $incidentType; $this->priority = $priority; $this->description = $description; $this->reporterId = $reporterId; $this->reporterName = $reporterName; $this->setTenantId($tenantId); }

    public function getStatus(): string { return $this->status; }
    public function getAssetId(): string { return $this->assetId; }
    public function setLocationDescription(?string $v): void { $this->locationDescription = $v; }
    public function setPhotoUrls(?array $v): void { $this->photoUrls = $v; }
    public function assign(string $engId, string $engName, ?string $backupId = null): void { $this->assignedEngineerId = $engId; $this->assignedEngineerName = $engName; $this->backupEngineerId = $backupId; $this->status = 'assigned'; $this->assignedAt = new \DateTimeImmutable(); }
    public function startProgress(): void { $this->status = 'in_progress'; }
    public function resolve(?string $notes = null, ?int $downtime = null, ?string $cost = null): void { $this->status = 'resolved'; $this->resolutionNotes = $notes; $this->downtimeMinutes = $downtime; $this->repairCost = $cost; $this->resolvedAt = new \DateTimeImmutable(); }
    public function close(): void { $this->status = 'closed'; }
    public function escalate(): void { $this->escalationLevel++; }

    public function toArray(): array
    { return ['id' => $this->getId(), 'property_id' => $this->propertyId, 'asset_id' => $this->assetId, 'asset_name' => $this->assetName,
        'location_description' => $this->locationDescription, 'incident_type' => $this->incidentType, 'priority' => $this->priority,
        'description' => $this->description, 'photo_urls' => $this->photoUrls, 'reporter_name' => $this->reporterName,
        'assigned_engineer_name' => $this->assignedEngineerName, 'status' => $this->status, 'escalation_level' => $this->escalationLevel,
        'resolution_notes' => $this->resolutionNotes, 'downtime_minutes' => $this->downtimeMinutes, 'repair_cost' => $this->repairCost,
        'assigned_at' => $this->assignedAt?->format('Y-m-d H:i:s'), 'resolved_at' => $this->resolvedAt?->format('Y-m-d H:i:s'),
        'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s')]; }
}
