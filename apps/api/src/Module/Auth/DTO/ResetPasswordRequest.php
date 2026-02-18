<?php

declare(strict_types=1);

namespace Lodgik\Module\Auth\DTO;

final class ResetPasswordRequest
{
    public function __construct(
        public readonly string $token,
        public readonly string $email,
        public readonly string $password,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if (trim($this->token) === '') {
            $errors['token'] = 'Reset token is required';
        }

        if (trim($this->email) === '') {
            $errors['email'] = 'Email is required';
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
            token: $data['token'] ?? '',
            email: $data['email'] ?? '',
            password: $data['password'] ?? '',
        );
    }
}
