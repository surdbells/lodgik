#!/usr/bin/env php
<?php
declare(strict_types=1);
require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
$dotenv->safeLoad();

$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=%s', $_ENV['DB_HOST'] ?? 'localhost', $_ENV['DB_PORT'] ?? '5432', $_ENV['DB_NAME'] ?? 'lodgik'),
    $_ENV['DB_USER'] ?? 'lodgik', $_ENV['DB_PASS'] ?? 'lodgik_secret',
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$existing = (int) $pdo->query("SELECT COUNT(*) FROM feature_modules")->fetchColumn();
if ($existing > 0 && !in_array('--fresh', $argv, true)) {
    echo "Feature modules already seeded ({$existing}). Use --fresh to re-seed.\n";
    exit(0);
}

if (in_array('--fresh', $argv, true)) {
    $pdo->exec('TRUNCATE TABLE tenant_feature_modules CASCADE');
    $pdo->exec('TRUNCATE TABLE feature_modules CASCADE');
    echo "Cleared feature_modules tables.\n";
}

function uuid(): string { $b=random_bytes(16); $b[6]=chr((ord($b[6])&0x0f)|0x40); $b[8]=chr((ord($b[8])&0x3f)|0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex($b),4)); }

$now = date('Y-m-d H:i:s');

// [key, name, category, min_tier, is_core, dependencies[], icon, sort]
$modules = [
    // Core (5)
    ['auth',                   'Authentication & Authorization', 'core',       'all',          true,  [],                                           'lock',         1],
    ['booking_engine',         'Booking Management',             'core',       'all',          true,  [],                                           'calendar',     2],
    ['room_management',        'Room Management',                'core',       'all',          true,  [],                                           'bed',          3],
    ['guest_management',       'Guest Management',               'core',       'all',          true,  [],                                           'people',       4],
    ['dashboard',              'Basic Dashboard',                'core',       'all',          true,  [],                                           'dashboard',    5],

    // Operations (8)
    ['service_requests',       'Service Requests',               'operations', 'starter',      true,  [],                                           'room_service', 10],
    ['staff_tasks',            'Staff Task Management',          'operations', 'starter',      true,  [],                                           'task',         11],
    ['guest_access_codes',     'Guest Cards & Access',           'operations', 'professional', false, ['booking_engine'],                           'credit-card',  12],
    ['stay_extensions',        'Stay Extensions',                'operations', 'professional', false, ['booking_engine'],                           'schedule',     13],
    ['housekeeping',           'Housekeeping Management',        'operations', 'professional', false, ['room_management'],                         'cleaning',     14],
    ['inventory_management',   'Inventory Management',           'operations', 'professional', false, [],                                           'inventory',    15],
    ['multi_property',         'Multi-Property Support',         'operations', 'enterprise',   false, [],                                           'business',     16],
    ['white_label',            'White-Label Branding',           'operations', 'enterprise',   false, [],                                           'palette',      17],

    // Finance (5)
    ['folio_billing',          'Folio & Billing',                'finance',    'starter',      true,  ['booking_engine'],                           'receipt',      20],
    ['invoice_generation',     'Invoice Generation',             'finance',    'professional', false, ['folio_billing'],                            'receipt_long', 21],
    ['manual_payment',         'Manual Payment Confirmation',    'finance',    'starter',      true,  ['folio_billing'],                            'payments',     22],
    ['dynamic_pricing',        'Dynamic Pricing',                'finance',    'professional', false, ['room_management'],                         'trending_up',  23],
    ['vat_tax_engine',         'VAT & Tax Engine',               'finance',    'professional', false, ['invoice_generation'],                      'calculate',    24],

    // HR (7)
    ['employee_management',    'Employee Management',            'hr',         'professional', false, [],                                           'badge',        30],
    ['attendance_shifts',      'Attendance & Shifts',            'hr',         'professional', false, ['employee_management'],                     'schedule',     31],
    ['leave_management',       'Leave Management',               'hr',         'professional', false, ['employee_management'],                     'event_busy',   32],
    ['payroll',                'Payroll (Nigeria PAYE)',          'hr',         'business',     false, ['employee_management'],                     'account_balance',33],
    ['paystack_salary',        'Paystack Salary Transfers',      'hr',         'business',     false, ['payroll'],                                  'send',         34],
    ['performance_reviews',    'Performance Reviews',            'hr',         'business',     false, ['employee_management'],                     'rate_review',  35],
    ['asset_management',       'Asset Management',               'hr',         'professional', false, ['employee_management'],                     'devices',      36],

    // F&B (3)
    ['bar_pos',                'Bar/Restaurant POS',             'fb',         'professional', false, [],                                           'restaurant',   40],
    ['kitchen_display',        'Kitchen Display System',          'fb',         'professional', false, ['bar_pos'],                                  'monitor',      41],
    ['menu_management',        'Menu Management',                'fb',         'professional', false, ['bar_pos'],                                  'menu_book',    42],

    // Facilities (1)
    ['gym_membership',         'Gym Membership Management',      'facilities', 'professional', false, ['guest_management'],                        'fitness',      45],

    // Guest Experience (4)
    ['guest_chat',             'Guest Chat',                     'guest',      'professional', false, ['guest_management'],                        'chat',         50],
    ['concierge_tablet',       'Concierge Tablet',               'guest',      'enterprise',   false, ['guest_management', 'booking_engine'],      'tablet',       51],
    ['guest_pwa',              'Guest PWA',                      'guest',      'professional', false, ['guest_management', 'booking_engine'],      'phone_iphone', 52],
    ['loyalty_program',        'Loyalty Program',                'guest',      'business',     false, ['guest_management'],                        'loyalty',      53],

    // Analytics (3)
    ['basic_analytics',        'Basic Analytics',                'analytics',  'all',          false, [],                                           'bar_chart',    60],
    ['advanced_analytics',     'Advanced Analytics',             'analytics',  'business',     false, ['basic_analytics'],                         'analytics',    61],
    ['custom_reports',         'Custom Reports',                 'analytics',  'enterprise',   false, ['basic_analytics'],                         'summarize',    62],

    // Marketing (2)
    ['promotions_campaigns',   'Promotions & Campaigns',         'marketing',  'professional', false, ['guest_management'],                        'campaign',     70],
    ['push_notifications',     'Push Notifications',             'marketing',  'professional', false, ['guest_management'],                        'notifications',71],

    // Integrations (4)
    ['email_notifications',    'Email Notifications (ZeptoMail)','integrations','all',         false, [],                                           'email',        80],
    ['whatsapp_messaging',     'WhatsApp Messaging',             'integrations','business',    false, ['guest_management'],                        'chat_bubble',  81],
    ['thermal_printing',       'Thermal Printing',               'integrations','professional', false, ['booking_engine'],                          'print',        82],
    ['multi_language',         'Multi-Language',                  'integrations','enterprise',  false, [],                                           'translate',    83],

    // Security (3)
    ['security_incidents',     'Security Incidents',             'security',   'professional', false, [],                                           'security',     90],
    ['audit_logging',          'Audit Logging',                  'security',   'business',     false, [],                                           'history',      91],
    ['advanced_access_control','Advanced Access Control',        'security',   'enterprise',   false, ['auth'],                                    'admin_panel',  92],
];

echo "Seeding " . count($modules) . " feature modules...\n";

// Build dependency map for required_by computation
$depMap = [];
foreach ($modules as [$key, $name, $cat, $tier, $core, $deps, $icon, $sort]) {
    $depMap[$key] = $deps;
}

// Compute required_by (reverse dependencies)
$requiredByMap = [];
foreach ($depMap as $key => $deps) {
    foreach ($deps as $dep) {
        $requiredByMap[$dep][] = $key;
    }
}

$stmt = $pdo->prepare("INSERT INTO feature_modules (id, module_key, name, description, category, min_tier, is_core, dependencies, required_by, sort_order, is_active, icon, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

foreach ($modules as [$key, $name, $cat, $tier, $core, $deps, $icon, $sort]) {
    $reqBy = $requiredByMap[$key] ?? [];
    $stmt->execute([
        uuid(), $key, $name, null, $cat, $tier,
        $core ? 'true' : 'false',
        json_encode($deps), json_encode($reqBy),
        $sort, 'true', $icon, $now, $now,
    ]);
}

echo "✅ Seeded " . count($modules) . " feature modules\n";

// Verify counts by category
$cats = $pdo->query("SELECT category, COUNT(*) as cnt FROM feature_modules GROUP BY category ORDER BY category")->fetchAll(PDO::FETCH_ASSOC);
foreach ($cats as $c) echo "   {$c['category']}: {$c['cnt']}\n";

$coreCount = $pdo->query("SELECT COUNT(*) FROM feature_modules WHERE is_core = true")->fetchColumn();
echo "   Core modules: {$coreCount}\n";
echo "   Total: " . array_sum(array_column($cats, 'cnt')) . "\n";
