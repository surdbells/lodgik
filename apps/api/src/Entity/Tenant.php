<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Entity\Traits\SoftDeletable;
use Lodgik\Enum\SubscriptionStatus;

#[ORM\Entity]
#[ORM\Table(name: 'tenants')]
#[ORM\Index(columns: ['slug'], name: 'idx_tenants_slug')]
#[ORM\HasLifecycleCallbacks]
class Tenant
{
    use HasUuid;
    use HasTimestamps;
    use SoftDeletable;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 100, unique: true)]
    private string $slug;

    #[ORM\Column(type: Types::STRING, length: 320, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 30, nullable: true)]
    private ?string $phone = null;

    // ─── Subscription ──────────────────────────────────────────

    #[ORM\Column(name: 'subscription_plan_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $subscriptionPlanId = null;

    #[ORM\Column(name: 'subscription_status', type: Types::STRING, length: 20, enumType: SubscriptionStatus::class)]
    private SubscriptionStatus $subscriptionStatus = SubscriptionStatus::TRIAL;

    #[ORM\Column(name: 'trial_ends_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $trialEndsAt = null;

    #[ORM\Column(name: 'subscription_ends_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $subscriptionEndsAt = null;

    #[ORM\Column(name: 'paystack_customer_code', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paystackCustomerCode = null;

    #[ORM\Column(name: 'paystack_subscription_code', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paystackSubscriptionCode = null;

    // ─── Limits (from plan) ────────────────────────────────────

    #[ORM\Column(name: 'max_rooms', type: Types::INTEGER, options: ['default' => 10])]
    private int $maxRooms = 10;

    #[ORM\Column(name: 'max_staff', type: Types::INTEGER, options: ['default' => 5])]
    private int $maxStaff = 5;

    #[ORM\Column(name: 'max_properties', type: Types::INTEGER, options: ['default' => 1])]
    private int $maxProperties = 1;

    // ─── Feature modules (JSON array of enabled module keys) ───

    #[ORM\Column(name: 'enabled_modules', type: Types::JSON)]
    private array $enabledModules = ['room_management', 'guest_management', 'booking_engine', 'front_desk', 'dashboard'];

    // ─── Branding ──────────────────────────────────────────────

    #[ORM\Column(name: 'primary_color', type: Types::STRING, length: 7, nullable: true)]
    private ?string $primaryColor = null;

    #[ORM\Column(name: 'secondary_color', type: Types::STRING, length: 7, nullable: true)]
    private ?string $secondaryColor = null;

    #[ORM\Column(name: 'logo_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $logoUrl = null;

    // ─── Meta ──────────────────────────────────────────────────

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::STRING, length: 10, options: ['default' => 'en'])]
    private string $locale = 'en';

    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'Africa/Lagos'])]
    private string $timezone = 'Africa/Lagos';

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'NGN'])]
    private string $currency = 'NGN';

    public function __construct(string $name, string $slug)
    {
        $this->generateId();
        $this->name = $name;
        $this->slug = $slug;
    }

    // ─── Getters & Setters ─────────────────────────────────────

    public function getName(): string { return $this->name; }
    public function setName(string $name): void { $this->name = $name; }

    public function getSlug(): string { return $this->slug; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): void { $this->email = $email; }

    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $phone): void { $this->phone = $phone; }

    public function getSubscriptionPlanId(): ?string { return $this->subscriptionPlanId; }
    public function setSubscriptionPlanId(?string $id): void { $this->subscriptionPlanId = $id; }

    public function getSubscriptionStatus(): SubscriptionStatus { return $this->subscriptionStatus; }
    public function setSubscriptionStatus(SubscriptionStatus $status): void { $this->subscriptionStatus = $status; }

    public function getTrialEndsAt(): ?\DateTimeImmutable { return $this->trialEndsAt; }
    public function setTrialEndsAt(?\DateTimeImmutable $date): void { $this->trialEndsAt = $date; }

    public function getSubscriptionEndsAt(): ?\DateTimeImmutable { return $this->subscriptionEndsAt; }
    public function setSubscriptionEndsAt(?\DateTimeImmutable $date): void { $this->subscriptionEndsAt = $date; }

    public function getPaystackCustomerCode(): ?string { return $this->paystackCustomerCode; }
    public function setPaystackCustomerCode(?string $code): void { $this->paystackCustomerCode = $code; }

    public function getPaystackSubscriptionCode(): ?string { return $this->paystackSubscriptionCode; }
    public function setPaystackSubscriptionCode(?string $code): void { $this->paystackSubscriptionCode = $code; }

    public function getMaxRooms(): int { return $this->maxRooms; }
    public function setMaxRooms(int $max): void { $this->maxRooms = $max; }

    public function getMaxStaff(): int { return $this->maxStaff; }
    public function setMaxStaff(int $max): void { $this->maxStaff = $max; }

    public function getMaxProperties(): int { return $this->maxProperties; }
    public function setMaxProperties(int $max): void { $this->maxProperties = $max; }

    public function getEnabledModules(): array { return $this->enabledModules; }
    public function setEnabledModules(array $modules): void { $this->enabledModules = $modules; }

    public function hasModule(string $moduleKey): bool
    {
        return in_array($moduleKey, $this->enabledModules, true);
    }

    public function enableModule(string $moduleKey): void
    {
        if (!$this->hasModule($moduleKey)) {
            $this->enabledModules[] = $moduleKey;
        }
    }

    public function disableModule(string $moduleKey): void
    {
        $this->enabledModules = array_values(
            array_filter($this->enabledModules, fn(string $m) => $m !== $moduleKey)
        );
    }

    public function getPrimaryColor(): ?string { return $this->primaryColor; }
    public function setPrimaryColor(?string $color): void { $this->primaryColor = $color; }

    public function getSecondaryColor(): ?string { return $this->secondaryColor; }
    public function setSecondaryColor(?string $color): void { $this->secondaryColor = $color; }

    public function getLogoUrl(): ?string { return $this->logoUrl; }
    public function setLogoUrl(?string $url): void { $this->logoUrl = $url; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }

    public function getLocale(): string { return $this->locale; }
    public function setLocale(string $locale): void { $this->locale = $locale; }

    public function getTimezone(): string { return $this->timezone; }
    public function setTimezone(string $tz): void { $this->timezone = $tz; }

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $currency): void { $this->currency = $currency; }

    public function isSubscriptionUsable(): bool
    {
        return $this->subscriptionStatus->isUsable();
    }
}
