<?php
declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Upsert all 45 feature modules into feature_modules.
 *
 * The seed script (bin/seed-features.php) only runs once and skips entirely
 * if the table already has rows. Production databases seeded before a new
 * module was added will silently be missing that row — causing 403 "feature
 * not available" errors for all tenants.
 *
 * This migration uses ON CONFLICT (module_key) DO UPDATE so it is idempotent:
 * safe to run on any database state.
 */
final class Version20260306300001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Upsert all 45 feature modules (idempotent — fixes missing rows on seeded DBs)';
    }

    public function up(Schema $schema): void
    {
        // Helper: one upsert per module
        // ON CONFLICT updates name/description/tier/category so corrections
        // made in the seed file are also applied to existing rows.
        $rows = $this->modules();

        foreach ($rows as $m) {
            [$key, $name, $desc, $cat, $tier, $core, $deps, $requiredBy, $icon, $sort] = $m;

            $coreVal     = $core     ? 'TRUE'  : 'FALSE';
            $depsJson    = json_encode($deps,       JSON_UNESCAPED_SLASHES);
            $reqByJson   = json_encode($requiredBy, JSON_UNESCAPED_SLASHES);
            $descVal     = $desc === null ? 'NULL' : "'" . addslashes($desc) . "'";

            $this->addSql(<<<SQL
                INSERT INTO feature_modules
                    (id, module_key, name, description, category, min_tier,
                     is_core, dependencies, required_by, icon, sort_order,
                     is_active, created_at, updated_at)
                VALUES (
                    gen_random_uuid()::text,
                    '{$key}',
                    '{$name}',
                    {$descVal},
                    '{$cat}',
                    '{$tier}',
                    {$coreVal},
                    '{$depsJson}',
                    '{$reqByJson}',
                    '{$icon}',
                    {$sort},
                    TRUE,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (module_key) DO UPDATE SET
                    name        = EXCLUDED.name,
                    description = EXCLUDED.description,
                    category    = EXCLUDED.category,
                    min_tier    = EXCLUDED.min_tier,
                    is_core     = EXCLUDED.is_core,
                    dependencies= EXCLUDED.dependencies,
                    required_by = EXCLUDED.required_by,
                    icon        = EXCLUDED.icon,
                    sort_order  = EXCLUDED.sort_order,
                    is_active   = TRUE,
                    updated_at  = CURRENT_TIMESTAMP
            SQL);
        }
    }

    public function down(Schema $schema): void
    {
        // Intentionally empty — removing module rows would break existing plans.
    }

    /** @return array<array{0:string,1:string,2:string|null,3:string,4:string,5:bool,6:string[],7:string[],8:string,9:int}> */
    private function modules(): array
    {
        // [key, name, description, category, min_tier, is_core, deps[], required_by[], icon, sort]
        $raw = [
            // ── Core (5) ──────────────────────────────────────────────────────
            ['auth',                    'Authentication & Authorization', null, 'core',         'all',          true,  [],                                                []],
            ['booking_engine',          'Booking Management',            null, 'core',         'all',          true,  [],                                                []],
            ['room_management',         'Room Management',               null, 'core',         'all',          true,  [],                                                []],
            ['guest_management',        'Guest Management',              null, 'core',         'all',          true,  [],                                                []],
            ['dashboard',               'Basic Dashboard',               null, 'core',         'all',          true,  [],                                                []],

            // ── Operations (8) ────────────────────────────────────────────────
            ['service_requests',        'Service Requests',              null, 'operations',   'starter',      true,  [],                                                []],
            ['staff_tasks',             'Staff Task Management',         null, 'operations',   'starter',      true,  [],                                                []],
            ['guest_access_codes',      'Guest Cards & Access',          'RFID/QR dual-interface card inventory, scanner, scan points and event audit log',
                                                                              'operations',   'professional', false, ['booking_engine'],                                []],
            ['stay_extensions',         'Stay Extensions',               null, 'operations',   'professional', false, ['booking_engine'],                                []],
            ['housekeeping',            'Housekeeping Management',       null, 'operations',   'professional', false, ['room_management'],                               []],
            ['inventory_management',    'Inventory Management',          'Stock tracking, goods received notes, purchase orders, procurement and inventory reports',
                                                                              'operations',   'professional', false, [],                                                []],
            ['multi_property',          'Multi-Property Support',        null, 'operations',   'enterprise',   false, [],                                                []],
            ['white_label',             'White-Label Branding',          null, 'operations',   'enterprise',   false, [],                                                []],

            // ── Finance (5) ───────────────────────────────────────────────────
            ['folio_billing',           'Folio & Billing',               null, 'finance',      'starter',      true,  ['booking_engine'],                                []],
            ['invoice_generation',      'Invoice Generation',            null, 'finance',      'professional', false, ['folio_billing'],                                 []],
            ['manual_payment',          'Manual Payment Confirmation',   null, 'finance',      'starter',      true,  ['folio_billing'],                                 []],
            ['dynamic_pricing',         'Dynamic Pricing',               null, 'finance',      'professional', false, ['room_management'],                               []],
            ['vat_tax_engine',          'VAT & Tax Engine',              null, 'finance',      'professional', false, ['invoice_generation'],                            []],

            // ── HR (7) ────────────────────────────────────────────────────────
            ['employee_management',     'Employee Management',           null, 'hr',           'professional', false, [],                                                []],
            ['attendance_shifts',       'Attendance & Shifts',           null, 'hr',           'professional', false, ['employee_management'],                           []],
            ['leave_management',        'Leave Management',              null, 'hr',           'professional', false, ['employee_management'],                           []],
            ['payroll',                 'Payroll (Nigeria PAYE)',        null, 'hr',           'business',     false, ['employee_management'],                           []],
            ['paystack_salary',         'Paystack Salary Transfers',     null, 'hr',           'business',     false, ['payroll'],                                       []],
            ['performance_reviews',     'Performance Reviews',           null, 'hr',           'business',     false, ['employee_management'],                           []],
            ['asset_management',        'Asset Management',              null, 'hr',           'professional', false, ['employee_management'],                           []],

            // ── F&B (3) ───────────────────────────────────────────────────────
            ['bar_pos',                 'Bar/Restaurant POS',            null, 'fb',           'professional', false, [],                                                []],
            ['kitchen_display',         'Kitchen Display System',        null, 'fb',           'professional', false, ['bar_pos'],                                       []],
            ['menu_management',         'Menu Management',               null, 'fb',           'professional', false, ['bar_pos'],                                       []],

            // ── Facilities (1) ────────────────────────────────────────────────
            ['gym_membership',          'Gym Membership Management',     null, 'facilities',   'professional', false, ['guest_management'],                              []],

            // ── Guest Experience (4) ──────────────────────────────────────────
            ['guest_chat',              'Guest Chat',                    null, 'guest',        'professional', false, ['guest_management'],                              []],
            ['concierge_tablet',        'Concierge Tablet',              null, 'guest',        'enterprise',   false, ['guest_management', 'booking_engine'],            []],
            ['guest_pwa',               'Guest PWA',                     null, 'guest',        'professional', false, ['guest_management', 'booking_engine'],            []],
            ['loyalty_program',         'Loyalty Program',               null, 'guest',        'business',     false, ['guest_management'],                              []],

            // ── Analytics (3) ─────────────────────────────────────────────────
            ['basic_analytics',         'Basic Analytics',               null, 'analytics',    'all',          false, [],                                                []],
            ['advanced_analytics',      'Advanced Analytics',            null, 'analytics',    'business',     false, ['basic_analytics'],                               []],
            ['custom_reports',          'Custom Reports',                null, 'analytics',    'enterprise',   false, ['basic_analytics'],                               []],

            // ── Marketing (2) ─────────────────────────────────────────────────
            ['promotions_campaigns',    'Promotions & Campaigns',        null, 'marketing',    'professional', false, ['guest_management'],                              []],
            ['push_notifications',      'Push Notifications',            null, 'marketing',    'professional', false, ['guest_management'],                              []],

            // ── Integrations (4) ──────────────────────────────────────────────
            ['email_notifications',     'Email Notifications',           null, 'integrations', 'all',          false, [],                                                []],
            ['whatsapp_messaging',      'WhatsApp Messaging',            null, 'integrations', 'business',     false, ['guest_management'],                              []],
            ['thermal_printing',        'Thermal Printing',              null, 'integrations', 'professional', false, ['booking_engine'],                                []],
            ['multi_language',          'Multi-Language',                null, 'integrations', 'enterprise',   false, [],                                                []],

            // ── Security (3) ──────────────────────────────────────────────────
            ['security_incidents',      'Security Incidents',            null, 'security',     'professional', false, [],                                                []],
            ['audit_logging',           'Audit Logging',                 null, 'security',     'business',     false, [],                                                []],
            ['advanced_access_control', 'Advanced Access Control',       null, 'security',     'enterprise',   false, ['auth'],                                          []],
        ];

        // Icon + sort order map
        $meta = [
            'auth'                    => ['lock',             1],
            'booking_engine'          => ['calendar',         2],
            'room_management'         => ['bed',              3],
            'guest_management'        => ['people',           4],
            'dashboard'               => ['dashboard',        5],
            'service_requests'        => ['room_service',    10],
            'staff_tasks'             => ['task',            11],
            'guest_access_codes'      => ['credit-card',     12],
            'stay_extensions'         => ['schedule',        13],
            'housekeeping'            => ['cleaning',        14],
            'inventory_management'    => ['inventory',       15],
            'multi_property'          => ['business',        16],
            'white_label'             => ['palette',         17],
            'folio_billing'           => ['receipt',         20],
            'invoice_generation'      => ['receipt_long',    21],
            'manual_payment'          => ['payments',        22],
            'dynamic_pricing'         => ['trending_up',     23],
            'vat_tax_engine'          => ['calculate',       24],
            'employee_management'     => ['badge',           30],
            'attendance_shifts'       => ['schedule',        31],
            'leave_management'        => ['event_busy',      32],
            'payroll'                 => ['account_balance', 33],
            'paystack_salary'         => ['send',            34],
            'performance_reviews'     => ['rate_review',     35],
            'asset_management'        => ['devices',         36],
            'bar_pos'                 => ['restaurant',      40],
            'kitchen_display'         => ['monitor',         41],
            'menu_management'         => ['menu_book',       42],
            'gym_membership'          => ['fitness',         45],
            'guest_chat'              => ['chat',            50],
            'concierge_tablet'        => ['tablet',          51],
            'guest_pwa'               => ['phone_iphone',    52],
            'loyalty_program'         => ['loyalty',         53],
            'basic_analytics'         => ['bar_chart',       60],
            'advanced_analytics'      => ['analytics',       61],
            'custom_reports'          => ['summarize',       62],
            'promotions_campaigns'    => ['campaign',        70],
            'push_notifications'      => ['notifications',   71],
            'email_notifications'     => ['email',           80],
            'whatsapp_messaging'      => ['chat_bubble',     81],
            'thermal_printing'        => ['print',           82],
            'multi_language'          => ['translate',       83],
            'security_incidents'      => ['security',        90],
            'audit_logging'           => ['history',         91],
            'advanced_access_control' => ['admin_panel',     92],
        ];

        // Compute required_by (reverse dependency map)
        $requiredByMap = [];
        foreach ($raw as [$key, , , , , , $deps]) {
            foreach ($deps as $dep) {
                $requiredByMap[$dep][] = $key;
            }
        }

        $result = [];
        foreach ($raw as [$key, $name, $desc, $cat, $tier, $core, $deps]) {
            [$icon, $sort] = $meta[$key];
            $requiredBy = $requiredByMap[$key] ?? [];
            $result[] = [$key, $name, $desc, $cat, $tier, $core, $deps, $requiredBy, $icon, $sort];
        }

        return $result;
    }
}
