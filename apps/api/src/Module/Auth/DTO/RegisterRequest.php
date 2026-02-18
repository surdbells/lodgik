<?php

declare(strict_types=1);

namespace Lodgik\Module\Auth\DTO;

final class RegisterRequest
{
    public function __construct(
        public readonly string $tenantName,
        public readonly string $firstName,
        public readonly string $lastName,
        public readonly string $email,
        public readonly string $password,
        public readonly ?string $phone = null,
        public readonly ?string $propertyName = null,
    ) {}

    /**
     * @return array<string, string>
     */
    public function validate(): array
    {
        $errors = [];

        if (trim($this->tenantName) === '') {
            $errors['tenant_name'] = 'Hotel/business name is required';
        } elseif (mb_strlen($this->tenantName) > 255) {
            $errors['tenant_name'] = 'Hotel/business name must not exceed 255 characters';
        }

        if (trim($this->firstName) === '') {
            $errors['first_name'] = 'First name is required';
        }

        if (trim($this->lastName) === '') {
            $errors['last_name'] = 'Last name is required';
        }

        if (trim($this->email) === '') {
            $errors['email'] = 'Email is required';
        } elseif (!filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email address';
        }

        if ($this->password === '') {
            $errors['password'] = 'Password is required';
        } elseif (mb_strlen($this->password) < 8) {
            $errors['password'] = 'Password must be at least 8 characters';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            tenantName: $data['tenant_name'] ?? '',
            firstName: $data['first_name'] ?? '',
            lastName: $data['last_name'] ?? '',
            email: $data['email'] ?? '',
            password: $data['password'] ?? '',
            phone: $data['phone'] ?? null,
            propertyName: $data['property_name'] ?? null,
        );
    }
}
