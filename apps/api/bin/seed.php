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

$args = array_slice($argv, 1);
$fresh = in_array('--fresh', $args, true);
$plansOnly = in_array('--plans-only', $args, true);

echo "🌱 Lodgik Database Seeder\n========================\n\n";

function uuid(): string { $b=random_bytes(16); $b[6]=chr((ord($b[6])&0x0f)|0x40); $b[8]=chr((ord($b[8])&0x3f)|0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex($b),4)); }
function ins(PDO $p, string $t, array $r): void { $c=implode(',',array_keys($r)); $v=implode(',',array_fill(0,count($r),'?')); $s=$p->prepare("INSERT INTO {$t} ({$c}) VALUES ({$v})"); $s->execute(array_values($r)); }
function cnt(PDO $p, string $sql) { return $p->query($sql)->fetchColumn(); }

$now = date('Y-m-d H:i:s');
$hash = password_hash('Demo1234!', PASSWORD_ARGON2ID);

if ($fresh) {
    echo "🗑️  Clearing all data...\n";
    foreach (['user_properties','property_bank_accounts','refresh_tokens','audit_logs','users','properties','subscription_plans','tenants'] as $t) {
        try { $pdo->exec("TRUNCATE TABLE {$t} CASCADE"); echo "   Truncated: {$t}\n"; } catch (\Throwable $e) { echo "   Skip: {$t}\n"; }
    }
    echo "\n";
}

// ─── Plans ─────────────────────────────────────────────────────
echo "📋 Seeding subscription plans...\n";
if ((int)cnt($pdo, "SELECT COUNT(*) FROM subscription_plans") > 0 && !$fresh) {
    echo "   Skipped (exist). Use --fresh.\n\n";
} else {
    $plans = [
        ['Starter','starter','Perfect for small guesthouses and lodges.',999900,9999000,15,5,1,1,14, ['room_management','guest_management','booking_engine','front_desk','dashboard','service_requests','staff_tasks']],
        ['Professional','professional','For growing hotels with housekeeping and bar POS.',2999900,29999000,50,15,3,2,14, ['room_management','guest_management','booking_engine','front_desk','dashboard','service_requests','staff_tasks','housekeeping','bar_pos','kitchen_display','menu_management','invoice_generation','dynamic_pricing','vat_tax_engine','guest_access_codes','stay_extensions','inventory_management','gym_membership','guest_chat','guest_pwa','security_incidents','thermal_printing']],
        ['Business','business','Full-featured with HR, payroll, and analytics.',5999900,59999000,150,40,5,3,14, ['room_management','guest_management','booking_engine','front_desk','dashboard','service_requests','staff_tasks','housekeeping','bar_pos','kitchen_display','menu_management','invoice_generation','dynamic_pricing','vat_tax_engine','guest_access_codes','stay_extensions','inventory_management','gym_membership','guest_chat','guest_pwa','security_incidents','thermal_printing','employee_management','attendance_shifts','leave_management','payroll','paystack_salary','performance_reviews','asset_management','loyalty_program','basic_analytics','advanced_analytics','whatsapp_messaging','audit_logging']],
        ['Enterprise','enterprise','Unlimited. Multi-property, white-label, custom reports.',9999900,99999000,999,999,20,4,30, ['room_management','guest_management','booking_engine','front_desk','dashboard','service_requests','staff_tasks','housekeeping','bar_pos','kitchen_display','menu_management','invoice_generation','dynamic_pricing','vat_tax_engine','guest_access_codes','stay_extensions','inventory_management','gym_membership','guest_chat','guest_pwa','concierge_tablet','security_incidents','thermal_printing','employee_management','attendance_shifts','leave_management','payroll','paystack_salary','performance_reviews','asset_management','loyalty_program','basic_analytics','advanced_analytics','custom_reports','whatsapp_messaging','multi_property','white_label','multi_language','advanced_access_control','audit_logging','promotions_campaigns','push_notifications','email_notifications']],
    ];
    foreach ($plans as [$n,$tier,$desc,$mp,$ap,$mr,$ms,$mprop,$sort,$trial,$mods]) {
        ins($pdo, 'subscription_plans', ['id'=>uuid(),'name'=>$n,'tier'=>$tier,'description'=>$desc,'monthly_price'=>$mp,'annual_price'=>$ap,'currency'=>'NGN','max_rooms'=>$mr,'max_staff'=>$ms,'max_properties'=>$mprop,'included_modules'=>json_encode($mods),'feature_flags'=>'{}','is_public'=>'true','is_active'=>'true','sort_order'=>$sort,'trial_days'=>$trial,'created_at'=>$now,'updated_at'=>$now]);
        echo "   ✅ {$n} (₦".number_format($mp/100)."/mo)\n";
    }
    echo "\n";
}

if ($plansOnly) { echo "✅ Done.\n"; exit(0); }

$proPlanId = cnt($pdo, "SELECT id FROM subscription_plans WHERE tier = 'professional'");
$starterPlanId = cnt($pdo, "SELECT id FROM subscription_plans WHERE tier = 'starter'");

// ─── Super Admin ───────────────────────────────────────────────
echo "👤 Seeding super admin...\n";
if ((int)cnt($pdo, "SELECT COUNT(*) FROM users WHERE role = 'super_admin'") > 0 && !$fresh) {
    echo "   Skipped.\n\n";
} else {
    $ptid = uuid();
    ins($pdo, 'tenants', ['id'=>$ptid,'name'=>'Lodgik Platform','slug'=>'lodgik-platform','email'=>'admin@lodgik.com','subscription_status'=>'active','max_rooms'=>999,'max_staff'=>999,'max_properties'=>999,'enabled_modules'=>json_encode(['all']),'is_active'=>'true','created_at'=>$now,'updated_at'=>$now]);
    ins($pdo, 'users', ['id'=>uuid(),'firstname'=>'Platform','lastname'=>'Admin','email'=>'admin@lodgik.com','password_hash'=>password_hash('LodgikAdmin2026!',PASSWORD_ARGON2ID),'role'=>'super_admin','tenant_id'=>$ptid,'is_active'=>'true','email_verified_at'=>$now,'created_at'=>$now,'updated_at'=>$now]);
    echo "   ✅ admin@lodgik.com / LodgikAdmin2026!\n\n";
}

// ─── Tenant 1: Grand Palace Hotel ──────────────────────────────
echo "🏨 Seeding Grand Palace Hotel...\n";
if ((int)cnt($pdo, "SELECT COUNT(*) FROM tenants WHERE slug = 'grand-palace-lagos'") > 0 && !$fresh) {
    echo "   Skipped.\n\n";
} else {
    $t1=uuid(); $p1=uuid(); $p2=uuid();
    ins($pdo, 'tenants', ['id'=>$t1,'name'=>'Grand Palace Hotel','slug'=>'grand-palace-lagos','email'=>'info@grandpalace.ng','phone'=>'+2349012345678','subscription_plan_id'=>$proPlanId,'subscription_status'=>'active','max_rooms'=>50,'max_staff'=>15,'max_properties'=>3,'enabled_modules'=>json_encode(['room_management','guest_management','booking_engine','front_desk','dashboard','housekeeping','bar_pos','kitchen_display']),'primary_color'=>'#1a1a2e','secondary_color'=>'#e94560','is_active'=>'true','created_at'=>$now,'updated_at'=>$now]);

    ins($pdo, 'properties', ['id'=>$p1,'name'=>'Grand Palace Lagos','slug'=>'grand-palace-lagos','email'=>'lagos@grandpalace.ng','phone'=>'+2349012345678','address'=>'15 Adeola Odeku Street, Victoria Island','city'=>'Lagos','state'=>'Lagos','country'=>'NG','star_rating'=>4,'check_in_time'=>'14:00','check_out_time'=>'12:00','timezone'=>'Africa/Lagos','currency'=>'NGN','is_active'=>'true','tenant_id'=>$t1,'created_at'=>$now,'updated_at'=>$now]);
    ins($pdo, 'properties', ['id'=>$p2,'name'=>'Grand Palace Abuja','slug'=>'grand-palace-abuja','email'=>'abuja@grandpalace.ng','phone'=>'+2349087654321','address'=>'42 Aminu Kano Crescent, Wuse 2','city'=>'Abuja','state'=>'FCT','country'=>'NG','star_rating'=>3,'check_in_time'=>'15:00','check_out_time'=>'11:00','timezone'=>'Africa/Lagos','currency'=>'NGN','is_active'=>'true','tenant_id'=>$t1,'created_at'=>$now,'updated_at'=>$now]);

    ins($pdo, 'property_bank_accounts', ['id'=>uuid(),'property_id'=>$p1,'bank_name'=>'GTBank','account_number'=>'0123456789','account_name'=>'Grand Palace Hotels Ltd','bank_code'=>'058','is_primary'=>'true','is_active'=>'true','tenant_id'=>$t1,'created_at'=>$now,'updated_at'=>$now]);
    ins($pdo, 'property_bank_accounts', ['id'=>uuid(),'property_id'=>$p1,'bank_name'=>'Access Bank','account_number'=>'9876543210','account_name'=>'Grand Palace Hotels Ltd','bank_code'=>'044','is_primary'=>'false','is_active'=>'true','tenant_id'=>$t1,'created_at'=>$now,'updated_at'=>$now]);

    $aid=uuid(); $mid=uuid();
    $staff = [
        [$aid,'Adebayo','Ogunlesi','adebayo@grandpalace.ng','property_admin',$p1],
        [$mid,'Chioma','Eze','chioma@grandpalace.ng','manager',$p1],
        [uuid(),'Fatima','Bello','fatima@grandpalace.ng','front_desk',$p1],
        [uuid(),'Emeka','Nwosu','emeka@grandpalace.ng','bar',$p1],
        [uuid(),'Aisha','Yusuf','aisha@grandpalace.ng','housekeeping',$p1],
        [uuid(),'David','Okafor','david@grandpalace.ng','kitchen',$p1],
        [uuid(),'Grace','Adeyemi','grace@grandpalace.ng','accountant',$p1],
        [uuid(),'Ibrahim','Mohammed','ibrahim@grandpalace.ng','concierge',$p1],
        [uuid(),'Kemi','Alabi','kemi@grandpalace.ng','manager',$p2],
        [uuid(),'Tunde','Bakare','tunde@grandpalace.ng','front_desk',$p2],
    ];
    foreach ($staff as [$uid,$fn,$ln,$em,$role,$pid]) {
        ins($pdo, 'users', ['id'=>$uid,'firstname'=>$fn,'lastname'=>$ln,'email'=>$em,'password_hash'=>$hash,'role'=>$role,'property_id'=>$pid,'tenant_id'=>$t1,'is_active'=>'true','email_verified_at'=>$now,'created_at'=>$now,'updated_at'=>$now]);
    }

    // Multi-property access
    foreach ([$aid,$mid] as $uid) {
        ins($pdo, 'user_properties', ['id'=>uuid(),'user_id'=>$uid,'property_id'=>$p1,'is_primary'=>'true','is_active'=>'true','tenant_id'=>$t1,'created_at'=>$now,'updated_at'=>$now]);
        ins($pdo, 'user_properties', ['id'=>uuid(),'user_id'=>$uid,'property_id'=>$p2,'is_primary'=>'false','is_active'=>'true','tenant_id'=>$t1,'created_at'=>$now,'updated_at'=>$now]);
    }
    echo "   ✅ 2 properties (Lagos ★4, Abuja ★3), 10 staff, 2 bank accounts\n\n";
}

// ─── Tenant 2: Sunshine Lodge ──────────────────────────────────
echo "🏨 Seeding Sunshine Lodge...\n";
if ((int)cnt($pdo, "SELECT COUNT(*) FROM tenants WHERE slug = 'sunshine-lodge-ikeja'") > 0 && !$fresh) {
    echo "   Skipped.\n\n";
} else {
    $t2=uuid(); $p3=uuid();
    ins($pdo, 'tenants', ['id'=>$t2,'name'=>'Sunshine Lodge','slug'=>'sunshine-lodge-ikeja','email'=>'info@sunshinelodge.ng','phone'=>'+2348012345678','subscription_plan_id'=>$starterPlanId,'subscription_status'=>'trial','trial_ends_at'=>date('Y-m-d H:i:s',strtotime('+14 days')),'max_rooms'=>15,'max_staff'=>5,'max_properties'=>1,'enabled_modules'=>json_encode(['room_management','guest_management','booking_engine','front_desk','dashboard']),'primary_color'=>'#f39c12','is_active'=>'true','created_at'=>$now,'updated_at'=>$now]);

    ins($pdo, 'properties', ['id'=>$p3,'name'=>'Sunshine Lodge Ikeja','slug'=>'sunshine-lodge-ikeja','email'=>'info@sunshinelodge.ng','phone'=>'+2348012345678','address'=>'8 Allen Avenue, Ikeja','city'=>'Lagos','state'=>'Lagos','country'=>'NG','star_rating'=>2,'check_in_time'=>'14:00','check_out_time'=>'12:00','timezone'=>'Africa/Lagos','currency'=>'NGN','is_active'=>'true','tenant_id'=>$t2,'created_at'=>$now,'updated_at'=>$now]);

    ins($pdo, 'property_bank_accounts', ['id'=>uuid(),'property_id'=>$p3,'bank_name'=>'First Bank','account_number'=>'3012345678','account_name'=>'Sunshine Lodge Enterprises','bank_code'=>'011','is_primary'=>'true','is_active'=>'true','tenant_id'=>$t2,'created_at'=>$now,'updated_at'=>$now]);

    foreach ([
        [uuid(),'Ngozi','Okoro','ngozi@sunshinelodge.ng','property_admin'],
        [uuid(),'James','Adekunle','james@sunshinelodge.ng','front_desk'],
        [uuid(),'Blessing','Udoh','blessing@sunshinelodge.ng','housekeeping'],
    ] as [$uid,$fn,$ln,$em,$role]) {
        ins($pdo, 'users', ['id'=>$uid,'firstname'=>$fn,'lastname'=>$ln,'email'=>$em,'password_hash'=>$hash,'role'=>$role,'property_id'=>$p3,'tenant_id'=>$t2,'is_active'=>'true','email_verified_at'=>$now,'created_at'=>$now,'updated_at'=>$now]);
    }
    echo "   ✅ 1 property (Ikeja ★2), 3 staff, 1 bank account\n\n";
}

// ─── Summary ───────────────────────────────────────────────────
echo "📊 Summary\n";
foreach (['tenants','users','properties','property_bank_accounts','subscription_plans','user_properties'] as $t) echo "   {$t}: ".cnt($pdo,"SELECT COUNT(*) FROM {$t}")."\n";
echo "\n🔑 Credentials\n";
echo "   Super Admin:    admin@lodgik.com / LodgikAdmin2026!\n";
echo "   Grand Palace:   adebayo@grandpalace.ng / Demo1234!\n";
echo "   Sunshine Lodge: ngozi@sunshinelodge.ng / Demo1234!\n";
echo "\n✅ Complete!\n";
