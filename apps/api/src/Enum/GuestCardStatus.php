<?php
declare(strict_types=1);
namespace Lodgik\Enum;

enum GuestCardStatus: string
{
    case AVAILABLE       = 'available';
    case ISSUED          = 'issued';
    /** Card issued by security at gate — sitting in pending pool, not yet attached to a booking. */
    case PENDING_CHECKIN = 'pending_checkin';
    case ACTIVE          = 'active';
    case DEACTIVATED     = 'deactivated';
    case LOST            = 'lost';
    case REPLACED        = 'replaced';

    public function label(): string
    {
        return match($this) {
            self::AVAILABLE       => 'Available',
            self::ISSUED          => 'Issued',
            self::PENDING_CHECKIN => 'Pending Check-in',
            self::ACTIVE          => 'Active',
            self::DEACTIVATED     => 'Deactivated',
            self::LOST            => 'Lost',
            self::REPLACED        => 'Replaced',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::AVAILABLE       => '#6b7280',
            self::ISSUED          => '#3b82f6',
            self::PENDING_CHECKIN => '#f97316',   // orange — waiting at gate
            self::ACTIVE          => '#22c55e',
            self::DEACTIVATED     => '#f59e0b',
            self::LOST            => '#ef4444',
            self::REPLACED        => '#8b5cf6',
        };
    }

    public function isUsable(): bool
    {
        return in_array($this, [self::ISSUED, self::PENDING_CHECKIN, self::ACTIVE]);
    }
}
