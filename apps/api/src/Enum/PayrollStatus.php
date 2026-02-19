<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum PayrollStatus: string
{
    case DRAFT      = 'draft';
    case CALCULATED = 'calculated';
    case REVIEWED   = 'reviewed';
    case APPROVED   = 'approved';
    case PAID       = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT      => 'Draft',
            self::CALCULATED => 'Calculated',
            self::REVIEWED   => 'Reviewed',
            self::APPROVED   => 'Approved',
            self::PAID       => 'Paid',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::DRAFT      => '#6b7280',
            self::CALCULATED => '#f59e0b',
            self::REVIEWED   => '#3b82f6',
            self::APPROVED   => '#22c55e',
            self::PAID       => '#10b981',
        };
    }

    /** @return string[] */
    public static function values(): array { return array_map(fn(self $s) => $s->value, self::cases()); }
}
