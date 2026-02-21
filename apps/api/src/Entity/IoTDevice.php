<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'iot_devices')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'room_id'], name: 'idx_iot_room')] #[ORM\HasLifecycleCallbacks]
class IoTDevice implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36, nullable: true)] private ?string $roomId = null;
    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 20, nullable: true)] private ?string $roomNumber = null;
    /** ac|light|curtain|tv|door_lock|thermostat|minibar_sensor */
    #[ORM\Column(name: 'device_type', type: Types::STRING, length: 20)] private string $deviceType;
    #[ORM\Column(type: Types::STRING, length: 100)] private string $name;
    #[ORM\Column(name: 'mqtt_topic', type: Types::STRING, length: 200, nullable: true)] private ?string $mqttTopic = null;
    #[ORM\Column(name: 'current_state', type: Types::JSON, nullable: true)] private ?array $currentState = null;
    /** online|offline|error */
    #[ORM\Column(type: Types::STRING, length: 10, options: ['default' => 'offline'])] private string $status = 'offline';
    #[ORM\Column(name: 'last_seen', type: Types::DATETIME_IMMUTABLE, nullable: true)] private ?\DateTimeImmutable $lastSeen = null;
    #[ORM\Column(name: 'energy_kwh', type: Types::DECIMAL, precision: 10, scale: 2, options: ['default' => '0.00'])] private string $energyKwh = '0.00';

    public function __construct(string $propertyId, string $deviceType, string $name, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->deviceType = $deviceType; $this->name = $name; $this->setTenantId($tenantId); }
    public function setRoomId(?string $v): void { $this->roomId = $v; } public function setRoomNumber(?string $v): void { $this->roomNumber = $v; }
    public function setMqttTopic(?string $v): void { $this->mqttTopic = $v; }
    public function updateState(array $state): void { $this->currentState = $state; $this->status = 'online'; $this->lastSeen = new \DateTimeImmutable(); }
    public function setStatus(string $v): void { $this->status = $v; }
    public function addEnergy(string $kwh): void { $this->energyKwh = (string)((float)$this->energyKwh + (float)$kwh); }
    public function toArray(): array { return ['id' => $this->getId(), 'property_id' => $this->propertyId, 'room_id' => $this->roomId, 'room_number' => $this->roomNumber, 'device_type' => $this->deviceType, 'name' => $this->name, 'mqtt_topic' => $this->mqttTopic, 'current_state' => $this->currentState, 'status' => $this->status, 'last_seen' => $this->lastSeen?->format('Y-m-d H:i:s'), 'energy_kwh' => $this->energyKwh]; }
}
