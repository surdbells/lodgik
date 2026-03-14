<?php

declare(strict_types=1);

namespace Lodgik\Module\Room\DTO;

final class CreateRoomTypeRequest
{
    public function __construct(
        public readonly string $propertyId,
        public readonly string $name,
        public readonly string $baseRate,
        public readonly ?string $hourlyRate = null,
        public readonly ?string $description = null,
        public readonly int $maxOccupancy = 2,
        public readonly ?array $amenities = null,
        public readonly int $sortOrder = 0,
        public readonly bool $priceIncludesVat = true,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if (trim($this->propertyId) === '') {
            $errors['property_id'] = 'Property ID is required';
        }
        if (trim($this->name) === '') {
            $errors['name'] = 'Name is required';
        }
        if (!is_numeric($this->baseRate) || (float) $this->baseRate < 0) {
            $errors['base_rate'] = 'Base rate must be a positive number';
        }
        if ($this->hourlyRate !== null && (!is_numeric($this->hourlyRate) || (float) $this->hourlyRate < 0)) {
            $errors['hourly_rate'] = 'Hourly rate must be a positive number';
        }
        if ($this->maxOccupancy < 1 || $this->maxOccupancy > 20) {
            $errors['max_occupancy'] = 'Max occupancy must be between 1 and 20';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            propertyId: $data['property_id'] ?? '',
            name: $data['name'] ?? '',
            baseRate: (string) ($data['base_rate'] ?? '0'),
            hourlyRate: isset($data['hourly_rate']) ? (string) $data['hourly_rate'] : null,
            description: $data['description'] ?? null,
            maxOccupancy: (int) ($data['max_occupancy'] ?? 2),
            amenities: $data['amenities'] ?? null,
            sortOrder: (int) ($data['sort_order'] ?? 0),
            priceIncludesVat: isset($data['price_includes_vat']) ? (bool) $data['price_includes_vat'] : true,
        );
    }
}
