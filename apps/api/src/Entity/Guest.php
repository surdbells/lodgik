<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Entity\Traits\SoftDeletable;

#[ORM\Entity]
#[ORM\Table(name: 'guests')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_guests_tenant')]
#[ORM\Index(columns: ['tenant_id', 'email'], name: 'idx_guests_tenant_email')]
#[ORM\Index(columns: ['tenant_id', 'phone'], name: 'idx_guests_tenant_phone')]
#[ORM\HasLifecycleCallbacks]
class Guest implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;
    use SoftDeletable;

    #[ORM\Column(name: 'first_name', type: Types::STRING, length: 100)]
    private string $firstName;

    #[ORM\Column(name: 'last_name', type: Types::STRING, length: 100)]
    private string $lastName;

    #[ORM\Column(type: Types::STRING, length: 320, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 30, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: Types::STRING, length: 80, nullable: true)]
    private ?string $nationality = null;

    #[ORM\Column(name: 'id_type', type: Types::STRING, length: 50, nullable: true)]
    private ?string $idType = null;

    #[ORM\Column(name: 'id_number', type: Types::STRING, length: 50, nullable: true)]
    private ?string $idNumber = null;

    #[ORM\Column(name: 'date_of_birth', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $dateOfBirth = null;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $gender = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $address = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $city = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $state = null;

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'NG'])]
    private string $country = 'NG';

    #[ORM\Column(name: 'vip_status', type: Types::STRING, length: 20, options: ['default' => 'regular'])]
    private string $vipStatus = 'regular';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'total_stays', type: Types::INTEGER, options: ['default' => 0])]
    private int $totalStays = 0;

    #[ORM\Column(name: 'total_spent', type: Types::DECIMAL, precision: 14, scale: 2, options: ['default' => '0.00'])]
    private string $totalSpent = '0.00';

    #[ORM\Column(name: 'last_visit_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastVisitAt = null;

    /** @var array<string, mixed>|null */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $preferences = null;

    #[ORM\Column(name: 'company_name', type: Types::STRING, length: 200, nullable: true)]
    private ?string $companyName = null;

    public function __construct(string $firstName, string $lastName, string $tenantId)
    {
        $this->generateId();
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->setTenantId($tenantId);
    }

    // ─── Getters & Setters ─────────────────────────────────────

    public function getFirstName(): string { return $this->firstName; }
    public function setFirstName(string $v): void { $this->firstName = $v; }

    public function getLastName(): string { return $this->lastName; }
    public function setLastName(string $v): void { $this->lastName = $v; }

    public function getFullName(): string { return $this->firstName . ' ' . $this->lastName; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $v): void { $this->email = $v !== null ? strtolower(trim($v)) : null; }

    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $v): void { $this->phone = $v; }

    public function getNationality(): ?string { return $this->nationality; }
    public function setNationality(?string $v): void { $this->nationality = $v; }

    public function getIdType(): ?string { return $this->idType; }
    public function setIdType(?string $v): void { $this->idType = $v; }

    public function getIdNumber(): ?string { return $this->idNumber; }
    public function setIdNumber(?string $v): void { $this->idNumber = $v; }

    public function getDateOfBirth(): ?\DateTimeImmutable { return $this->dateOfBirth; }
    public function setDateOfBirth(?\DateTimeImmutable $v): void { $this->dateOfBirth = $v; }

    public function getGender(): ?string { return $this->gender; }
    public function setGender(?string $v): void { $this->gender = $v; }

    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $v): void { $this->address = $v; }

    public function getCity(): ?string { return $this->city; }
    public function setCity(?string $v): void { $this->city = $v; }

    public function getState(): ?string { return $this->state; }
    public function setState(?string $v): void { $this->state = $v; }

    public function getCountry(): string { return $this->country; }
    public function setCountry(string $v): void { $this->country = $v; }

    public function getVipStatus(): string { return $this->vipStatus; }
    public function setVipStatus(string $v): void { $this->vipStatus = $v; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function getTotalStays(): int { return $this->totalStays; }
    public function setTotalStays(int $v): void { $this->totalStays = $v; }
    public function incrementStays(): void { $this->totalStays++; }

    public function getTotalSpent(): string { return $this->totalSpent; }
    public function setTotalSpent(string $v): void { $this->totalSpent = $v; }
    public function addSpent(string $amount): void
    {
        $this->totalSpent = bcadd($this->totalSpent, $amount, 2);
    }

    public function getLastVisitAt(): ?\DateTimeImmutable { return $this->lastVisitAt; }
    public function setLastVisitAt(?\DateTimeImmutable $v): void { $this->lastVisitAt = $v; }

    public function getPreferences(): ?array { return $this->preferences; }
    public function setPreferences(?array $v): void { $this->preferences = $v; }

    public function getCompanyName(): ?string { return $this->companyName; }
    public function setCompanyName(?string $v): void { $this->companyName = $v; }
}
