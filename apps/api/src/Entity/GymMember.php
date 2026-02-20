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
#[ORM\Table(name: 'gym_members')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_gm_property')]
#[ORM\Index(columns: ['tenant_id', 'email'], name: 'idx_gm_email')]
#[ORM\Index(columns: ['tenant_id', 'phone'], name: 'idx_gm_phone')]
#[ORM\HasLifecycleCallbacks]
class GymMember implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'first_name', type: Types::STRING, length: 100)]
    private string $firstName;

    #[ORM\Column(name: 'last_name', type: Types::STRING, length: 100)]
    private string $lastName;

    #[ORM\Column(type: Types::STRING, length: 150, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $phone;

    /** 'external' for walk-ins/local members, 'guest' for hotel guests */
    #[ORM\Column(name: 'member_type', type: Types::STRING, length: 20, options: ['default' => 'external'])]
    private string $memberType = 'external';

    /** If member_type = 'guest', link to guest entity */
    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $guestId = null;

    /** If member_type = 'guest', link to active booking */
    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $bookingId = null;

    #[ORM\Column(name: 'date_of_birth', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $dateOfBirth = null;

    /** M/F/Other */
    #[ORM\Column(type: Types::STRING, length: 10, nullable: true)]
    private ?string $gender = null;

    #[ORM\Column(name: 'emergency_contact', type: Types::STRING, length: 200, nullable: true)]
    private ?string $emergencyContact = null;

    #[ORM\Column(name: 'photo_url', type: Types::TEXT, nullable: true)]
    private ?string $photoUrl = null;

    /** QR code value for check-in */
    #[ORM\Column(name: 'qr_code', type: Types::STRING, length: 50, nullable: true)]
    private ?string $qrCode = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $propertyId, string $firstName, string $lastName, string $phone, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->phone = $phone;
        $this->setTenantId($tenantId);
        $this->qrCode = 'GYM-' . strtoupper(substr(md5($this->getId()), 0, 8));
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getFirstName(): string { return $this->firstName; }
    public function setFirstName(string $v): void { $this->firstName = $v; }
    public function getLastName(): string { return $this->lastName; }
    public function setLastName(string $v): void { $this->lastName = $v; }
    public function getFullName(): string { return $this->firstName . ' ' . $this->lastName; }
    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $v): void { $this->email = $v; }
    public function getPhone(): string { return $this->phone; }
    public function setPhone(string $v): void { $this->phone = $v; }
    public function getMemberType(): string { return $this->memberType; }
    public function setMemberType(string $v): void { $this->memberType = $v; }
    public function getGuestId(): ?string { return $this->guestId; }
    public function setGuestId(?string $v): void { $this->guestId = $v; }
    public function getBookingId(): ?string { return $this->bookingId; }
    public function setBookingId(?string $v): void { $this->bookingId = $v; }
    public function getDateOfBirth(): ?\DateTimeImmutable { return $this->dateOfBirth; }
    public function setDateOfBirth(?\DateTimeImmutable $v): void { $this->dateOfBirth = $v; }
    public function getGender(): ?string { return $this->gender; }
    public function setGender(?string $v): void { $this->gender = $v; }
    public function getEmergencyContact(): ?string { return $this->emergencyContact; }
    public function setEmergencyContact(?string $v): void { $this->emergencyContact = $v; }
    public function getPhotoUrl(): ?string { return $this->photoUrl; }
    public function setPhotoUrl(?string $v): void { $this->photoUrl = $v; }
    public function getQrCode(): ?string { return $this->qrCode; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function isGuest(): bool { return $this->memberType === 'guest'; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'first_name' => $this->firstName, 'last_name' => $this->lastName,
            'full_name' => $this->getFullName(), 'email' => $this->email,
            'phone' => $this->phone, 'member_type' => $this->memberType,
            'guest_id' => $this->guestId, 'booking_id' => $this->bookingId,
            'date_of_birth' => $this->dateOfBirth?->format('Y-m-d'),
            'gender' => $this->gender, 'emergency_contact' => $this->emergencyContact,
            'photo_url' => $this->photoUrl, 'qr_code' => $this->qrCode,
            'notes' => $this->notes, 'is_active' => $this->isActive,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}
