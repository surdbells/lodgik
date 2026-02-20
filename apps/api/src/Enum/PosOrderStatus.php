<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum PosOrderStatus: string
{
    case OPEN = 'open';
    case SENT = 'sent';
    case PREPARING = 'preparing';
    case READY = 'ready';
    case SERVED = 'served';
    case PAID = 'paid';
    case CANCELLED = 'cancelled';

    public static function values(): array { return array_map(fn(self $s) => $s->value, self::cases()); }

    public function label(): string
    {
        return match ($this) {
            self::OPEN => 'Open', self::SENT => 'Sent to Kitchen',
            self::PREPARING => 'Preparing', self::READY => 'Ready',
            self::SERVED => 'Served', self::PAID => 'Paid',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::OPEN => '#6b7280', self::SENT => '#3b82f6',
            self::PREPARING => '#f59e0b', self::READY => '#22c55e',
            self::SERVED => '#8b5cf6', self::PAID => '#10b981',
            self::CANCELLED => '#ef4444',
        };
    }
}
