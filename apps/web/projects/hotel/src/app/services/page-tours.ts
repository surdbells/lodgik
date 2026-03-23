import { TourStep } from '@lodgik/shared';

/**
 * Centralised tour step definitions for every screen.
 * Each key matches the tourKey passed to <ui-page-header [tourKey]="...">
 */
export const PAGE_TOURS: Record<string, TourStep[]> = {

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: [
    { title: 'Hotel Dashboard', description: 'This is your command centre. Every KPI — occupancy, revenue, arrivals — is visible at a glance. The data refreshes each time you visit.' },
    { element: '[data-tour="dashboard-stats"]', title: 'Key Metrics', description: 'Today\'s occupancy rate, ADR (average daily rate), RevPAR, and available rooms. Click any card to drill into the detail.' },
    { element: '[data-tour="dashboard-alerts"]', title: 'Alert Bar', description: 'Overdue checkouts, dirty rooms, and pending arrivals appear here in red/amber. Act on these first each morning.' },
    { element: '[data-tour="dashboard-chart"]', title: 'Occupancy Trend', description: 'A 30-day view of occupancy. Hover any point to see the exact rate for that day.' },
    { element: '[data-tour="dashboard-activity"]', title: 'Recent Activity', description: 'Latest check-ins, check-outs, and bookings across all staff. You can see who did what and when.' },
  ],

  // ── Bookings ──────────────────────────────────────────────────────────────
  bookings: [
    { title: 'Bookings', description: 'All reservations live here — pending, confirmed, checked-in, and checked-out. Use the tabs and filters to find any booking quickly.' },
    { element: '[data-tour="bookings-new"]', title: 'New Booking', description: 'Click here to create a booking. The 4-step wizard covers guest selection, room assignment, dates, and pricing.' },
    { element: '[data-tour="bookings-filter"]', title: 'Filters', description: 'Filter by status, date range, booking type (overnight, short rest, walk-in) or search by guest name or booking reference.' },
    { element: '[data-tour="bookings-calendar"]', title: 'Calendar View', description: 'Switch to calendar view for a visual grid of all room occupancy by date. Great for spotting gaps and avoiding double-booking.' },
    { element: '[data-tour="bookings-checkin"]', title: 'Check In / Check Out', description: 'Click any booking row to open it, then use the Check In or Check Out button. Folio and access code are generated automatically.' },
  ],

  // ── New Booking ───────────────────────────────────────────────────────────
  'new-booking': [
    { title: 'Create a Booking', description: 'Walk through 4 steps to create a reservation. Each step is validated before you can proceed.' },
    { element: '[data-tour="nb-guest"]', title: 'Step 1 — Guest', description: 'Search for an existing guest by name, phone, or email. If they\'re new, type their name and click "Create Guest".' },
    { element: '[data-tour="nb-room"]', title: 'Step 2 — Room', description: 'Available rooms for your selected dates appear here. Rooms are colour-coded by type and price.' },
    { element: '[data-tour="nb-dates"]', title: 'Step 3 — Dates & Type', description: 'Set check-in/out dates. For Short Rest, select the duration (1h, 2h, 3h, 6h). The system calculates the rate automatically.' },
    { element: '[data-tour="nb-payment"]', title: 'Step 4 — Pricing', description: 'The room rate is pre-filled. You can apply a discount here if you have the permission. Corporate rates apply automatically for corporate guests.' },
  ],

  // ── Checkout Tracker ──────────────────────────────────────────────────────
  'checkout-tracker': [
    { title: 'Live Room Monitor', description: 'Real-time view of all checked-in guests and how close they are to their checkout time. Staff use this to manage the day proactively.' },
    { element: '[data-tour="tracker-grid"]', title: 'Room Cards', description: 'Each card is colour-coded by urgency: red = overdue, orange = within 30 min, yellow = within 2 hours, green = plenty of time. Click any card to act.' },
    { element: '[data-tour="tracker-fullscreen"]', title: 'Fullscreen Mode', description: 'Click Fullscreen to display this monitor on a wall screen or TV at reception. It auto-refreshes every 60 seconds.' },
    { element: '[data-tour="tracker-notify"]', title: 'Notify Guest', description: 'Send an SMS or in-app reminder to a guest about their upcoming checkout. Choose the channel and message tone.' },
  ],

  // ── Rooms ─────────────────────────────────────────────────────────────────
  rooms: [
    { title: 'Room Management', description: 'All your hotel rooms in one place. View by grid (visual floor plan style) or list.' },
    { element: '[data-tour="rooms-grid"]', title: 'Room Grid', description: 'Colour-coded by status: green = available, blue = occupied, orange = dirty, grey = maintenance. Click any room to see details or change status.' },
    { element: '[data-tour="rooms-status"]', title: 'Status Filters', description: 'Filter by status to quickly find all dirty rooms, all available rooms, or rooms under maintenance.' },
    { element: '[data-tour="rooms-add"]', title: 'Add Room', description: 'Create a new room by assigning it a number, room type, and floor. Amenities are inherited from the room type.' },
  ],

  // ── Folios ────────────────────────────────────────────────────────────────
  folios: [
    { title: 'Folios & Billing', description: 'A folio is the running tab for a guest\'s stay — all charges, payments, and adjustments in one place.' },
    { element: '[data-tour="folio-charges"]', title: 'Charges', description: 'Room charges post automatically each night. Add extras (bar, minibar, laundry) with the Add Charge button.' },
    { element: '[data-tour="folio-payment"]', title: 'Record Payment', description: 'Record cash, bank transfer, or POS card payments here. The system shows the bank account details to display to the guest.' },
    { element: '[data-tour="folio-balance"]', title: 'Balance', description: 'Outstanding balance shown in red. A zero or credit balance shows in green. You cannot check out a guest with an outstanding balance unless overridden.' },
    { element: '[data-tour="folio-invoice"]', title: 'Generate Invoice', description: 'When the folio is closed, click Generate Invoice to produce a VAT-compliant PDF or send it by email.' },
  ],

  // ── POS ───────────────────────────────────────────────────────────────────
  pos: [
    { title: 'POS — Bar & Restaurant', description: 'Place food and beverage orders, manage tables, and track kitchen queue from this screen.' },
    { element: '[data-tour="pos-tables"]', title: 'Table Map', description: 'Live table status — green = available, orange = occupied. Click a table to view its open order or start a new one.' },
    { element: '[data-tour="pos-order"]', title: 'Order Builder', description: 'Select a table and click + to open the order builder. Tap products to add them. Prices update automatically based on the table\'s section pricing.' },
    { element: '[data-tour="pos-section"]', title: 'Section Pricing', description: 'Items can have different prices per area (e.g. ₦8,000 at the restaurant, ₦12,000 in the Executive Lounge). These apply automatically when a table is selected.' },
    { element: '[data-tour="pos-kitchen"]', title: 'Kitchen Queue', description: 'Orders sent to the kitchen appear here in real-time. Staff mark items ready or call them up as they\'re prepared.' },
  ],

  // ── POS Menu ──────────────────────────────────────────────────────────────
  'pos-menu': [
    { title: 'Menu Management', description: 'Manage your F&B menu — categories, items, prices, and section-specific pricing overrides.' },
    { element: '[data-tour="menu-categories"]', title: 'Categories', description: 'Organise your menu into categories (Starters, Mains, Drinks, etc.). Each category can be set to food or drink type.' },
    { element: '[data-tour="menu-items"]', title: 'Menu Items', description: 'Each item has a name, description, base price, prep time, and optional stock-item link for automatic inventory deduction.' },
    { element: '[data-tour="menu-section-price"]', title: '🏷 Section Prices', description: 'Click the tag icon on any item to set a different price per area. Example: ₦7,500 default, ₦12,000 in Executive Lounge. Applied automatically at order time.' },
  ],

  // ── Housekeeping ──────────────────────────────────────────────────────────
  housekeeping: [
    { title: 'Housekeeping', description: 'Manage room cleaning tasks, track completion, and run quality inspections from here.' },
    { element: '[data-tour="hk-queue"]', title: 'Task Queue', description: 'All cleaning tasks for today — auto-generated on checkout. Drag to reorder or assign to a specific housekeeper.' },
    { element: '[data-tour="hk-assign"]', title: 'Assign Tasks', description: 'Click Assign to allocate a room to a specific housekeeper. They\'ll see it on their mobile app immediately.' },
    { element: '[data-tour="hk-inspect"]', title: 'Inspection', description: 'After a room is marked clean, a supervisor can mark it Inspected here. Only inspected rooms appear as fully available.' },
    { element: '[data-tour="hk-lost-found"]', title: 'Lost & Found', description: 'Housekeepers log lost items found during cleaning. You can view, claim, and return them from here.' },
  ],

  // ── Staff ─────────────────────────────────────────────────────────────────
  staff: [
    { title: 'Staff Management', description: 'All hotel staff accounts in one place. Invite new staff, manage roles, and control property access.' },
    { element: '[data-tour="staff-invite"]', title: 'Invite Staff', description: 'Enter the staff member\'s email and select their role. They\'ll receive an invitation link to create their account.' },
    { element: '[data-tour="staff-roles"]', title: 'Roles', description: 'Each staff member has one role: property_admin, manager, front_desk, housekeeping, security, bar, kitchen, or maintenance. Roles control what they can see.' },
    { element: '[data-tour="staff-properties"]', title: 'Property Access', description: 'In multi-property setups, assign which properties each staff member can access.' },
  ],

  // ── RBAC ─────────────────────────────────────────────────────────────────
  rbac: [
    { title: 'Role Permissions', description: 'Fine-tune exactly what each role can do — beyond just their default access. Changes apply immediately to all staff with that role.' },
    { element: '[data-tour="rbac-roles"]', title: 'Select a Role', description: 'Click a role on the left to see its permissions. property_admin has all permissions by default and cannot be restricted.' },
    { element: '[data-tour="rbac-modules"]', title: 'Permission Modules', description: 'Permissions are grouped by module (Bookings, Rooms, Folios, POS, etc.). Each module shows how many permissions are granted.' },
    { element: '[data-tour="rbac-toggle"]', title: 'Grant / Revoke', description: 'Toggle individual permissions on or off. Use "Grant All" or "Revoke All" to bulk-update a module for a role.' },
    { element: '[data-tour="rbac-save"]', title: 'Save Changes', description: 'Changes are saved instantly when you click Save. Staff don\'t need to log out — permissions update on their next API call.' },
  ],

  // ── Features ──────────────────────────────────────────────────────────────
  features: [
    { title: 'Features & Modules', description: 'Your subscription plan includes a set of modules. Enable or disable non-core modules to customise the system for your hotel.' },
    { element: '[data-tour="features-core"]', title: 'Core Modules', description: 'Core modules (marked in green) are always on — they form the foundation of the system and cannot be disabled.' },
    { element: '[data-tour="features-toggle"]', title: 'Toggleable Modules', description: 'Non-core modules can be turned on or off. Disabling a module hides it from all staff menus immediately.' },
    { element: '[data-tour="features-deps"]', title: 'Dependencies', description: 'Some modules depend on others. Disabling a parent module will also disable its dependents — the system warns you before doing so.' },
  ],

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: [
    { title: 'Analytics & Reports', description: 'Revenue trends, occupancy statistics, and guest data presented as interactive charts.' },
    { element: '[data-tour="analytics-revpar"]', title: 'RevPAR & ADR', description: 'Revenue Per Available Room and Average Daily Rate — the two key financial metrics for any hotel. Compare to last month and last year.' },
    { element: '[data-tour="analytics-occupancy"]', title: 'Occupancy Chart', description: 'Daily occupancy rate over your selected period. Red line = 80% target. Hover any bar for the exact figure.' },
    { element: '[data-tour="analytics-export"]', title: 'Export', description: 'Download any report as a CSV or PDF for sharing with owners, accountants, or franchise managers.' },
  ],

  // ── Inventory ─────────────────────────────────────────────────────────────
  inventory: [
    { title: 'Inventory Management', description: 'Track all hotel stock — bar supplies, cleaning consumables, amenities, and maintenance materials.' },
    { element: '[data-tour="inv-stock"]', title: 'Stock Levels', description: 'Current quantities for every item. Items below their reorder threshold are highlighted in amber.' },
    { element: '[data-tour="inv-grn"]', title: 'Goods Received', description: 'When stock arrives, create a GRN (Goods Received Note) to update inventory levels and record the delivery.' },
    { element: '[data-tour="inv-po"]', title: 'Purchase Orders', description: 'Generate purchase orders to your vendors. Once approved, the system tracks expected vs received quantities.' },
  ],

  // ── Security ──────────────────────────────────────────────────────────────
  security: [
    { title: 'Security & Compliance', description: 'Incident reports, guest card management, and gate access control in one place.' },
    { element: '[data-tour="sec-incidents"]', title: 'Incident Reports', description: 'Log any security or safety incident — the report is time-stamped and linked to the staff member who created it.' },
    { element: '[data-tour="sec-cards"]', title: 'Guest Cards', description: 'Issue access cards at the entrance. Cards are linked to bookings — reception cannot check in a guest without a valid card (when enforcement is enabled).' },
    { element: '[data-tour="sec-gate"]', title: 'Gate Log', description: 'Every card scan at every entry point is recorded here with timestamp and direction.' },
  ],

  // ── Payroll ───────────────────────────────────────────────────────────────
  payroll: [
    { title: 'Payroll', description: 'Run PAYE-compliant payroll for all your staff. The system calculates CRA deductions, tax brackets, pension, and NHF automatically.' },
    { element: '[data-tour="payroll-run"]', title: 'Run Payroll', description: 'Start a new payroll period by selecting the month. The system pulls all attendance records and salary settings automatically.' },
    { element: '[data-tour="payroll-review"]', title: 'Review & Edit', description: 'Review each staff member\'s gross pay, deductions, and net pay before approving. You can adjust individual items if needed.' },
    { element: '[data-tour="payroll-approve"]', title: 'Approve & Export', description: 'Once approved, payslips are emailed to staff. Export the bank transfer schedule for your finance team.' },
  ],

  // ── Guest Cards ───────────────────────────────────────────────────────────
  'guest-cards': [
    { title: 'Guest Cards', description: 'Physical key cards issued at the security gate before check-in. This screen manages the full card lifecycle.' },
    { element: '[data-tour="cards-issue"]', title: 'Issue Card', description: 'Security staff issue a card when the guest arrives at the gate, optionally logging the vehicle plate number.' },
    { element: '[data-tour="cards-attach"]', title: 'Attach to Booking', description: 'After issue, the card is attached to a booking. Reception sees the card status and cannot check in until a valid card is attached (if enforcement is on).' },
    { element: '[data-tour="cards-events"]', title: 'Scan Events', description: 'Every scan of the card at any entry point is logged here — time, direction, and scan point.' },
  ],

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: [
    { title: 'Hotel Settings', description: 'Configure your property details, bank accounts, and system preferences.' },
    { element: '[data-tour="settings-property"]', title: 'Property Details', description: 'Hotel name, address, contact info, and branding. The address appears on invoices and in stay notifications sent to guest contacts.' },
    { element: '[data-tour="settings-bank"]', title: 'Bank Account', description: 'Your hotel\'s bank account details are displayed on every invoice and folio — guests use this to make payment. Keep it up to date.' },
    { element: '[data-tour="settings-card"]', title: 'Card Enforcement', description: 'Toggle this on to require security gate cards before reception can check in any guest.' },
  ],

  // ── Police Reports ────────────────────────────────────────────────────────
  'police-reports': [
    { title: 'Police Reports (Form C)', description: 'Nigeria\'s hotel regulations require keeping a register of all guests. Reports are auto-created on check-in and can be submitted to the police.' },
    { element: '[data-tour="police-add"]', title: 'Add Report', description: 'Manually add a report for walk-in guests or to correct details. Required fields: guest name, arrival date.' },
    { element: '[data-tour="police-submit"]', title: 'Submit', description: 'Mark a report as officially submitted. This is for record-keeping — actual submission is done with your local police station.' },
    { element: '[data-tour="police-export"]', title: 'Export CSV', description: 'Download all reports as a spreadsheet for your police liaison or compliance records.' },
  ],

  // ── Audit Log ─────────────────────────────────────────────────────────────
  'audit-log': [
    { title: 'Audit Log', description: 'Every create, update, and delete action by any staff member is recorded here. Cannot be edited or deleted.' },
    { element: '[data-tour="audit-filter"]', title: 'Filters', description: 'Filter by staff member, action type, date range, or affected record. Great for investigating disputes or errors.' },
    { element: '[data-tour="audit-diff"]', title: 'Before / After', description: 'Click any log entry to see exactly what changed — the before and after values for every field that was modified.' },
  ],

  // ── Gym ───────────────────────────────────────────────────────────────────
  gym: [
    { title: 'Gym & Fitness Centre', description: 'Manage external gym memberships, check-ins, class bookings, and payments.' },
    { element: '[data-tour="gym-members"]', title: 'Members', description: 'External (non-hotel) members who pay a monthly or annual subscription. Hotel guests access the gym automatically through their booking.' },
    { element: '[data-tour="gym-checkin"]', title: 'Check-in Screen', description: 'Scan a member\'s QR code or search by name to log a visit. The system validates the membership status instantly.' },
    { element: '[data-tour="gym-classes"]', title: 'Class Schedule', description: 'Create and manage fitness classes. Members can book spots in advance from this screen.' },
    { element: '[data-tour="gym-revenue"]', title: 'Revenue', description: 'Monthly membership income, outstanding payments, and renewals due this week.' },
  ],

};
