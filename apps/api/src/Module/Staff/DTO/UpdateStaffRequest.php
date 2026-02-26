<?php

declare(strict_types=1);

namespace Lodgik\Module\Staff\DTO;

use Lodgik\Enum\UserRole;

final class UpdateStaffRequest
{
    public function __construct(
        public readonly ?string $firstName = null,
        public readonly ?string $lastName = null,
        public readonly ?string $role = null,
        public readonly ?string $phone = null,
        public readonly ?string $propertyId = null,
        public readonly ?bool $isActive = null,
        public readonly ?string $password = null,
        public readonly ?string $email = null,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if ($this->firstName !== null && trim($this->firstName) === '') {
            $errors['first_name'] = 'First name cannot be empty';
        }

        if ($this->lastName !== null && trim($this->lastName) === '') {
            $errors['last_name'] = 'Last name cannot be empty';
        }

        if ($this->role !== null) {
            if (!in_array($this->role, UserRole::values(), true)) {
                $errors['role'] = 'Invalid role';
            } elseif ($this->role === 'super_admin') {
                $errors['role'] = 'Cannot assign super admin role';
            }
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            firstName: $data['first_name'] ?? null,
            lastName: $data['last_name'] ?? null,
            role: $data['role'] ?? null,
            phone: $data['phone'] ?? null,
            propertyId: array_key_exists('property_id', $data) ? $data['property_id'] : null,
            isActive: isset($data['is_active']) ? (bool) $data['is_active'] : null,
            password: $data['password'] ?? null,
            email: $data['email'] ?? null,
        );
    }
}
