<?php

declare(strict_types=1);

namespace Lodgik\Module\Admin;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\AppRelease;
use Lodgik\Entity\FeatureModule;
use Lodgik\Entity\SubscriptionPlan;
use Lodgik\Entity\Tenant;
use Lodgik\Entity\User;
use Lodgik\Entity\WhatsAppMessage;
use Lodgik\Entity\WhatsAppTemplate;
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
        private readonly \Lodgik\Service\JwtService $jwt,
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
        if ($dto->paystackPlanCodeMonthly) $plan->setPaystackPlanCodeMonthly($dto->paystackPlanCodeMonthly);
        if ($dto->paystackPlanCodeAnnual) $plan->setPaystackPlanCodeAnnual($dto->paystackPlanCodeAnnual);

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
        if (isset($data['paystack_plan_code_monthly'])) $plan->setPaystackPlanCodeMonthly($data['paystack_plan_code_monthly'] ?: null);
        if (isset($data['paystack_plan_code_annual'])) $plan->setPaystackPlanCodeAnnual($data['paystack_plan_code_annual'] ?: null);

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
        $conn = $this->em->getConnection();

        // ─── Tenant counts ────────────────────────────────────
        $tenantCount = (int) $conn->fetchOne('SELECT COUNT(*) FROM tenants');
        $activeTenants = (int) $conn->fetchOne("SELECT COUNT(*) FROM tenants WHERE is_active = true");
        $trialTenants = (int) $conn->fetchOne("SELECT COUNT(*) FROM tenants WHERE subscription_status = 'trial'");

        // Tenants by status
        $statusRows = $conn->fetchAllAssociative("SELECT subscription_status, COUNT(*) as cnt FROM tenants GROUP BY subscription_status");
        $tenantsByStatus = [];
        foreach ($statusRows as $r) $tenantsByStatus[$r['subscription_status']] = (int) $r['cnt'];

        // ─── User & property counts ──────────────────────────
        $totalUsers = (int) $conn->fetchOne('SELECT COUNT(*) FROM users');
        $totalProperties = (int) $conn->fetchOne('SELECT COUNT(*) FROM properties');
        $planCount = (int) $conn->fetchOne("SELECT COUNT(*) FROM subscription_plans WHERE is_active = true");

        // ─── Merchant counts ─────────────────────────────────
        $totalMerchants = (int) $conn->fetchOne('SELECT COUNT(*) FROM merchants');
        $activeMerchants = (int) $conn->fetchOne("SELECT COUNT(*) FROM merchants WHERE status = 'active'");
        $pendingMerchants = (int) $conn->fetchOne("SELECT COUNT(*) FROM merchants WHERE status IN ('pending_approval', 'kyc_in_progress')");

        // ─── MRR (monthly recurring revenue) ─────────────────
        // Count active tenants per plan and multiply by plan price
        $mrrRows = $conn->fetchAllAssociative("
            SELECT sp.name, sp.monthly_price, COUNT(t.id) as tenant_count
            FROM tenants t
            JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
            WHERE t.subscription_status = 'active' AND sp.is_active = true
            GROUP BY sp.id, sp.name, sp.monthly_price
        ");
        $mrr = 0;
        $revenueByPlan = [];
        foreach ($mrrRows as $r) {
            $planRevenue = (int) $r['monthly_price'] * (int) $r['tenant_count'];
            $mrr += $planRevenue;
            $revenueByPlan[] = ['name' => $r['name'], 'revenue' => $planRevenue, 'tenants' => (int) $r['tenant_count']];
        }

        // ─── Monthly trend (last 6 months) ───────────────────
        $monthlyTrend = $conn->fetchAllAssociative("
            SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
                   COUNT(*) as signups
            FROM tenants
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY month
        ");
        // Add revenue estimate per month
        foreach ($monthlyTrend as &$m) {
            $m['signups'] = (int) $m['signups'];
            $m['revenue'] = $m['signups'] * ($mrr > 0 && $activeTenants > 0 ? (int) ($mrr / $activeTenants) : 0);
        }

        // ─── Recent tenants (last 10) ────────────────────────
        $recentRows = $conn->fetchAllAssociative("
            SELECT t.id, t.name, t.email, t.subscription_status,
                   t.created_at, sp.name as plan_name
            FROM tenants t
            LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
            ORDER BY t.created_at DESC LIMIT 10
        ");
        $recentTenants = [];
        foreach ($recentRows as $r) {
            $recentTenants[] = [
                'id' => $r['id'],
                'name' => $r['name'],
                'email' => $r['email'],
                'subscription_status' => $r['subscription_status'],
                'plan_name' => $r['plan_name'] ?? 'None',
                'created_at' => $r['created_at'],
            ];
        }

        // ─── Sparkline data (weekly signups last 7 weeks) ────
        $tenantSpark = [];
        for ($i = 6; $i >= 0; $i--) {
            $count = (int) $conn->fetchOne("
                SELECT COUNT(*) FROM tenants
                WHERE created_at >= NOW() - INTERVAL '{$i} weeks' - INTERVAL '1 week'
                  AND created_at < NOW() - INTERVAL '{$i} weeks'
            ");
            $tenantSpark[] = $count;
        }

        return [
            'total_tenants' => $tenantCount,
            'active_tenants' => $activeTenants,
            'trial_tenants' => $trialTenants,
            'active_plans' => $planCount,
            'total_users' => $totalUsers,
            'total_properties' => $totalProperties,
            'total_plans' => $planCount,
            'total_merchants' => $totalMerchants,
            'active_merchants' => $activeMerchants,
            'pending_merchants' => $pendingMerchants,
            'mrr' => $mrr,
            'tenants_by_status' => $tenantsByStatus,
            'revenue_by_plan' => $revenueByPlan,
            'monthly_trend' => $monthlyTrend,
            'recent_tenants' => $recentTenants,
            'tenant_trend' => array_map('intval', $tenantSpark ?: []),
        ];
    }

    // ─── Tenant detail ─────────────────────────────────────────

    public function getTenantUsage(string $tenantId): array
    {
        $tenant = $this->em->find(Tenant::class, $tenantId);
        if (!$tenant) throw new \RuntimeException('Tenant not found');
        $rooms = (int) $this->em->createQuery("SELECT COUNT(r) FROM Lodgik\\Entity\\Room r WHERE r.tenantId = :t")->setParameter('t', $tenantId)->getSingleScalarResult();
        $staff = (int) $this->em->createQuery("SELECT COUNT(u) FROM Lodgik\\Entity\\User u WHERE u.tenantId = :t AND u.isActive = true")->setParameter('t', $tenantId)->getSingleScalarResult();
        $props = (int) $this->em->createQuery("SELECT COUNT(p) FROM Lodgik\\Entity\\Property p WHERE p.tenantId = :t")->setParameter('t', $tenantId)->getSingleScalarResult();
        return [
            'rooms' => ['used' => $rooms, 'limit' => $tenant->getMaxRooms(), 'percent' => $tenant->getMaxRooms() > 0 ? round($rooms / $tenant->getMaxRooms() * 100) : 0],
            'staff' => ['used' => $staff, 'limit' => $tenant->getMaxStaff(), 'percent' => $tenant->getMaxStaff() > 0 ? round($staff / $tenant->getMaxStaff() * 100) : 0],
            'properties' => ['used' => $props, 'limit' => $tenant->getMaxProperties(), 'percent' => $tenant->getMaxProperties() > 0 ? round($props / $tenant->getMaxProperties() * 100) : 0],
        ];
    }

    public function getTenantFeatures(string $tenantId): array
    {
        $tenant = $this->em->find(Tenant::class, $tenantId);
        if (!$tenant) throw new \RuntimeException('Tenant not found');
        $allModules = $this->em->getRepository(FeatureModule::class)->findBy(['isActive' => true], ['sortOrder' => 'ASC']);
        $enabled = $tenant->getEnabledModules();
        $modules = array_map(fn($m) => ['module_key' => $m->getModuleKey(), 'name' => $m->getName(), 'category' => $m->getCategory(), 'is_core' => $m->isCore(), 'is_enabled' => in_array($m->getModuleKey(), $enabled), 'icon' => $m->getIcon()], $allModules);
        return ['modules' => $modules, 'enabled_modules' => $enabled, 'enabled_count' => count($enabled), 'total_modules' => count($allModules)];
    }

    public function setTenantFeature(string $tenantId, string $moduleKey, bool $enable): void
    {
        $tenant = $this->em->find(Tenant::class, $tenantId);
        if (!$tenant) throw new \RuntimeException('Tenant not found');
        $enable ? $tenant->enableModule($moduleKey) : $tenant->disableModule($moduleKey);
        $this->em->flush();
    }

    public function impersonateTenant(string $tenantId, string $adminUserId): array
    {
        $tenant = $this->em->find(Tenant::class, $tenantId);
        if (!$tenant) throw new \RuntimeException('Tenant not found');

        // Find property admin user for this tenant
        $filters = $this->em->getFilters();
        $wasEnabled = $filters->isEnabled('tenant_filter');
        if ($wasEnabled) $filters->disable('tenant_filter');

        $user = $this->em->getRepository(User::class)->findOneBy([
            'tenantId' => $tenantId,
            'role' => \Lodgik\Enum\UserRole::PROPERTY_ADMIN,
        ]);

        if ($wasEnabled) $filters->enable('tenant_filter');

        if (!$user) throw new \RuntimeException('No admin user found for this tenant');

        // Generate real JWT for the hotel app
        $accessToken = $this->jwt->createAccessToken($user->getJwtClaims());
        $rawRefresh = bin2hex(random_bytes(32));
        $refreshEntity = new \Lodgik\Entity\RefreshToken(
            userId: $user->getId(),
            tokenHash: \Lodgik\Entity\RefreshToken::hashToken($rawRefresh),
            expiresAt: new \DateTimeImmutable('+2 hours'),
            deviceInfo: 'admin-impersonation',
        );
        $this->em->persist($refreshEntity);
        $this->em->flush();

        $hotelAppUrl = $_ENV['HOTEL_APP_URL'] ?? 'https://app.lodgik.co';

        return [
            'user' => $user->toArray(),
            'tenant' => ['id' => $tenant->getId(), 'name' => $tenant->getName()],
            'access_token' => $accessToken,
            'refresh_token' => $rawRefresh,
            'impersonated_by' => $adminUserId,
            'redirect_url' => rtrim($hotelAppUrl, '/') . '/auth/impersonate?token=' . urlencode($accessToken) . '&refresh=' . urlencode($rawRefresh),
        ];
    }

    // ─── Platform settings ─────────────────────────────────────

    public function getSettings(): array
    {
        $zeptoConfigured = !empty($_ENV['ZEPTOMAIL_API_KEY'] ?? '');
        $termiiConfigured = !empty($_ENV['TERMII_API_KEY'] ?? '');
        $paystackConfigured = !empty($_ENV['PAYSTACK_SECRET_KEY'] ?? '');
        return [
            'base_url' => $_ENV['APP_URL'] ?? 'http://localhost:8080',
            'zeptomail_configured' => $zeptoConfigured,
            'termii_configured' => $termiiConfigured,
            'paystack_configured' => $paystackConfigured,
            'zeptomail' => ['from_email' => $_ENV['ZEPTOMAIL_FROM_EMAIL'] ?? '', 'from_name' => $_ENV['ZEPTOMAIL_FROM_NAME'] ?? ''],
            'termii' => ['sender_id' => $_ENV['TERMII_SENDER_ID'] ?? 'Lodgik', 'default_channel' => 'whatsapp'],
            'defaults' => ['trial_days' => (int) ($_ENV['DEFAULT_TRIAL_DAYS'] ?? 14), 'default_max_rooms' => 10, 'default_max_staff' => 5, 'default_currency' => 'NGN'],
            'feature_flags' => ['allow_self_registration' => true, 'require_email_verification' => false, 'enable_whatsapp' => $termiiConfigured, 'enable_sms_otp' => false, 'maintenance_mode' => false, 'enable_app_updates' => true],
        ];
    }

    public function updateSettings(array $data): void { /* Settings stored in env/cache — placeholder for DB-backed settings */ }
    public function sendTestEmail(): bool { return true; }
    public function sendTestSms(): bool { return true; }

    // ─── Analytics ─────────────────────────────────────────────

    public function getAnalytics(int $days = 30): array
    {
        $stats = $this->getDashboardStats();
        $totalBookings = (int) $this->em->createQuery("SELECT COUNT(b) FROM Lodgik\\Entity\\Booking b")->getSingleScalarResult();
        $totalRooms = (int) $this->em->createQuery("SELECT COUNT(r) FROM Lodgik\\Entity\\Room r")->getSingleScalarResult();
        return array_merge($stats, [
            'total_bookings' => $totalBookings,
            'total_rooms' => $totalRooms,
            'mrr' => 0,
            'growth_trend' => [],
            'booking_trend' => [],
            'feature_adoption' => [],
            'revenue_by_plan' => [],
            'tenants_by_tier' => [],
            'top_tenants' => [],
        ]);
    }

    // ─── WhatsApp ──────────────────────────────────────────────

    public function getWhatsAppConfig(): array
    {
        return ['api_key' => '', 'sender_id' => $_ENV['TERMII_SENDER_ID'] ?? 'Lodgik', 'channel' => 'whatsapp', 'webhook_url' => '/api/webhooks/whatsapp', 'is_configured' => !empty($_ENV['TERMII_API_KEY'] ?? '')];
    }
    public function updateWhatsAppConfig(array $data): void { }
    public function getWhatsAppStats(): array { return ['messages_30d' => 0, 'delivered' => 0, 'failed' => 0]; }
    public function getWhatsAppTemplates(): array
    {
        $templates = $this->em->getRepository(WhatsAppTemplate::class)->findAll();
        return array_map(fn($t) => $t->toArray(), $templates);
    }
    public function createWhatsAppTemplate(array $data): WhatsAppTemplate
    {
        $t = new WhatsAppTemplate();
        $t->setName($data['name'] ?? '');
        $t->setBody($data['body'] ?? '');
        $t->setMessageType($data['message_type'] ?? 'custom');
        $t->setTenantId('platform');
        $this->em->persist($t);
        $this->em->flush();
        return $t;
    }
    public function getWhatsAppLogs(): array
    {
        $msgs = $this->em->getRepository(WhatsAppMessage::class)->findBy([], ['createdAt' => 'DESC'], 100);
        return array_map(fn($m) => $m->toArray(), $msgs);
    }
    public function sendTestWhatsApp(): bool { return true; }

    // ─── App releases ──────────────────────────────────────────

    public function listAppReleases(?string $appType = null): array
    {
        $criteria = $appType ? ['appType' => $appType] : [];
        $releases = $this->em->getRepository(AppRelease::class)->findBy($criteria, ['createdAt' => 'DESC'], 100);
        return array_map(fn($r) => $r->toArray(), $releases);
    }

    public function createAppRelease(array $data, ?string $userId = null): AppRelease
    {
        $r = new AppRelease();
        $r->setAppType($data['app_type'] ?? 'android');
        $r->setVersion($data['version'] ?? '0.0.1');
        $r->setBuildNumber((int) ($data['build_number'] ?? 1));
        $r->setReleaseNotes($data['release_notes'] ?? null);
        $r->setMinOsVersion($data['min_os_version'] ?? null);
        $r->setIsMandatory((bool) ($data['is_mandatory'] ?? false));
        $r->setDownloadUrl($data['download_url'] ?? null);
        if ($userId) $r->setUploadedBy($userId);
        $this->em->persist($r);
        $this->em->flush();
        return $r;
    }

    public function publishRelease(string $id): AppRelease
    {
        $r = $this->em->find(AppRelease::class, $id);
        if (!$r) throw new \RuntimeException('Release not found');
        $r->setStatus('published');
        $r->setPublishedAt(new \DateTimeImmutable());
        $r->setIsLatest(true);
        $this->em->flush();
        return $r;
    }

    public function deprecateRelease(string $id): AppRelease
    {
        $r = $this->em->find(AppRelease::class, $id);
        if (!$r) throw new \RuntimeException('Release not found');
        $r->setStatus('deprecated');
        $this->em->flush();
        return $r;
    }

    public function duplicatePlan(string $id): SubscriptionPlan
    {
        $original = $this->getPlan($id);
        if (!$original) throw new \RuntimeException('Plan not found');
        $dto = new CreatePlanRequest(['name' => $original->getName() . ' (Copy)', 'tier' => $original->getTier(), 'monthly_price' => $original->getMonthlyPrice(), 'annual_price' => $original->getAnnualPrice(), 'max_rooms' => $original->getMaxRooms(), 'max_staff' => $original->getMaxStaff(), 'max_properties' => $original->getMaxProperties(), 'included_modules' => $original->getIncludedModules(), 'is_public' => false, 'trial_days' => $original->getTrialDays()]);
        return $this->createPlan($dto);
    }

    public function getAppAnalytics(): array
    {
        return ['total_downloads' => 0, 'active_installations' => 0, 'by_type' => []];
    }
}
