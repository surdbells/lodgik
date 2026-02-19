<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum ServiceRequestCategory: string
{
    case ROOM_SERVICE  = 'room_service';
    case HOUSEKEEPING  = 'housekeeping';
    case MAINTENANCE   = 'maintenance';
    case AMENITY       = 'amenity';
    case FOOD          = 'food';
    case LAUNDRY       = 'laundry';
    case TRANSPORT     = 'transport';
    case OTHER         = 'other';

    public function label(): string
    {
        return match ($this) {
            self::ROOM_SERVICE => 'Room Service',
            self::HOUSEKEEPING => 'Housekeeping',
            self::MAINTENANCE  => 'Maintenance',
            self::AMENITY      => 'Amenity',
            self::FOOD         => 'Food & Beverage',
            self::LAUNDRY      => 'Laundry',
            self::TRANSPORT    => 'Transport',
            self::OTHER        => 'Other',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::ROOM_SERVICE => '🛎️',
            self::HOUSEKEEPING => '🧹',
            self::MAINTENANCE  => '🔧',
            self::AMENITY      => '🎁',
            self::FOOD         => '🍽️',
            self::LAUNDRY      => '👔',
            self::TRANSPORT    => '🚗',
            self::OTHER        => '📋',
        };
    }

    /** @return string[] */
    public static function values(): array { return array_map(fn(self $s) => $s->value, self::cases()); }
}
