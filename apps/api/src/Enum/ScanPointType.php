<?php
declare(strict_types=1);
namespace Lodgik\Enum;

enum ScanPointType: string
{
    case RECEPTION  = 'reception';
    case SECURITY   = 'security';
    case FACILITY   = 'facility';
    case POS        = 'pos';
    case ENTRY_GATE = 'entry_gate';
    case EXIT_GATE  = 'exit_gate';

    public function label(): string
    {
        return match($this) {
            self::RECEPTION  => 'Reception',
            self::SECURITY   => 'Security Post',
            self::FACILITY   => 'Facility',
            self::POS        => 'POS Terminal',
            self::ENTRY_GATE => 'Entry Gate',
            self::EXIT_GATE  => 'Exit Gate',
        };
    }
}
