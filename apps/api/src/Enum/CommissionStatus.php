<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum CommissionStatus: string
{
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case PAYABLE = 'payable';
    case PAID = 'paid';
    case REVERSED = 'reversed';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::APPROVED => 'Approved',
            self::PAYABLE => 'Payable',
            self::PAID => 'Paid',
            self::REVERSED => 'Reversed',
        };
    }

    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }
}
