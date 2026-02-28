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
#[ORM\Table(name: 'police_reports')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'arrival_date'], name: 'idx_pr_arrival')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_pr_booking')]
#[ORM\HasLifecycleCallbacks]
class PoliceReport implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;
    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;
    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)]
    private string $guestId;
    #[ORM\Column(name: 'guest_name', type: Types::STRING, length: 200)]
    private string $guestName;
    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $nationality = null;
    /** passport | national_id | drivers_license | voters_card | nin */
    #[ORM\Column(name: 'id_type', type: Types::STRING, length: 30, nullable: true)]
    private ?string $idType = null;
    #[ORM\Column(name: 'id_number', type: Types::STRING, length: 50, nullable: true)]
    private ?string $idNumber = null;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $address = null;
    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $phone = null;
    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $email = null;
    #[ORM\Column(name: 'purpose_of_visit', type: Types::STRING, length: 100, nullable: true)]
    private ?string $purposeOfVisit = null;
    #[ORM\Column(name: 'arrival_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $arrivalDate;
    #[ORM\Column(name: 'departure_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $departureDate = null;
    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 10, nullable: true)]
    private ?string $roomNumber = null;
    #[ORM\Column(name: 'accompanying_persons', type: Types::INTEGER, options: ['default' => 0])]
    private int $accompanyingPersons = 0;
    #[ORM\Column(name: 'vehicle_plate', type: Types::STRING, length: 20, nullable: true)]
    private ?string $vehiclePlate = null;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $remarks = null;
    #[ORM\Column(name: 'submitted_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $submittedAt = null;

    public function __construct(string $propertyId, string $bookingId, string $guestId, string $guestName, \DateTimeImmutable $arrivalDate, string $tenantId)
    {
        $this->generateId(); $this->propertyId = $propertyId; $this->bookingId = $bookingId;
        $this->guestId = $guestId; $this->guestName = $guestName; $this->arrivalDate = $arrivalDate;
        // submittedAt intentionally null — report starts as 'pending'
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getBookingId(): string { return $this->bookingId; }
    public function markSubmitted(): void { $this->submittedAt = new \DateTimeImmutable(); }
    public function getStatus(): string { return $this->submittedAt !== null ? 'submitted' : 'pending'; }
    public function setNationality(?string $v): void { $this->nationality = $v; }
    public function setIdType(?string $v): void { $this->idType = $v; }
    public function setIdNumber(?string $v): void { $this->idNumber = $v; }
    public function setAddress(?string $v): void { $this->address = $v; }
    public function setPhone(?string $v): void { $this->phone = $v; }
    public function setEmail(?string $v): void { $this->email = $v; }
    public function setPurposeOfVisit(?string $v): void { $this->purposeOfVisit = $v; }
    public function setDepartureDate(?\DateTimeImmutable $v): void { $this->departureDate = $v; }
    public function setRoomNumber(?string $v): void { $this->roomNumber = $v; }
    public function setAccompanyingPersons(int $v): void { $this->accompanyingPersons = $v; }
    public function setVehiclePlate(?string $v): void { $this->vehiclePlate = $v; }
    public function setRemarks(?string $v): void { $this->remarks = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId, 'booking_id' => $this->bookingId,
            'guest_name' => $this->guestName, 'nationality' => $this->nationality,
            'id_type' => $this->idType, 'id_number' => $this->idNumber,
            // Frontend aliases
            'passport_number' => $this->idType === 'passport' ? $this->idNumber : null,
            'nin'             => $this->idType === 'nin'      ? $this->idNumber : null,
            'status' => $this->getStatus(),
            'address' => $this->address, 'phone' => $this->phone, 'email' => $this->email,
            'purpose_of_visit' => $this->purposeOfVisit,
            'arrival_date' => $this->arrivalDate->format('Y-m-d'),
            'departure_date' => $this->departureDate?->format('Y-m-d'),
            'room_number' => $this->roomNumber, 'accompanying_persons' => $this->accompanyingPersons,
            'vehicle_plate' => $this->vehiclePlate, 'remarks' => $this->remarks,
            'submitted_at' => $this->submittedAt?->format('Y-m-d H:i:s'),
        ];
    }
}
