<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum ServiceRequestStatus: string
{
    case PENDING      = 'pending';
    case ACKNOWLEDGED = 'acknowledged';
    case IN_PROGRESS  = 'in_progress';
    case COMPLETED    = 'completed';
    case CANCELLED    = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PENDING      => 'Pending',
            self::ACKNOWLEDGED => 'Acknowledged',
            self::IN_PROGRESS  => 'In Progress',
            self::COMPLETED    => 'Completed',
            self::CANCELLED    => 'Cancelled',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING      => '#f59e0b',
            self::ACKNOWLEDGED => '#3b82f6',
            self::IN_PROGRESS  => '#8b5cf6',
            self::COMPLETED    => '#22c55e',
            self::CANCELLED    => '#6b7280',
        };
    }

    /** @return string[] */
    public static function values(): array { return array_map(fn(self $s) => $s->value, self::cases()); }
}
