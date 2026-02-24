<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_hotels')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_mh_merchant')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_mh_tenant')]
#[ORM\Index(columns: ['onboarding_status'], name: 'idx_mh_status')]
#[ORM\HasLifecycleCallbacks]
class MerchantHotel
{
    use HasUuid; use HasTimestamps;

    #[ORM\Column(name: 'merchant_id', type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $tenantId = null;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $propertyId = null;
    #[ORM\Column(name: 'hotel_name', type: Types::STRING, length: 255)]
    private string $hotelName;
    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $location = null;
    #[ORM\Column(name: 'contact_person', type: Types::STRING, length: 100, nullable: true)]
    private ?string $contactPerson = null;
    #[ORM\Column(name: 'contact_phone', type: Types::STRING, length: 20, nullable: true)]
    private ?string $contactPhone = null;
    #[ORM\Column(name: 'contact_email', type: Types::STRING, length: 320, nullable: true)]
    private ?string $contactEmail = null;
    #[ORM\Column(name: 'rooms_count', type: Types::INTEGER)]
    private int $roomsCount = 0;
    #[ORM\Column(name: 'hotel_category', type: Types::STRING, length: 20)]
    private string $hotelCategory = 'budget';
    #[ORM\Column(name: 'subscription_plan', type: Types::STRING, length: 36, nullable: true)]
    private ?string $subscriptionPlan = null;
    #[ORM\Column(name: 'onboarding_status', type: Types::STRING, length: 20)]
    private string $onboardingStatus = 'pending';
    #[ORM\Column(name: 'bound_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $boundAt = null;
    #[ORM\Column(name: 'is_permanent_bind', type: Types::BOOLEAN)]
    private bool $isPermanentBind = true;

    public function __construct() { $this->generateId(); }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getTenantId(): ?string { return $this->tenantId; }
    public function setTenantId(?string $v): self { $this->tenantId = $v; return $this; }
    public function getPropertyId(): ?string { return $this->propertyId; }
    public function setPropertyId(?string $v): self { $this->propertyId = $v; return $this; }
    public function getHotelName(): string { return $this->hotelName; }
    public function setHotelName(string $v): self { $this->hotelName = $v; return $this; }
    public function getLocation(): ?string { return $this->location; }
    public function setLocation(?string $v): self { $this->location = $v; return $this; }
    public function getContactPerson(): ?string { return $this->contactPerson; }
    public function setContactPerson(?string $v): self { $this->contactPerson = $v; return $this; }
    public function getContactPhone(): ?string { return $this->contactPhone; }
    public function setContactPhone(?string $v): self { $this->contactPhone = $v; return $this; }
    public function getContactEmail(): ?string { return $this->contactEmail; }
    public function setContactEmail(?string $v): self { $this->contactEmail = $v; return $this; }
    public function getRoomsCount(): int { return $this->roomsCount; }
    public function setRoomsCount(int $v): self { $this->roomsCount = $v; return $this; }
    public function getHotelCategory(): string { return $this->hotelCategory; }
    public function setHotelCategory(string $v): self { $this->hotelCategory = $v; return $this; }
    public function getSubscriptionPlan(): ?string { return $this->subscriptionPlan; }
    public function setSubscriptionPlan(?string $v): self { $this->subscriptionPlan = $v; return $this; }
    public function getOnboardingStatus(): string { return $this->onboardingStatus; }
    public function setOnboardingStatus(string $v): self { $this->onboardingStatus = $v; return $this; }
    public function getBoundAt(): ?\DateTimeImmutable { return $this->boundAt; }
    public function setBoundAt(?\DateTimeImmutable $v): self { $this->boundAt = $v; return $this; }
    public function getIsPermanentBind(): bool { return $this->isPermanentBind; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'tenant_id' => $this->tenantId,
            'property_id' => $this->propertyId, 'hotel_name' => $this->hotelName, 'location' => $this->location,
            'contact_person' => $this->contactPerson, 'contact_phone' => $this->contactPhone,
            'contact_email' => $this->contactEmail, 'rooms_count' => $this->roomsCount,
            'hotel_category' => $this->hotelCategory, 'subscription_plan' => $this->subscriptionPlan,
            'onboarding_status' => $this->onboardingStatus, 'bound_at' => $this->boundAt?->format(\DateTimeInterface::ATOM),
            'is_permanent_bind' => $this->isPermanentBind,
            'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
