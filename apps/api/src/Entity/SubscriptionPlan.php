<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Subscription plan definition. Not tenant-scoped — managed by super admin.
 * Plans can be standard (visible to all) or custom (visible to one tenant).
 */
#[ORM\Entity]
#[ORM\Table(name: 'subscription_plans')]
#[ORM\HasLifecycleCallbacks]
class SubscriptionPlan
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 50, unique: true)]
    private string $tier;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    // ─── Pricing (in kobo / smallest currency unit) ────────────

    #[ORM\Column(name: 'monthly_price', type: Types::BIGINT)]
    private int $monthlyPrice;

    #[ORM\Column(name: 'annual_price', type: Types::BIGINT)]
    private int $annualPrice;

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'NGN'])]
    private string $currency = 'NGN';

    // ─── Limits ────────────────────────────────────────────────

    #[ORM\Column(name: 'max_rooms', type: Types::INTEGER)]
    private int $maxRooms;

    #[ORM\Column(name: 'max_staff', type: Types::INTEGER)]
    private int $maxStaff;

    #[ORM\Column(name: 'max_properties', type: Types::INTEGER, options: ['default' => 1])]
    private int $maxProperties = 1;

    // ─── Included modules (JSON array of module keys) ──────────

    #[ORM\Column(name: 'included_modules', type: Types::JSON)]
    private array $includedModules;

    // ─── Custom feature flags ──────────────────────────────────

    #[ORM\Column(name: 'feature_flags', type: Types::JSON, nullable: true)]
    private ?array $featureFlags = null;

    // ─── Visibility ────────────────────────────────────────────

    #[ORM\Column(name: 'is_public', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isPublic = true;

    /** Tenant-specific private plan (only visible to this tenant). */
    #[ORM\Column(name: 'for_tenant_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $forTenantId = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;

    // ─── Paystack ──────────────────────────────────────────────

    #[ORM\Column(name: 'paystack_plan_code_monthly', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paystackPlanCodeMonthly = null;

    #[ORM\Column(name: 'paystack_plan_code_annual', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paystackPlanCodeAnnual = null;

    #[ORM\Column(name: 'trial_days', type: Types::INTEGER, options: ['default' => 14])]
    private int $trialDays = 14;

    public function __construct(
        string $name,
        string $tier,
        int $monthlyPrice,
        int $annualPrice,
        int $maxRooms,
        int $maxStaff,
        array $includedModules,
    ) {
        $this->generateId();
        $this->name = $name;
        $this->tier = $tier;
        $this->monthlyPrice = $monthlyPrice;
        $this->annualPrice = $annualPrice;
        $this->maxRooms = $maxRooms;
        $this->maxStaff = $maxStaff;
        $this->includedModules = $includedModules;
    }

    // ─── Getters & Setters ─────────────────────────────────────

    public function getName(): string { return $this->name; }
    public function setName(string $name): void { $this->name = $name; }

    public function getTier(): string { return $this->tier; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $desc): void { $this->description = $desc; }

    public function getMonthlyPrice(): int { return $this->monthlyPrice; }
    public function setMonthlyPrice(int $price): void { $this->monthlyPrice = $price; }

    public function getAnnualPrice(): int { return $this->annualPrice; }
    public function setAnnualPrice(int $price): void { $this->annualPrice = $price; }

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $currency): void { $this->currency = $currency; }

    public function getMaxRooms(): int { return $this->maxRooms; }
    public function setMaxRooms(int $max): void { $this->maxRooms = $max; }

    public function getMaxStaff(): int { return $this->maxStaff; }
    public function setMaxStaff(int $max): void { $this->maxStaff = $max; }

    public function getMaxProperties(): int { return $this->maxProperties; }
    public function setMaxProperties(int $max): void { $this->maxProperties = $max; }

    public function getIncludedModules(): array { return $this->includedModules; }
    public function setIncludedModules(array $modules): void { $this->includedModules = $modules; }

    public function includesModule(string $moduleKey): bool
    {
        return in_array($moduleKey, $this->includedModules, true);
    }

    public function getFeatureFlags(): ?array { return $this->featureFlags; }
    public function setFeatureFlags(?array $flags): void { $this->featureFlags = $flags; }

    public function isPublic(): bool { return $this->isPublic; }
    public function setIsPublic(bool $public): void { $this->isPublic = $public; }

    public function getForTenantId(): ?string { return $this->forTenantId; }
    public function setForTenantId(?string $tenantId): void { $this->forTenantId = $tenantId; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $order): void { $this->sortOrder = $order; }

    public function getPaystackPlanCodeMonthly(): ?string { return $this->paystackPlanCodeMonthly; }
    public function setPaystackPlanCodeMonthly(?string $code): void { $this->paystackPlanCodeMonthly = $code; }

    public function getPaystackPlanCodeAnnual(): ?string { return $this->paystackPlanCodeAnnual; }
    public function setPaystackPlanCodeAnnual(?string $code): void { $this->paystackPlanCodeAnnual = $code; }

    public function getTrialDays(): int { return $this->trialDays; }
    public function setTrialDays(int $days): void { $this->trialDays = $days; }
}
