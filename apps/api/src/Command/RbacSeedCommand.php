<?php
declare(strict_types=1);

namespace Lodgik\Command;

use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'lodgik:rbac-seed', description: 'Seed RBAC permissions catalogue and role defaults')]
final class RbacSeedCommand extends AbstractCommand
{
    public function __construct(EntityManagerInterface $em, LoggerInterface $logger)
    {
        parent::__construct($em, $logger);
    }

    protected function handle(InputInterface $input, SymfonyStyle $io): int
    {
        $conn = $this->em->getConnection();
        $io->title('Seeding RBAC Permissions & Role Defaults');

        // ── All permissions: [module_key, action, label, description, sort_order]
        $permissions = [
            // ─── Dashboard ─────────────────────────────────────────────────
            ['dashboard', 'view',                    'View Dashboard',                  'Access the main dashboard and KPI overview', 10],
            ['dashboard', 'view_revenue',             'View Revenue Figures',            'See revenue totals and financial KPIs on dashboard', 20],
            ['dashboard', 'view_occupancy',           'View Occupancy Data',             'See occupancy rates and room status overview', 30],
            ['dashboard', 'view_staff_activity',      'View Staff Activity',             'See staff task completion and clock-in status on dashboard', 40],

            // ─── Bookings ──────────────────────────────────────────────────
            ['bookings', 'view',                     'View Bookings',                   'See the bookings list and calendar', 10],
            ['bookings', 'view_all_properties',       'View All Properties\' Bookings',  'Access bookings across all properties (multi-property)', 15],
            ['bookings', 'create',                   'Create Booking',                  'Create new individual bookings', 20],
            ['bookings', 'edit',                     'Edit Booking',                    'Modify booking details (dates, room, notes)', 30],
            ['bookings', 'cancel',                   'Cancel Booking',                  'Cancel a confirmed or checked-in booking', 40],
            ['bookings', 'check_in',                 'Check In Guest',                  'Perform guest check-in and assign room', 50],
            ['bookings', 'check_out',                'Check Out Guest',                 'Perform guest check-out', 60],
            ['bookings', 'override_price',           'Override Room Price',             'Change the room rate on a booking (deviation from standard pricing)', 70],
            ['bookings', 'apply_discount',           'Apply Booking Discount',          'Apply a percentage or fixed discount to a booking', 80],
            ['bookings', 'assign_room',              'Assign / Reassign Room',          'Assign or change the room for an existing booking', 90],
            ['bookings', 'extend_stay',              'Extend Guest Stay',               'Extend checkout date for an active booking', 100],
            ['bookings', 'add_notes',                'Add Internal Notes',              'Add staff-only internal notes to a booking', 110],
            ['bookings', 'view_financials',          'View Booking Financials',         'See folio balance and charges linked to a booking', 120],
            ['bookings', 'manage_group',             'Manage Group Bookings',           'Create, edit, and manage group and corporate bookings', 130],

            // ─── Rooms ─────────────────────────────────────────────────────
            ['rooms', 'view',                       'View Rooms',                       'View room list, grid, and availability', 10],
            ['rooms', 'edit_status',                'Change Room Status',               'Mark rooms as clean, dirty, out-of-order, etc.', 20],
            ['rooms', 'manage_types',               'Manage Room Types',                'Create and edit room types and rate plans', 30],
            ['rooms', 'manage_amenities',           'Manage Amenities',                 'Add or remove room and property amenities', 40],
            ['rooms', 'view_housekeeping_status',   'View Housekeeping Status',         'See cleaning status overlay on room grid', 50],
            ['rooms', 'block_room',                 'Block / Unblock Room',             'Take a room out of available inventory temporarily', 60],

            // ─── Guests ────────────────────────────────────────────────────
            ['guests', 'view',                      'View Guests',                      'Browse the guest directory', 10],
            ['guests', 'create',                    'Create Guest',                     'Register a new guest profile', 20],
            ['guests', 'edit',                      'Edit Guest Profile',               'Modify guest personal information', 30],
            ['guests', 'delete',                    'Delete Guest',                     'Remove a guest profile from the system', 40],
            ['guests', 'view_contact_details',      'View Contact Details',             'See guest phone number and email address', 50],
            ['guests', 'view_id_documents',         'View ID Documents',                'Access scanned ID documents uploaded for a guest', 60],
            ['guests', 'upload_id_documents',       'Upload ID Documents',              'Upload or replace guest ID document scans', 70],
            ['guests', 'view_booking_history',      'View Booking History',             'See all past stays for a guest', 80],
            ['guests', 'add_notes',                 'Add Guest Notes',                  'Add internal staff notes to a guest profile', 90],
            ['guests', 'view_intelligence',         'View Guest Intelligence',          'See guest tags, preferences, visit frequency, and spend data', 100],

            // ─── Folios ────────────────────────────────────────────────────
            ['folios', 'view',                      'View Folios',                      'Browse the folio list and see folio summaries', 10],
            ['folios', 'view_balance',              'View Folio Balance',               'See outstanding balance and charge breakdown', 20],
            ['folios', 'add_charge',                'Add Charge to Folio',              'Post room charges, services, minibar, etc. to a folio', 30],
            ['folios', 'edit_charge',               'Edit Folio Charge',                'Modify the description or amount of an existing charge', 40],
            ['folios', 'delete_charge',             'Delete Folio Charge',              'Remove a posted charge from a folio', 50],
            ['folios', 'add_payment',               'Record Payment',                   'Record a cash, bank transfer, or card payment on a folio', 60],
            ['folios', 'apply_discount',            'Apply Folio Discount',             'Apply a discount adjustment to the folio total', 70],
            ['folios', 'add_adjustment',            'Add Folio Adjustment',             'Post a credit or debit adjustment (e.g. complimentary, correction)', 80],
            ['folios', 'close',                     'Close Folio',                      'Mark a folio as closed (triggers invoice eligibility)', 90],
            ['folios', 'reopen',                    'Reopen Folio',                     'Reopen a closed folio to add further charges', 100],
            ['folios', 'view_group_folio',          'View Group / Corporate Folio',     'Access consolidated group booking folios', 110],
            ['folios', 'manage_group_folio',        'Manage Group Folio',               'Record payments and adjustments on group folios', 120],

            // ─── Invoices ──────────────────────────────────────────────────
            ['invoices', 'view',                    'View Invoices',                    'Browse invoice list and view invoice details', 10],
            ['invoices', 'create',                  'Generate Invoice',                 'Generate an invoice from a closed folio', 20],
            ['invoices', 'email',                   'Email Invoice to Guest',           'Send invoice via email to the guest or corporate contact', 30],
            ['invoices', 'download_pdf',            'Download Invoice PDF',             'Export and download invoice as PDF', 40],
            ['invoices', 'record_payment',          'Record Invoice Payment',           'Mark full or partial payment on an invoice', 50],
            ['invoices', 'void',                    'Void Invoice',                     'Cancel (void) an issued invoice', 60],
            ['invoices', 'view_group_invoice',      'View Group Invoice',               'Access consolidated invoices for group/corporate bookings', 70],

            // ─── Housekeeping ──────────────────────────────────────────────
            ['housekeeping', 'view_tasks',          'View Housekeeping Tasks',          'See assigned housekeeping tasks and their status', 10],
            ['housekeeping', 'assign_tasks',        'Assign Tasks',                     'Allocate cleaning tasks to housekeeping staff', 20],
            ['housekeeping', 'mark_complete',       'Mark Task Complete',               'Mark a housekeeping task as done', 30],
            ['housekeeping', 'mark_inspected',      'Mark Room Inspected',              'Approve a cleaned room after quality inspection', 40],
            ['housekeeping', 'report_lost_found',   'Report Lost & Found',              'Log lost or found items from room cleaning', 50],
            ['housekeeping', 'view_lost_found',     'View Lost & Found',                'Browse the lost and found log', 60],
            ['housekeeping', 'manage_consumables',  'Manage Consumables / Inventory',   'View and update housekeeping supply stock levels', 70],
            ['housekeeping', 'view_consumables',    'View Consumables',                 'See consumable stock without edit access', 80],

            // ─── HR & Staff ────────────────────────────────────────────────
            ['staff', 'view',                       'View Staff List',                  'Browse staff members and their profiles', 10],
            ['staff', 'invite',                     'Invite Staff',                     'Send staff invitations and assign roles', 20],
            ['staff', 'edit',                       'Edit Staff Profile',               'Modify staff contact info, role, and property access', 30],
            ['staff', 'deactivate',                 'Deactivate Staff',                 'Suspend a staff account from system access', 40],
            ['staff', 'view_clock_records',         'View Clock-in Records',            'See staff attendance clock-in/out logs', 50],
            ['staff', 'manage_shifts',              'Manage Shifts',                    'Create and assign work shift schedules', 60],
            ['staff', 'approve_leave',              'Approve Leave Requests',           'Review and approve or reject staff leave applications', 70],
            ['staff', 'view_leave',                 'View Leave Records',               'See staff leave balances and history', 80],

            // ─── Payroll ───────────────────────────────────────────────────
            ['payroll', 'view',                     'View Payroll Periods',             'Browse payroll runs and their status', 10],
            ['payroll', 'run',                      'Run Payroll',                      'Create and compute a new payroll period', 20],
            ['payroll', 'edit',                     'Edit Payroll Items',               'Adjust individual payroll line items before approval', 30],
            ['payroll', 'approve',                  'Approve Payroll',                  'Authorise a computed payroll for disbursement', 40],
            ['payroll', 'view_payslips',            'View Payslips',                    'Access individual employee payslip breakdowns', 50],
            ['payroll', 'export',                   'Export Payroll',                   'Download payroll reports and bank transfer schedules', 60],

            // ─── POS / Bar / Restaurant ────────────────────────────────────
            ['pos', 'view',                         'View POS Orders',                  'Browse orders placed through POS', 10],
            ['pos', 'take_order',                   'Take Order',                       'Create new food and beverage orders', 20],
            ['pos', 'edit_order',                   'Edit Order',                       'Modify an open order before it is sent to kitchen', 30],
            ['pos', 'void_order',                   'Void Order',                       'Cancel a placed order', 40],
            ['pos', 'apply_discount',               'Apply Order Discount',             'Apply a discount to a POS order', 50],
            ['pos', 'charge_to_room',               'Charge Order to Room',             'Post a POS order charge to a guest folio', 60],
            ['pos', 'manage_menu',                  'Manage Menu & Pricing',            'Create, edit, and price menu items and categories', 70],
            ['pos', 'view_reports',                 'View POS Reports',                 'Access daily sales, top items, and revenue reports for POS', 80],
            ['pos', 'manage_tables',                'Manage Tables',                    'Create table layouts and assign tables to orders', 90],

            // ─── Inventory ─────────────────────────────────────────────────
            ['inventory', 'view',                   'View Inventory',                   'Browse stock levels and item catalogue', 10],
            ['inventory', 'add_item',               'Add Inventory Item',               'Create new items in the stock catalogue', 20],
            ['inventory', 'adjust_stock',           'Adjust Stock Level',               'Manually correct stock quantities', 30],
            ['inventory', 'create_grn',             'Create GRN (Goods Received)',       'Record incoming stock deliveries', 40],
            ['inventory', 'create_purchase_order',  'Create Purchase Order',            'Generate purchase orders to vendors', 50],
            ['inventory', 'approve_purchase_order', 'Approve Purchase Order',           'Authorise a purchase order for processing', 60],
            ['inventory', 'manage_vendors',         'Manage Vendors',                   'Add, edit, and manage supplier accounts', 70],
            ['inventory', 'view_reports',           'View Inventory Reports',           'Access stock valuation, movement, and wastage reports', 80],

            // ─── Security & Compliance ─────────────────────────────────────
            ['security', 'view_incidents',          'View Incidents',                   'Browse security incident log', 10],
            ['security', 'create_incident',         'Create Incident Report',           'Log a new security or safety incident', 20],
            ['security', 'edit_incident',           'Edit Incident Report',             'Modify or update an existing incident report', 30],
            ['security', 'close_incident',          'Close Incident',                   'Mark an incident as resolved', 40],
            ['security', 'manage_cards',            'Manage Guest Cards',               'Issue, revoke, and view guest access card records', 50],
            ['security', 'view_card_events',        'View Card Scan Events',            'See gate access scan logs and card event history', 60],
            ['security', 'manage_scan_points',      'Manage Scan Points',               'Configure and manage entry/exit card scan points', 70],
            ['security', 'view_police_reports',     'View Police Reports',              'Access police and regulatory incident reports', 80],
            ['security', 'create_police_report',    'Create Police Report',             'Generate and submit a police/regulatory report', 90],
            ['security', 'view_audit_log',          'View Audit Log',                   'Access the full system activity audit trail', 100],

            // ─── Events & Banquets ─────────────────────────────────────────
            ['events', 'view',                      'View Events',                      'Browse event and banquet bookings', 10],
            ['events', 'create',                    'Create Event',                     'Book a new event or banquet', 20],
            ['events', 'edit',                      'Edit Event',                       'Modify event details, catering, and seating', 30],
            ['events', 'cancel',                    'Cancel Event',                     'Cancel a confirmed event booking', 40],
            ['events', 'manage_spaces',             'Manage Event Spaces',              'Create and configure event spaces and capacity', 50],
            ['events', 'view_financials',           'View Event Financials',            'See event billing, deposits, and outstanding balance', 60],

            // ─── Corporate Profiles ────────────────────────────────────────
            ['corporate', 'view',                   'View Corporate Profiles',          'Browse corporate account profiles', 10],
            ['corporate', 'create',                 'Create Corporate Profile',         'Register a new corporate or travel agent account', 20],
            ['corporate', 'edit',                   'Edit Corporate Profile',           'Modify corporate contact, rates, and contract terms', 30],
            ['corporate', 'set_credit_limit',       'Set Credit Limit',                 'Configure credit limits and deferred payment terms', 40],
            ['corporate', 'view_financials',        'View Corporate Financials',        'See outstanding balances and payment history for a corporate account', 50],
            ['corporate', 'manage_group_link',      'Link Group Bookings',              'Associate group bookings with corporate accounts', 60],

            // ─── Analytics & Reports ───────────────────────────────────────
            ['analytics', 'view_dashboard',         'View Analytics Dashboard',         'Access the analytics overview and trend charts', 10],
            ['analytics', 'view_occupancy_report',  'View Occupancy Reports',           'See occupancy rate trends, RevPAR, and ADR', 20],
            ['analytics', 'view_revenue_report',    'View Revenue Reports',             'Access detailed revenue breakdown and financial analytics', 30],
            ['analytics', 'view_guest_report',      'View Guest Reports',               'See guest demographics, repeat visit, and satisfaction data', 40],
            ['analytics', 'view_staff_report',      'View Staff Performance Reports',   'Access staff productivity and task completion analytics', 50],
            ['analytics', 'export',                 'Export Reports',                   'Download analytics and reports as CSV or PDF', 60],

            // ─── Settings & Configuration ──────────────────────────────────
            ['settings', 'view',                    'View Settings',                    'Access the settings panel (read-only)', 10],
            ['settings', 'edit_property',           'Edit Property Settings',           'Modify hotel name, address, contact, and branding', 20],
            ['settings', 'manage_bank_accounts',    'Manage Bank Accounts',             'Add or change the property bank account for guest payments', 30],
            ['settings', 'manage_integrations',     'Manage Integrations',              'Configure third-party integrations (OTA, WhatsApp, IoT)', 40],
            ['settings', 'manage_rbac',             'Manage Role Permissions',          'Configure which roles can access which features', 50],
            ['settings', 'manage_subscription',     'Manage Subscription & Billing',    'View and change the SaaS subscription plan', 60],

            // ─── Service Requests ──────────────────────────────────────────
            ['service_requests', 'view',            'View Service Requests',            'See guest service and maintenance requests', 10],
            ['service_requests', 'create',          'Create Service Request',           'Log a new service or maintenance request', 20],
            ['service_requests', 'assign',          'Assign Service Request',           'Assign a request to a specific staff member', 30],
            ['service_requests', 'resolve',         'Resolve Service Request',          'Mark a service request as completed', 40],
            ['service_requests', 'view_chat',       'View Guest Chat',                  'Access and respond to guest chat messages', 50],

            // ─── OTA & Channel Manager ─────────────────────────────────────
            ['ota', 'view',                         'View OTA Channels',                'Browse OTA channel connections and sync status', 10],
            ['ota', 'manage',                       'Manage OTA Channels',              'Connect, configure, and sync OTA channels', 20],
            ['ota', 'view_reservations',            'View OTA Reservations',            'See reservations imported from OTA channels', 30],

            // ─── Gym & Fitness ─────────────────────────────────────────────
            ['gym', 'view',                         'View Gym Members',                 'Browse gym membership directory', 10],
            ['gym', 'create_member',                'Create Gym Member',                'Register a new gym member', 20],
            ['gym', 'edit_member',                  'Edit Gym Member',                  'Modify member profile and membership details', 30],
            ['gym', 'record_payment',               'Record Membership Payment',        'Log gym membership payment (cash or transfer)', 40],
            ['gym', 'check_in',                     'Gym Check-in',                     'Record a member or guest gym visit', 50],
            ['gym', 'manage_plans',                 'Manage Membership Plans',          'Create and price gym membership plan tiers', 60],
            ['gym', 'manage_classes',               'Manage Fitness Classes',           'Schedule and manage gym fitness classes', 70],
            ['gym', 'view_reports',                 'View Gym Reports',                 'Access gym revenue and visit analytics', 80],
        ];

        $io->writeln('Inserting ' . count($permissions) . ' permissions…');

        // Insert permissions, ignoring duplicates
        foreach ($permissions as [$module, $action, $label, $desc, $sort]) {
            $conn->executeStatement(
                "INSERT INTO permissions (module_key, action, label, description, sort_order)
                 VALUES (:m, :a, :l, :d, :s)
                 ON CONFLICT (module_key, action) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description",
                ['m' => $module, 'a' => $action, 'l' => $label, 'd' => $desc, 's' => $sort],
            );
        }

        // ── Role defaults ────────────────────────────────────────────────────
        // Format: [role, module_key, action, granted]
        // property_admin is always ALL — enforced in middleware, not stored here.
        // manager: almost everything except delete and RBAC management
        // front_desk: bookings, rooms, guests, folios basic, service requests
        // housekeeping: only housekeeping tasks and rooms status
        // security: security module, guest view, incidents
        // accountant: folios, invoices, analytics, reports, payroll view
        // concierge: guests view, service requests, bookings view
        // bar/kitchen/restaurant: POS module
        // maintenance: assets, service requests
        $defaults = $this->buildDefaults();

        $io->writeln('Inserting ' . count($defaults) . ' role defaults…');

        foreach ($defaults as [$role, $module, $action, $granted]) {
            $conn->executeStatement(
                "INSERT INTO role_permission_defaults (role, permission_id, granted)
                 SELECT :role, p.id, :granted
                 FROM permissions p
                 WHERE p.module_key = :m AND p.action = :a
                 ON CONFLICT (role, permission_id) DO UPDATE SET granted = EXCLUDED.granted",
                ['role' => $role, 'm' => $module, 'a' => $action, 'granted' => $granted ? 1 : 0],
            );
        }

        $io->success('RBAC seed complete.');
        return self::SUCCESS;
    }

    /** @return array<array{string,string,string,bool}> [role, module, action, granted] */
    private function buildDefaults(): array
    {
        $all = [];

        // Helper to grant multiple actions on a module for a role
        $grant = function (string $role, string $module, array $actions) use (&$all): void {
            foreach ($actions as $action) {
                $all[] = [$role, $module, $action, true];
            }
        };

        // Helper to deny — useful to be explicit about denied sensitive actions
        $deny = function (string $role, string $module, array $actions) use (&$all): void {
            foreach ($actions as $action) {
                $all[] = [$role, $module, $action, false];
            }
        };

        // ── MANAGER (most access, except RBAC management and delete ops) ──────
        $grant('manager', 'dashboard',       ['view', 'view_revenue', 'view_occupancy', 'view_staff_activity']);
        $grant('manager', 'bookings',        ['view', 'view_all_properties', 'create', 'edit', 'cancel', 'check_in', 'check_out', 'override_price', 'apply_discount', 'assign_room', 'extend_stay', 'add_notes', 'view_financials', 'manage_group']);
        $grant('manager', 'rooms',           ['view', 'edit_status', 'manage_types', 'manage_amenities', 'view_housekeeping_status', 'block_room']);
        $grant('manager', 'guests',          ['view', 'create', 'edit', 'view_contact_details', 'view_id_documents', 'upload_id_documents', 'view_booking_history', 'add_notes', 'view_intelligence']);
        $deny('manager',  'guests',          ['delete']);
        $grant('manager', 'folios',          ['view', 'view_balance', 'add_charge', 'edit_charge', 'delete_charge', 'add_payment', 'apply_discount', 'add_adjustment', 'close', 'reopen', 'view_group_folio', 'manage_group_folio']);
        $grant('manager', 'invoices',        ['view', 'create', 'email', 'download_pdf', 'record_payment', 'void', 'view_group_invoice']);
        $grant('manager', 'housekeeping',    ['view_tasks', 'assign_tasks', 'mark_complete', 'mark_inspected', 'report_lost_found', 'view_lost_found', 'manage_consumables', 'view_consumables']);
        $grant('manager', 'staff',           ['view', 'invite', 'edit', 'view_clock_records', 'manage_shifts', 'approve_leave', 'view_leave']);
        $deny('manager',  'staff',           ['deactivate']);
        $grant('manager', 'payroll',         ['view', 'run', 'edit', 'view_payslips', 'export']);
        $deny('manager',  'payroll',         ['approve']);
        $grant('manager', 'pos',             ['view', 'take_order', 'edit_order', 'void_order', 'apply_discount', 'charge_to_room', 'manage_menu', 'view_reports', 'manage_tables']);
        $grant('manager', 'inventory',       ['view', 'add_item', 'adjust_stock', 'create_grn', 'create_purchase_order', 'manage_vendors', 'view_reports']);
        $deny('manager',  'inventory',       ['approve_purchase_order']);
        $grant('manager', 'security',        ['view_incidents', 'create_incident', 'edit_incident', 'close_incident', 'manage_cards', 'view_card_events', 'manage_scan_points', 'view_police_reports', 'create_police_report', 'view_audit_log']);
        $grant('manager', 'events',          ['view', 'create', 'edit', 'cancel', 'manage_spaces', 'view_financials']);
        $grant('manager', 'corporate',       ['view', 'create', 'edit', 'set_credit_limit', 'view_financials', 'manage_group_link']);
        $grant('manager', 'analytics',       ['view_dashboard', 'view_occupancy_report', 'view_revenue_report', 'view_guest_report', 'view_staff_report', 'export']);
        $grant('manager', 'settings',        ['view', 'edit_property', 'manage_bank_accounts', 'manage_integrations']);
        $deny('manager',  'settings',        ['manage_rbac', 'manage_subscription']);
        $grant('manager', 'service_requests',['view', 'create', 'assign', 'resolve', 'view_chat']);
        $grant('manager', 'ota',             ['view', 'manage', 'view_reservations']);
        $grant('manager', 'gym',             ['view', 'create_member', 'edit_member', 'record_payment', 'check_in', 'manage_plans', 'manage_classes', 'view_reports']);

        // ── FRONT DESK ────────────────────────────────────────────────────────
        $grant('front_desk', 'dashboard',       ['view', 'view_occupancy']);
        $grant('front_desk', 'bookings',        ['view', 'create', 'edit', 'check_in', 'check_out', 'assign_room', 'extend_stay', 'add_notes', 'view_financials']);
        $deny('front_desk',  'bookings',        ['cancel', 'override_price', 'apply_discount', 'manage_group', 'view_all_properties']);
        $grant('front_desk', 'rooms',           ['view', 'edit_status', 'view_housekeeping_status']);
        $deny('front_desk',  'rooms',           ['manage_types', 'manage_amenities', 'block_room']);
        $grant('front_desk', 'guests',          ['view', 'create', 'edit', 'view_contact_details', 'view_id_documents', 'upload_id_documents', 'add_notes', 'view_booking_history']);
        $deny('front_desk',  'guests',          ['delete', 'view_intelligence']);
        $grant('front_desk', 'folios',          ['view', 'view_balance', 'add_charge', 'add_payment']);
        $deny('front_desk',  'folios',          ['edit_charge', 'delete_charge', 'apply_discount', 'add_adjustment', 'close', 'reopen', 'manage_group_folio']);
        $grant('front_desk', 'invoices',        ['view', 'download_pdf']);
        $deny('front_desk',  'invoices',        ['create', 'email', 'record_payment', 'void', 'view_group_invoice']);
        $grant('front_desk', 'service_requests',['view', 'create', 'view_chat']);
        $deny('front_desk',  'service_requests',['assign', 'resolve']);
        $grant('front_desk', 'events',          ['view']);
        $deny('front_desk',  'events',          ['create', 'edit', 'cancel', 'manage_spaces', 'view_financials']);
        $grant('front_desk', 'corporate',       ['view']);
        $deny('front_desk',  'corporate',       ['create', 'edit', 'set_credit_limit', 'view_financials', 'manage_group_link']);
        $grant('front_desk', 'gym',             ['view', 'check_in']);
        $deny('front_desk',  'gym',             ['create_member', 'edit_member', 'record_payment', 'manage_plans', 'manage_classes', 'view_reports']);

        // ── ACCOUNTANT ────────────────────────────────────────────────────────
        $grant('accountant', 'dashboard',       ['view', 'view_revenue', 'view_occupancy']);
        $grant('accountant', 'bookings',        ['view', 'view_financials']);
        $deny('accountant',  'bookings',        ['create', 'edit', 'cancel', 'check_in', 'check_out', 'override_price', 'apply_discount', 'assign_room', 'extend_stay', 'manage_group']);
        $grant('accountant', 'guests',          ['view', 'view_contact_details', 'view_booking_history']);
        $deny('accountant',  'guests',          ['create', 'edit', 'delete', 'view_id_documents', 'upload_id_documents', 'add_notes', 'view_intelligence']);
        $grant('accountant', 'folios',          ['view', 'view_balance', 'add_payment', 'apply_discount', 'add_adjustment', 'close', 'view_group_folio', 'manage_group_folio']);
        $deny('accountant',  'folios',          ['add_charge', 'edit_charge', 'delete_charge', 'reopen']);
        $grant('accountant', 'invoices',        ['view', 'create', 'email', 'download_pdf', 'record_payment', 'void', 'view_group_invoice']);
        $grant('accountant', 'payroll',         ['view', 'approve', 'view_payslips', 'export']);
        $deny('accountant',  'payroll',         ['run', 'edit']);
        $grant('accountant', 'analytics',       ['view_dashboard', 'view_occupancy_report', 'view_revenue_report', 'export']);
        $deny('accountant',  'analytics',       ['view_guest_report', 'view_staff_report']);
        $grant('accountant', 'corporate',       ['view', 'view_financials']);
        $deny('accountant',  'corporate',       ['create', 'edit', 'set_credit_limit', 'manage_group_link']);
        $grant('accountant', 'gym',             ['view', 'record_payment', 'view_reports']);
        $deny('accountant',  'gym',             ['create_member', 'edit_member', 'check_in', 'manage_plans', 'manage_classes']);

        // ── CONCIERGE ─────────────────────────────────────────────────────────
        $grant('concierge', 'dashboard',       ['view', 'view_occupancy']);
        $grant('concierge', 'bookings',        ['view', 'create', 'add_notes', 'view_financials']);
        $deny('concierge',  'bookings',        ['edit', 'cancel', 'check_in', 'check_out', 'override_price', 'apply_discount', 'assign_room', 'extend_stay', 'manage_group', 'view_all_properties']);
        $grant('concierge', 'guests',          ['view', 'view_contact_details', 'view_booking_history', 'add_notes']);
        $deny('concierge',  'guests',          ['create', 'edit', 'delete', 'view_id_documents', 'upload_id_documents', 'view_intelligence']);
        $grant('concierge', 'service_requests',['view', 'create', 'assign', 'resolve', 'view_chat']);
        $grant('concierge', 'events',          ['view']);
        $grant('concierge', 'gym',             ['view', 'check_in']);

        // ── HOUSEKEEPING ──────────────────────────────────────────────────────
        $grant('housekeeping', 'dashboard',       ['view']);
        $grant('housekeeping', 'rooms',           ['view', 'edit_status', 'view_housekeeping_status']);
        $deny('housekeeping',  'rooms',           ['manage_types', 'manage_amenities', 'block_room']);
        $grant('housekeeping', 'housekeeping',    ['view_tasks', 'mark_complete', 'report_lost_found', 'view_lost_found', 'view_consumables']);
        $deny('housekeeping',  'housekeeping',    ['assign_tasks', 'mark_inspected', 'manage_consumables']);
        $grant('housekeeping', 'guests',          ['view']);
        $deny('housekeeping',  'guests',          ['create', 'edit', 'delete', 'view_contact_details', 'view_id_documents', 'upload_id_documents', 'add_notes', 'view_booking_history', 'view_intelligence']);

        // ── SECURITY ──────────────────────────────────────────────────────────
        $grant('security', 'dashboard',       ['view']);
        $grant('security', 'guests',          ['view', 'view_contact_details', 'view_id_documents']);
        $deny('security',  'guests',          ['create', 'edit', 'delete', 'upload_id_documents', 'add_notes', 'view_booking_history', 'view_intelligence']);
        $grant('security', 'bookings',        ['view']);
        $deny('security',  'bookings',        ['create', 'edit', 'cancel', 'check_in', 'check_out', 'override_price', 'apply_discount', 'assign_room', 'extend_stay', 'add_notes', 'view_financials', 'manage_group', 'view_all_properties']);
        $grant('security', 'security',        ['view_incidents', 'create_incident', 'manage_cards', 'view_card_events', 'view_police_reports', 'create_police_report']);
        $deny('security',  'security',        ['edit_incident', 'close_incident', 'manage_scan_points', 'view_audit_log']);

        // ── BAR ───────────────────────────────────────────────────────────────
        $grant('bar', 'dashboard',      ['view']);
        $grant('bar', 'pos',            ['view', 'take_order', 'edit_order', 'charge_to_room', 'manage_tables']);
        $deny('bar',  'pos',            ['void_order', 'apply_discount', 'manage_menu', 'view_reports']);
        $grant('bar', 'inventory',      ['view']);

        // ── KITCHEN ───────────────────────────────────────────────────────────
        $grant('kitchen', 'dashboard',  ['view']);
        $grant('kitchen', 'pos',        ['view', 'take_order', 'edit_order']);
        $deny('kitchen',  'pos',        ['void_order', 'apply_discount', 'charge_to_room', 'manage_menu', 'view_reports', 'manage_tables']);
        $grant('kitchen', 'inventory',  ['view']);

        // ── RESTAURANT ────────────────────────────────────────────────────────
        $grant('restaurant', 'dashboard', ['view']);
        $grant('restaurant', 'pos',       ['view', 'take_order', 'edit_order', 'charge_to_room', 'manage_tables']);
        $deny('restaurant',  'pos',       ['void_order', 'apply_discount', 'manage_menu', 'view_reports']);
        $grant('restaurant', 'guests',    ['view']);

        // ── MAINTENANCE ───────────────────────────────────────────────────────
        $grant('maintenance', 'dashboard',        ['view']);
        $grant('maintenance', 'service_requests', ['view', 'create', 'resolve']);
        $deny('maintenance',  'service_requests', ['assign', 'view_chat']);
        $grant('maintenance', 'rooms',            ['view', 'edit_status']);
        $deny('maintenance',  'rooms',            ['manage_types', 'manage_amenities', 'block_room', 'view_housekeeping_status']);

        return $all;
    }
}
