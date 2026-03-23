<?php declare(strict_types=1);

namespace Lodgik\Enum;

enum EmploymentType: string
{
    case PERMANENT  = 'permanent';
    case CONTRACT   = 'contract';
    case AD_HOC     = 'ad_hoc';
    case INTERN     = 'intern';
    case VOLUNTEER  = 'volunteer';

    public function label(): string
    {
        return match ($this) {
            self::PERMANENT => 'Permanent',
            self::CONTRACT  => 'Contract',
            self::AD_HOC    => 'Ad Hoc',
            self::INTERN    => 'Intern',
            self::VOLUNTEER => 'Volunteer',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PERMANENT => '#4A7A4A',   // sage green
            self::CONTRACT  => '#2563EB',   // blue
            self::AD_HOC    => '#D97706',   // amber
            self::INTERN    => '#7C3AED',   // purple
            self::VOLUNTEER => '#059669',   // emerald
        };
    }

    public function bgColor(): string
    {
        return match ($this) {
            self::PERMANENT => '#E8F0E8',
            self::CONTRACT  => '#EFF6FF',
            self::AD_HOC    => '#FEF3C7',
            self::INTERN    => '#F5F3FF',
            self::VOLUNTEER => '#ECFDF5',
        };
    }

    public function isFixed(): bool
    {
        return in_array($this, [self::CONTRACT, self::AD_HOC, self::INTERN], true);
    }

    /** @return string[] */
    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }

    public static function options(): array
    {
        return array_map(fn(self $s) => ['value' => $s->value, 'label' => $s->label()], self::cases());
    }
}
