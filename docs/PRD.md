# Lodgik — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 2026-02-22  
**Status:** Implementation Complete  

---

## 1. Executive Summary

Lodgik is a comprehensive, multi-tenant SaaS hotel management platform designed to digitize every aspect of hotel operations across the Nigerian hospitality market and beyond. The platform serves hotel owners, staff, guests, and merchant partners through seven purpose-built applications spanning web, mobile, and tablet interfaces.

### Product Vision
To become the operating system for modern hotels — replacing fragmented tools with a unified, intelligent platform that connects every department, every guest, and every partner into one seamless ecosystem.

### Key Value Propositions
- **For Hotel Owners:** Real-time visibility into operations, revenue, and occupancy through a single dashboard
- **For Staff:** Department-specific workflows (reception, housekeeping, kitchen, security) optimized for efficiency
- **For Guests:** Digital-first experience — mobile check-in, in-room controls, service requests, dining orders
- **For Merchant Partners:** Revenue-sharing ecosystem with transparent commission tracking and automated payouts

---

## 2. Target Users & Personas

### 2.1 Hotel Owner / Property Admin
- Manages property settings, room inventory, pricing, staff, and subscriptions
- Needs: occupancy analytics, revenue reports, staff scheduling, multi-property support

### 2.2 Reception / Front Desk Staff
- Handles check-in/out, walk-in bookings, guest inquiries, room assignments
- Needs: quick booking creation, folio management, real-time room status

### 2.3 Housekeeping Staff
- Manages room cleaning assignments, status updates, maintenance requests
- Needs: task queue, room priority indicators, inspection checklists

### 2.4 Kitchen / Bar Staff
- Processes F&B orders, manages kitchen queue, item preparation status
- Needs: real-time order queue, item status updates, send-to-folio integration

### 2.5 Security Staff
- Manages visitor access codes, gate passes, guest movements, police reports
- Needs: visitor verification, entry/exit logging, incident reporting

### 2.6 Hotel Guest
- Books rooms, makes service requests, orders F&B, controls in-room devices
- Needs: mobile check-in, chat with departments, amenity vouchers, digital key

### 2.7 Merchant Partner (Sales Agent / Reseller)
- Onboards hotels onto the platform, earns commissions on subscriptions
- Needs: hotel registration, lead pipeline, commission tracking, payout visibility

### 2.8 Super Admin (Lodgik Platform)
- Manages tenants, subscription plans, features, platform analytics, merchants
- Needs: tenant lifecycle management, KYC review, commission configuration

---

## 3. Product Scope

### 3.1 Applications (7 Total)

| Application | Type | Users | Purpose |
|-------------|------|-------|---------|
| Hotel Web App | Angular SPA | Hotel staff & management | Full property management |
| Admin Web App | Angular SPA | Super admins | Platform management |
| Merchant Portal | Angular SPA | Merchant partners | Partner ecosystem |
| Guest Mobile App | Ionic/Angular | Hotel guests | Guest self-service |
| Tablet App | Ionic/Angular | In-room guests | Room controls & services |
| Security App | Ionic/Angular | Security staff | Visitor/gate management |
| Reception App | Ionic/Angular | Front desk staff | Quick check-in/out |

### 3.2 Functional Modules (40 Backend Modules)

**Phase 0 — SaaS Platform Foundation:**
Auth, Staff, Tenant, Admin, Feature, Onboarding, AppDistribution, Subscription, Usage

**Phase 1 — Core PMS:**
Room, Guest, Booking, Dashboard

**Phase 2 — Finance:**
Folio, Invoice

**Phase 3 — HR & Payroll:**
Employee, Attendance, Leave, Payroll

**Phase 4 — Guest Experience:**
GuestAuth, ServiceRequest, Chat, Notification

**Phase 5 — Gym/Fitness:**
Gym

**Phase 6 — Operations & F&B:**
Housekeeping, POS (includes Bar/Kitchen operations)

**Phase 7 — Smart Guest Services:**
Security, RoomControl, GuestServices, Tablet

**Phase 8 — Advanced Features:**
Finance (compliance), Asset, WhatsApp, Loyalty, Analytics, Spa, OTA, IoT

**Phase 9 — Merchant Module:**
Merchant (registration, KYC, commissions, payouts, leads, resources, support)

---

## 4. Feature Requirements

### 4.1 Booking & Room Management
- **FR-101:** Room types with rates, descriptions, amenities, capacity
- **FR-102:** Individual and group bookings with date range, guest assignment
- **FR-103:** Room status lifecycle: available → occupied → dirty → inspected → available
- **FR-104:** Booking addons (breakfast, airport pickup, extra bed)
- **FR-105:** Dynamic pricing rules (seasonal, day-of-week, occupancy-based)
- **FR-106:** Walk-in bookings via reception app
- **FR-107:** OTA channel integration (Booking.com, Expedia mapping)

### 4.2 Guest Management
- **FR-201:** Guest profiles with documents, preferences, loyalty tier
- **FR-202:** Mobile check-in via guest app with QR code
- **FR-203:** Guest access codes for room/facility entry
- **FR-204:** Multi-department chat (reception, kitchen, bar)
- **FR-205:** Service request submission and tracking
- **FR-206:** In-room controls (AC, lighting, DND) via tablet/mobile
- **FR-207:** Amenity vouchers (spa, gym, dining credits)
- **FR-208:** Waitlist management for fully-booked services

### 4.3 Finance & Billing
- **FR-301:** Guest folios with charges, payments, adjustments
- **FR-302:** Invoice generation with line items and PDF export
- **FR-303:** Multiple payment methods (cash, card, bank transfer, POS)
- **FR-304:** Folio posting from POS, spa, gym, room service
- **FR-305:** Night audit with daily snapshot and reconciliation
- **FR-306:** Revenue analytics and financial dashboards
- **FR-307:** Expense tracking with category management

### 4.4 HR & Staff Operations
- **FR-401:** Employee management with departments, positions, salaries
- **FR-402:** Shift scheduling and assignment
- **FR-403:** Clock in/out attendance with geolocation
- **FR-404:** Leave management (request, approve, balance tracking)
- **FR-405:** Payroll processing with tax brackets and deductions
- **FR-406:** Performance review cycles

### 4.5 F&B / Point of Sale
- **FR-501:** POS with menu categories, products, tables
- **FR-502:** Order creation with items, modifiers, split bills
- **FR-503:** Kitchen display system (send-to-kitchen, preparing, ready)
- **FR-504:** Post-to-folio integration for room charge
- **FR-505:** Bar and restaurant order management

### 4.6 Merchant Partner Ecosystem
- **FR-601:** Merchant registration with auto-generated merchant ID
- **FR-602:** KYC workflow (document upload, admin review, approve/reject)
- **FR-603:** Hotel onboarding by merchants with binding
- **FR-604:** Commission auto-calculation on subscription payments
- **FR-605:** Commission lifecycle (pending → approved → payable → paid)
- **FR-606:** Payout generation with KYC gate enforcement
- **FR-607:** Lead pipeline (lead → contacted → demo → negotiation → converted)
- **FR-608:** Resource library with download tracking
- **FR-609:** Merchant support tickets with SLA enforcement

### 4.7 Platform Management
- **FR-701:** Multi-tenant architecture with data isolation
- **FR-702:** Subscription plans with tiered feature access
- **FR-703:** Feature flag management per tenant
- **FR-704:** Platform-wide analytics and usage metrics
- **FR-705:** WhatsApp notification integration via Termii
- **FR-706:** IoT device management and automation rules

---

## 5. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Response Time | < 500ms for 95th percentile API calls |
| Availability | 99.5% uptime SLA |
| Concurrent Users | 1,000+ simultaneous users per tenant |
| Data Isolation | Strict tenant-level data isolation |
| Authentication | JWT with refresh tokens, role-based access |
| API Security | HTTPS, CORS, rate limiting, input validation |
| Mobile Support | iOS 14+, Android 10+ |
| Browser Support | Chrome 90+, Safari 14+, Firefox 90+, Edge 90+ |
| Scalability | Horizontal scaling via containerized deployment |

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| Hotel Onboarding Time | < 24 hours from signup to first booking |
| Guest App Adoption | > 40% of guests using mobile check-in |
| Staff Efficiency | 30% reduction in manual task time |
| Merchant Hotel Conversion | > 15% lead-to-customer conversion rate |
| Platform Uptime | > 99.5% monthly |

---

## 7. Release History

| Phase | Features | Status |
|-------|----------|--------|
| Phase 0 | SaaS platform, auth, tenants, subscriptions | ✅ Complete |
| Phase 1 | Core PMS (rooms, guests, bookings) | ✅ Complete |
| Phase 2 | Finance (folios, invoices) | ✅ Complete |
| Phase 3 | HR (employees, attendance, leave, payroll) | ✅ Complete |
| Phase 4 | Guest experience (chat, requests, notifications) | ✅ Complete |
| Phase 5 | Gym/fitness facility management | ✅ Complete |
| Phase 6 | Operations (housekeeping, POS/F&B) | ✅ Complete |
| Phase 7 | Smart guest services (security, room control) | ✅ Complete |
| Phase 8 | Advanced (assets, WhatsApp, loyalty, analytics, spa, OTA, IoT) | ✅ Complete |
| Phase 9 | Merchant module (partner ecosystem, commissions) | ✅ Complete |
