# Lodgik — Software Requirements Specification (SRS)

**Version:** 1.0  
**Date:** 2026-02-22  
**Document ID:** LODGIK-SRS-001  
**Status:** Implementation Complete  

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the Lodgik Hotel Management System, a multi-tenant SaaS platform for hotel property management, guest services, staff operations, financial management, and merchant partner ecosystem.

### 1.2 Scope
Lodgik encompasses 7 applications (3 web, 4 mobile), a backend API with 40 modules and 466 endpoints, supporting the full lifecycle of hotel operations from booking to checkout, staff management, F&B operations, security, and merchant partner revenue sharing.

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| Tenant | A hotel business entity (may have multiple properties) |
| Property | A physical hotel building within a tenant |
| Folio | A guest bill/account accumulating charges during a stay |
| PMS | Property Management System |
| OTA | Online Travel Agency (Booking.com, Expedia) |
| KYC | Know Your Customer verification |
| MRC | Merchant Reference Code (e.g., MRC-A1B2C3) |

---

## 2. System Architecture Requirements

### 2.1 Backend (SR-ARCH-001 through SR-ARCH-010)

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-ARCH-001 | PHP 8.3+ with Slim 4 framework | Must |
| SR-ARCH-002 | Doctrine ORM for database abstraction | Must |
| SR-ARCH-003 | MySQL 8.0+ or PostgreSQL 14+ as primary database | Must |
| SR-ARCH-004 | Redis for session caching and real-time features | Should |
| SR-ARCH-005 | JWT (HS256) authentication with 15min access / 30d refresh | Must |
| SR-ARCH-006 | Role-based access control (RBAC) with 13 roles | Must |
| SR-ARCH-007 | Multi-tenant data isolation via tenant_id on all entities | Must |
| SR-ARCH-008 | Dependency injection container (PHP-DI) | Must |
| SR-ARCH-009 | Database migrations for schema versioning (24 migrations) | Must |
| SR-ARCH-010 | Automated test suite (448 tests, 1120 assertions) | Must |

### 2.2 Frontend (SR-ARCH-011 through SR-ARCH-018)

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-ARCH-011 | Angular 17+ with standalone components | Must |
| SR-ARCH-012 | Tailwind CSS for styling | Must |
| SR-ARCH-013 | Lazy-loaded routes for performance | Must |
| SR-ARCH-014 | Shared component library (@lodgik/shared) | Must |
| SR-ARCH-015 | Chart library (@lodgik/charts) for dashboards | Should |
| SR-ARCH-016 | Ionic 7+ for mobile apps | Must |
| SR-ARCH-017 | Cross-platform mobile (iOS + Android) from shared codebase | Must |
| SR-ARCH-018 | Offline-capable mobile architecture | Should |

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-AUTH-001 | Email/password registration with tenant creation | Must |
| SR-AUTH-002 | Login returns JWT access + refresh token pair | Must |
| SR-AUTH-003 | Token refresh without re-authentication | Must |
| SR-AUTH-004 | Password reset via email token | Must |
| SR-AUTH-005 | Staff invitation with role assignment | Must |
| SR-AUTH-006 | Session revocation (single and all devices) | Must |
| SR-AUTH-007 | Guest authentication (separate auth flow) | Must |
| SR-AUTH-008 | Role middleware enforcement on all protected routes | Must |
| SR-AUTH-009 | Password hashing with Argon2id | Must |

### 3.2 Room Management

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-ROOM-001 | Room type CRUD with rates, capacity, amenities | Must |
| SR-ROOM-002 | Room inventory per type with status tracking | Must |
| SR-ROOM-003 | Room status lifecycle (available→occupied→dirty→clean) | Must |
| SR-ROOM-004 | Bulk room status updates | Must |
| SR-ROOM-005 | Dynamic pricing rules (seasonal, DOW, occupancy) | Should |
| SR-ROOM-006 | Floor plan assignment (floor, building, wing) | Should |
| SR-ROOM-007 | Room maintenance blocking | Must |

### 3.3 Booking Management

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-BOOK-001 | Create booking with guest, room type, dates, rate | Must |
| SR-BOOK-002 | Booking status lifecycle with audit trail | Must |
| SR-BOOK-003 | Group booking support | Should |
| SR-BOOK-004 | Booking addons (breakfast, transport, etc.) | Should |
| SR-BOOK-005 | Check-in with room assignment and folio creation | Must |
| SR-BOOK-006 | Check-out with folio balance validation | Must |
| SR-BOOK-007 | Walk-in booking via reception | Must |
| SR-BOOK-008 | Availability calendar calculation | Must |

### 3.4 Finance & Billing

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-FIN-001 | Guest folio auto-creation on check-in | Must |
| SR-FIN-002 | Charge posting (room, F&B, spa, minibar, phone) | Must |
| SR-FIN-003 | Payment recording (cash, card, bank, city ledger) | Must |
| SR-FIN-004 | Folio adjustments with reason tracking | Must |
| SR-FIN-005 | Invoice generation with line items | Must |
| SR-FIN-006 | Night audit with daily snapshot | Should |
| SR-FIN-007 | Expense category management and tracking | Should |
| SR-FIN-008 | Tax configuration with bracket-based calculation | Should |
| SR-FIN-009 | Revenue analytics with trend data | Should |

### 3.5 HR & Payroll

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-HR-001 | Employee CRUD with department/position | Must |
| SR-HR-002 | Shift scheduling and assignment | Should |
| SR-HR-003 | Clock in/out attendance tracking | Must |
| SR-HR-004 | Leave request and approval workflow | Must |
| SR-HR-005 | Leave balance tracking per type | Must |
| SR-HR-006 | Payroll period management | Should |
| SR-HR-007 | Salary computation with tax deductions | Should |
| SR-HR-008 | Performance review cycles | Should |

### 3.6 Guest Experience

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-GX-001 | Guest profile with documents and preferences | Must |
| SR-GX-002 | Mobile check-in via guest app | Should |
| SR-GX-003 | Service request submission and tracking | Must |
| SR-GX-004 | Multi-department chat (reception, kitchen, bar) | Must |
| SR-GX-005 | Push and in-app notifications | Must |
| SR-GX-006 | In-room tablet controls (AC, lighting, DND) | Should |
| SR-GX-007 | Amenity vouchers and charge transfers | Should |
| SR-GX-008 | Waitlist for overbooked services | Should |

### 3.7 F&B / Point of Sale

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-POS-001 | Menu category and product management | Must |
| SR-POS-002 | Order creation with items and modifiers | Must |
| SR-POS-003 | Kitchen display system (KDS) queue | Must |
| SR-POS-004 | Item status: pending→preparing→ready→served | Must |
| SR-POS-005 | Post-to-folio for room charge | Must |
| SR-POS-006 | Split bill support | Should |
| SR-POS-007 | Table management | Should |

### 3.8 Merchant Partner Ecosystem

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-MRC-001 | Merchant registration with auto-ID (MRC-XXXXXX) | Must |
| SR-MRC-002 | KYC document upload and admin review workflow | Must |
| SR-MRC-003 | Hotel binding to merchant with onboarding status | Must |
| SR-MRC-004 | Commission auto-calculation on subscription payment | Must |
| SR-MRC-005 | Commission lifecycle (pending→approved→paid) with cooling | Must |
| SR-MRC-006 | Payout generation with KYC gate enforcement | Must |
| SR-MRC-007 | Commission tier management with plan overrides | Must |
| SR-MRC-008 | Lead pipeline with conversion to hotel | Should |
| SR-MRC-009 | Resource library with download tracking | Should |
| SR-MRC-010 | Support ticket system with SLA | Should |
| SR-MRC-011 | Merchant audit trail for all financial actions | Must |
| SR-MRC-012 | Merchant notification system (in-app + email) | Should |

### 3.9 SaaS Platform Management

| ID | Requirement | Priority |
|----|-------------|----------|
| SR-SAAS-001 | Multi-tenant architecture with data isolation | Must |
| SR-SAAS-002 | Subscription plans with tiered features/limits | Must |
| SR-SAAS-003 | Paystack payment integration | Must |
| SR-SAAS-004 | Feature flag management per tenant | Must |
| SR-SAAS-005 | Usage metrics and quota enforcement | Should |
| SR-SAAS-006 | Tenant onboarding wizard | Must |
| SR-SAAS-007 | Mobile app distribution and versioning | Should |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| SR-PERF-001 | API response time (95th percentile) | < 500ms |
| SR-PERF-002 | Dashboard load time | < 2 seconds |
| SR-PERF-003 | Database query optimization | Indexed queries |
| SR-PERF-004 | Concurrent user support per tenant | 1,000+ |

### 4.2 Security

| ID | Requirement |
|----|-------------|
| SR-SEC-001 | All API traffic over HTTPS |
| SR-SEC-002 | JWT tokens with expiration and refresh |
| SR-SEC-003 | Password hashing with Argon2id |
| SR-SEC-004 | RBAC enforcement on all protected endpoints |
| SR-SEC-005 | Tenant data isolation (no cross-tenant access) |
| SR-SEC-006 | Input validation on all POST/PUT endpoints |
| SR-SEC-007 | SQL injection prevention via parameterized queries |
| SR-SEC-008 | CORS configuration for frontend origins |
| SR-SEC-009 | Rate limiting on authentication endpoints |
| SR-SEC-010 | Audit logging for financial and admin actions |

### 4.3 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| SR-REL-001 | System availability | 99.5% uptime |
| SR-REL-002 | Database backup frequency | Daily |
| SR-REL-003 | Disaster recovery RTO | < 4 hours |
| SR-REL-004 | Disaster recovery RPO | < 1 hour |
| SR-REL-005 | Automated health monitoring | Every 60s |

### 4.4 Scalability

| ID | Requirement |
|----|-------------|
| SR-SCALE-001 | Horizontal scaling via containerized deployment |
| SR-SCALE-002 | Database read replicas for analytics queries |
| SR-SCALE-003 | Redis caching for frequently accessed data |
| SR-SCALE-004 | Stateless API servers behind load balancer |

### 4.5 Compatibility

| ID | Requirement |
|----|-------------|
| SR-COMPAT-001 | Chrome 90+, Safari 14+, Firefox 90+, Edge 90+ |
| SR-COMPAT-002 | iOS 14+, Android 10+ |
| SR-COMPAT-003 | Responsive design (mobile-first) |
| SR-COMPAT-004 | API versioning via URL prefix (/api/v1/) |

---

## 5. Database Schema Summary

**Total tables:** 113 (matching entity count)  
**Total migrations:** 24  
**Key relationships:**

- Tenant → Properties (1:N)
- Property → Rooms → RoomTypes (N:1)
- Guest → Bookings (1:N)
- Booking → Folio (1:1)
- Folio → FolioCharges, FolioPayments (1:N)
- Employee → Attendance, Leave, Payroll (1:N)
- Merchant → MerchantHotels, Commissions, Leads (1:N)
- CommissionTier → Commissions (1:N)
- Subscription → Tenant (N:1)

---

## 6. External System Interfaces

| System | Protocol | Purpose |
|--------|----------|---------|
| Paystack | REST API + Webhooks | Subscription billing |
| Termii | REST API | WhatsApp messaging |
| Booking.com | REST API | OTA channel sync |
| Expedia | REST API | OTA channel sync |
| FCM/APNs | Push API | Mobile push notifications |

---

## 7. Test Requirements

| Category | Count | Coverage |
|----------|-------|----------|
| Unit Tests | 448 | Entity behavior, DTO validation, enum values |
| Assertions | 1,120 | Property values, status transitions, calculations |
| Module Coverage | All 40 modules | At least entity-level tests per module |
| Commission Calculation | Percentage, fixed, plan overrides, cooling period |
| Security | RBAC enforcement, tenant isolation |
| Build Verification | 7 apps compile without errors |

---

## 8. Traceability Matrix

| PRD Feature | SRS Requirements | Module |
|-------------|-----------------|--------|
| FR-101 to FR-107 | SR-ROOM-001 to SR-ROOM-007 | Room |
| FR-201 to FR-208 | SR-GX-001 to SR-GX-008 | Guest, GuestServices |
| FR-301 to FR-307 | SR-FIN-001 to SR-FIN-009 | Folio, Invoice, Finance |
| FR-401 to FR-406 | SR-HR-001 to SR-HR-008 | Employee, Attendance, Leave, Payroll |
| FR-501 to FR-505 | SR-POS-001 to SR-POS-007 | Pos |
| FR-601 to FR-609 | SR-MRC-001 to SR-MRC-012 | Merchant |
| FR-701 to FR-706 | SR-SAAS-001 to SR-SAAS-007 | Tenant, Subscription, Admin |
