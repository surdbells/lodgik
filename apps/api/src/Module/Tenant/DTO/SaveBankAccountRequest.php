<?php

declare(strict_types=1);

namespace Lodgik\Module\Tenant\DTO;

final class SaveBankAccountRequest
{
    public function __construct(
        public readonly string $bankName,
        public readonly string $accountNumber,
        public readonly string $accountName,
        public readonly ?string $bankCode = null,
        public readonly bool $isPrimary = false,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if (trim($this->bankName) === '') {
            $errors['bank_name'] = 'Bank name is required';
        }

        if (trim($this->accountNumber) === '') {
            $errors['account_number'] = 'Account number is required';
        } elseif (!preg_match('/^\d{10}$/', $this->accountNumber)) {
            $errors['account_number'] = 'Account number must be 10 digits';
        }

        if (trim($this->accountName) === '') {
            $errors['account_name'] = 'Account name is required';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            bankName: $data['bank_name'] ?? '',
            accountNumber: $data['account_number'] ?? '',
            accountName: $data['account_name'] ?? '',
            bankCode: $data['bank_code'] ?? null,
            isPrimary: (bool) ($data['is_primary'] ?? false),
        );
    }
}
