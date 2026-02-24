<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_leads')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_ml_merch')]
#[ORM\Index(columns: ['status'], name: 'idx_ml_status')]
#[ORM\HasLifecycleCallbacks]
class MerchantLead
{
    use HasUuid; use HasTimestamps;

    #[ORM\Column(name: 'merchant_id', type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(name: 'hotel_name', type: Types::STRING, length: 255)]
    private string $hotelName;
    #[ORM\Column(name: 'contact_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $contactName = null;
    #[ORM\Column(name: 'contact_phone', type: Types::STRING, length: 20, nullable: true)]
    private ?string $contactPhone = null;
    #[ORM\Column(name: 'contact_email', type: Types::STRING, length: 320, nullable: true)]
    private ?string $contactEmail = null;
    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $location = null;
    #[ORM\Column(name: 'rooms_estimate', type: Types::INTEGER)]
    private int $roomsEstimate = 0;
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'lead';
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;
    #[ORM\Column(name: 'converted_hotel_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $convertedHotelId = null;
    #[ORM\Column(name: 'follow_up_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $followUpDate = null;

    public function __construct() { $this->generateId(); }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getHotelName(): string { return $this->hotelName; }
    public function setHotelName(string $v): self { $this->hotelName = $v; return $this; }
    public function getContactName(): ?string { return $this->contactName; }
    public function setContactName(?string $v): self { $this->contactName = $v; return $this; }
    public function getContactPhone(): ?string { return $this->contactPhone; }
    public function setContactPhone(?string $v): self { $this->contactPhone = $v; return $this; }
    public function getContactEmail(): ?string { return $this->contactEmail; }
    public function setContactEmail(?string $v): self { $this->contactEmail = $v; return $this; }
    public function getLocation(): ?string { return $this->location; }
    public function setLocation(?string $v): self { $this->location = $v; return $this; }
    public function getRoomsEstimate(): int { return $this->roomsEstimate; }
    public function setRoomsEstimate(int $v): self { $this->roomsEstimate = $v; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): self { $this->status = $v; return $this; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }
    public function getConvertedHotelId(): ?string { return $this->convertedHotelId; }
    public function setConvertedHotelId(?string $v): self { $this->convertedHotelId = $v; return $this; }
    public function getFollowUpDate(): ?\DateTimeImmutable { return $this->followUpDate; }
    public function setFollowUpDate(?\DateTimeImmutable $v): self { $this->followUpDate = $v; return $this; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'hotel_name' => $this->hotelName,
            'contact_name' => $this->contactName, 'contact_phone' => $this->contactPhone,
            'contact_email' => $this->contactEmail, 'location' => $this->location,
            'rooms_estimate' => $this->roomsEstimate, 'status' => $this->status, 'notes' => $this->notes,
            'converted_hotel_id' => $this->convertedHotelId,
            'follow_up_date' => $this->followUpDate?->format('Y-m-d'),
            'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
