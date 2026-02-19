<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum RoomStatus: string
{
    case VACANT_CLEAN = 'vacant_clean';
    case VACANT_DIRTY = 'vacant_dirty';
    case OCCUPIED = 'occupied';
    case RESERVED = 'reserved';
    case OUT_OF_ORDER = 'out_of_order';
    case MAINTENANCE = 'maintenance';

    /**
     * @return string[]
     */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::VACANT_CLEAN => 'Vacant Clean',
            self::VACANT_DIRTY => 'Vacant Dirty',
            self::OCCUPIED => 'Occupied',
            self::RESERVED => 'Reserved',
            self::OUT_OF_ORDER => 'Out of Order',
            self::MAINTENANCE => 'Maintenance',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::VACANT_CLEAN => '#22c55e',   // green
            self::VACANT_DIRTY => '#f59e0b',   // amber
            self::OCCUPIED => '#3b82f6',       // blue
            self::RESERVED => '#8b5cf6',       // purple
            self::OUT_OF_ORDER => '#ef4444',   // red
            self::MAINTENANCE => '#6b7280',    // gray
        };
    }
}
