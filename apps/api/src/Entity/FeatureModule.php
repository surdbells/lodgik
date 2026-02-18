<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Platform-wide module registry (not tenant-scoped).
 * Managed by super admin. 43 modules total.
 */
#[ORM\Entity]
#[ORM\Table(name: 'feature_modules')]
#[ORM\UniqueConstraint(name: 'uq_feature_module_key', columns: ['module_key'])]
#[ORM\HasLifecycleCallbacks]
class FeatureModule
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(name: 'module_key', type: Types::STRING, length: 50)]
    private string $moduleKey;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $category;

    /** Minimum tier required: 'all', 'starter', 'professional', 'business', 'enterprise' */
    #[ORM\Column(name: 'min_tier', type: Types::STRING, length: 20, options: ['default' => 'all'])]
    private string $minTier = 'all';

    #[ORM\Column(name: 'is_core', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isCore = false;

    /** JSON array of module_keys this module depends on. */
    #[ORM\Column(type: Types::JSON)]
    private array $dependencies = [];

    /** JSON array of module_keys that depend on THIS module (reverse deps). */
    #[ORM\Column(name: 'required_by', type: Types::JSON)]
    private array $requiredBy = [];

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    /** Icon identifier for frontend (e.g. 'bed', 'people', 'restaurant'). */
    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $icon = null;

    public function __construct(string $moduleKey, string $name, string $category)
    {
        $this->generateId();
        $this->moduleKey = $moduleKey;
        $this->name = $name;
        $this->category = $category;
    }

    public function getModuleKey(): string { return $this->moduleKey; }
    public function getName(): string { return $this->name; }
    public function setName(string $name): void { $this->name = $name; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $desc): void { $this->description = $desc; }
    public function getCategory(): string { return $this->category; }
    public function setCategory(string $cat): void { $this->category = $cat; }
    public function getMinTier(): string { return $this->minTier; }
    public function setMinTier(string $tier): void { $this->minTier = $tier; }
    public function isCore(): bool { return $this->isCore; }
    public function setIsCore(bool $core): void { $this->isCore = $core; }
    public function getDependencies(): array { return $this->dependencies; }
    public function setDependencies(array $deps): void { $this->dependencies = $deps; }
    public function getRequiredBy(): array { return $this->requiredBy; }
    public function setRequiredBy(array $reqs): void { $this->requiredBy = $reqs; }
    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $order): void { $this->sortOrder = $order; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): void { $this->isActive = $active; }
    public function getIcon(): ?string { return $this->icon; }
    public function setIcon(?string $icon): void { $this->icon = $icon; }
}
