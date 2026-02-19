<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum ChargeCategory: string
{
    case ROOM = 'room';
    case SERVICE = 'service';
    case MINIBAR = 'minibar';
    case BAR = 'bar';
    case LAUNDRY = 'laundry';
    case RESTAURANT = 'restaurant';
    case TELEPHONE = 'telephone';
    case OTHER = 'other';

    /** @return string[] */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::ROOM => 'Room Charge',
            self::SERVICE => 'Service',
            self::MINIBAR => 'Minibar',
            self::BAR => 'Bar',
            self::LAUNDRY => 'Laundry',
            self::RESTAURANT => 'Restaurant',
            self::TELEPHONE => 'Telephone',
            self::OTHER => 'Other',
        };
    }
}
