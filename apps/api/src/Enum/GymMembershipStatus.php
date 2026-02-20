<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum GymMembershipStatus: string
{
    case ACTIVE = 'active';
    case EXPIRED = 'expired';
    case SUSPENDED = 'suspended';
    case CANCELLED = 'cancelled';

    public static function values(): array { return array_map(fn(self $s) => $s->value, self::cases()); }

    public function label(): string
    {
        return match ($this) {
            self::ACTIVE => 'Active', self::EXPIRED => 'Expired',
            self::SUSPENDED => 'Suspended', self::CANCELLED => 'Cancelled',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::ACTIVE => '#22c55e', self::EXPIRED => '#ef4444',
            self::SUSPENDED => '#f59e0b', self::CANCELLED => '#6b7280',
        };
    }
}
