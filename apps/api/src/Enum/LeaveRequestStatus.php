<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum LeaveRequestStatus: string
{
    case PENDING   = 'pending';
    case APPROVED  = 'approved';
    case REJECTED  = 'rejected';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PENDING   => 'Pending',
            self::APPROVED  => 'Approved',
            self::REJECTED  => 'Rejected',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING   => '#f59e0b',
            self::APPROVED  => '#22c55e',
            self::REJECTED  => '#ef4444',
            self::CANCELLED => '#6b7280',
        };
    }

    /** @return string[] */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }
}
