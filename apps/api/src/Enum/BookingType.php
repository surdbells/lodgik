<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum BookingType: string
{
    case OVERNIGHT = 'overnight';
    case SHORT_REST_3HR = 'short_rest_3hr';
    case SHORT_REST_6HR = 'short_rest_6hr';
    case HALF_DAY = 'half_day';
    case FULL_DAY = 'full_day';
    case WALK_IN = 'walk_in';
    case CORPORATE = 'corporate';

    /** @return string[] */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::OVERNIGHT => 'Overnight',
            self::SHORT_REST_3HR => 'Short Rest (3hrs)',
            self::SHORT_REST_6HR => 'Short Rest (6hrs)',
            self::HALF_DAY => 'Half Day (12hrs)',
            self::FULL_DAY => 'Full Day (24hrs)',
            self::WALK_IN => 'Walk-In',
            self::CORPORATE => 'Corporate',
        };
    }

    /** Default duration in hours for time-based types. */
    public function durationHours(): ?int
    {
        return match ($this) {
            self::SHORT_REST_3HR => 3,
            self::SHORT_REST_6HR => 6,
            self::HALF_DAY => 12,
            self::FULL_DAY => 24,
            default => null,
        };
    }

    public function isHourly(): bool
    {
        return in_array($this, [self::SHORT_REST_3HR, self::SHORT_REST_6HR, self::HALF_DAY, self::FULL_DAY], true);
    }
}
