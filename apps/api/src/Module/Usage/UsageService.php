<?php

declare(strict_types=1);

namespace Lodgik\Module\Usage;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\TenantUsageMetric;
use Lodgik\Entity\Tenant;
use Lodgik\Repository\TenantRepository;

final class UsageService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantRepository $tenantRepo,
    ) {}

    /**
     * Get current (live) usage for a tenant.
     */
    public function getCurrentUsage(string $tenantId): array
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        $conn = $this->em->getConnection();

        // Count active staff (users)
        $staffUsed = (int) $conn->fetchOne(
            "SELECT COUNT(*) FROM users WHERE tenant_id = ? AND is_active = true AND deleted_at IS NULL AND role != 'super_admin'",
            [$tenantId]
        );

        // Count active properties
        $propertiesUsed = (int) $conn->fetchOne(
            "SELECT COUNT(*) FROM properties WHERE tenant_id = ? AND is_active = true AND deleted_at IS NULL",
            [$tenantId]
        );

        // Count rooms (table doesn't exist yet in Phase 0 — will be 0 until Phase 1)
        $roomsUsed = 0;
        try {
            $roomsUsed = (int) $conn->fetchOne(
                "SELECT COUNT(*) FROM rooms WHERE tenant_id = ? AND is_active = true AND deleted_at IS NULL",
                [$tenantId]
            );
        } catch (\Throwable) {
            // rooms table doesn't exist yet
        }

        $enabledModules = $tenant->getEnabledModules();

        return [
            'tenant_id' => $tenantId,
            'rooms' => [
                'used' => $roomsUsed,
                'limit' => $tenant->getMaxRooms(),
                'percent' => $tenant->getMaxRooms() > 0 ? round($roomsUsed / $tenant->getMaxRooms() * 100, 1) : 0,
                'available' => max(0, $tenant->getMaxRooms() - $roomsUsed),
            ],
            'staff' => [
                'used' => $staffUsed,
                'limit' => $tenant->getMaxStaff(),
                'percent' => $tenant->getMaxStaff() > 0 ? round($staffUsed / $tenant->getMaxStaff() * 100, 1) : 0,
                'available' => max(0, $tenant->getMaxStaff() - $staffUsed),
            ],
            'properties' => [
                'used' => $propertiesUsed,
                'limit' => $tenant->getMaxProperties(),
                'percent' => $tenant->getMaxProperties() > 0 ? round($propertiesUsed / $tenant->getMaxProperties() * 100, 1) : 0,
                'available' => max(0, $tenant->getMaxProperties() - $propertiesUsed),
            ],
            'modules' => [
                'enabled' => count($enabledModules),
                'list' => $enabledModules,
            ],
        ];
    }

    /**
     * Get usage limits for a tenant (plan-defined).
     */
    public function getLimits(string $tenantId): array
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        $planId = $tenant->getSubscriptionPlanId();
        $plan = $planId ? $this->em->find(\Lodgik\Entity\SubscriptionPlan::class, $planId) : null;

        return [
            'tenant_id' => $tenantId,
            'plan' => $plan ? [
                'id' => $plan->getId(),
                'name' => $plan->getName(),
                'tier' => $plan->getTier(),
            ] : null,
            'limits' => [
                'max_rooms' => $tenant->getMaxRooms(),
                'max_staff' => $tenant->getMaxStaff(),
                'max_properties' => $tenant->getMaxProperties(),
            ],
            'modules' => $tenant->getEnabledModules(),
            'subscription_status' => $tenant->getSubscriptionStatus()->value,
        ];
    }

    /**
     * Get usage history (from daily snapshots).
     */
    public function getHistory(string $tenantId, int $days = 30): array
    {
        $since = (new \DateTimeImmutable())->modify("-{$days} days");

        $metrics = $this->em->getRepository(TenantUsageMetric::class)
            ->findBy(
                ['tenantId' => $tenantId],
                ['recordedDate' => 'DESC'],
                $days,
            );

        // Filter to date range in PHP (simpler than DQL for now)
        $metrics = array_filter($metrics, fn(TenantUsageMetric $m) => $m->getRecordedDate() >= $since);

        return [
            'tenant_id' => $tenantId,
            'period_days' => $days,
            'data_points' => count($metrics),
            'history' => array_map(fn(TenantUsageMetric $m) => [
                'date' => $m->getRecordedDate()->format('Y-m-d'),
                'rooms' => ['used' => $m->getRoomsUsed(), 'limit' => $m->getRoomsLimit(), 'percent' => $m->getRoomsPercent()],
                'staff' => ['used' => $m->getStaffUsed(), 'limit' => $m->getStaffLimit(), 'percent' => $m->getStaffPercent()],
                'properties' => ['used' => $m->getPropertiesUsed(), 'limit' => $m->getPropertiesLimit(), 'percent' => $m->getPropertiesPercent()],
                'bookings' => $m->getBookingsCount(),
                'guests' => $m->getGuestsCount(),
                'api_calls' => $m->getApiCallsCount(),
            ], array_values($metrics)),
        ];
    }

    /**
     * Record a daily usage snapshot (called by cron).
     */
    public function recordDailySnapshot(string $tenantId): TenantUsageMetric
    {
        $usage = $this->getCurrentUsage($tenantId);
        $tenant = $this->tenantRepo->find($tenantId);

        $date = new \DateTimeImmutable('today');

        // Check if already recorded today
        $existing = $this->em->getRepository(TenantUsageMetric::class)
            ->findOneBy(['tenantId' => $tenantId, 'recordedDate' => $date]);

        if ($existing !== null) {
            // Update existing
            $existing->setRoomsUsed($usage['rooms']['used']);
            $existing->setStaffUsed($usage['staff']['used']);
            $existing->setPropertiesUsed($usage['properties']['used']);
            $existing->setActiveModulesCount($usage['modules']['enabled']);
            $this->em->flush();
            return $existing;
        }

        $metric = new TenantUsageMetric(
            $tenantId,
            $date,
            $tenant->getMaxRooms(),
            $tenant->getMaxStaff(),
            $tenant->getMaxProperties(),
        );
        $metric->setRoomsUsed($usage['rooms']['used']);
        $metric->setStaffUsed($usage['staff']['used']);
        $metric->setPropertiesUsed($usage['properties']['used']);
        $metric->setActiveModulesCount($usage['modules']['enabled']);

        $this->em->persist($metric);
        $this->em->flush();

        return $metric;
    }
}
