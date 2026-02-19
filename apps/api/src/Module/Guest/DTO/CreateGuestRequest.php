<?php

declare(strict_types=1);

namespace Lodgik\Module\Guest\DTO;

final class CreateGuestRequest
{
    private const VALID_ID_TYPES = ['national_id', 'passport', 'drivers_license', 'voters_card', 'nin', 'other'];
    private const VALID_GENDERS = ['male', 'female', 'other'];
    private const VALID_VIP = ['regular', 'silver', 'gold', 'platinum', 'vvip'];

    public function __construct(
        public readonly string $firstName,
        public readonly string $lastName,
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
        public readonly string $country = 'NG',
        public readonly string $vipStatus = 'regular',
        public readonly ?string $notes = null,
        public readonly ?string $companyName = null,
        public readonly ?array $preferences = null,
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
        if ($this->email !== null && $this->email !== '' && !filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email address';
        }
        if ($this->phone !== null && $this->phone !== '' && !preg_match('/^\+?\d{7,15}$/', $this->phone)) {
            $errors['phone'] = 'Invalid phone number';
        }
        if ($this->idType !== null && !in_array($this->idType, self::VALID_ID_TYPES, true)) {
            $errors['id_type'] = 'Invalid ID type. Valid: ' . implode(', ', self::VALID_ID_TYPES);
        }
        if ($this->gender !== null && !in_array($this->gender, self::VALID_GENDERS, true)) {
            $errors['gender'] = 'Invalid gender. Valid: ' . implode(', ', self::VALID_GENDERS);
        }
        if (!in_array($this->vipStatus, self::VALID_VIP, true)) {
            $errors['vip_status'] = 'Invalid VIP status. Valid: ' . implode(', ', self::VALID_VIP);
        }
        if ($this->dateOfBirth !== null) {
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
            firstName: $data['first_name'] ?? '',
            lastName: $data['last_name'] ?? '',
            email: $data['email'] ?? null,
            phone: $data['phone'] ?? null,
            nationality: $data['nationality'] ?? null,
            idType: $data['id_type'] ?? null,
            idNumber: $data['id_number'] ?? null,
            dateOfBirth: $data['date_of_birth'] ?? null,
            gender: $data['gender'] ?? null,
            address: $data['address'] ?? null,
            city: $data['city'] ?? null,
            state: $data['state'] ?? null,
            country: $data['country'] ?? 'NG',
            vipStatus: $data['vip_status'] ?? 'regular',
            notes: $data['notes'] ?? null,
            companyName: $data['company_name'] ?? null,
            preferences: $data['preferences'] ?? null,
        );
    }
}
