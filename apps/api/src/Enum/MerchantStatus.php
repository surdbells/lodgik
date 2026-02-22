<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum MerchantStatus: string
{
    case PENDING_APPROVAL = 'pending_approval';
    case KYC_IN_PROGRESS = 'kyc_in_progress';
    case ACTIVE = 'active';
    case SUSPENDED = 'suspended';
    case TERMINATED = 'terminated';

    public function label(): string
    {
        return match ($this) {
            self::PENDING_APPROVAL => 'Pending Approval',
            self::KYC_IN_PROGRESS => 'KYC In Progress',
            self::ACTIVE => 'Active',
            self::SUSPENDED => 'Suspended',
            self::TERMINATED => 'Terminated',
        };
    }

    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }
}
