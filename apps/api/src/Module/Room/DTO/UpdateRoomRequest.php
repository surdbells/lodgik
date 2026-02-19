<?php

declare(strict_types=1);

namespace Lodgik\Module\Room\DTO;

final class UpdateRoomRequest
{
    public function __construct(
        public readonly ?string $roomTypeId = null,
        public readonly ?string $roomNumber = null,
        public readonly ?int $floor = null,
        public readonly ?string $notes = null,
        public readonly ?array $amenities = null,
        public readonly ?bool $isActive = null,
    ) {}

    public function validate(): array
    {
        $errors = [];

        if ($this->roomNumber !== null && trim($this->roomNumber) === '') {
            $errors['room_number'] = 'Room number cannot be empty';
        }
        if ($this->floor !== null && ($this->floor < -5 || $this->floor > 100)) {
            $errors['floor'] = 'Floor must be between -5 and 100';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            roomTypeId: $data['room_type_id'] ?? null,
            roomNumber: $data['room_number'] ?? null,
            floor: isset($data['floor']) ? (int) $data['floor'] : null,
            notes: array_key_exists('notes', $data) ? $data['notes'] : null,
            amenities: array_key_exists('amenities', $data) ? $data['amenities'] : null,
            isActive: isset($data['is_active']) ? (bool) $data['is_active'] : null,
        );
    }
}
