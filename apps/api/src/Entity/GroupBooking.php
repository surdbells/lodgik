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
#[ORM\Table(name: 'group_bookings')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_gb_prop')]
#[ORM\HasLifecycleCallbacks]
class GroupBooking implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;
    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $name;
    /** corporate | group | travel_agent | event | wedding */
    #[ORM\Column(name: 'booking_type', type: Types::STRING, length: 20)]
    private string $bookingType;
    #[ORM\Column(name: 'contact_name', type: Types::STRING, length: 150)]
    private string $contactName;
    #[ORM\Column(name: 'contact_email', type: Types::STRING, length: 150, nullable: true)]
    private ?string $contactEmail = null;
    #[ORM\Column(name: 'contact_phone', type: Types::STRING, length: 20, nullable: true)]
    private ?string $contactPhone = null;
    #[ORM\Column(name: 'company_name', type: Types::STRING, length: 200, nullable: true)]
    private ?string $companyName = null;
    #[ORM\Column(name: 'discount_percentage', type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $discountPercentage = '0.00';
    #[ORM\Column(name: 'total_rooms', type: Types::INTEGER, options: ['default' => 1])]
    private int $totalRooms = 1;
    #[ORM\Column(name: 'check_in', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $checkIn;
    #[ORM\Column(name: 'check_out', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $checkOut;
    #[ORM\Column(name: 'master_folio_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $masterFolioId = null;
    /** tentative | confirmed | cancelled */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'tentative'])]
    private string $status = 'tentative';
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;
    #[ORM\Column(name: 'special_requirements', type: Types::TEXT, nullable: true)]
    private ?string $specialRequirements = null;
    #[ORM\Column(name: 'created_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $createdBy = null;

    public function __construct(string $propertyId, string $name, string $bookingType, string $contactName, \DateTimeImmutable $checkIn, \DateTimeImmutable $checkOut, string $tenantId)
    {
        $this->generateId(); $this->propertyId = $propertyId; $this->name = $name; $this->bookingType = $bookingType;
        $this->contactName = $contactName; $this->checkIn = $checkIn; $this->checkOut = $checkOut; $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getBookingType(): string { return $this->bookingType; }
    public function getDiscountPercentage(): string { return $this->discountPercentage; }
    public function setDiscountPercentage(string $v): void { $this->discountPercentage = $v; }
    public function getTotalRooms(): int { return $this->totalRooms; }
    public function setTotalRooms(int $v): void { $this->totalRooms = $v; }
    public function setContactEmail(?string $v): void { $this->contactEmail = $v; }
    public function setContactPhone(?string $v): void { $this->contactPhone = $v; }
    public function setCompanyName(?string $v): void { $this->companyName = $v; }
    public function setMasterFolioId(?string $v): void { $this->masterFolioId = $v; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function setSpecialRequirements(?string $v): void { $this->specialRequirements = $v; }
    public function setCreatedBy(?string $v): void { $this->createdBy = $v; }
    public function getStatus(): string { return $this->status; }
    public function confirm(): void { $this->status = 'confirmed'; }
    public function cancel(): void { $this->status = 'cancelled'; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId, 'name' => $this->name,
            'booking_type' => $this->bookingType, 'contact_name' => $this->contactName,
            'contact_email' => $this->contactEmail, 'contact_phone' => $this->contactPhone,
            'company_name' => $this->companyName, 'discount_percentage' => $this->discountPercentage,
            'total_rooms' => $this->totalRooms, 'check_in' => $this->checkIn->format('Y-m-d'),
            'check_out' => $this->checkOut->format('Y-m-d'), 'master_folio_id' => $this->masterFolioId,
            'status' => $this->status, 'notes' => $this->notes,
            'special_requirements' => $this->specialRequirements,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
