<?php

declare(strict_types=1);

namespace Lodgik\Module\Room\DTO;

final class BulkCreateRoomsRequest
{
    public function __construct(
        public readonly string $propertyId,
        public readonly string $roomTypeId,
        public readonly int $floor,
        public readonly string $prefix,
        public readonly int $from,
        public readonly int $to,
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
        if ($this->floor < -5 || $this->floor > 100) {
            $errors['floor'] = 'Floor must be between -5 and 100';
        }
        if ($this->from < 1 || $this->from > 9999) {
            $errors['from'] = 'From must be between 1 and 9999';
        }
        if ($this->to < 1 || $this->to > 9999) {
            $errors['to'] = 'To must be between 1 and 9999';
        }
        if ($this->from > $this->to) {
            $errors['range'] = 'From must be less than or equal to To';
        }
        if (($this->to - $this->from + 1) > 100) {
            $errors['range'] = 'Cannot create more than 100 rooms at once';
        }

        return $errors;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            propertyId: $data['property_id'] ?? '',
            roomTypeId: $data['room_type_id'] ?? '',
            floor: (int) ($data['floor'] ?? 0),
            prefix: $data['prefix'] ?? '',
            from: (int) ($data['from'] ?? 0),
            to: (int) ($data['to'] ?? 0),
        );
    }
}
