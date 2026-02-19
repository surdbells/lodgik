<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum FolioStatus: string
{
    case OPEN = 'open';
    case CLOSED = 'closed';
    case VOID = 'void';

    /** @return string[] */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::OPEN => 'Open',
            self::CLOSED => 'Closed',
            self::VOID => 'Void',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::OPEN => '#22c55e',
            self::CLOSED => '#6b7280',
            self::VOID => '#ef4444',
        };
    }
}
