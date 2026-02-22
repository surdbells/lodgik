<?php

declare(strict_types=1);

namespace Lodgik\Enum;

enum UserRole: string
{
    case SUPER_ADMIN = 'super_admin';
    case PROPERTY_ADMIN = 'property_admin';
    case MANAGER = 'manager';
    case FRONT_DESK = 'front_desk';
    case HOUSEKEEPING = 'housekeeping';
    case BAR = 'bar';
    case KITCHEN = 'kitchen';
    case ACCOUNTANT = 'accountant';
    case HR = 'hr';
    case CONCIERGE = 'concierge';
    case MAINTENANCE = 'maintenance';
    case GYM_STAFF = 'gym_staff';
    case SECURITY = 'security';
    case ENGINEER = 'engineer';
    case MERCHANT_ADMIN = 'merchant_admin';
    case MERCHANT_AGENT = 'merchant_agent';

    /**
     * Roles that can manage a property's settings.
     */
    public static function adminRoles(): array
    {
        return [
            self::SUPER_ADMIN,
            self::PROPERTY_ADMIN,
        ];
    }

    /**
     * Roles that can manage staff and operations.
     */
    public static function managementRoles(): array
    {
        return [
            self::SUPER_ADMIN,
            self::PROPERTY_ADMIN,
            self::MANAGER,
        ];
    }

    /**
     * Merchant portal roles.
     */
    public static function merchantRoles(): array
    {
        return [
            self::MERCHANT_ADMIN,
            self::MERCHANT_AGENT,
        ];
    }

    /**
     * All role values as a flat string array.
     */
    public static function values(): array
    {
        return array_map(fn(self $role) => $role->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::SUPER_ADMIN => 'Super Admin',
            self::PROPERTY_ADMIN => 'Property Admin',
            self::MANAGER => 'Manager',
            self::FRONT_DESK => 'Front Desk',
            self::HOUSEKEEPING => 'Housekeeping',
            self::BAR => 'Bar Staff',
            self::KITCHEN => 'Kitchen Staff',
            self::ACCOUNTANT => 'Accountant',
            self::HR => 'HR',
            self::CONCIERGE => 'Concierge',
            self::MAINTENANCE => 'Maintenance',
            self::GYM_STAFF => 'Gym Staff',
            self::SECURITY => 'Security',
            self::ENGINEER => 'Engineer',
            self::MERCHANT_ADMIN => 'Merchant Admin',
            self::MERCHANT_AGENT => 'Merchant Agent',
        };
    }
}
