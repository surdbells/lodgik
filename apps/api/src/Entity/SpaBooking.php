<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'spa_bookings')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'booking_date'], name: 'idx_spab_date')] #[ORM\HasLifecycleCallbacks]
class SpaBooking implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(name: 'service_id', type: Types::STRING, length: 36)] private string $serviceId;
    #[ORM\Column(name: 'service_name', type: Types::STRING, length: 100)] private string $serviceName;
    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)] private string $guestId;
    #[ORM\Column(name: 'guest_name', type: Types::STRING, length: 200)] private string $guestName;
    #[ORM\Column(name: 'therapist_name', type: Types::STRING, length: 150, nullable: true)] private ?string $therapistName = null;
    #[ORM\Column(name: 'booking_date', type: Types::DATE_IMMUTABLE)] private \DateTimeImmutable $bookingDate;
    #[ORM\Column(name: 'start_time', type: Types::STRING, length: 5)] private string $startTime;
    #[ORM\Column(type: Types::BIGINT)] private string $price;
    /** booked|in_progress|completed|cancelled|no_show */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'booked'])] private string $status = 'booked';

    public function __construct(string $propertyId, string $serviceId, string $serviceName, string $guestId, string $guestName, \DateTimeImmutable $bookingDate, string $startTime, string $price, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->serviceId = $serviceId; $this->serviceName = $serviceName; $this->guestId = $guestId; $this->guestName = $guestName; $this->bookingDate = $bookingDate; $this->startTime = $startTime; $this->price = $price; $this->setTenantId($tenantId); }
    public function getStatus(): string { return $this->status; } public function setTherapistName(?string $v): void { $this->therapistName = $v; }
    public function start(): void { $this->status = 'in_progress'; } public function complete(): void { $this->status = 'completed'; } public function cancel(): void { $this->status = 'cancelled'; }
    public function toArray(): array { return ['id' => $this->getId(), 'service_name' => $this->serviceName, 'guest_name' => $this->guestName, 'therapist_name' => $this->therapistName, 'booking_date' => $this->bookingDate->format('Y-m-d'), 'start_time' => $this->startTime, 'price' => $this->price, 'status' => $this->status]; }
}
