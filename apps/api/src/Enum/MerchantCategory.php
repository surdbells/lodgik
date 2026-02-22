<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum MerchantCategory: string
{
    case SALES_AGENT = 'sales_agent';
    case CHANNEL_PARTNER = 'channel_partner';
    case CONSULTANT = 'consultant';

    public function label(): string
    {
        return match ($this) {
            self::SALES_AGENT => 'Sales Agent',
            self::CHANNEL_PARTNER => 'Channel Partner',
            self::CONSULTANT => 'Consultant',
        };
    }

    public static function values(): array
    {
        return array_map(fn(self $c) => $c->value, self::cases());
    }
}
