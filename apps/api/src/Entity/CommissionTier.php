<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'commission_tiers')]
#[ORM\HasLifecycleCallbacks]
class CommissionTier
{
    use HasUuid; use HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $type = 'percentage';
    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $newSubscriptionRate = '10.00';
    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $renewalRate = '5.00';
    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $upgradeRate = '8.00';
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $planOverrides = null;
    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isDefault = false;
    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isActive = true;

    public function __construct() { $this->generateId(); }

    public function getName(): string { return $this->name; }
    public function setName(string $v): self { $this->name = $v; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): self { $this->description = $v; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $v): self { $this->type = $v; return $this; }
    public function getNewSubscriptionRate(): string { return $this->newSubscriptionRate; }
    public function setNewSubscriptionRate(string $v): self { $this->newSubscriptionRate = $v; return $this; }
    public function getRenewalRate(): string { return $this->renewalRate; }
    public function setRenewalRate(string $v): self { $this->renewalRate = $v; return $this; }
    public function getUpgradeRate(): string { return $this->upgradeRate; }
    public function setUpgradeRate(string $v): self { $this->upgradeRate = $v; return $this; }
    public function getPlanOverrides(): ?array { return $this->planOverrides; }
    public function setPlanOverrides(?array $v): self { $this->planOverrides = $v; return $this; }
    public function isDefault(): bool { return $this->isDefault; }
    public function setIsDefault(bool $v): self { $this->isDefault = $v; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): self { $this->isActive = $v; return $this; }

    public function getRateForScope(string $scope, ?string $planTier = null): string
    {
        if ($planTier && $this->planOverrides && isset($this->planOverrides[$planTier])) {
            return (string) $this->planOverrides[$planTier];
        }
        return match ($scope) {
            'new_subscription' => $this->newSubscriptionRate,
            'renewal' => $this->renewalRate,
            'upgrade' => $this->upgradeRate,
            default => $this->newSubscriptionRate,
        };
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'name' => $this->name, 'description' => $this->description,
            'type' => $this->type, 'new_subscription_rate' => $this->newSubscriptionRate,
            'renewal_rate' => $this->renewalRate, 'upgrade_rate' => $this->upgradeRate,
            'plan_overrides' => $this->planOverrides, 'is_default' => $this->isDefault,
            'is_active' => $this->isActive, 'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
