<?php

declare(strict_types=1);

namespace Lodgik\Module\Tenant\DTO;

final class UpdateTenantRequest
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?string $email = null,
        public readonly ?string $phone = null,
        public readonly ?string $primaryColor = null,
        public readonly ?string $secondaryColor = null,
        public readonly ?string $logoUrl = null,
        public readonly ?string $locale = null,
        public readonly ?string $timezone = null,
        public readonly ?string $currency = null,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if ($this->name !== null && trim($this->name) === '') {
            $errors['name'] = 'Name cannot be empty';
        }

        if ($this->email !== null && !filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email address';
        }

        if ($this->primaryColor !== null && !preg_match('/^#[0-9a-fA-F]{6}$/', $this->primaryColor)) {
            $errors['primary_color'] = 'Invalid hex color (e.g. #1a1a2e)';
        }

        if ($this->secondaryColor !== null && !preg_match('/^#[0-9a-fA-F]{6}$/', $this->secondaryColor)) {
            $errors['secondary_color'] = 'Invalid hex color';
        }

        if ($this->currency !== null && strlen($this->currency) !== 3) {
            $errors['currency'] = 'Currency must be a 3-letter ISO code';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'] ?? null,
            email: $data['email'] ?? null,
            phone: $data['phone'] ?? null,
            primaryColor: $data['primary_color'] ?? null,
            secondaryColor: $data['secondary_color'] ?? null,
            logoUrl: $data['logo_url'] ?? null,
            locale: $data['locale'] ?? null,
            timezone: $data['timezone'] ?? null,
            currency: $data['currency'] ?? null,
        );
    }
}
