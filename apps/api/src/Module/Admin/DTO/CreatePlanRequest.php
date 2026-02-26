<?php

declare(strict_types=1);

namespace Lodgik\Module\Admin\DTO;

final class CreatePlanRequest
{
    public function __construct(
        public readonly string $name,
        public readonly string $tier,
        public readonly ?string $description = null,
        public readonly int $monthlyPrice = 0,
        public readonly int $annualPrice = 0,
        public readonly string $currency = 'NGN',
        public readonly int $maxRooms = 10,
        public readonly int $maxStaff = 5,
        public readonly int $maxProperties = 1,
        public readonly array $includedModules = [],
        public readonly array $featureFlags = [],
        public readonly bool $isPublic = true,
        public readonly ?string $forTenantId = null,
        public readonly int $trialDays = 14,
        public readonly int $sortOrder = 0,
        public readonly ?string $paystackPlanCodeMonthly = null,
        public readonly ?string $paystackPlanCodeAnnual = null,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if (trim($this->name) === '') {
            $errors['name'] = 'Plan name is required';
        }

        if (trim($this->tier) === '') {
            $errors['tier'] = 'Plan tier is required';
        }

        if ($this->monthlyPrice < 0) {
            $errors['monthly_price'] = 'Price cannot be negative';
        }

        if ($this->annualPrice < 0) {
            $errors['annual_price'] = 'Price cannot be negative';
        }

        if ($this->maxRooms < 1) {
            $errors['max_rooms'] = 'Must allow at least 1 room';
        }

        if ($this->maxStaff < 1) {
            $errors['max_staff'] = 'Must allow at least 1 staff';
        }

        if ($this->maxProperties < 1) {
            $errors['max_properties'] = 'Must allow at least 1 property';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'] ?? '',
            tier: $data['tier'] ?? '',
            description: $data['description'] ?? null,
            monthlyPrice: (int) ($data['monthly_price'] ?? 0),
            annualPrice: (int) ($data['annual_price'] ?? 0),
            currency: $data['currency'] ?? 'NGN',
            maxRooms: (int) ($data['max_rooms'] ?? 10),
            maxStaff: (int) ($data['max_staff'] ?? 5),
            maxProperties: (int) ($data['max_properties'] ?? 1),
            includedModules: $data['included_modules'] ?? [],
            featureFlags: $data['feature_flags'] ?? [],
            isPublic: (bool) ($data['is_public'] ?? true),
            forTenantId: $data['for_tenant_id'] ?? null,
            trialDays: (int) ($data['trial_days'] ?? 14),
            sortOrder: (int) ($data['sort_order'] ?? 0),
            paystackPlanCodeMonthly: $data['paystack_plan_code_monthly'] ?? null,
            paystackPlanCodeAnnual: $data['paystack_plan_code_annual'] ?? null,
        );
    }
}
