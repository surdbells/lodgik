<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum HousekeepingTaskStatus: string
{
    case PENDING = 'pending';
    case ASSIGNED = 'assigned';
    case IN_PROGRESS = 'in_progress';
    case COMPLETED = 'completed';
    case INSPECTED = 'inspected';
    case NEEDS_REWORK = 'needs_rework';

    public static function values(): array { return array_map(fn(self $s) => $s->value, self::cases()); }

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending', self::ASSIGNED => 'Assigned',
            self::IN_PROGRESS => 'In Progress', self::COMPLETED => 'Completed',
            self::INSPECTED => 'Inspected', self::NEEDS_REWORK => 'Needs Rework',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING => '#6b7280', self::ASSIGNED => '#3b82f6',
            self::IN_PROGRESS => '#f59e0b', self::COMPLETED => '#22c55e',
            self::INSPECTED => '#10b981', self::NEEDS_REWORK => '#ef4444',
        };
    }
}
