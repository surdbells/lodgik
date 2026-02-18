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
#[ORM\Table(name: 'properties')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_properties_tenant')]
#[ORM\HasLifecycleCallbacks]
class Property implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;
    use SoftDeletable;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $slug = null;

    #[ORM\Column(type: Types::STRING, length: 320, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 30, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $address = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $city = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $state = null;

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'NG'])]
    private string $country = 'NG';

    #[ORM\Column(name: 'star_rating', type: Types::SMALLINT, nullable: true)]
    private ?int $starRating = null;

    #[ORM\Column(name: 'check_in_time', type: Types::STRING, length: 5, options: ['default' => '14:00'])]
    private string $checkInTime = '14:00';

    #[ORM\Column(name: 'check_out_time', type: Types::STRING, length: 5, options: ['default' => '12:00'])]
    private string $checkOutTime = '12:00';

    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'Africa/Lagos'])]
    private string $timezone = 'Africa/Lagos';

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'NGN'])]
    private string $currency = 'NGN';

    #[ORM\Column(name: 'logo_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $logoUrl = null;

    #[ORM\Column(name: 'cover_image_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $coverImageUrl = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    /** @var array<string, mixed> Extra settings (JSONB). */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $settings = null;

    public function __construct(string $name, string $tenantId)
    {
        $this->generateId();
        $this->name = $name;
        $this->setTenantId($tenantId);
    }

    // ─── Getters & Setters ─────────────────────────────────────

    public function getName(): string { return $this->name; }
    public function setName(string $name): void { $this->name = $name; }

    public function getSlug(): ?string { return $this->slug; }
    public function setSlug(?string $slug): void { $this->slug = $slug; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): void { $this->email = $email; }

    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $phone): void { $this->phone = $phone; }

    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $address): void { $this->address = $address; }

    public function getCity(): ?string { return $this->city; }
    public function setCity(?string $city): void { $this->city = $city; }

    public function getState(): ?string { return $this->state; }
    public function setState(?string $state): void { $this->state = $state; }

    public function getCountry(): string { return $this->country; }
    public function setCountry(string $country): void { $this->country = $country; }

    public function getStarRating(): ?int { return $this->starRating; }
    public function setStarRating(?int $rating): void { $this->starRating = $rating; }

    public function getCheckInTime(): string { return $this->checkInTime; }
    public function setCheckInTime(string $time): void { $this->checkInTime = $time; }

    public function getCheckOutTime(): string { return $this->checkOutTime; }
    public function setCheckOutTime(string $time): void { $this->checkOutTime = $time; }

    public function getTimezone(): string { return $this->timezone; }
    public function setTimezone(string $tz): void { $this->timezone = $tz; }

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $currency): void { $this->currency = $currency; }

    public function getLogoUrl(): ?string { return $this->logoUrl; }
    public function setLogoUrl(?string $url): void { $this->logoUrl = $url; }

    public function getCoverImageUrl(): ?string { return $this->coverImageUrl; }
    public function setCoverImageUrl(?string $url): void { $this->coverImageUrl = $url; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }

    public function getSettings(): ?array { return $this->settings; }
    public function setSettings(?array $settings): void { $this->settings = $settings; }

    public function getSetting(string $key, mixed $default = null): mixed
    {
        return $this->settings[$key] ?? $default;
    }

    public function setSetting(string $key, mixed $value): void
    {
        if ($this->settings === null) {
            $this->settings = [];
        }
        $this->settings[$key] = $value;
    }
}
