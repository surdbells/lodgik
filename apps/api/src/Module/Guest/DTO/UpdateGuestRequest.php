<?php

declare(strict_types=1);

namespace Lodgik\Module\Guest\DTO;

final class UpdateGuestRequest
{
    private const VALID_ID_TYPES = ['national_id', 'passport', 'drivers_license', 'voters_card', 'nin', 'other'];
    private const VALID_GENDERS = ['male', 'female', 'other'];
    private const VALID_VIP = ['regular', 'silver', 'gold', 'platinum', 'vvip'];

    public function __construct(
        public readonly ?string $firstName = null,
        public readonly ?string $lastName = null,
        public readonly ?string $email = null,
        public readonly ?string $phone = null,
        public readonly ?string $nationality = null,
        public readonly ?string $idType = null,
        public readonly ?string $idNumber = null,
        public readonly ?string $dateOfBirth = null,
        public readonly ?string $gender = null,
        public readonly ?string $address = null,
        public readonly ?string $city = null,
        public readonly ?string $state = null,
        public readonly ?string $country = null,
        public readonly ?string $vipStatus = null,
        public readonly ?string $notes = null,
        public readonly ?string $companyName = null,
        public readonly ?array $preferences = null,
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
        if ($this->email !== null && $this->email !== '' && !filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email address';
        }
        if ($this->phone !== null && $this->phone !== '' && !preg_match('/^\+?\d{7,15}$/', $this->phone)) {
            $errors['phone'] = 'Invalid phone number';
        }
        if ($this->idType !== null && !in_array($this->idType, self::VALID_ID_TYPES, true)) {
            $errors['id_type'] = 'Invalid ID type';
        }
        if ($this->gender !== null && !in_array($this->gender, self::VALID_GENDERS, true)) {
            $errors['gender'] = 'Invalid gender';
        }
        if ($this->vipStatus !== null && !in_array($this->vipStatus, self::VALID_VIP, true)) {
            $errors['vip_status'] = 'Invalid VIP status';
        }
        if ($this->dateOfBirth !== null && $this->dateOfBirth !== '') {
            $d = \DateTimeImmutable::createFromFormat('Y-m-d', $this->dateOfBirth);
            if ($d === false) {
                $errors['date_of_birth'] = 'Invalid date format. Use YYYY-MM-DD';
            }
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            firstName: $data['first_name'] ?? null,
            lastName: $data['last_name'] ?? null,
            email: array_key_exists('email', $data) ? $data['email'] : null,
            phone: array_key_exists('phone', $data) ? $data['phone'] : null,
            nationality: array_key_exists('nationality', $data) ? $data['nationality'] : null,
            idType: array_key_exists('id_type', $data) ? $data['id_type'] : null,
            idNumber: array_key_exists('id_number', $data) ? $data['id_number'] : null,
            dateOfBirth: array_key_exists('date_of_birth', $data) ? $data['date_of_birth'] : null,
            gender: array_key_exists('gender', $data) ? $data['gender'] : null,
            address: array_key_exists('address', $data) ? $data['address'] : null,
            city: array_key_exists('city', $data) ? $data['city'] : null,
            state: array_key_exists('state', $data) ? $data['state'] : null,
            country: $data['country'] ?? null,
            vipStatus: $data['vip_status'] ?? null,
            notes: array_key_exists('notes', $data) ? $data['notes'] : null,
            companyName: array_key_exists('company_name', $data) ? $data['company_name'] : null,
            preferences: array_key_exists('preferences', $data) ? $data['preferences'] : null,
        );
    }
}
