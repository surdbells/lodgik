<?php

declare(strict_types=1);

namespace Lodgik\Module\Room\DTO;

final class CreateRoomRequest
{
    public function __construct(
        public readonly string $propertyId,
        public readonly string $roomTypeId,
        public readonly string $roomNumber,
        public readonly ?int $floor = null,
        public readonly ?string $notes = null,
        public readonly ?array $amenities = null,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if (trim($this->propertyId) === '') {
            $errors['property_id'] = 'Property ID is required';
        }
        if (trim($this->roomTypeId) === '') {
            $errors['room_type_id'] = 'Room type ID is required';
        }
        if (trim($this->roomNumber) === '') {
            $errors['room_number'] = 'Room number is required';
        }
        if ($this->floor !== null && ($this->floor < -5 || $this->floor > 100)) {
            $errors['floor'] = 'Floor must be between -5 and 100';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            propertyId: $data['property_id'] ?? '',
            roomTypeId: $data['room_type_id'] ?? '',
            roomNumber: $data['room_number'] ?? '',
            floor: isset($data['floor']) ? (int) $data['floor'] : null,
            notes: $data['notes'] ?? null,
            amenities: $data['amenities'] ?? null,
        );
    }
}
