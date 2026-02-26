<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'iot_automations')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'is_active'], name: 'idx_iota_active')] #[ORM\HasLifecycleCallbacks]
class IoTAutomation implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(type: Types::STRING, length: 100)] private string $name;
    /** check_in|check_out|time_based|occupancy|manual */
    #[ORM\Column(name: 'trigger_type', type: Types::STRING, length: 15)] private string $triggerType;
    #[ORM\Column(name: 'trigger_config', type: Types::JSON)] private array $triggerConfig;
    /** Array of {device_type, action, params} */
    #[ORM\Column(name: 'actions', type: Types::JSON)] private array $actions;
    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])] private bool $isActive = true;

    public function __construct(string $propertyId, string $name, string $triggerType, array $triggerConfig, array $actions, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->name = $name; $this->triggerType = $triggerType; $this->triggerConfig = $triggerConfig; $this->actions = $actions; $this->setTenantId($tenantId); }
    public function getName(): string { return $this->name; } public function getTriggerType(): string { return $this->triggerType; }
    public function getActions(): array { return $this->actions; } public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function toArray(): array { return ['id' => $this->getId(), 'name' => $this->name, 'trigger_type' => $this->triggerType, 'trigger_config' => $this->triggerConfig, 'actions' => $this->actions, 'is_active' => $this->isActive]; }
}
