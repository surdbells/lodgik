# Lodgik — Phase 8 Implementation Plan

## Production-Grade Upgrade for 5-Star Hotel Operations

**Created:** 2026-02-21
**Status:** In Progress
**Target:** Full production readiness for luxury hotels (e.g., Eko Hotels, Transcorp Hilton)

---

## System State (Post Phase 7)

| Metric | Count |
|--------|-------|
| Entities | 73 |
| Enums | 18 |
| Modules | 31 |
| API Endpoints | 320+ |
| Tests | 339 (844 assertions) |
| Hotel Web Pages | 40 |
| Guest App Pages | 14 |
| Mobile Apps | 6 (guest, tablet, housekeeping, POS, kitchen, reception) |
| Desktop App | 1 (Electron) |

---

## Critical Audit Findings

### RBAC Gap (SEVERITY: HIGH)

**15 of 31 route modules have NO RoleMiddleware.** Any authenticated user can access payroll, folios, invoices, employee records, etc. This is unacceptable for production.

| Unprotected Module | Risk |
|---|---|
| Attendance | Staff can view/modify any attendance |
| Chat | Any staff can read guest chats |
| Employee | Kitchen staff can view HR records |
| Folio | Housekeeping can modify billing |
| Gym | Unrestricted plan/member management |
| Housekeeping | Any role can create/complete tasks |
| Invoice | Any role can void invoices |
| Leave | Any role can approve leave |
| Notification | Low risk (personal notifications) |
| Payroll | Any role can view salaries |
| POS | Any role can create orders |
| RoomControl | Any role can toggle DND/maintenance |
| Security | Any role can approve gate passes |
| GuestServices | Any role can approve transfers |
| ServiceRequest | Low risk (but should be scoped) |

### Missing Entities for Requested Features

| Entity | Feature Area |
|--------|-------------|
| Expense, ExpenseCategory | Financial Management |
| PricingRule | Dynamic Pricing |
| GroupBooking | Booking Management |
| PerformanceReview | HR & Staff KPIs |
| NightAudit | Compliance |
| PoliceReport | Compliance (Nigeria) |
| TaxConfiguration | Financial / VAT |
| Asset, AssetCategory | Asset Management |
| AssetLocation | Asset Management |
| ServiceEngineer | Asset Management |
| AssetIncident | Asset Management |
| PreventiveMaintenance | Asset Management |
| MaintenanceLog | Asset Management |
| ContractorSLA | Asset Management |
| WhatsAppMessage | WhatsApp (Termii) |
| LoyaltyTier, LoyaltyPoints | CRM & Loyalty |
| Promotion, GuestPreference | CRM & Loyalty |

### Missing UserRole Values

| Role | Needed For |
|------|-----------|
| `SECURITY` | Security/gatehouse app |
| `ENGINEER` | Asset management / maintenance |

### Offline Support Scope

**Applies to:** Hotel web app, Desktop (Electron) app, Reception NativeScript app
**Does NOT apply to:** Guest mobile app (stays online-only / PWA optional later)

---

## Phase 8A — RBAC Hardening + Core Production Gaps

**Priority:** CRITICAL
**Scope:** Backend-heavy, all existing modules

### 8A-1: RBAC Full Implementation

Add `SECURITY` + `ENGINEER` roles to `UserRole` enum.

Apply `RoleMiddleware` to all 15 unprotected modules:

| Module | Allowed Roles |
|--------|--------------|
| Attendance | `property_admin, manager, hr, front_desk` |
| Chat | `property_admin, manager, front_desk, concierge` |
| Employee | `property_admin, manager, hr` |
| Folio | `property_admin, manager, front_desk, accountant` |
| Gym | `property_admin, manager, gym_staff, front_desk` |
| Housekeeping | `property_admin, manager, housekeeping, front_desk` |
| Invoice | `property_admin, manager, accountant` |
| Leave | `property_admin, manager, hr` (submit own: all staff) |
| Notification | all authenticated (keep open — personal scope) |
| Payroll | `property_admin, hr` |
| POS | `property_admin, manager, bar, kitchen, front_desk` |
| RoomControl | `property_admin, manager, housekeeping, front_desk, maintenance, concierge` |
| Security | `property_admin, manager, security, front_desk` |
| GuestServices | `property_admin, manager, front_desk, concierge` |
| ServiceRequest | `property_admin, manager, front_desk, housekeeping, maintenance, concierge` |

### 8A-2: Financial Gaps

**New Entities:**
- `ExpenseCategory` — name, parent_id, is_active
- `Expense` — property_id, category_id, vendor, description, amount, receipt_url, date, status (draft/submitted/approved/rejected/paid), submitted_by, approved_by

**New Endpoints (~10):**
- CRUD expenses, approve/reject, list by category/date, P&L report
- Payment reconciliation (match folio payments to bank)
- Night audit endpoint (end-of-day close)

**New Entity:**
- `TaxConfiguration` — property_id, tax_name (VAT, Tourism Levy), rate, is_compound, applies_to (room/fnb/all), is_active

### 8A-3: Booking Enhancements

**New Entity:**
- `GroupBooking` — name, type (corporate/group/travel_agent), contact_name, contact_email, contact_phone, company_name, discount_percentage, total_rooms, master_folio_id, notes

**Booking entity additions:**
- `group_booking_id` (nullable FK)
- `corporate_name` field

**New Entity:**
- `PricingRule` — property_id, room_type_id, name, rule_type (seasonal/day_of_week/occupancy/length_of_stay/early_bird/last_minute), adjustment_type (percentage/fixed), adjustment_value, start_date, end_date, min_occupancy, max_occupancy, min_nights, priority, is_active

**Dynamic pricing engine:**
- Auto-calculate rate based on active rules
- Stack rules by priority
- Preview pricing with rules applied

### 8A-4: HR Gaps

**New Entity:**
- `PerformanceReview` — employee_id, reviewer_id, period (Q1/Q2/Q3/Q4/Annual), year, rating (1-5), goals_json, strengths, improvements, action_items, status (draft/submitted/acknowledged), submitted_at, acknowledged_at

**New Endpoints (~5):**
- Create/update review, list by employee, list pending, acknowledge

**Dashboard addition:**
- Staff KPI summary (avg review score, attendance %, tasks completed)

### 8A-5: Compliance

**New Entity:**
- `NightAudit` — property_id, audit_date, rooms_occupied, rooms_available, total_revenue, room_revenue, fnb_revenue, other_revenue, outstanding_balance, discrepancies_json, notes, status (open/closed), closed_by, closed_at

**New Entity:**
- `PoliceReport` — property_id, booking_id, guest_id, guest_name, nationality, id_type, id_number, address, phone, purpose_of_visit, arrival_date, departure_date, room_number, accompanying_persons, remarks, submitted_at

**Workflow:**
- Night audit: auto-populate from day's data, manager reviews + closes
- Police report: auto-generate on check-in, exportable as PDF

### 8A-6: Dashboard Enhancements

Add to existing `DashboardService.getOverview()`:
- `outstanding_payments` — total unpaid folio balance
- `service_queue` — count of pending service requests by category
- `staff_kpis` — attendance rate, avg review score, tasks completed today
- `revenue_weekly` + `revenue_monthly` — aggregated revenue metrics
- `expense_summary` — total expenses MTD vs budget

---

## Phase 8B — Asset Management + Security NativeScript App

**Priority:** HIGH
**Scope:** New module + new mobile app

### 8B-1: Asset Management Backend

**8 New Entities:**

| Entity | Key Fields |
|--------|-----------|
| `Asset` | id, category_id, property_id, name, brand, model, serial_number, purchase_date, warranty_expiry, qr_code, status (active/under_repair/retired), criticality (low/medium/high/critical), location_id, notes |
| `AssetCategory` | name, parent_id, icon, description |
| `AssetLocation` | property_id, block, floor, room_area, description |
| `ServiceEngineer` | name, company, engineer_type (internal/external/oem), specialization (hvac/electrical/plumbing/elevator/it/general), phone, emergency_phone, email, whatsapp, sla_response_minutes, sla_resolution_minutes, availability (24x7/business_hours/on_call), is_active |
| `AssetIncident` | asset_id, location_id, property_id, incident_type (breakdown/leakage/noise/electrical/fire/other), priority (auto from asset criticality), description, photo_urls, reporter_id, reporter_name, assigned_engineer_id, backup_engineer_id, status (new/assigned/in_progress/resolved/closed), escalation_level (0-3), resolution_notes, downtime_minutes, cost |
| `PreventiveMaintenance` | asset_id, property_id, schedule_type (daily/weekly/monthly/quarterly/annual), last_performed, next_due, assigned_engineer_id, checklist_json, status (scheduled/overdue/completed), notes |
| `MaintenanceLog` | asset_id, incident_id (nullable), engineer_id, action_taken, parts_replaced, cost, downtime_minutes, date |
| `ContractorSLA` | engineer_id, contract_start, contract_end, sla_terms, performance_score (0-100), total_incidents, avg_response_minutes, avg_resolution_minutes, total_cost |

**AssetService (~25 endpoints):**
- Asset CRUD + search + QR lookup
- Incident creation → auto-assign engineer → escalation timer
- PM scheduler with auto-reminders
- Engineer directory + speed-dial info
- Cost tracking per asset, department, vendor
- Reports: most faulty assets, downtime per department, cost vs replacement

**Asset-Engineer Pre-Mapping:**
- Each asset links to primary engineer + backup
- Incident auto-loads correct engineer for one-tap contact

**Hotel Web Pages:**
- Asset registry (search, filter, QR)
- Incident dashboard (new/in-progress/escalated)
- Engineer directory
- PM calendar
- Reports & analytics

### 8B-2: Security NativeScript App

**New NativeScript Angular app at `apps/mobile/security/`**

**Pages:**

| Page | Features |
|------|----------|
| Login | Security staff auth |
| Dashboard | Active passes, on-premise count, alerts |
| Gate Pass Verification | QR scan or PIN entry → verify booking → allow/deny |
| Visitor Management | Pre-authorized list, on-spot registration, blacklist check |
| Guest Movement | Step-in/out logging with timestamp |
| Checkout Enforcement | Clearance view: checked-out but not exited, luggage/asset verify, payment status |
| Emergency Panel | Panic button (silent alarm), incident type selector (fire/security breach/medical), broadcast to all apps |
| Incident Logbook | Categorized logging (theft/fire/medical/damage/dispute), photo/video attach, witness linking |
| Muster List | All on-premise guests + staff for emergency headcount |
| Staff Check-in | Clock-in/out sync with attendance module |
| Contractor Log | Vendor entry/exit with timestamp |
| Vehicle Log | License plate, vehicle type, linked guest/staff |
| Shift Handover | Digital observations log, pending issues, special instructions |

**Backend additions for security app:**
- `EmergencyAlert` entity — type, triggered_by, property_id, status, broadcast sent
- `VehicleLog` entity — plate, type, direction, linked_to, gate_post
- `ShiftHandover` entity — from_staff, to_staff, observations, pending_issues, timestamp
- `Blacklist` entity — person_name, id_number, reason, photo, added_by, property scope

**Integration points:**
- Attendance module (staff clock-in at gate)
- Folio module (payment status check before exit)
- Housekeeping (asset clearance on checkout)
- Notification module (emergency broadcast)

---

## Phase 8C — Offline Support + Thermal Printer + WhatsApp

**Priority:** HIGH
**Scope:** Hotel web, desktop, reception app + Termii integration

### 8C-1: Hotel Web App — Offline (IndexedDB)

- IndexedDB storage layer with typed stores
- Sync queue: pending mutations stored offline, auto-replay on reconnect
- Connectivity heartbeat indicator in sidebar
- Cached data: rooms, active bookings, guest list, today's arrivals/departures
- Conflict resolution: timestamp-based last-write-wins
- Service Worker for static asset caching

### 8C-2: Desktop App — Offline (Electron + SQLite)

- SQLite local database mirroring critical tables
- Background sync worker (every 30s when online)
- System tray offline indicator
- Queue up to 500 operations offline

### 8C-3: Reception App — Offline (NativeScript)

- ApplicationSettings + SQLite plugin for local cache
- Queue operations: check-in, check-out, walk-in booking, room status change
- Auto-sync on reconnect with conflict detection
- Visual offline banner

### 8C-4: Bluetooth Thermal Printer (ESC/POS)

**Reception App (NativeScript):**
- Bluetooth pairing/discovery
- ESC/POS command builder
- Templates: booking confirmation, check-in slip, folio summary, receipt

**Hotel Web App:**
- Web Bluetooth API (Chrome/Edge)
- Same ESC/POS templates
- Print preview + direct print

### 8C-5: WhatsApp Integration (Termii API)

**New Entity:**
- `WhatsAppMessage` — property_id, direction (inbound/outbound), recipient_phone, template_id, template_params, message_body, status (pending/sent/delivered/read/failed), termii_message_id, cost, sent_at, delivered_at

**Termii Service:**
- Send template messages (booking confirmation, check-in code, visitor arrival, checkout reminder)
- Send OTP for guest verification
- Delivery webhook handler
- Message log with status tracking

**Auto-triggers:**
- Booking confirmed → WhatsApp confirmation + access code
- Visitor code generated → WhatsApp to visitor with code + directions
- Check-out reminder (morning of departure)
- Guest survey after checkout

**Hotel Web:**
- WhatsApp message log page
- Template management
- Delivery stats dashboard

---

## Phase 8D — CRM, Loyalty, Multi-language, Analytics

**Priority:** MEDIUM
**Scope:** New module + frontend updates

### CRM & Loyalty

**Entities:**
- `LoyaltyTier` — name (Bronze/Silver/Gold/Platinum/Diamond), min_points, discount_percentage, benefits_json, priority
- `LoyaltyPoints` — guest_id, points, source (booking/dining/spa/referral/manual), transaction_type (earn/redeem/expire/adjust), reference_id, notes
- `Promotion` — code, name, type (percentage/fixed/room_upgrade/free_night), value, start_date, end_date, usage_limit, usage_count, min_booking_amount, applicable_room_types, is_active
- `GuestPreference` — guest_id, room_preferences (floor/view/bed_type), dietary_restrictions, special_occasions, communication_preference, notes

**Engine:**
- Points earning rules (configurable per property)
- Auto-tier calculation based on cumulative points
- Redemption: points → discount on folio charge
- Promotion code validation at booking

### Multi-language

**Infrastructure:**
- i18n service with translation file loader
- Translation files: `en.json`, `yo.json` (Yoruba), `ha.json` (Hausa), `ig.json` (Igbo), `fr.json` (French), `ar.json` (Arabic)
- Language selector in all apps
- Backend: Accept-Language header support
- Guest app: auto-detect from device locale

### Analytics & BI

**Endpoints:**
- RevPAR trends (daily/weekly/monthly, by room type)
- ADR analysis (by source, room type, day of week)
- Occupancy forecast (based on bookings + historical)
- Revenue breakdown (room/F&B/amenity/other)
- Custom date range reports
- SVG chart data endpoints (for frontend rendering)

**Hotel Web Pages:**
- Analytics dashboard with interactive SVG charts
- Custom report builder
- Export to PDF/Excel

---

## Phase 8E — Advanced Features

**Priority:** LOW (post-launch)
**Scope:** Integration-heavy

### OTA Channel Manager
- Booking.com API integration (availability push, reservation pull)
- Expedia API integration
- Rate parity management
- Availability sync (real-time room inventory)
- `OtaChannel` entity — channel_name, credentials, mapping, sync_status
- `OtaReservation` entity — channel, external_id, booking_id, sync_status

### Spa & Pool Management
- `SpaService` entity — name, duration, price, category
- `SpaTherapist` entity — name, specializations, schedule
- `SpaBooking` entity — guest, service, therapist, datetime, status
- `PoolAccessLog` entity — guest, check_in, check_out, area
- Booking calendar for spa
- Capacity management for pool

### IoT Smart Room
- MQTT broker integration
- Device registry (AC, lights, curtains per room)
- Guest control via tablet app
- Automation rules (check-in → lights on, checkout → all off)
- Energy monitoring per room

### Dynamic Pricing Engine (Advanced)
- Competitor rate monitoring
- Demand forecasting (ML-based)
- Event-based pricing (conferences, holidays)
- Last-room pricing

---

## Implementation Order

```
Phase 8A ──┐
            ├── Phase 8B ──┐
            │               ├── Phase 8C ──┐
            │               │               ├── Phase 8D
            │               │               │
            │               │               └── Phase 8E
            │               │
            └───────────────┘
```

**Phase 8A** must complete first (RBAC is a security blocker).
**Phase 8B** can start after 8A (new module, minimal dependencies).
**Phase 8C** can start after 8A (builds on hardened backend).
**Phase 8D** and **8E** are post-launch enhancements.

---

## Success Criteria

- [ ] All 31+ modules have explicit RoleMiddleware
- [ ] Night audit can close a day's operations
- [ ] Police reports auto-generate on check-in
- [ ] Dynamic pricing adjusts rates automatically
- [ ] Group bookings with master folio work end-to-end
- [ ] Asset management tracks full lifecycle
- [ ] Security app handles gate operations independently
- [ ] Hotel web works offline for critical operations
- [ ] Reception can print thermal receipts via Bluetooth
- [ ] WhatsApp notifications reach guests via Termii
- [ ] 400+ tests passing
- [ ] All builds clean across all apps
