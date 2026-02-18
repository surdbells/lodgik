<?php

declare(strict_types=1);

namespace Lodgik\Module\Auth\DTO;

final class LoginRequest
{
    public function __construct(
        public readonly string $email,
        public readonly string $password,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if (trim($this->email) === '') {
            $errors['email'] = 'Email is required';
        } elseif (!filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email address';
        }

        if ($this->password === '') {
            $errors['password'] = 'Password is required';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            email: $data['email'] ?? '',
            password: $data['password'] ?? '',
        );
    }
}
