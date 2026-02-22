<?php

declare(strict_types=1);

namespace Lodgik\Module\Admin;

use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Module\Admin\DTO\CreatePlanRequest;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminController
{
    public function __construct(
        private readonly AdminService $adminService,
        private readonly ResponseHelper $response,
    ) {}

    // ─── Dashboard ─────────────────────────────────────────────

    /** GET /api/admin/dashboard */
    public function dashboard(Request $request, Response $response): Response
    {
        $stats = $this->adminService->getDashboardStats();
        return $this->response->success($response, $stats);
    }

    // ─── Tenants ───────────────────────────────────────────────

    /** GET /api/admin/tenants */
    public function listTenants(Request $request, Response $response): Response
    {
        $pagination = PaginationHelper::fromRequest($request);
        $search = PaginationHelper::searchFromRequest($request);
        $filters = PaginationHelper::filtersFromRequest($request, ['status']);

        $result = $this->adminService->listTenants(
            search: $search,
            status: $filters['status'] ?? null,
            page: $pagination['page'],
            limit: $pagination['limit'],
        );

        $items = array_map(fn($t) => $this->serializeTenantAdmin($t), $result['items']);

        return $this->response->paginated(
            $response, $items, $result['total'],
            $pagination['page'], $pagination['limit'],
        );
    }

    /** GET /api/admin/tenants/{id} */
    public function showTenant(Request $request, Response $response, array $args): Response
    {
        $tenant = $this->adminService->getTenant($args['id']);
        if ($tenant === null) {
            return $this->response->notFound($response, 'Tenant not found');
        }

        return $this->response->success($response, $this->serializeTenantAdmin($tenant));
    }

    /** PATCH /api/admin/tenants/{id}/activate */
    public function activateTenant(Request $request, Response $response, array $args): Response
    {
        try {
            $tenant = $this->adminService->setTenantActive($args['id'], true);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $this->serializeTenantAdmin($tenant), 'Tenant activated');
    }

    /** PATCH /api/admin/tenants/{id}/suspend */
    public function suspendTenant(Request $request, Response $response, array $args): Response
    {
        try {
            $tenant = $this->adminService->setTenantActive($args['id'], false);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $this->serializeTenantAdmin($tenant), 'Tenant suspended');
    }

    /** POST /api/admin/tenants/{id}/assign-plan */
    public function assignPlan(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $planId = $body['plan_id'] ?? '';

        if (trim($planId) === '') {
            return $this->response->validationError($response, ['plan_id' => 'Plan ID is required']);
        }

        try {
            $tenant = $this->adminService->assignPlan($args['id'], $planId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $this->serializeTenantAdmin($tenant), 'Plan assigned');
    }

    // ─── Plans ─────────────────────────────────────────────────

    /** GET /api/admin/plans */
    public function listPlans(Request $request, Response $response): Response
    {
        $plans = $this->adminService->listPlans();
        $items = array_map(fn($p) => $this->serializePlan($p), $plans);

        return $this->response->success($response, $items);
    }

    /** GET /api/plans (public) */
    public function listPublicPlans(Request $request, Response $response): Response
    {
        $plans = $this->adminService->listPublicPlans();
        $items = array_map(fn($p) => $this->serializePlanPublic($p), $plans);

        return $this->response->success($response, $items);
    }

    /** GET /api/admin/plans/{id} */
    public function showPlan(Request $request, Response $response, array $args): Response
    {
        $plan = $this->adminService->getPlan($args['id']);
        if ($plan === null) {
            return $this->response->notFound($response, 'Plan not found');
        }

        return $this->response->success($response, $this->serializePlan($plan));
    }

    /** POST /api/admin/plans */
    public function createPlan(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = CreatePlanRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $plan = $this->adminService->createPlan($dto);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 409);
        }

        return $this->response->created($response, $this->serializePlan($plan), 'Plan created');
    }

    /** PATCH /api/admin/plans/{id} */
    public function updatePlan(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);

        try {
            $plan = $this->adminService->updatePlan($args['id'], $body);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $this->serializePlan($plan), 'Plan updated');
    }

    /** DELETE /api/admin/plans/{id} */
    public function deletePlan(Request $request, Response $response, array $args): Response
    {
        try {
            $this->adminService->deletePlan($args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->noContent($response);
    }

    // ─── Tenant detail: usage, features, impersonate ──────────

    public function tenantUsage(Request $request, Response $response, array $args): Response
    {
        $usage = $this->adminService->getTenantUsage($args['id']);
        return $this->response->success($response, $usage);
    }

    public function tenantFeatures(Request $request, Response $response, array $args): Response
    {
        $features = $this->adminService->getTenantFeatures($args['id']);
        return $this->response->success($response, $features);
    }

    public function enableTenantFeature(Request $request, Response $response, array $args): Response
    {
        $this->adminService->setTenantFeature($args['id'], $args['moduleKey'], true);
        return $this->response->success($response, ['enabled' => true, 'module_key' => $args['moduleKey']]);
    }

    public function disableTenantFeature(Request $request, Response $response, array $args): Response
    {
        $this->adminService->setTenantFeature($args['id'], $args['moduleKey'], false);
        return $this->response->success($response, ['enabled' => false, 'module_key' => $args['moduleKey']]);
    }

    public function impersonateTenant(Request $request, Response $response, array $args): Response
    {
        $result = $this->adminService->impersonateTenant($args['id'], $request->getAttribute('user_id'));
        return $this->response->success($response, $result);
    }

    // ─── Platform settings ─────────────────────────────────────

    public function getSettings(Request $request, Response $response): Response
    {
        return $this->response->success($response, $this->adminService->getSettings());
    }

    public function updateSettings(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $this->adminService->updateSettings($body);
        return $this->response->success($response, ['saved' => true]);
    }

    public function testEmail(Request $request, Response $response): Response
    {
        $sent = $this->adminService->sendTestEmail();
        return $sent ? $this->response->success($response, ['sent' => true]) : $this->response->error($response, 'Failed to send test email');
    }

    public function testSms(Request $request, Response $response): Response
    {
        $sent = $this->adminService->sendTestSms();
        return $sent ? $this->response->success($response, ['sent' => true]) : $this->response->error($response, 'Failed to send test SMS');
    }

    // ─── Platform analytics ────────────────────────────────────

    public function analytics(Request $request, Response $response): Response
    {
        $days = (int) ($request->getQueryParams()['days'] ?? 30);
        return $this->response->success($response, $this->adminService->getAnalytics($days));
    }

    // ─── WhatsApp admin config ─────────────────────────────────

    public function whatsappConfig(Request $request, Response $response): Response
    {
        return $this->response->success($response, $this->adminService->getWhatsAppConfig());
    }

    public function updateWhatsappConfig(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $this->adminService->updateWhatsAppConfig($body);
        return $this->response->success($response, ['saved' => true]);
    }

    public function whatsappStats(Request $request, Response $response): Response
    {
        return $this->response->success($response, $this->adminService->getWhatsAppStats());
    }

    public function whatsappTemplates(Request $request, Response $response): Response
    {
        return $this->response->success($response, $this->adminService->getWhatsAppTemplates());
    }

    public function createWhatsappTemplate(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $template = $this->adminService->createWhatsAppTemplate($body);
        return $this->response->success($response, $template->toArray(), 201);
    }

    public function whatsappLogs(Request $request, Response $response): Response
    {
        return $this->response->success($response, $this->adminService->getWhatsAppLogs());
    }

    public function testWhatsapp(Request $request, Response $response): Response
    {
        $sent = $this->adminService->sendTestWhatsApp();
        return $sent ? $this->response->success($response, ['sent' => true]) : $this->response->error($response, 'Failed');
    }

    // ─── App release management ────────────────────────────────

    public function listAppReleases(Request $request, Response $response): Response
    {
        $appType = $request->getQueryParams()['app_type'] ?? null;
        $releases = $this->adminService->listAppReleases($appType);
        return $this->response->success($response, $releases);
    }

    public function createAppRelease(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $release = $this->adminService->createAppRelease($body, $request->getAttribute('user_id'));
        return $this->response->success($response, $release->toArray(), 201);
    }

    public function publishRelease(Request $request, Response $response, array $args): Response
    {
        $release = $this->adminService->publishRelease($args['id']);
        return $this->response->success($response, $release->toArray());
    }

    public function deprecateRelease(Request $request, Response $response, array $args): Response
    {
        $release = $this->adminService->deprecateRelease($args['id']);
        return $this->response->success($response, $release->toArray());
    }

    public function appAnalytics(Request $request, Response $response): Response
    {
        return $this->response->success($response, $this->adminService->getAppAnalytics());
    }

    public function duplicatePlan(Request $request, Response $response, array $args): Response
    {
        $plan = $this->adminService->duplicatePlan($args['id']);
        return $this->response->success($response, $this->serializePlan($plan), 201);
    }

    // ─── Serializers ───────────────────────────────────────────

    private function serializeTenantAdmin(object $t): array
    {
        return [
            'id' => $t->getId(),
            'name' => $t->getName(),
            'slug' => $t->getSlug(),
            'email' => $t->getEmail(),
            'phone' => $t->getPhone(),
            'subscription_status' => $t->getSubscriptionStatus()->value,
            'subscription_plan_id' => $t->getSubscriptionPlanId(),
            'trial_ends_at' => $t->getTrialEndsAt()?->format(\DateTimeInterface::ATOM),
            'subscription_ends_at' => $t->getSubscriptionEndsAt()?->format(\DateTimeInterface::ATOM),
            'max_rooms' => $t->getMaxRooms(),
            'max_staff' => $t->getMaxStaff(),
            'max_properties' => $t->getMaxProperties(),
            'enabled_modules' => $t->getEnabledModules(),
            'is_active' => $t->isActive(),
            'created_at' => $t->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function serializePlan(object $p): array
    {
        return [
            'id' => $p->getId(),
            'name' => $p->getName(),
            'tier' => $p->getTier(),
            'description' => $p->getDescription(),
            'monthly_price' => $p->getMonthlyPrice(),
            'annual_price' => $p->getAnnualPrice(),
            'currency' => $p->getCurrency(),
            'max_rooms' => $p->getMaxRooms(),
            'max_staff' => $p->getMaxStaff(),
            'max_properties' => $p->getMaxProperties(),
            'included_modules' => $p->getIncludedModules(),
            'feature_flags' => $p->getFeatureFlags(),
            'is_public' => $p->isPublic(),
            'is_active' => $p->isActive(),
            'for_tenant_id' => $p->getForTenantId(),
            'trial_days' => $p->getTrialDays(),
            'sort_order' => $p->getSortOrder(),
        ];
    }

    private function serializePlanPublic(object $p): array
    {
        return [
            'id' => $p->getId(),
            'name' => $p->getName(),
            'tier' => $p->getTier(),
            'description' => $p->getDescription(),
            'monthly_price' => $p->getMonthlyPrice(),
            'annual_price' => $p->getAnnualPrice(),
            'currency' => $p->getCurrency(),
            'max_rooms' => $p->getMaxRooms(),
            'max_staff' => $p->getMaxStaff(),
            'max_properties' => $p->getMaxProperties(),
            'included_modules' => $p->getIncludedModules(),
            'trial_days' => $p->getTrialDays(),
        ];
    }
}
