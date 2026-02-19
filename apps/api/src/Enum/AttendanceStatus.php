<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum AttendanceStatus: string
{
    case PRESENT  = 'present';
    case ABSENT   = 'absent';
    case LATE     = 'late';
    case HALF_DAY = 'half_day';
    case ON_LEAVE = 'on_leave';

    public function label(): string
    {
        return match ($this) {
            self::PRESENT  => 'Present',
            self::ABSENT   => 'Absent',
            self::LATE     => 'Late',
            self::HALF_DAY => 'Half Day',
            self::ON_LEAVE => 'On Leave',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PRESENT  => '#22c55e',
            self::ABSENT   => '#ef4444',
            self::LATE     => '#f59e0b',
            self::HALF_DAY => '#3b82f6',
            self::ON_LEAVE => '#8b5cf6',
        };
    }

    /** @return string[] */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }
}
