<?php

declare(strict_types=1);

namespace Lodgik\Module\Tenant\DTO;

final class CreatePropertyRequest
{
    public function __construct(
        public readonly string $name,
        public readonly ?string $email = null,
        public readonly ?string $phone = null,
        public readonly ?string $address = null,
        public readonly ?string $city = null,
        public readonly ?string $state = null,
        public readonly ?string $country = null,
        public readonly ?int $starRating = null,
        public readonly ?string $checkInTime = null,
        public readonly ?string $checkOutTime = null,
        public readonly ?string $timezone = null,
        public readonly ?string $currency = null,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if (trim($this->name) === '') {
            $errors['name'] = 'Property name is required';
        }

        if ($this->email !== null && !filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email address';
        }

        if ($this->starRating !== null && ($this->starRating < 1 || $this->starRating > 5)) {
            $errors['star_rating'] = 'Star rating must be between 1 and 5';
        }

        if ($this->checkInTime !== null && !preg_match('/^\d{2}:\d{2}$/', $this->checkInTime)) {
            $errors['check_in_time'] = 'Time must be in HH:MM format';
        }

        if ($this->checkOutTime !== null && !preg_match('/^\d{2}:\d{2}$/', $this->checkOutTime)) {
            $errors['check_out_time'] = 'Time must be in HH:MM format';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'] ?? '',
            email: $data['email'] ?? null,
            phone: $data['phone'] ?? null,
            address: $data['address'] ?? null,
            city: $data['city'] ?? null,
            state: $data['state'] ?? null,
            country: $data['country'] ?? null,
            starRating: isset($data['star_rating']) ? (int) $data['star_rating'] : null,
            checkInTime: $data['check_in_time'] ?? null,
            checkOutTime: $data['check_out_time'] ?? null,
            timezone: $data['timezone'] ?? null,
            currency: $data['currency'] ?? null,
        );
    }
}
