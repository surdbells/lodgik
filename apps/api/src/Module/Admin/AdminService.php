<?php

declare(strict_types=1);

namespace Lodgik\Module\Admin;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\SubscriptionPlan;
use Lodgik\Entity\Tenant;
use Lodgik\Enum\SubscriptionStatus;
use Lodgik\Module\Admin\DTO\CreatePlanRequest;
use Lodgik\Repository\SubscriptionPlanRepository;
use Lodgik\Repository\TenantRepository;

final class AdminService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantRepository $tenantRepo,
        private readonly SubscriptionPlanRepository $planRepo,
    ) {}

    // ─── Tenants ───────────────────────────────────────────────

    /**
     * List all tenants (super admin view, bypasses tenant filter).
     *
     * @return array{items: Tenant[], total: int}
     */
    public function listTenants(
        ?string $search = null,
        ?string $status = null,
        int $page = 1,
        int $limit = 20,
    ): array {
        $qb = $this->em->createQueryBuilder()
            ->select('t')
            ->from(Tenant::class, 't')
            ->orderBy('t.createdAt', 'DESC');

        if ($search !== null && trim($search) !== '') {
            $qb->andWhere('(LOWER(t.name) LIKE :search OR LOWER(t.email) LIKE :search OR LOWER(t.slug) LIKE :search)')
                ->setParameter('search', '%' . strtolower(trim($search)) . '%');
        }

        if ($status !== null) {
            $qb->andWhere('t.subscriptionStatus = :status')
                ->setParameter('status', $status);
        }

        // Count
        $countQb = clone $qb;
        $countQb->select('COUNT(t.id)')->resetDQLPart('orderBy');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        // Paginate
        $qb->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);
        $items = $qb->getQuery()->getResult();

        return ['items' => $items, 'total' => $total];
    }

    /**
     * Get tenant details (super admin can see any tenant).
     */
    public function getTenant(string $id): ?Tenant
    {
        return $this->tenantRepo->find($id);
    }

    /**
     * Activate/deactivate a tenant.
     */
    public function setTenantActive(string $tenantId, bool $active): Tenant
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        $tenant->setIsActive($active);
        $this->em->flush();

        return $tenant;
    }

    /**
     * Assign a subscription plan to a tenant.
     */
    public function assignPlan(string $tenantId, string $planId): Tenant
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        $plan = $this->planRepo->find($planId);
        if ($plan === null) {
            throw new \RuntimeException('Plan not found');
        }

        $tenant->setSubscriptionPlanId($plan->getId());
        $tenant->setSubscriptionStatus(SubscriptionStatus::ACTIVE);
        $tenant->setSubscriptionEndsAt(new \DateTimeImmutable('+30 days'));
        $tenant->setMaxRooms($plan->getMaxRooms());
        $tenant->setMaxStaff($plan->getMaxStaff());
        $tenant->setMaxProperties($plan->getMaxProperties());
        $tenant->setEnabledModules($plan->getIncludedModules());

        $this->em->flush();

        return $tenant;
    }

    // ─── Subscription Plans ────────────────────────────────────

    /**
     * @return SubscriptionPlan[]
     */
    public function listPlans(): array
    {
        return $this->planRepo->findAll();
    }

    /**
     * @return SubscriptionPlan[]
     */
    public function listPublicPlans(): array
    {
        return $this->planRepo->findPublicActive();
    }

    public function getPlan(string $id): ?SubscriptionPlan
    {
        return $this->planRepo->find($id);
    }

    public function createPlan(CreatePlanRequest $dto): SubscriptionPlan
    {
        // Check tier uniqueness
        $existing = $this->planRepo->findByTier($dto->tier);
        if ($existing !== null) {
            throw new \RuntimeException("A plan with tier '{$dto->tier}' already exists");
        }

        $plan = new SubscriptionPlan(
            $dto->name,
            $dto->tier,
            $dto->monthlyPrice,
            $dto->annualPrice,
            $dto->maxRooms,
            $dto->maxStaff,
            $dto->includedModules,
        );
        $plan->setDescription($dto->description);
        $plan->setCurrency($dto->currency);
        $plan->setMaxProperties($dto->maxProperties);
        $plan->setFeatureFlags($dto->featureFlags);
        $plan->setIsPublic($dto->isPublic);
        $plan->setForTenantId($dto->forTenantId);
        $plan->setTrialDays($dto->trialDays);
        $plan->setSortOrder($dto->sortOrder);

        $this->em->persist($plan);
        $this->em->flush();

        return $plan;
    }

    public function updatePlan(string $id, array $data): SubscriptionPlan
    {
        $plan = $this->planRepo->find($id);
        if ($plan === null) {
            throw new \RuntimeException('Plan not found');
        }

        if (isset($data['name'])) $plan->setName($data['name']);
        if (isset($data['description'])) $plan->setDescription($data['description']);
        if (isset($data['monthly_price'])) $plan->setMonthlyPrice((int) $data['monthly_price']);
        if (isset($data['annual_price'])) $plan->setAnnualPrice((int) $data['annual_price']);
        if (isset($data['max_rooms'])) $plan->setMaxRooms((int) $data['max_rooms']);
        if (isset($data['max_staff'])) $plan->setMaxStaff((int) $data['max_staff']);
        if (isset($data['max_properties'])) $plan->setMaxProperties((int) $data['max_properties']);
        if (isset($data['included_modules'])) $plan->setIncludedModules($data['included_modules']);
        if (isset($data['feature_flags'])) $plan->setFeatureFlags($data['feature_flags']);
        if (isset($data['is_public'])) $plan->setIsPublic((bool) $data['is_public']);
        if (isset($data['is_active'])) $plan->setIsActive((bool) $data['is_active']);
        if (isset($data['sort_order'])) $plan->setSortOrder((int) $data['sort_order']);
        if (isset($data['trial_days'])) $plan->setTrialDays((int) $data['trial_days']);

        $this->em->flush();

        return $plan;
    }

    public function deletePlan(string $id): void
    {
        $plan = $this->planRepo->find($id);
        if ($plan === null) {
            throw new \RuntimeException('Plan not found');
        }

        $plan->setIsActive(false);
        $this->em->flush();
    }

    // ─── Dashboard Stats ───────────────────────────────────────

    public function getDashboardStats(): array
    {
        $tenantCount = (int) $this->em->createQueryBuilder()
            ->select('COUNT(t.id)')
            ->from(Tenant::class, 't')
            ->getQuery()->getSingleScalarResult();

        $activeTenants = (int) $this->em->createQueryBuilder()
            ->select('COUNT(t.id)')
            ->from(Tenant::class, 't')
            ->where('t.isActive = true')
            ->getQuery()->getSingleScalarResult();

        $trialTenants = (int) $this->em->createQueryBuilder()
            ->select('COUNT(t.id)')
            ->from(Tenant::class, 't')
            ->where('t.subscriptionStatus = :status')
            ->setParameter('status', 'trial')
            ->getQuery()->getSingleScalarResult();

        $planCount = (int) $this->em->createQueryBuilder()
            ->select('COUNT(p.id)')
            ->from(SubscriptionPlan::class, 'p')
            ->where('p.isActive = true')
            ->getQuery()->getSingleScalarResult();

        return [
            'total_tenants' => $tenantCount,
            'active_tenants' => $activeTenants,
            'trial_tenants' => $trialTenants,
            'active_plans' => $planCount,
        ];
    }
}
