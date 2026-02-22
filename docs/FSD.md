# Lodgik — Functional Specification Document (FSD)

**Version:** 1.0  
**Date:** 2026-02-22  
**Status:** Implementation Complete  

---

## 1. System Overview

Lodgik is a multi-tenant SaaS hotel management platform consisting of a PHP/Slim backend API with 40 modules, 113 entities, 466 API routes, and 7 frontend applications (3 web, 4 mobile). The system operates on a tenant-isolated architecture where each hotel property operates within its own data boundary.

### 1.1 Architecture

```
┌─────────────────────────────────────────────────┐
│                 FRONTEND LAYER                   │
├──────────┬───────────┬──────────┬───────────────┤
│ Hotel    │ Admin     │ Merchant │ Mobile Apps   │
│ Web App  │ Web App   │ Portal   │ (Guest,Tablet │
│ (Angular)│ (Angular) │(Angular) │ Security,Rcpt)│
├──────────┴───────────┴──────────┴───────────────┤
│              REST API (Slim PHP)                 │
│        466 endpoints, JWT Auth, RBAC            │
├─────────────────────────────────────────────────┤
│            SERVICE LAYER (40 modules)            │
├─────────────────────────────────────────────────┤
│         ENTITY LAYER (113 entities, Doctrine)    │
├──────────┬──────────┬───────────────────────────┤
│ MySQL/   │ Redis    │ Paystack  │ Termii       │
│ Postgres │ (cache)  │ (billing) │ (WhatsApp)   │
└──────────┴──────────┴───────────┴──────────────┘
```

### 1.2 Data Isolation Model

Every request carries `tenant_id` and `property_id` derived from the authenticated user's JWT. Entities implementing `TenantAware` interface are automatically filtered to the current tenant at the repository level. Super admin endpoints bypass tenant isolation.

---

## 2. Module Specifications

### 2.1 Auth Module (9 endpoints)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/auth/register | POST | Create tenant + admin user |
| /api/auth/login | POST | Authenticate, return JWT tokens |
| /api/auth/refresh | POST | Refresh expired access token |
| /api/auth/logout | POST | Revoke current refresh token |
| /api/auth/logout-all | POST | Revoke all user sessions |
| /api/auth/forgot-password | POST | Send password reset email |
| /api/auth/reset-password | POST | Reset password with token |
| /api/auth/accept-invite | POST | Accept staff invitation |
| /api/auth/me | GET | Get current user profile |

**Token Lifecycle:** Access tokens expire in 15 minutes. Refresh tokens expire in 30 days. Login returns both tokens. Refresh endpoint accepts refresh token and returns new pair.

**RBAC Roles:** super_admin, property_admin, manager, front_desk, housekeeping, kitchen, bar, security, accountant, hr_manager, merchant_admin, merchant_agent, guest

### 2.2 Room Module (18 endpoints)

**Entities:** Room, RoomType, RoomStatusLog, PricingRule

**Room Status Lifecycle:**
```
available → reserved → occupied → dirty → inspected → available
                                    ↓
                              maintenance
```

**Key Functions:**
- CRUD for room types with base rates, capacity, amenities list
- Room inventory per type with floor/building assignment
- Bulk status updates (mark floor clean, block rooms for maintenance)
- Pricing rules: seasonal rates, day-of-week multipliers, occupancy-based pricing
- Room status log for housekeeping audit trail

### 2.3 Booking Module (11 endpoints)

**Entities:** Booking, BookingAddon, BookingStatusLog, GroupBooking

**Booking Status Lifecycle:**
```
pending → confirmed → checked_in → checked_out → completed
    ↓                      ↓
cancelled              no_show
```

**Key Functions:**
- Create booking with guest, room type, dates, rate, addons
- Group bookings (wedding blocks, corporate events)
- Auto-assign room on check-in or pre-assign
- Booking addons (breakfast, parking, airport transfer) with pricing
- Calendar view data for availability grid
- Status history with timestamps

### 2.4 Folio Module (11 endpoints)

**Entities:** Folio, FolioCharge, FolioPayment, FolioAdjustment

**Folio Status:** open → balanced → closed → void

**Key Functions:**
- Auto-create folio on booking check-in
- Post charges (room night, F&B, spa, minibar, phone)
- Record payments with method (cash, card, bank, city_ledger)
- Adjustments (discounts, corrections) with reason
- Balance calculation: total_charges - total_payments - total_adjustments
- Transfer charges between folios (room move, split bill)

### 2.5 Employee & HR Module (9 + 12 + 10 + 9 = 40 endpoints)

**Entities:** Employee, Department, AttendanceRecord, Shift, ShiftAssignment, LeaveType, LeaveRequest, LeaveBalance, PayrollPeriod, PayrollItem, PerformanceReview, TaxBracket

**Key Functions:**
- Employee CRUD with department, position, salary, employment status
- Shift scheduling with assignment to employees
- Clock in/out with timestamps and geolocation
- Leave request → approval workflow with balance deduction
- Payroll period management with tax bracket application
- Performance review cycles with rating and notes

### 2.6 POS Module (16 endpoints)

**Entities:** PosTable, PosCategory, PosProduct, PosOrder, PosOrderItem

**Order Lifecycle:**
```
open → sent_to_kitchen → preparing → ready → served → paid → closed
                                                        ↓
                                                    cancelled
```

**Key Functions:**
- Menu management (categories, products with prices, availability)
- Table management for restaurant/bar
- Order creation with items, quantities, notes, split groups
- Kitchen display: send-to-kitchen, mark preparing, mark ready
- Payment: cash, card, room_charge (post to folio)
- Split bill support by item groups
- Post-to-folio integration for room service charges

### 2.7 Security Module (13 endpoints)

**Entities:** VisitorAccessCode, GatePass, GuestMovement, PoliceReport

**Key Functions:**
- Guest visitor access codes with time window, auto-generated 8-char codes
- Gate passes for authorized entry with vehicle tracking
- Guest movement logging (check-in, check-out, pool, gym, restaurant)
- Police report filing with incident details
- Visitor check-in/out with phone and purpose verification

### 2.8 Merchant Module (53 endpoints)

**Entities:** Merchant, MerchantKyc, MerchantBankAccount, MerchantHotel, CommissionTier, Commission, CommissionPayout, MerchantResource, MerchantResourceDownload, MerchantSupportTicket, MerchantAuditLog, MerchantNotification, MerchantLead, MerchantStatement

**Merchant Lifecycle:**
```
PENDING_APPROVAL → KYC_IN_PROGRESS → ACTIVE → SUSPENDED → TERMINATED
```

**Commission Lifecycle:**
```
PENDING (7-day cooling) → APPROVED → PAYABLE → PAID
                            ↓
                         REVERSED
```

**Auto-Commission Trigger:** When a subscription payment is verified via Paystack (either direct or webhook), the system checks if the tenant's hotel is bound to a merchant via `MerchantHotel`. If bound, commission is auto-calculated using the merchant's `CommissionTier` rates with plan-specific overrides, and a PENDING commission record is created with a 7-day cooling period.

**KYC Gate:** Payouts are blocked until KYC status is 'approved'. Bank account changes require admin re-approval.

### 2.9 Subscription Module (7 endpoints)

**Entities:** Subscription, SubscriptionPlan, SubscriptionInvoice

**Integration:** Paystack payment gateway for checkout initialization, payment verification, and webhook processing. Supports monthly and annual billing cycles.

**Webhook Events:** charge.success, subscription.create, subscription.not_renew, subscription.disable, invoice.payment_failed

### 2.10 Additional Modules

| Module | Endpoints | Key Entities | Purpose |
|--------|-----------|-------------|---------|
| GuestAuth | 8 | GuestSession, GuestAccessCode | Guest mobile auth |
| Chat | 5 | ChatMessage | Multi-dept messaging |
| Notification | 6 | Notification, DeviceToken | Push/in-app alerts |
| Gym | 21 | GymMember, GymClass, GymMembership | Fitness management |
| Housekeeping | 11 | HousekeepingTask | Room cleaning ops |
| Finance | 24 | NightAudit, Expense, TaxConfig | Financial compliance |
| Asset | 26 | Asset, AssetCategory, MaintenanceLog | Asset management |
| WhatsApp | 10 | WhatsAppMessage, WhatsAppTemplate | Termii integration |
| Loyalty | 7 | LoyaltyPoints, LoyaltyTier, Promotion | CRM/loyalty |
| Analytics | 5 | DailySnapshot | Revenue analytics |
| Spa | 4 | SpaService, SpaBooking, PoolAccessLog | Spa/pool |
| Ota | 6 | OtaChannel, OtaReservation | Channel management |
| IoT | 5 | IoTDevice, IoTAutomation | Smart devices |

---

## 3. Cross-Module Integration Points

| Source | Target | Trigger | Action |
|--------|--------|---------|--------|
| Booking | Folio | Check-in | Auto-create guest folio |
| POS | Folio | Post-to-room | Add charge to guest folio |
| Subscription | Merchant | Payment verified | Auto-calculate commission |
| Security | GuestServices | Visitor code created | Auto-create gate pass |
| Merchant Lead | MerchantHotel | Lead converted | Create hotel binding |
| MerchantHotel | Commission | Subscription payment | Auto-trigger commission |
| Finance | Dashboard | Night audit | Generate daily snapshot |

---

## 4. API Response Format

All API responses follow a consistent JSON structure:

**Success:**
```json
{ "data": { ... }, "meta": { "page": 1, "per_page": 20, "total": 100 } }
```

**Error:**
```json
{ "error": "Description of error", "errors": { "field": "Validation message" } }
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 204: No content (delete)
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 422: Validation error
- 500: Server error

---

## 5. Authentication Flow

```
1. POST /api/auth/login { email, password }
   → { access_token, refresh_token, user }

2. All requests: Authorization: Bearer <access_token>
   → JWT decoded → user_id, tenant_id, property_id, role extracted

3. Token expired: POST /api/auth/refresh { refresh_token }
   → { access_token, refresh_token }

4. Logout: POST /api/auth/logout { refresh_token }
   → Refresh token revoked
```

---

## 6. Entity Count Summary

| Domain | Entity Count | Key Entities |
|--------|-------------|--------------|
| SaaS Platform | 15 | Tenant, User, Property, Subscription, SubscriptionPlan |
| Core PMS | 12 | Room, RoomType, Guest, Booking, BookingAddon |
| Finance | 8 | Folio, FolioCharge, Invoice, NightAudit, Expense |
| HR | 12 | Employee, Attendance, Leave, Payroll, Shift |
| Guest Experience | 6 | ServiceRequest, ChatMessage, Notification |
| F&B / POS | 5 | PosTable, PosCategory, PosProduct, PosOrder |
| Gym | 7 | GymMember, GymMembership, GymClass |
| Security | 5 | VisitorAccessCode, GatePass, GuestMovement |
| Smart Services | 5 | RoomControlRequest, AmenityVoucher, WaitlistEntry |
| Advanced | 14 | Asset, IoTDevice, Loyalty, Spa, OtaChannel |
| Merchant | 14 | Merchant, Commission, CommissionTier, MerchantHotel |
| WhatsApp | 2 | WhatsAppMessage, WhatsAppTemplate |
| **Total** | **113** | |
