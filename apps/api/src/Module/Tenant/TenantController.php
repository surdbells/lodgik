<?php

declare(strict_types=1);

namespace Lodgik\Module\Tenant;

use Lodgik\Helper\ResponseHelper;
use Lodgik\Module\Tenant\DTO\CreatePropertyRequest;
use Lodgik\Module\Tenant\DTO\SaveBankAccountRequest;
use Lodgik\Module\Tenant\DTO\UpdatePropertyRequest;
use Lodgik\Module\Tenant\DTO\UpdateTenantRequest;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class TenantController
{
    public function __construct(
        private readonly TenantService $tenantService,
        private readonly ResponseHelper $response,
    ) {}

    // ─── Tenant Settings ───────────────────────────────────────

    /** GET /api/tenant */
    public function show(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $tenant = $this->tenantService->getTenant($tenantId);

        if ($tenant === null) {
            return $this->response->notFound($response, 'Tenant not found');
        }

        return $this->response->success($response, $this->serializeTenant($tenant));
    }

    /** PATCH /api/tenant */
    public function update(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = UpdateTenantRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        $tenantId = $request->getAttribute('auth.tenant_id');

        try {
            $tenant = $this->tenantService->updateTenant($tenantId, $dto);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $this->serializeTenant($tenant), 'Settings updated');
    }

    // ─── Properties ────────────────────────────────────────────

    /** GET /api/properties */
    public function listProperties(Request $request, Response $response): Response
    {
        $properties = $this->tenantService->listProperties();
        $items = array_map(fn($p) => $this->serializeProperty($p), $properties);

        return $this->response->success($response, $items);
    }

    /** GET /api/properties/{id} */
    public function showProperty(Request $request, Response $response, array $args): Response
    {
        $property = $this->tenantService->getProperty($args['id']);

        if ($property === null) {
            return $this->response->notFound($response, 'Property not found');
        }

        return $this->response->success($response, $this->serializeProperty($property));
    }

    /** POST /api/properties */
    public function createProperty(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = CreatePropertyRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        $tenantId = $request->getAttribute('auth.tenant_id');

        try {
            $property = $this->tenantService->createProperty($dto, $tenantId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 409);
        }

        return $this->response->created($response, $this->serializeProperty($property), 'Property created');
    }

    /** PATCH /api/properties/{id} */
    public function updateProperty(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = UpdatePropertyRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $property = $this->tenantService->updateProperty($args['id'], $dto);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $this->serializeProperty($property), 'Property updated');
    }

    /** DELETE /api/properties/{id} */
    public function deleteProperty(Request $request, Response $response, array $args): Response
    {
        try {
            $this->tenantService->deleteProperty($args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->noContent($response);
    }

    // ─── Bank Accounts ─────────────────────────────────────────

    /** GET /api/properties/{propertyId}/bank-accounts */
    public function listBankAccounts(Request $request, Response $response, array $args): Response
    {
        $accounts = $this->tenantService->listBankAccounts($args['propertyId']);
        $items = array_map(fn($a) => $this->serializeBankAccount($a), $accounts);

        return $this->response->success($response, $items);
    }

    /** POST /api/properties/{propertyId}/bank-accounts */
    public function createBankAccount(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = SaveBankAccountRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        $tenantId = $request->getAttribute('auth.tenant_id');

        try {
            $account = $this->tenantService->saveBankAccount($args['propertyId'], $dto, $tenantId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->created($response, $this->serializeBankAccount($account), 'Bank account added');
    }

    /** PUT /api/properties/{propertyId}/bank-accounts/{id} */
    public function updateBankAccount(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = SaveBankAccountRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        $tenantId = $request->getAttribute('auth.tenant_id');

        try {
            $account = $this->tenantService->saveBankAccount($args['propertyId'], $dto, $tenantId, $args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $this->serializeBankAccount($account), 'Bank account updated');
    }

    /** DELETE /api/properties/{propertyId}/bank-accounts/{id} */
    public function deleteBankAccount(Request $request, Response $response, array $args): Response
    {
        try {
            $this->tenantService->deleteBankAccount($args['id']);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->noContent($response);
    }

    // ─── Serializers ───────────────────────────────────────────

    private function serializeTenant(object $t): array
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
            'primary_color' => $t->getPrimaryColor(),
            'secondary_color' => $t->getSecondaryColor(),
            'logo_url' => $t->getLogoUrl(),
            'locale' => $t->getLocale(),
            'timezone' => $t->getTimezone(),
            'currency' => $t->getCurrency(),
            'is_active' => $t->isActive(),
        ];
    }

    private function serializeProperty(object $p): array
    {
        return [
            'id' => $p->getId(),
            'name' => $p->getName(),
            'slug' => $p->getSlug(),
            'email' => $p->getEmail(),
            'phone' => $p->getPhone(),
            'address' => $p->getAddress(),
            'city' => $p->getCity(),
            'state' => $p->getState(),
            'country' => $p->getCountry(),
            'star_rating' => $p->getStarRating(),
            'check_in_time' => $p->getCheckInTime(),
            'check_out_time' => $p->getCheckOutTime(),
            'timezone' => $p->getTimezone(),
            'currency' => $p->getCurrency(),
            'logo_url' => $p->getLogoUrl(),
            'cover_image_url' => $p->getCoverImageUrl(),
            'is_active' => $p->isActive(),
            'created_at' => $p->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function serializeBankAccount(object $a): array
    {
        return [
            'id' => $a->getId(),
            'property_id' => $a->getPropertyId(),
            'bank_name' => $a->getBankName(),
            'account_number' => $a->getAccountNumber(),
            'account_name' => $a->getAccountName(),
            'bank_code' => $a->getBankCode(),
            'is_primary' => $a->isPrimary(),
        ];
    }
}
