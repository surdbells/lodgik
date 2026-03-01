<?php

declare(strict_types=1);

namespace Lodgik\Module\Feature;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\FeatureModule;
use Lodgik\Entity\Tenant;
use Lodgik\Entity\TenantFeatureModule;
use Lodgik\Entity\SubscriptionPlan;
use Lodgik\Repository\TenantRepository;

final class FeatureService
{
    /** Tier hierarchy for comparison. */
    private const TIER_ORDER = ['all' => 0, 'starter' => 1, 'professional' => 2, 'business' => 3, 'enterprise' => 4];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantRepository $tenantRepo,
    ) {}

    // ─── Module Registry ───────────────────────────────────────

    /**
     * Get all active feature modules.
     * @return FeatureModule[]
     */
    public function listModules(): array
    {
        return $this->em->getRepository(FeatureModule::class)
            ->findBy(['isActive' => true], ['sortOrder' => 'ASC']);
    }

    /**
     * Get a single module by key.
     */
    public function getModule(string $key): ?FeatureModule
    {
        return $this->em->getRepository(FeatureModule::class)
            ->findOneBy(['moduleKey' => $key]);
    }

    // ─── Tenant Features ───────────────────────────────────────

    /**
     * Compute the effective enabled modules for a tenant.
     *
     * Logic:
     * 1. Start with plan's included_modules (from tenant.enabled_modules)
     * 2. Always include core modules
     * 3. Apply per-tenant overrides (TenantFeatureModule)
     *
     * @return array{modules: array, overrides: array}
     */
    public function getTenantFeatures(string $tenantId): array
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        // Base: tenant's own enabled_modules snapshot (set at sign-up)
        $tenantModules = $tenant->getEnabledModules();

        // Merge live subscription plan's included_modules so that modules
        // added to a plan after the tenant was created take effect automatically
        $livePlanModules = [];
        $planId = $tenant->getSubscriptionPlanId();
        if ($planId !== null) {
            $plan = $this->em->find(SubscriptionPlan::class, $planId);
            if ($plan !== null) {
                $livePlanModules = $plan->getIncludedModules();
            }
        }
        $planModules = array_unique(array_merge($tenantModules, $livePlanModules));

        // Core modules always included
        $coreModules = $this->getCoreModuleKeys();
        $effective = array_unique(array_merge($planModules, $coreModules));

        // Apply overrides
        $overrides = $this->getTenantOverrides($tenantId);
        foreach ($overrides as $override) {
            if ($override->isEnabled()) {
                if (!in_array($override->getModuleKey(), $effective, true)) {
                    $effective[] = $override->getModuleKey();
                }
            } else {
                // Can disable non-core modules
                $module = $this->getModule($override->getModuleKey());
                if ($module !== null && !$module->isCore()) {
                    $effective = array_values(array_filter(
                        $effective,
                        fn(string $k) => $k !== $override->getModuleKey()
                    ));
                }
            }
        }

        sort($effective);

        return [
            'modules' => $effective,
            'overrides' => array_map(fn($o) => [
                'module_key' => $o->getModuleKey(),
                'is_enabled' => $o->isEnabled(),
                'reason' => $o->getReason(),
            ], $overrides),
        ];
    }

    /**
     * Check if a tenant has a specific module enabled.
     */
    public function tenantHasModule(string $tenantId, string $moduleKey): bool
    {
        $features = $this->getTenantFeatures($tenantId);
        return in_array($moduleKey, $features['modules'], true);
    }

    // ─── Enable/Disable with Dependency Resolution ─────────────

    /**
     * Enable a module for a tenant (with auto-dependency resolution).
     * @return string[] List of all modules that were enabled (including dependencies)
     */
    public function enableModule(string $tenantId, string $moduleKey, ?string $actorId = null): array
    {
        $module = $this->getModule($moduleKey);
        if ($module === null) {
            throw new \RuntimeException("Module '{$moduleKey}' does not exist");
        }

        // Resolve dependencies (recursive)
        $toEnable = $this->resolveDependencies($moduleKey);
        $toEnable[] = $moduleKey;
        $toEnable = array_unique($toEnable);

        // Update tenant's enabled_modules
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        $current = $tenant->getEnabledModules();
        $added = [];

        foreach ($toEnable as $key) {
            if (!in_array($key, $current, true)) {
                $current[] = $key;
                $added[] = $key;
            }
        }

        $tenant->setEnabledModules($current);

        // Create/update override records for explicitly enabled modules
        $this->setOverride($tenantId, $moduleKey, true, $actorId, 'Manually enabled');

        $this->em->flush();

        return $added;
    }

    /**
     * Disable a module for a tenant (with reverse-dependency check).
     * @return string[] List of modules that were also disabled (dependents)
     */
    public function disableModule(string $tenantId, string $moduleKey, ?string $actorId = null): array
    {
        $module = $this->getModule($moduleKey);
        if ($module === null) {
            throw new \RuntimeException("Module '{$moduleKey}' does not exist");
        }

        if ($module->isCore()) {
            throw new \RuntimeException("Cannot disable core module '{$moduleKey}'");
        }

        // Find modules that depend on this one (cascade disable)
        $toDisable = $this->resolveReverseDependencies($moduleKey);
        $toDisable[] = $moduleKey;
        $toDisable = array_unique($toDisable);

        // Filter out core modules from disable list
        $coreKeys = $this->getCoreModuleKeys();
        $toDisable = array_values(array_filter(
            $toDisable,
            fn(string $k) => !in_array($k, $coreKeys, true)
        ));

        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        $current = $tenant->getEnabledModules();
        $removed = [];

        foreach ($toDisable as $key) {
            if (in_array($key, $current, true)) {
                $current = array_values(array_filter($current, fn(string $k) => $k !== $key));
                $removed[] = $key;
            }
        }

        $tenant->setEnabledModules($current);
        $this->setOverride($tenantId, $moduleKey, false, $actorId, 'Manually disabled');

        // Also remove force-enable overrides for cascade-disabled modules
        foreach ($removed as $key) {
            if ($key !== $moduleKey) {
                $existingOverride = $this->em->getRepository(TenantFeatureModule::class)
                    ->findOneBy(['tenantId' => $tenantId, 'moduleKey' => $key]);
                if ($existingOverride !== null && $existingOverride->isEnabled()) {
                    $existingOverride->setIsEnabled(false);
                    $existingOverride->setChangedBy($actorId);
                    $existingOverride->setReason('Cascade-disabled (dependency of ' . $moduleKey . ')');
                }
            }
        }

        $this->em->flush();

        return $removed;
    }

    // ─── Dependency Resolution ─────────────────────────────────

    /**
     * Resolve all dependencies for a module (recursive, depth-first).
     * @return string[] Module keys that must be enabled first
     */
    public function resolveDependencies(string $moduleKey, array &$visited = []): array
    {
        if (in_array($moduleKey, $visited, true)) {
            return []; // Circular dependency guard
        }
        $visited[] = $moduleKey;

        $module = $this->getModule($moduleKey);
        if ($module === null) {
            return [];
        }

        $result = [];
        foreach ($module->getDependencies() as $depKey) {
            $result = array_merge($result, $this->resolveDependencies($depKey, $visited));
            $result[] = $depKey;
        }

        return array_unique($result);
    }

    /**
     * Resolve all reverse dependencies (modules that depend on the given one).
     * @return string[] Module keys that must be disabled too
     */
    public function resolveReverseDependencies(string $moduleKey, array &$visited = []): array
    {
        if (in_array($moduleKey, $visited, true)) {
            return [];
        }
        $visited[] = $moduleKey;

        $module = $this->getModule($moduleKey);
        if ($module === null) {
            return [];
        }

        $result = [];
        foreach ($module->getRequiredBy() as $depKey) {
            $result = array_merge($result, $this->resolveReverseDependencies($depKey, $visited));
            $result[] = $depKey;
        }

        return array_unique($result);
    }

    /**
     * Given a list of module keys, resolve all dependencies and return the full set.
     * Used by plan creation to auto-include dependencies.
     * @return string[]
     */
    public function resolveAllDependencies(array $moduleKeys): array
    {
        $result = $moduleKeys;
        foreach ($moduleKeys as $key) {
            $deps = $this->resolveDependencies($key);
            $result = array_merge($result, $deps);
        }
        return array_values(array_unique($result));
    }

    // ─── Plan Duplicate ────────────────────────────────────────

    /**
     * Duplicate a subscription plan for the admin.
     */
    public function duplicatePlan(string $planId): \Lodgik\Entity\SubscriptionPlan
    {
        $original = $this->em->find(\Lodgik\Entity\SubscriptionPlan::class, $planId);
        if ($original === null) {
            throw new \RuntimeException('Plan not found');
        }

        $clone = new \Lodgik\Entity\SubscriptionPlan(
            $original->getName() . ' (Copy)',
            $original->getTier() . '_copy_' . substr(bin2hex(random_bytes(3)), 0, 6),
            $original->getMonthlyPrice(),
            $original->getAnnualPrice(),
            $original->getMaxRooms(),
            $original->getMaxStaff(),
            $original->getIncludedModules(),
        );
        $clone->setDescription($original->getDescription());
        $clone->setMaxProperties($original->getMaxProperties());
        $clone->setFeatureFlags($original->getFeatureFlags());
        $clone->setTrialDays($original->getTrialDays());
        $clone->setIsPublic(false); // Draft
        $clone->setSortOrder($original->getSortOrder() + 1);

        $this->em->persist($clone);
        $this->em->flush();

        return $clone;
    }

    // ─── Helpers ───────────────────────────────────────────────

    /**
     * @return string[]
     */
    private function getCoreModuleKeys(): array
    {
        $cores = $this->em->getRepository(FeatureModule::class)
            ->findBy(['isCore' => true, 'isActive' => true]);
        return array_map(fn(FeatureModule $m) => $m->getModuleKey(), $cores);
    }

    /**
     * @return TenantFeatureModule[]
     */
    private function getTenantOverrides(string $tenantId): array
    {
        return $this->em->getRepository(TenantFeatureModule::class)
            ->findBy(['tenantId' => $tenantId]);
    }

    private function setOverride(
        string $tenantId,
        string $moduleKey,
        bool $enabled,
        ?string $actorId,
        ?string $reason,
    ): void {
        $existing = $this->em->getRepository(TenantFeatureModule::class)
            ->findOneBy(['tenantId' => $tenantId, 'moduleKey' => $moduleKey]);

        if ($existing !== null) {
            $existing->setIsEnabled($enabled);
            $existing->setChangedBy($actorId);
            $existing->setReason($reason);
        } else {
            $override = new TenantFeatureModule($tenantId, $moduleKey, $enabled);
            $override->setChangedBy($actorId);
            $override->setReason($reason);
            $this->em->persist($override);
        }
    }

    /**
     * Check if a tier meets a minimum tier requirement.
     */
    public static function tierMeetsMinimum(string $tenantTier, string $minTier): bool
    {
        $order = self::TIER_ORDER;
        return ($order[$tenantTier] ?? 0) >= ($order[$minTier] ?? 0);
    }
}
