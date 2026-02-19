<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum BookingStatus: string
{
    case PENDING = 'pending';
    case CONFIRMED = 'confirmed';
    case CHECKED_IN = 'checked_in';
    case CHECKED_OUT = 'checked_out';
    case CANCELLED = 'cancelled';
    case NO_SHOW = 'no_show';

    /** @return string[] */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::CONFIRMED => 'Confirmed',
            self::CHECKED_IN => 'Checked In',
            self::CHECKED_OUT => 'Checked Out',
            self::CANCELLED => 'Cancelled',
            self::NO_SHOW => 'No Show',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING => '#f59e0b',
            self::CONFIRMED => '#3b82f6',
            self::CHECKED_IN => '#22c55e',
            self::CHECKED_OUT => '#6b7280',
            self::CANCELLED => '#ef4444',
            self::NO_SHOW => '#dc2626',
        };
    }
}
