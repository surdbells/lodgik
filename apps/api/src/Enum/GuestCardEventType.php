<?php
declare(strict_types=1);
namespace Lodgik\Enum;

enum GuestCardEventType: string
{
    case CHECK_IN          = 'check_in';
    case CHECK_OUT         = 'check_out';
    case RECEPTION_LOOKUP  = 'reception_lookup';
    case ENTRY             = 'entry';
    case EXIT              = 'exit';
    case SECURITY_ENTRY    = 'security_entry';
    case SECURITY_EXIT     = 'security_exit';
    case FACILITY_ACCESS   = 'facility_access';
    case POS_CHARGE        = 'pos_charge';
    case LOST_REPORTED     = 'lost_reported';
    case DEACTIVATED       = 'deactivated';
    case ACCESS_DENIED     = 'access_denied';

    public function label(): string
    {
        return match($this) {
            self::CHECK_IN         => 'Check-In Card Issue',
            self::CHECK_OUT        => 'Checkout Scan',
            self::RECEPTION_LOOKUP => 'Reception Lookup',
            self::ENTRY            => 'Premises Entry',
            self::EXIT             => 'Premises Exit',
            self::SECURITY_ENTRY   => 'Security Entry',
            self::SECURITY_EXIT    => 'Security Final Exit',
            self::FACILITY_ACCESS  => 'Facility Access',
            self::POS_CHARGE       => 'POS Charge',
            self::LOST_REPORTED    => 'Card Reported Lost',
            self::DEACTIVATED      => 'Card Deactivated',
            self::ACCESS_DENIED    => 'Access Denied',
        };
    }

    public function icon(): string
    {
        return match($this) {
            self::CHECK_IN         => '🏷️',
            self::CHECK_OUT        => '🚪',
            self::RECEPTION_LOOKUP => '🔍',
            self::ENTRY            => '➡️',
            self::EXIT             => '⬅️',
            self::SECURITY_ENTRY   => '🛡️',
            self::SECURITY_EXIT    => '🚶',
            self::FACILITY_ACCESS  => '🏊',
            self::POS_CHARGE       => '💳',
            self::LOST_REPORTED    => '❗',
            self::DEACTIVATED      => '🚫',
            self::ACCESS_DENIED    => '⛔',
        };
    }
}
