<?php

declare(strict_types=1);

namespace Lodgik\Module\Room\DTO;

final class UpdateRoomTypeRequest
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?string $baseRate = null,
        public readonly ?string $hourlyRate = null,
        public readonly ?string $description = null,
        public readonly ?int $maxOccupancy = null,
        public readonly ?array $amenities = null,
        public readonly ?int $sortOrder = null,
        public readonly ?bool $isActive = null,
        public readonly ?bool $priceIncludesVat = null,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if ($this->name !== null && trim($this->name) === '') {
            $errors['name'] = 'Name cannot be empty';
        }
        if ($this->baseRate !== null && (!is_numeric($this->baseRate) || (float) $this->baseRate < 0)) {
            $errors['base_rate'] = 'Base rate must be a positive number';
        }
        if ($this->hourlyRate !== null && $this->hourlyRate !== '' && (!is_numeric($this->hourlyRate) || (float) $this->hourlyRate < 0)) {
            $errors['hourly_rate'] = 'Hourly rate must be a positive number';
        }
        if ($this->maxOccupancy !== null && ($this->maxOccupancy < 1 || $this->maxOccupancy > 20)) {
            $errors['max_occupancy'] = 'Max occupancy must be between 1 and 20';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'] ?? null,
            baseRate: isset($data['base_rate']) ? (string) $data['base_rate'] : null,
            hourlyRate: isset($data['hourly_rate']) ? (string) $data['hourly_rate'] : null,
            description: array_key_exists('description', $data) ? $data['description'] : null,
            maxOccupancy: isset($data['max_occupancy']) ? (int) $data['max_occupancy'] : null,
            amenities: array_key_exists('amenities', $data) ? $data['amenities'] : null,
            sortOrder: isset($data['sort_order']) ? (int) $data['sort_order'] : null,
            isActive: isset($data['is_active']) ? (bool) $data['is_active'] : null,
            priceIncludesVat: array_key_exists('price_includes_vat', $data) ? (bool) $data['price_includes_vat'] : null,
        );
    }
}
