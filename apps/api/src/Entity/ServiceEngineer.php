<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'service_engineers')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_eng_prop')] #[ORM\HasLifecycleCallbacks]
class ServiceEngineer implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(type: Types::STRING, length: 150)] private string $name;
    #[ORM\Column(type: Types::STRING, length: 150, nullable: true)] private ?string $company = null;
    /** internal|external|oem */
    #[ORM\Column(name: 'engineer_type', type: Types::STRING, length: 10)] private string $engineerType;
    /** hvac|electrical|plumbing|elevator|it|general|carpentry|painting */
    #[ORM\Column(type: Types::STRING, length: 30)] private string $specialization;
    #[ORM\Column(type: Types::STRING, length: 20)] private string $phone;
    #[ORM\Column(name: 'emergency_phone', type: Types::STRING, length: 20, nullable: true)] private ?string $emergencyPhone = null;
    #[ORM\Column(type: Types::STRING, length: 150, nullable: true)] private ?string $email = null;
    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)] private ?string $whatsapp = null;
    #[ORM\Column(name: 'sla_response_minutes', type: Types::INTEGER, options: ['default' => 60])] private int $slaResponseMinutes = 60;
    #[ORM\Column(name: 'sla_resolution_minutes', type: Types::INTEGER, options: ['default' => 240])] private int $slaResolutionMinutes = 240;
    /** 24x7|business_hours|on_call */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'business_hours'])] private string $availability = 'business_hours';
    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])] private bool $isActive = true;

    public function __construct(string $propertyId, string $name, string $engineerType, string $specialization, string $phone, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->name = $name; $this->engineerType = $engineerType; $this->specialization = $specialization; $this->phone = $phone; $this->setTenantId($tenantId); }

    public function getName(): string { return $this->name; } public function setName(string $v): void { $this->name = $v; }
    public function getPhone(): string { return $this->phone; }
    public function setCompany(?string $v): void { $this->company = $v; }
    public function setEmergencyPhone(?string $v): void { $this->emergencyPhone = $v; }
    public function setEmail(?string $v): void { $this->email = $v; }
    public function setWhatsapp(?string $v): void { $this->whatsapp = $v; }
    public function setSlaResponseMinutes(int $v): void { $this->slaResponseMinutes = $v; }
    public function setSlaResolutionMinutes(int $v): void { $this->slaResolutionMinutes = $v; }
    public function setAvailability(string $v): void { $this->availability = $v; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function isActive(): bool { return $this->isActive; }

    public function toArray(): array
    { return ['id' => $this->getId(), 'property_id' => $this->propertyId, 'name' => $this->name, 'company' => $this->company,
        'engineer_type' => $this->engineerType, 'specialization' => $this->specialization, 'phone' => $this->phone,
        'emergency_phone' => $this->emergencyPhone, 'email' => $this->email, 'whatsapp' => $this->whatsapp,
        'sla_response_minutes' => $this->slaResponseMinutes, 'sla_resolution_minutes' => $this->slaResolutionMinutes,
        'availability' => $this->availability, 'is_active' => $this->isActive]; }
}
