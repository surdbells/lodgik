<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum SubscriptionStatus: string
{
    case TRIAL = 'trial';
    case ACTIVE = 'active';
    case PAST_DUE = 'past_due';
    case CANCELLED = 'cancelled';
    case EXPIRED = 'expired';
    case SUSPENDED = 'suspended';

    public function isUsable(): bool
    {
        return match ($this) {
            self::TRIAL, self::ACTIVE, self::PAST_DUE => true,
            default => false,
        };
    }
}
