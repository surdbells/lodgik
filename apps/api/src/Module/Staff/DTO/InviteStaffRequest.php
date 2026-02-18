<?php

declare(strict_types=1);

namespace Lodgik\Module\Staff\DTO;

use Lodgik\Enum\UserRole;

final class InviteStaffRequest
{
    public function __construct(
        public readonly string $firstName,
        public readonly string $lastName,
        public readonly string $email,
        public readonly string $role,
        public readonly ?string $phone = null,
        public readonly ?string $propertyId = null,
    ) {}

    public function validate(): array
    {
        $errors = [];

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

        if (trim($this->role) === '') {
            $errors['role'] = 'Role is required';
        } elseif (!in_array($this->role, UserRole::values(), true)) {
            $errors['role'] = 'Invalid role. Valid roles: ' . implode(', ', UserRole::values());
        } elseif ($this->role === 'super_admin') {
            $errors['role'] = 'Cannot invite a super admin';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            firstName: $data['first_name'] ?? '',
            lastName: $data['last_name'] ?? '',
            email: $data['email'] ?? '',
            role: $data['role'] ?? '',
            phone: $data['phone'] ?? null,
            propertyId: $data['property_id'] ?? null,
        );
    }
}
