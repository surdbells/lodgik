<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'pool_access_logs')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'access_date'], name: 'idx_pool_date')] #[ORM\HasLifecycleCallbacks]
class PoolAccessLog implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)] private string $guestId;
    #[ORM\Column(name: 'guest_name', type: Types::STRING, length: 200)] private string $guestName;
    #[ORM\Column(name: 'area', type: Types::STRING, length: 50, options: ['default' => 'main_pool'])] private string $area = 'main_pool';
    #[ORM\Column(name: 'access_date', type: Types::DATE_IMMUTABLE)] private \DateTimeImmutable $accessDate;
    #[ORM\Column(name: 'check_in_time', type: Types::STRING, length: 5)] private string $checkInTime;
    #[ORM\Column(name: 'check_out_time', type: Types::STRING, length: 5, nullable: true)] private ?string $checkOutTime = null;

    public function __construct(string $propertyId, string $guestId, string $guestName, \DateTimeImmutable $accessDate, string $checkInTime, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->guestId = $guestId; $this->guestName = $guestName; $this->accessDate = $accessDate; $this->checkInTime = $checkInTime; $this->setTenantId($tenantId); }
    public function setArea(string $v): void { $this->area = $v; } public function checkOut(string $time): void { $this->checkOutTime = $time; }
    public function toArray(): array { return ['id' => $this->getId(), 'guest_name' => $this->guestName, 'area' => $this->area, 'access_date' => $this->accessDate->format('Y-m-d'), 'check_in_time' => $this->checkInTime, 'check_out_time' => $this->checkOutTime]; }
}
