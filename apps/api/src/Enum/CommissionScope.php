<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum CommissionScope: string
{
    case NEW_SUBSCRIPTION = 'new_subscription';
    case RENEWAL = 'renewal';
    case UPGRADE = 'upgrade';

    public function label(): string
    {
        return match ($this) {
            self::NEW_SUBSCRIPTION => 'New Subscription',
            self::RENEWAL => 'Renewal',
            self::UPGRADE => 'Upgrade',
        };
    }

    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }
}
