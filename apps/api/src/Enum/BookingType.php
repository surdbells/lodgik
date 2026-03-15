<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum BookingType: string
{
    case LODGE           = 'lodge';          // Overnight / multi-night (checkout 12:00 noon)
    case SHORT_REST_1HR  = 'short_rest_1hr'; // 1 hour same-day
    case SHORT_REST_2HR  = 'short_rest_2hr'; // 2 hours same-day
    case SHORT_REST_3HR  = 'short_rest_3hr'; // 3 hours same-day
    case HALF_DAY        = 'half_day';       // Hours configurable (default 6h) same-day
    case CORPORATE       = 'corporate';      // Corporate account booking (Lodge rules)

    // Legacy aliases — kept for backward compatibility with existing DB rows
    case OVERNIGHT       = 'overnight';
    case SHORT_REST_6HR  = 'short_rest_6hr';
    case FULL_DAY        = 'full_day';
    case WALK_IN         = 'walk_in';

    /** @return string[] */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::LODGE          => 'Lodge',
            self::SHORT_REST_1HR => 'Short Rest (1hr)',
            self::SHORT_REST_2HR => 'Short Rest (2hrs)',
            self::SHORT_REST_3HR => 'Short Rest (3hrs)',
            self::HALF_DAY       => 'Half Day',
            self::CORPORATE      => 'Corporate',
            self::OVERNIGHT      => 'Lodge',        // legacy
            self::SHORT_REST_6HR => 'Short Rest (6hrs)', // legacy
            self::FULL_DAY       => 'Full Day (24hrs)',  // legacy
            self::WALK_IN        => 'Walk-In',           // legacy
        };
    }

    /** Default duration in hours for time-based types (null = night-based). */
    public function durationHours(): ?int
    {
        return match ($this) {
            self::SHORT_REST_1HR => 1,
            self::SHORT_REST_2HR => 2,
            self::SHORT_REST_3HR => 3,
            self::SHORT_REST_6HR => 6,   // legacy
            self::FULL_DAY       => 24,  // legacy
            // half_day hours come from property settings, not enum
            default => null,
        };
    }

    public function isHourly(): bool
    {
        return in_array($this, [
            self::SHORT_REST_1HR,
            self::SHORT_REST_2HR,
            self::SHORT_REST_3HR,
            self::SHORT_REST_6HR,
            self::HALF_DAY,
            self::FULL_DAY,
        ], true);
    }

    /** Night-based booking types (checkout at noon). */
    public function isLodge(): bool
    {
        return in_array($this, [self::LODGE, self::OVERNIGHT, self::CORPORATE], true);
    }
}
