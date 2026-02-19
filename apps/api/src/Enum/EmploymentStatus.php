<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum EmploymentStatus: string
{
    case ACTIVE     = 'active';
    case PROBATION  = 'probation';
    case SUSPENDED  = 'suspended';
    case TERMINATED = 'terminated';
    case RESIGNED   = 'resigned';

    public function label(): string
    {
        return match ($this) {
            self::ACTIVE     => 'Active',
            self::PROBATION  => 'Probation',
            self::SUSPENDED  => 'Suspended',
            self::TERMINATED => 'Terminated',
            self::RESIGNED   => 'Resigned',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::ACTIVE     => '#22c55e',
            self::PROBATION  => '#f59e0b',
            self::SUSPENDED  => '#ef4444',
            self::TERMINATED => '#6b7280',
            self::RESIGNED   => '#8b5cf6',
        };
    }

    public function isEmployed(): bool
    {
        return in_array($this, [self::ACTIVE, self::PROBATION], true);
    }

    /** @return string[] */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }
}
