# Lodgik — Comprehensive Documentation Framework

**Version:** 1.0  
**Classification:** Internal / Enterprise-Grade  
**Date:** 2026-02-22  
**Prepared for:** Engineering, Product, Legal, Operations, Investors, Partners  

---

## Table of Contents

1. Product & Business Documentation
2. Legal, Compliance & Governance
3. UX/UI & Design
4. Technical Architecture
5. Web & Mobile Engineering
6. DevOps & Deployment
7. Security
8. QA & Testing
9. Operations & Support
10. Analytics, Growth & Feedback
11. Knowledge Base & Training
12. Minimum Required Docs for MVP (Checklist)
13. Docs Required for Scale & Enterprise Sales (Checklist)
14. Recommended Documentation Folder Structure

---

# 1. Product & Business Documentation

## 1.1 Product Vision & Strategy

**Purpose:** Align all stakeholders on what Lodgik is, who it serves, why it exists, and where it is going. This is the foundational reference for every product and engineering decision.

**Owner:** Product Lead / CEO

**Status:** Mandatory

**Must contain:**

- **Mission statement:** "Lodgik is the operating system for modern hotels — replacing fragmented tools with a unified, intelligent platform connecting every department, guest, and partner."
- **Target market:** Nigerian hospitality (primary), West African expansion (secondary), global enterprise licensing (tertiary)
- **Problem definition:** Hotels in Nigeria rely on paper logs, Excel spreadsheets, WhatsApp for operations, and have zero integration between front desk, housekeeping, kitchen, finance, and guest experience. This costs 30-40% in operational inefficiency and guest satisfaction.
- **Platform scope:** 7 applications (Hotel Web, Admin Web, Merchant Portal, Guest Mobile, Tablet, Security Mobile, Reception Mobile), 40 backend modules, 466 API endpoints
- **Competitive positioning vs Opera PMS, Cloudbeds, Mews, Little Hotelier — differentiated by African-market-native payment integration (Paystack), WhatsApp-native messaging (Termii), merchant partner revenue-sharing model, and offline-capable mobile design
- **3-year roadmap with quarterly milestones**
- **Success metrics:** Hotels onboarded, MRR, guest app adoption rate, churn, NPS

## 1.2 Product Requirements Document (PRD)

**Purpose:** Define what the product does at the feature level. The source of truth for engineering scope.

**Owner:** Product Lead

**Status:** Mandatory — Exists at `docs/PRD.md`

**Must contain:**

- Feature requirements grouped by domain (FR-101 through FR-706 — already defined)
- User stories for each persona (Hotel Owner, Manager, Front Desk, Housekeeping, Kitchen, Security, Guest, Merchant, Super Admin)
- Acceptance criteria per feature
- Priority classification (Must / Should / Could / Won't for this release)
- Dependency map showing cross-module feature interactions
- Non-functional requirements (performance, availability, scalability)

## 1.3 Persona Definitions

**Purpose:** Drive all UX, feature, and communication decisions around real user archetypes.

**Owner:** Product Lead

**Status:** Mandatory

**Must contain detailed profiles for each of the 9 Lodgik personas:**

| Persona | Role | App(s) Used | Key Needs |
|---------|------|-------------|-----------|
| **Ade (Hotel Owner)** | property_admin | Hotel Web | Revenue visibility, occupancy trends, staff performance, subscription management |
| **Funmi (General Manager)** | manager | Hotel Web | Operational oversight, night audit, department coordination |
| **Tunde (Front Desk)** | front_desk | Hotel Web + Reception Mobile | Quick check-in/out, walk-in bookings, folio management, guest requests |
| **Aisha (Housekeeping)** | housekeeping | Hotel Web | Task queue, room status updates, inspection checklists, priority alerts |
| **Emeka (Kitchen/Bar)** | kitchen / bar | Hotel Web (POS) | Kitchen display, order queue, item preparation, ready notifications |
| **Ibrahim (Security)** | security | Security Mobile | Visitor verification, gate passes, movement logging, incident reports |
| **Grace (Guest)** | guest | Guest Mobile + Tablet | Mobile check-in, service requests, F&B orders, room controls, chat |
| **Chidi (Merchant)** | merchant_admin | Merchant Portal | Hotel onboarding, lead pipeline, commission tracking, payout visibility |
| **Platform Admin** | super_admin | Admin Web | Tenant lifecycle, KYC review, commission tiers, platform analytics |

Each persona document must include: demographic profile, day-in-the-life scenario, pain points without Lodgik, workflow with Lodgik, feature touchpoints, and success metrics.

## 1.4 Monetization & Plan Architecture

**Purpose:** Define how Lodgik generates revenue, structures pricing, and manages the merchant commission model.

**Owner:** Product Lead + Finance

**Status:** Mandatory

**Must contain:**

- **Subscription plan tiers** (linked to SubscriptionPlan entity): plan name, monthly/annual pricing in NGN, included modules, room limits, staff limits, property limits
- **Feature gating rules:** which modules are accessible per plan tier (mapped to TenantFeatureModule entity and FeatureMiddleware)
- **Merchant commission structure:** CommissionTier rates (new_subscription: 10%, renewal: 5%, upgrade: 8%), plan-specific overrides, 7-day cooling period, KYC gate on payouts
- **Add-on pricing:** WhatsApp message bundles, additional properties, premium OTA channels, IoT device management
- **Billing lifecycle:** trial → active → past_due → suspended → cancelled, grace periods, proration on upgrade
- **Revenue recognition rules:** when commission becomes payable, when subscription revenue is recognized

## 1.5 Product Roadmap

**Purpose:** Communicate planned feature delivery to all stakeholders with timeline commitments.

**Owner:** Product Lead

**Status:** Mandatory

**Must contain:**

- Completed phases (0-9) with delivery dates and feature summaries
- Next planned phases: Phase 10 (Multi-language support, Arabic RTL), Phase 11 (Revenue Management / Dynamic Pricing AI), Phase 12 (Hotel Chain Management), Phase 13 (Channel Manager deep integration)
- Quarterly OKRs tied to roadmap milestones
- Technical debt backlog with prioritization
- Customer-requested features pipeline

## 1.6 Support & Escalation Policy

**Purpose:** Define how support requests are triaged, routed, and resolved for hotels, merchants, and guests.

**Owner:** Operations Lead

**Status:** Mandatory

**Must contain:**

- **Tier definitions:** L1 (app usage questions, password resets), L2 (configuration issues, data corrections), L3 (bugs, infrastructure), L4 (security incidents, data breaches)
- **SLA targets per tier:** L1 < 4hrs, L2 < 12hrs, L3 < 24hrs, L4 < 1hr (based on MerchantSupportTicket SLA logic — 24hrs for finance, 48hrs for others)
- **Escalation paths:** L1 → support agent, L2 → technical support, L3 → engineering on-call, L4 → incident commander + CTO
- **Channel availability:** in-app chat, WhatsApp, email, phone (enterprise only)
- **Business hours:** 8am-10pm WAT for standard, 24/7 for enterprise tier
- **Merchant support:** separate queue with priority routing (already implemented in MerchantSupportTicket)

---

# 2. Legal, Compliance & Governance

## 2.1 Terms of Service

**Purpose:** Legally binding agreement governing the use of Lodgik by hotel tenants.

**Owner:** Legal

**Status:** Mandatory

**Must contain:**

- Service definition and scope
- Account registration requirements (linked to Auth module register flow)
- Acceptable use policy (no illegal activity, no sharing credentials)
- Subscription terms (auto-renewal, cancellation policy, refund policy)
- Data ownership: "Tenant retains ownership of all operational data entered into Lodgik. Lodgik has a license to process data solely for service delivery."
- Limitation of liability (system downtime, data loss caps)
- Dispute resolution (Nigerian jurisdiction, arbitration clause)
- Termination provisions (tenant-initiated, Lodgik-initiated for ToS violations, data export window)
- Governing law: Federal Republic of Nigeria

## 2.2 Privacy Policy (NDPR/GDPR Aligned)

**Purpose:** Disclose how Lodgik collects, processes, stores, and protects personal data. Required under Nigeria Data Protection Regulation (NDPR) 2019 and aligned with GDPR for international guests.

**Owner:** Legal + DPO (Data Protection Officer)

**Status:** Mandatory

**Must contain:**

- **Data collected:** Guest PII (name, email, phone, ID document via GuestDocument entity, passport numbers), employee PII (via Employee entity — NIN, bank details, salary), visitor data (via VisitorAccessCode — name, phone, purpose), merchant KYC (via MerchantKyc — government ID, selfie, CAC certificate)
- **Legal basis for processing:** contractual necessity (hotel-guest relationship), legitimate interest (operational efficiency), consent (marketing communications)
- **Data controller:** the hotel tenant (Lodgik is data processor)
- **Data processor obligations:** Lodgik processes data on behalf of tenants, subject to data processing agreement
- **Data retention periods:** Guest data: 7 years post-checkout (Nigerian tax/audit requirement), employee data: 5 years post-termination, financial records: 10 years, security logs: 1 year
- **Cross-border transfer:** data stored in Nigerian/African data centers; if international, standard contractual clauses apply
- **Data subject rights:** access, rectification, erasure ("right to be forgotten"), data portability, objection to processing
- **Breach notification:** within 72 hours to NDPR Bureau and affected data subjects
- **Cookie policy:** analytics cookies with opt-out
- **Children's data:** Lodgik does not knowingly collect data from persons under 18

## 2.3 Data Processing Agreement (DPA)

**Purpose:** Governs the relationship between hotel tenants (data controllers) and Lodgik (data processor).

**Owner:** Legal

**Status:** Mandatory for enterprise, recommended for all

**Must contain:**

- Scope of processing (types of data, categories of data subjects)
- Processing instructions (tenant controls what is processed)
- Sub-processor list (Paystack for payments, Termii for messaging, cloud hosting provider)
- Security measures (encryption at rest, in transit, access controls — see Section 7)
- Audit rights (tenant can request evidence of compliance)
- Data deletion obligations on contract termination
- Breach notification procedures

## 2.4 Incident Response Plan

**Purpose:** Structured process for responding to security incidents, data breaches, and service disruptions.

**Owner:** Engineering Lead + Legal

**Status:** Mandatory

**Must contain:**

- **Severity classification:** P1 (data breach, full outage), P2 (partial outage, security vulnerability), P3 (degraded performance, minor bug), P4 (cosmetic issues)
- **Response team:** Incident Commander, Technical Lead, Communications Lead, Legal Advisor
- **Response timeline:** P1: detection → containment within 30min, root cause within 4hrs, resolution within 12hrs; P2: 1hr/8hrs/24hrs; P3: 4hrs/24hrs/72hrs
- **Communication protocol:** internal Slack/notification within 15min, affected tenants within 1hr for P1, NDPR Bureau within 72hrs for data breach
- **Post-incident review:** mandatory blameless postmortem within 48hrs
- **Evidence preservation:** audit logs (AuditLog entity), MerchantAuditLog, request logs with RequestIdMiddleware correlation
- **Annual tabletop exercises** simulating breach scenarios

## 2.5 SLA Agreement

**Purpose:** Contractual uptime and performance commitments to hotel tenants and merchant partners.

**Owner:** Operations + Legal

**Status:** Mandatory for enterprise, recommended for all

**Must contain:**

| Metric | Standard Plan | Enterprise Plan |
|--------|--------------|-----------------|
| Uptime | 99.0% monthly | 99.5% monthly |
| API response (p95) | < 1 second | < 500ms |
| Scheduled maintenance window | Sundays 2-4am WAT | Pre-notified, < 30min |
| Data backup frequency | Daily | Hourly |
| Disaster recovery RTO | < 8 hours | < 4 hours |
| Disaster recovery RPO | < 24 hours | < 1 hour |
| Support response (L1) | < 8 hours | < 2 hours |
| Support response (P1) | < 4 hours | < 1 hour |

- **Credit schedule:** 10% monthly credit per 0.1% below SLA target
- **Exclusions:** force majeure, tenant-side issues, scheduled maintenance, third-party service outages (Paystack, Termii)
- **Measurement methodology:** synthetic monitoring + health endpoint (`/api/health`)

---

# 3. UX/UI & Design

## 3.1 Design System

**Purpose:** Ensure visual and interaction consistency across all 7 Lodgik applications.

**Owner:** Design Lead

**Status:** Mandatory

**Must contain:**

- **Color palettes:** Hotel app (blue primary `#3b82f6`), Admin app (dark navy `#0f1f33`), Merchant portal (emerald `#065f46`), Guest app (warm neutral), Security app (dark mode)
- **Typography:** System fonts (Inter/SF Pro for mobile, default for web), heading hierarchy (H1-H4), body text sizes
- **Component library** (maps to `@lodgik/shared` Angular library): PageHeaderComponent, StatsCardComponent, BadgeComponent, LoadingSpinnerComponent, DataTableComponent, ToastContainerComponent, ConfirmDialogComponent
- **Icon system:** Emoji-based nav icons (current implementation), plan migration to Lucide icon set
- **Spacing system:** Tailwind CSS utility-first (4px base unit)
- **Layout patterns:** sidebar navigation (60px/240px), main content area with 24px padding, header bar (56px height)
- **Form patterns:** label-above-input, validation inline, error states in red-50 background
- **Responsive breakpoints:** sm (640px), md (768px), lg (1024px), xl (1280px)
- **Dark mode specifications** (for security and tablet apps)
- **Animation guidelines:** transitions 150ms ease, loading spinners, skeleton screens

## 3.2 Guest vs Staff UX Separation

**Purpose:** Ensure the guest-facing experience is consumer-grade (simple, delightful, zero training) while staff-facing tools are power-user optimized (dense information, keyboard shortcuts, batch operations).

**Owner:** Design Lead

**Status:** Mandatory

**Must contain:**

- **Guest experience principles:**
  - Maximum 3 taps to complete any action (book service, send request, order food)
  - No hotel jargon — "Your Bill" not "Folio", "Room Service" not "Service Request"
  - Visual-first design with large touch targets (minimum 44px)
  - Graceful offline behavior with sync indicators
  - Multi-language ready (currently English, planned: Yoruba, Hausa, Igbo, French, Arabic)

- **Staff experience principles:**
  - Information density over whitespace — show maximum data per screen
  - Keyboard-navigable (tab order, enter to submit, escape to cancel)
  - Batch operations (mark 10 rooms clean, bulk assign shifts)
  - Real-time polling (implemented — 30-second intervals on dashboards)
  - Role-specific views (front_desk sees bookings, housekeeping sees tasks, kitchen sees orders)

## 3.3 Accessibility & Localization

**Purpose:** Ensure Lodgik meets accessibility standards and supports multi-language/multi-currency operation.

**Owner:** Design Lead + Engineering

**Status:** Recommended (mandatory for enterprise)

**Must contain:**

- WCAG 2.1 AA compliance targets
- Minimum contrast ratios (4.5:1 text, 3:1 large text)
- Screen reader compatibility (ARIA labels on all interactive elements)
- Keyboard navigation for all web applications
- **Localization architecture:** i18n framework selection, translation file structure, RTL support plan (Arabic)
- **Currency handling:** NGN as primary (₦ prefix), USD/GBP/EUR for international properties, all amounts stored as integer (kobo/cents) in database
- **Date/time handling:** WAT (UTC+1) as default, per-property timezone configuration, ISO 8601 for API responses

## 3.4 Offline-First Mobile UX Rules

**Purpose:** Define how mobile apps behave when internet connectivity is lost or degraded — critical for Nigerian hotel operations where connectivity is unreliable.

**Owner:** Mobile Engineering Lead

**Status:** Mandatory

**Must contain:**

- **Offline-capable operations:** view cached bookings, view room status, create service requests (queued), view guest information, clock in/out (attendance), view assigned tasks (housekeeping)
- **Online-required operations:** process payment, send WhatsApp message, sync OTA reservations, real-time chat
- **Sync strategy:** background sync on reconnection, conflict resolution (server wins for financial data, client wins for draft data), sync status indicator (green/amber/red)
- **Storage limits:** maximum 50MB local storage per app, automatic purge of data older than 7 days
- **Error states:** clear messaging ("You're offline. This action will be completed when you reconnect."), queue indicator showing pending sync items

---

# 4. Technical Architecture

## 4.1 Multi-Tenant Architecture Document

**Purpose:** Define how Lodgik isolates data, routes requests, and manages resources across hotel tenants.

**Owner:** Engineering Lead

**Status:** Mandatory — partially documented in `docs/FSD.md`

**Must contain:**

- **Isolation model:** shared database with `tenant_id` column on all tenant-scoped tables. TenantAware interface implemented on 80+ entities. TenantMiddleware extracts tenant context from JWT and injects into request attributes.
- **Query filtering:** all repository queries automatically filtered by tenant_id at the service layer
- **Cross-tenant prevention:** no API endpoint can access data from another tenant. Super admin endpoints bypass tenant filter but are gated by `super_admin` role.
- **Tenant provisioning flow:** Register → create Tenant + Property + User → run onboarding wizard → activate subscription
- **Tenant configuration:** per-tenant branding (logo, colors via BrandingService), per-tenant feature flags (TenantFeatureModule + FeatureMiddleware), per-tenant app config (TenantAppConfig)
- **Resource limits:** max rooms, max staff, max properties — enforced per subscription plan
- **Data export:** tenant can request full data export (all entities with their tenant_id)
- **Tenant deletion:** soft delete with 30-day grace period, then hard purge

## 4.2 Role-Based Access Control (RBAC) Document

**Purpose:** Define every role, its permissions, and how access control is enforced across all 466 endpoints.

**Owner:** Engineering Lead

**Status:** Mandatory

**Must contain:**

- **Role definitions** (16 roles in UserRole enum):

| Role | Scope | Primary Access |
|------|-------|---------------|
| super_admin | Platform | All admin endpoints, tenant management, KYC review |
| property_admin | Tenant | Full hotel management, staff management, billing |
| manager | Tenant | Operational management, reports, no billing changes |
| front_desk | Property | Bookings, check-in/out, folios, guest management |
| housekeeping | Property | Task queue, room status updates |
| kitchen | Property | POS kitchen queue, item preparation |
| bar | Property | POS bar orders, item preparation |
| accountant | Property | Finance module, invoices, payroll |
| hr | Property | Employee management, attendance, leave |
| concierge | Property | Guest services, service requests |
| maintenance | Property | Asset management, maintenance logs |
| gym_staff | Property | Gym module, membership management |
| security | Property | Visitor codes, gate passes, police reports |
| engineer | Property | IoT devices, room controls, automation |
| merchant_admin | Merchant | Full merchant portal access |
| merchant_agent | Merchant | Limited to hotel viewing, lead management |

- **Middleware enforcement:** RoleMiddleware checks user role against allowed roles array per route group. Defined in each module's `routes.php`.
- **Permission inheritance:** property_admin inherits all property-level permissions. manager inherits most except billing/subscription changes.
- **API response filtering:** some endpoints return different data based on role (e.g., dashboard KPIs differ for manager vs front_desk)

## 4.3 API Design Standards

**Purpose:** Define the conventions that govern all 466 API endpoints for consistency, predictability, and developer experience.

**Owner:** Engineering Lead

**Status:** Mandatory — partially documented in `docs/openapi.yaml` (461 endpoints)

**Must contain:**

- **URL conventions:** `/api/{module}/{resource}` for tenant-scoped, `/api/admin/{resource}` for super admin, `/api/merchant/{resource}` for merchant portal, `/api/guest-auth/{action}` for guest app
- **HTTP methods:** GET (read), POST (create/action), PUT (full update), PATCH (partial update), DELETE (remove)
- **Request format:** JSON body for POST/PUT/PATCH, query parameters for GET filters
- **Response format:** `{ "data": {...} }` for single resource, `[{...}]` for lists (arrays), `{ "error": "message" }` for errors
- **Status codes:** 200 (success), 201 (created), 204 (no content), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 422 (validation error), 429 (rate limited), 500 (server error)
- **Pagination:** query params `page` and `per_page`, response includes count
- **Filtering:** query params (e.g., `?status=active&search=grand`)
- **Date format:** ISO 8601 (`2026-02-22T14:30:00+01:00`)
- **Currency amounts:** stored as integer (kobo) in database, returned as decimal string in API ("50000.00")
- **Versioning strategy:** URL prefix `/api/v1/` (planned for breaking changes)
- **Rate limiting:** 100 requests/minute per authenticated user (RateLimitMiddleware), 10 requests/minute for auth endpoints
- **CORS:** configured via CorsMiddleware with explicit origin whitelist

## 4.4 Integration Standards

**Purpose:** Define how Lodgik integrates with external services and the patterns for adding new integrations.

**Owner:** Engineering Lead

**Status:** Mandatory

**Must contain:**

- **Paystack integration** (SubscriptionService + PaystackService):
  - Checkout initialization → redirect to Paystack → verify callback → activate subscription
  - Webhook processing (5 events: charge.success, subscription.create/not_renew/disable, invoice.payment_failed)
  - Webhook signature verification with HMAC
  - Commission auto-trigger on charge.success (Phase 9D)

- **Termii integration** (WhatsAppService + TermiiClient):
  - Template-based messaging (booking confirmation, check-in reminder, receipt)
  - Message status tracking (sent, delivered, read)
  - Rate limiting and retry logic

- **OTA integration** (OtaService):
  - Channel mapping (Booking.com, Expedia)
  - Reservation sync (pull reservations, push availability)
  - Rate plan synchronization

- **Integration pattern:** all external services wrapped in dedicated client classes, injectable via DI container, with retry logic, circuit breaker readiness, and timeout configuration

## 4.5 Data Flow & Event Architecture

**Purpose:** Document how data flows through the system, especially for cross-module triggers and asynchronous operations.

**Owner:** Engineering Lead

**Status:** Recommended

**Must contain:**

- **Synchronous flows:** HTTP request → middleware chain (CORS → JSON parser → Auth → Tenant → Role → Feature) → controller → service → entity manager → response
- **Cross-module triggers** (currently synchronous, inline):
  - Booking check-in → auto-create Folio
  - POS post-to-folio → create FolioCharge
  - Subscription payment → auto-calculate Commission
  - Visitor code creation → auto-create GatePass
  - Lead conversion → create MerchantHotel
  - Night audit → generate DailySnapshot
- **Polling-based real-time:** frontend apps poll dashboards every 30 seconds, kitchen display every 10 seconds, chat every 5 seconds
- **Future event bus architecture:** plan for Redis pub/sub or dedicated message queue for decoupling cross-module triggers

---

# 5. Web & Mobile Engineering

## 5.1 Web Application Architecture

**Purpose:** Document the Angular monorepo structure, build pipeline, and patterns governing all 3 web applications.

**Owner:** Frontend Engineering Lead

**Status:** Mandatory

**Must contain:**

- **Monorepo structure:** Angular workspace with 4 projects (hotel, admin, merchant, shared library)
- **Build system:** Angular CLI with `ng build {project}` per app. Tailwind CSS via PostCSS. Shared library compiled separately.
- **Shared library (`@lodgik/shared`):**
  - Services: ApiService, AuthService, TokenService, BrandingService, FeatureService, ToastService
  - Components: PageHeaderComponent, StatsCardComponent, BadgeComponent, LoadingSpinnerComponent, DataTableComponent
  - Guards: authGuard, adminGuard
  - Interceptors: authInterceptor (adds Bearer token), errorInterceptor (handles 401 → redirect to login)
- **Chart library (`@lodgik/charts`):** LineChartComponent, BarChartComponent, DonutChartComponent, GaugeChartComponent, SparklineChartComponent
- **State management:** Angular signals for component state, no global store (services manage API calls and caching)
- **Routing:** lazy-loaded routes per page, layout wrapper with sidebar + header, role-gated child routes
- **Page counts:** Hotel: 70 pages, Admin: 17 pages, Merchant: 11 pages

## 5.2 Mobile Application Architecture

**Purpose:** Document the Ionic/Angular mobile app architecture for all 4 mobile applications.

**Owner:** Mobile Engineering Lead

**Status:** Mandatory

**Must contain:**

- **Framework:** Ionic 7 + Angular (shared TypeScript codebase)
- **Apps:** Guest (27 files), Tablet (14 files), Security (13 files), Reception (15 files)
- **Native capabilities:** Camera (KYC document upload), GPS (attendance geolocation), Push notifications (FCM/APNs via DeviceToken entity), Biometric auth
- **API communication:** shared ApiService with environment-specific base URLs
- **Offline architecture:** (see Section 3.4)
- **App distribution:** managed via AppDistribution module (14 endpoints) — app releases with version tracking, platform-specific download URLs, download logging

## 5.3 Push Notification Architecture

**Purpose:** Define how push notifications are delivered across web and mobile clients.

**Owner:** Engineering Lead

**Status:** Recommended

**Must contain:**

- **Device token management:** DeviceToken entity stores FCM/APNs tokens per user per device
- **Notification entity:** stores in-app notifications with type, title, body, read status, sent timestamp
- **Channel types:** in_app (always), email (configurable), whatsapp (via Termii), push (via FCM/APNs)
- **Trigger points:** booking confirmation, check-in reminder, service request update, commission earned, KYC status change, new resource uploaded
- **Merchant notifications:** MerchantNotification entity with separate channel (in_app + email)
- **Delivery guarantee:** at-least-once for in_app, best-effort for push/email/whatsapp

---

# 6. DevOps & Deployment

## 6.1 CI/CD Pipeline

**Purpose:** Define the automated build, test, and deployment pipeline for all Lodgik components.

**Owner:** DevOps Lead

**Status:** Mandatory

**Must contain:**

- **Pipeline stages:**
  1. **Lint:** PHP-CS-Fixer, ESLint, Stylelint
  2. **Test:** PHPUnit (448 tests, 1120 assertions), Angular unit tests
  3. **Build:** `composer install --no-dev`, `ng build hotel`, `ng build admin`, `ng build merchant`
  4. **Security scan:** dependency vulnerability check (Composer audit, npm audit)
  5. **Deploy:** push to staging → smoke test → manual approval → push to production
  6. **Post-deploy:** health check, smoke tests, rollback trigger if health fails

- **Branch strategy:** main (production), develop (staging), feature/* (development), hotfix/* (emergency)
- **Deployment targets:** Docker containers behind Nginx reverse proxy
- **Rollback procedure:** `git checkout <previous-tag>`, re-run migrations if needed, rebuild frontends (documented in DEPLOYMENT_RUNBOOK.md)

## 6.2 Environment Separation

**Purpose:** Define the isolated environments for development, testing, staging, and production.

**Owner:** DevOps Lead

**Status:** Mandatory

**Must contain:**

| Environment | Purpose | Database | External Services | Access |
|-------------|---------|----------|-------------------|--------|
| local | Developer machine | SQLite / local MySQL | Mocked | Developer only |
| dev | Shared development | Shared dev DB | Sandbox keys | Engineering team |
| staging | Pre-production testing | Staging DB (production mirror) | Sandbox keys | QA + product |
| production | Live system | Production DB | Live keys | Automated deploy only |

- **Environment parity:** staging must mirror production infrastructure (same container images, same DB engine version)
- **Data masking:** production data never copied to lower environments without PII anonymization
- **Feature flags:** FeatureMiddleware allows enabling features per environment and per tenant

## 6.3 Secrets Management

**Purpose:** Define how sensitive configuration (API keys, database credentials, JWT secrets) is managed.

**Owner:** DevOps Lead

**Status:** Mandatory

**Must contain:**

- **Secrets inventory:**
  - JWT_SECRET (64-char random string)
  - DB_PASSWORD
  - REDIS_PASSWORD
  - PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET
  - TERMII_API_KEY
  - SMTP credentials
- **Storage:** environment variables loaded from `.env` file (excluded from git via `.gitignore`)
- **Production:** secrets injected via container orchestration (Docker secrets / AWS Secrets Manager / Vault)
- **Rotation policy:** JWT_SECRET rotated quarterly, DB_PASSWORD rotated monthly, API keys rotated on personnel change
- **Access control:** only DevOps lead and CTO have production secret access

## 6.4 Monitoring, Logging & Alerting

**Purpose:** Define the observability stack that ensures Lodgik operational health.

**Owner:** DevOps Lead

**Status:** Mandatory

**Must contain:**

- **Health endpoint:** `/api/health` (checks application), `/api/health/detailed` (checks DB + Redis connectivity)
- **Application logging:** structured JSON logs with request_id (RequestIdMiddleware), timestamp, user_id, tenant_id, action, duration
- **Log levels:** ERROR (immediate alert), WARNING (daily review), INFO (audit trail), DEBUG (development only)
- **Metrics to collect:** request count, response time (p50/p95/p99), error rate, active users, database query time, Redis hit rate
- **Alerting thresholds:**
  - Health endpoint failure → P1 alert (PagerDuty/SMS) within 60 seconds
  - Error rate > 5% → P2 alert within 5 minutes
  - Response time p95 > 2 seconds → P3 alert within 15 minutes
  - Disk usage > 80% → P3 alert within 1 hour
- **Log retention:** 90 days in centralized logging, 1 year in cold storage
- **Dashboards:** Grafana/similar for real-time metrics, weekly automated reports

## 6.5 Rollback & Hotfix Strategy

**Purpose:** Define how to quickly revert problematic deployments and ship emergency fixes.

**Owner:** DevOps Lead

**Status:** Mandatory — documented in `docs/DEPLOYMENT_RUNBOOK.md`

**Must contain:**

- **Rollback trigger:** automated (health check failure post-deploy) or manual (on-call decision)
- **Rollback steps:** revert to previous Docker image tag, run migration rollback if schema changed, verify health
- **Hotfix process:** branch from main → fix → test → deploy directly to production (bypassing staging for P1 only) → backport to develop
- **Database migration rollback:** all migrations must have `down()` method. Never drop columns that contain data without backup.
- **Maximum rollback window:** 30 minutes from deployment to rollback decision

---

# 7. Security

## 7.1 Authentication & Authorization Architecture

**Purpose:** Comprehensive security documentation covering how every request is authenticated, authorized, and audited.

**Owner:** Engineering Lead + Security Lead

**Status:** Mandatory

**Must contain:**

- **Authentication stack:**
  - JWT (HS256) with configurable expiration (15min access, 30d refresh)
  - Password hashing: Argon2id (PHP native)
  - Refresh token rotation: new pair issued on each refresh, old token invalidated
  - Guest authentication: separate flow via GuestAuth module (booking reference + last name or phone OTP)
  - Merchant authentication: standard JWT with merchant_admin/merchant_agent roles

- **Middleware chain** (executed in order for every request):
  1. `CorsMiddleware` — validates origin, sets CORS headers
  2. `JsonBodyParserMiddleware` — parses JSON request body
  3. `RequestIdMiddleware` — generates unique request ID for tracing
  4. `ErrorHandlerMiddleware` — catches exceptions, returns structured error response
  5. `RateLimitMiddleware` — enforces per-user rate limits (Redis-backed)
  6. `AuthMiddleware` — validates JWT, extracts user_id, tenant_id, role
  7. `TenantMiddleware` — resolves tenant context, injects property_id
  8. `RoleMiddleware` — validates user role against endpoint-allowed roles
  9. `FeatureMiddleware` — checks if required module is enabled for tenant

- **Session management:** stateless (JWT only), no server-side sessions. RefreshToken entity stores token hashes for revocation capability.

## 7.2 Data Encryption

**Purpose:** Define encryption standards for data at rest and in transit.

**Owner:** Security Lead

**Status:** Mandatory

**Must contain:**

- **In transit:** TLS 1.2+ mandatory for all API traffic (Nginx SSL termination). HSTS headers with 1-year max-age.
- **At rest:** database-level encryption (InnoDB tablespace encryption for MySQL 8.0), Redis password protection
- **Sensitive field handling:**
  - Passwords: Argon2id hashed (never stored in plaintext)
  - API keys: stored as environment variables, never in database
  - KYC documents: URLs only stored in database, actual documents in encrypted object storage
  - Bank account numbers: stored in MerchantBankAccount entity (plan: encrypt with application-level AES-256)
  - Guest ID numbers: stored in GuestDocument entity (plan: encrypt with application-level AES-256)
- **Backup encryption:** all database backups encrypted with AES-256 before storage

## 7.3 Vulnerability Management

**Purpose:** Process for identifying, triaging, and remediating security vulnerabilities.

**Owner:** Security Lead

**Status:** Mandatory

**Must contain:**

- **Dependency scanning:** `composer audit` and `npm audit` run in CI pipeline on every commit
- **OWASP Top 10 mitigations:**
  - A01 (Broken Access Control): RoleMiddleware + TenantMiddleware enforce on every route
  - A02 (Cryptographic Failures): Argon2id passwords, TLS in transit, encrypted backups
  - A03 (Injection): Doctrine ORM parameterized queries (no raw SQL), input validation in DTOs
  - A04 (Insecure Design): threat modeling per module, security review on PRs
  - A05 (Security Misconfiguration): production checklist (APP_DEBUG=false, error details hidden)
  - A06 (Vulnerable Components): automated dependency scanning
  - A07 (Auth Failures): rate limiting on login (10 req/min), account lockout after 5 failed attempts
  - A08 (Data Integrity): webhook signature verification (Paystack HMAC), audit logging
  - A09 (Logging Failures): structured logging with request_id, audit trail
  - A10 (SSRF): no user-controlled URL fetching in production code

- **Vulnerability severity classification:** Critical (RCE, auth bypass) → patch within 4 hours; High (data exposure) → patch within 24 hours; Medium → patch within 7 days; Low → next release
- **Responsible disclosure policy:** security@lodgik.com, 90-day disclosure timeline

## 7.4 Penetration Testing Readiness

**Purpose:** Preparation for third-party penetration testing and security audits.

**Owner:** Security Lead

**Status:** Recommended (mandatory for enterprise)

**Must contain:**

- **Scope definition:** all API endpoints (466), web applications (3), mobile applications (4), infrastructure
- **Test types:** black-box (external), grey-box (with API docs), white-box (with source access)
- **Pre-test checklist:**
  - Staging environment provisioned with production-like data (anonymized)
  - Test accounts created for each role (16 roles)
  - OpenAPI spec provided (docs/openapi.yaml — 461 endpoints documented)
  - Network diagram provided
  - Known issues documented
- **Post-test process:** findings triaged within 48 hours, critical findings patched before production, re-test within 30 days
- **Frequency:** annually for standard, semi-annually for enterprise, after major architecture changes

---

# 8. QA & Testing

## 8.1 Automated Testing Strategy

**Purpose:** Define the automated test pyramid and coverage targets for Lodgik.

**Owner:** QA Lead + Engineering Lead

**Status:** Mandatory

**Must contain:**

- **Current state:**
  - 448 PHPUnit tests, 1,120 assertions
  - Coverage: all 40 modules have at least entity-level tests
  - Test categories: unit tests (entity behavior, DTO validation, enum values), integration tests (service-layer with DB)
  
- **Test pyramid targets:**
  - Unit tests (70%): entity methods, DTO validation, enum behavior, utility functions
  - Integration tests (20%): service methods with real EntityManager (in-memory SQLite)
  - E2E tests (10%): critical user flows (register → login → create booking → check-in → create folio → payment → check-out)

- **Frontend testing:**
  - Angular unit tests for services and components
  - Cypress/Playwright E2E for critical web flows
  - Mobile: Appium/Detox for native flow testing

- **Test data management:** factory classes for generating test entities, seed scripts for staging environment

## 8.2 Manual QA Process

**Purpose:** Define the human QA process for features that cannot be fully automated.

**Owner:** QA Lead

**Status:** Mandatory

**Must contain:**

- **Test case management:** structured test cases per module with preconditions, steps, expected results
- **Exploratory testing:** 2 hours per sprint on new features, focus on edge cases and error states
- **Cross-browser testing:** Chrome, Safari, Firefox, Edge (latest 2 versions each)
- **Mobile device matrix:** iOS (iPhone 12+, iPad), Android (Samsung Galaxy S21+, Pixel 6+), various screen sizes
- **Accessibility audit:** quarterly WCAG 2.1 AA audit using axe-core and manual screen reader testing
- **Regression testing:** full regression on all critical paths before each production release

## 8.3 Performance & Load Testing

**Purpose:** Ensure Lodgik meets performance SLAs under expected and peak load conditions.

**Owner:** Engineering Lead

**Status:** Recommended (mandatory for enterprise)

**Must contain:**

- **Baseline targets:**
  - API response: < 200ms (p50), < 500ms (p95), < 1s (p99)
  - Dashboard render: < 2 seconds
  - Search/filter: < 500ms
  - File upload (KYC documents): < 5 seconds

- **Load scenarios:**
  - Normal: 500 concurrent users across 50 tenants
  - Peak: 2,000 concurrent users (Saturday evening check-in rush)
  - Stress: 5,000 concurrent users (DDoS simulation)
  - Spike: 0 → 1,000 users in 30 seconds (flash sale scenario)

- **Tools:** k6, Apache JMeter, or Artillery
- **Database performance:** query analysis with EXPLAIN, slow query log monitoring, index optimization
- **Frequency:** before each major release, quarterly for load regression

## 8.4 Release Gates

**Purpose:** Define the quality gates that must pass before any code reaches production.

**Owner:** Engineering Lead

**Status:** Mandatory

**Must contain:**

| Gate | Requirement | Blocking? |
|------|-------------|-----------|
| Unit tests | 448+ tests pass, 0 failures | Yes |
| Build | All 7 apps compile without errors | Yes |
| Security scan | No critical/high vulnerabilities in dependencies | Yes |
| Code review | At least 1 approval from senior engineer | Yes |
| QA sign-off | Manual QA on affected features complete | Yes (for feature releases) |
| Performance regression | No p95 degradation > 20% | Yes (for infrastructure changes) |
| OpenAPI spec | Updated and valid | No (recommended) |
| Migration | Reversible (has down() method) | Yes |
| Staging verification | Smoke tests pass on staging | Yes |

---

# 9. Operations & Support

## 9.1 Incident Management Process

**Purpose:** Structured process for detecting, responding to, and resolving production incidents.

**Owner:** Operations Lead

**Status:** Mandatory

**Must contain:**

- **Detection sources:** health endpoint monitoring (60s interval), error rate alerts, customer reports, Paystack webhook failures
- **Severity levels:**
  - SEV-1: Full outage or data breach → All hands, CTO notified, customer communication within 1 hour
  - SEV-2: Major feature broken (bookings, payments) → On-call engineer + team lead
  - SEV-3: Minor feature degraded → On-call engineer, fix within 24 hours
  - SEV-4: Cosmetic/low-impact → Added to sprint backlog
- **On-call rotation:** weekly rotation among senior engineers, 24/7 availability for SEV-1/SEV-2
- **Communication templates:** status page updates, customer email templates per severity
- **Post-incident:** blameless postmortem within 48 hours, action items tracked to completion
- **Metrics:** MTTD (mean time to detect), MTTR (mean time to resolve), incidents per month by severity

## 9.2 Hotel Onboarding Workflow

**Purpose:** Step-by-step operational process for activating a new hotel on Lodgik.

**Owner:** Customer Success

**Status:** Mandatory

**Must contain:**

1. **Account creation:** Hotel owner registers via web (Auth module → Tenant + User created)
2. **Onboarding wizard:** Property setup, room types, rooms, departments, branding (Onboarding module — 12 endpoints)
3. **Subscription activation:** Select plan → Paystack checkout → subscription activated
4. **Staff setup:** Invite staff with role assignments (TenantInvitation → accept-invite flow)
5. **Data import:** bulk room import, guest history import (CSV upload)
6. **Training:** 1-hour video walkthrough for each role, in-app tooltips, help center links
7. **Go-live checkpoint:** verify rooms configured, at least 1 staff per critical role, test booking created and checked in
8. **Merchant binding** (if applicable): merchant registers hotel, admin approves, onboarding status tracked in MerchantHotel

- **Target onboarding time:** < 24 hours from registration to first real booking
- **Onboarding health score:** rooms configured (yes/no), staff invited (count), first booking created (yes/no), payment method added (yes/no)

## 9.3 SLA Tracking & Reporting

**Purpose:** Operational process for measuring and reporting on SLA compliance.

**Owner:** Operations Lead

**Status:** Mandatory for enterprise

**Must contain:**

- **Uptime measurement:** synthetic monitoring hitting `/api/health` every 60 seconds from 3 geographic locations
- **Uptime calculation:** (total_minutes - downtime_minutes) / total_minutes × 100
- **Exclusions:** scheduled maintenance (pre-notified), client-side issues, third-party outages
- **Monthly SLA report:** uptime percentage, incident count by severity, MTTR, credit eligibility
- **Customer dashboard:** real-time status page showing system health, recent incidents, planned maintenance

## 9.4 Support Playbooks

**Purpose:** Step-by-step guides for support agents handling common issues.

**Owner:** Customer Success + Engineering

**Status:** Mandatory

**Must contain playbooks for:**

- "Hotel cannot log in" → verify email, check account status, reset password, check subscription status
- "Booking not showing" → check tenant_id match, verify booking status, check date filters
- "Payment failed" → verify Paystack key configuration, check webhook URL, test with sandbox
- "Guest app not connecting" → verify guest-auth token, check property configuration, test API endpoint
- "Room status stuck" → check for incomplete housekeeping tasks, manual status override
- "Commission not calculated" → verify merchant-hotel binding, check KYC status, verify subscription payment webhook received
- "WhatsApp messages not sending" → check Termii API key, verify template approval, check message quota
- "Mobile app crash" → collect device info, app version, crash logs, escalate to L3

---

# 10. Analytics, Growth & Feedback

## 10.1 Product Analytics Framework

**Purpose:** Define what user behavior and product usage metrics are tracked to inform product decisions.

**Owner:** Product Lead + Data

**Status:** Mandatory

**Must contain:**

- **User engagement metrics:**
  - DAU/MAU per app (hotel web, guest mobile, merchant portal)
  - Feature adoption rate (% of tenants using each module)
  - Session duration and frequency
  - Drop-off points in onboarding wizard

- **Operational metrics:**
  - Bookings created per tenant per month
  - Average occupancy rate per tenant
  - Service requests per guest stay
  - POS orders per day
  - Chat messages per stay

- **Implementation:** DailySnapshot entity (Analytics module) captures daily aggregates. Dashboard endpoint serves trend data. Frontend tracks page views and action events.

## 10.2 Revenue & Churn Analytics

**Purpose:** Track financial health of the Lodgik platform.

**Owner:** Finance + Product

**Status:** Mandatory

**Must contain:**

- **Revenue metrics:**
  - MRR (Monthly Recurring Revenue) — sum of all active subscription amounts
  - ARPU (Average Revenue Per User/Tenant)
  - MRR growth rate (month-over-month)
  - Commission revenue (merchant ecosystem)
  - Plan distribution (how many tenants on each tier)

- **Churn metrics:**
  - Monthly churn rate (tenants who cancelled / total active tenants)
  - Revenue churn (lost MRR / total MRR)
  - Churn reasons (captured during cancellation flow)
  - Reactivation rate

- **Data sources:** Subscription entity (status, amount, billing_cycle), SubscriptionInvoice (payment history), Tenant (subscription_status)

## 10.3 Feature Feedback Lifecycle

**Purpose:** Process for collecting, triaging, and acting on feature requests from hotel operators, guests, and merchants.

**Owner:** Product Lead

**Status:** Recommended

**Must contain:**

- **Collection channels:** in-app feedback button, support tickets, merchant portal, sales team notes, NPS survey comments
- **Triage process:** weekly review, categorize (bug, improvement, new feature), score (impact × frequency), assign to roadmap quarter
- **Feedback loop:** acknowledge receipt within 48 hours, update when prioritized, notify when shipped
- **Feature request database:** title, requester (tenant/merchant), category, priority score, status (requested, planned, in-progress, shipped, declined), decline reason

---

# 11. Knowledge Base & Training

## 11.1 Internal Engineering Runbooks

**Purpose:** Step-by-step operational guides for engineering team members.

**Owner:** Engineering Lead

**Status:** Mandatory

**Must contain:**

- **New developer onboarding:** repository setup, local environment, running tests, architecture overview, coding conventions
- **Adding a new module:** create entity → migration → service → controller → routes → DI config → tests → frontend pages
- **Database migration procedures:** creating migrations, testing rollback, deploying to production
- **On-call procedures:** tools access, escalation contacts, common incident patterns
- **Release procedure:** branch preparation, CI/CD pipeline monitoring, smoke test execution, rollback decision criteria

## 11.2 Hotel Onboarding Manual

**Purpose:** Guide for hotel owners and managers setting up their Lodgik account.

**Owner:** Customer Success

**Status:** Mandatory

**Must contain:**

- **Getting started:** account creation, subscription selection, payment
- **Property setup:** hotel name, address, logo, branding colors
- **Room configuration:** create room types (rates, capacity, amenities), add rooms per type
- **Staff management:** invite staff, assign roles, department setup
- **Booking workflow:** create booking, check-in, manage folio, check-out
- **Guest services:** service request categories, chat department routing
- **Finance:** night audit, expense tracking, invoice generation
- **Reports:** dashboard interpretation, occupancy trends, revenue analytics
- **Mobile apps:** guest app setup, QR code generation, tablet configuration

## 11.3 API Documentation

**Purpose:** Complete reference for developers integrating with or extending Lodgik.

**Owner:** Engineering Lead

**Status:** Mandatory — exists at `docs/openapi.yaml` + Swagger UI at `/docs/`

**Must contain:**

- OpenAPI 3.0 specification (461 endpoints documented)
- Swagger UI interactive explorer
- Authentication guide (JWT token lifecycle)
- Error response reference
- Webhook event documentation (Paystack events)
- Rate limiting documentation
- Code examples in cURL, JavaScript, PHP, Python

## 11.4 Merchant Partner Training

**Purpose:** Training materials for merchant partners using the Merchant Portal.

**Owner:** Customer Success + Merchant Operations

**Status:** Mandatory

**Must contain:**

- **Onboarding guide:** registration, KYC document preparation, bank account setup
- **Hotel registration workflow:** collecting hotel information, submitting for onboarding, tracking status
- **Lead management:** creating leads, updating pipeline stages, converting to registered hotels
- **Commission understanding:** how rates work, cooling period, when commissions become payable
- **Payout process:** viewing earnings, understanding statements, payout schedule
- **Support:** how to create tickets, expected response times, escalation

---

# 12. Minimum Required Docs for MVP Checklist

These documents are required before the first production hotel goes live.

| # | Document | Owner | Status |
|---|----------|-------|--------|
| 1 | Product Vision & Strategy | Product | ◻️ Draft needed |
| 2 | PRD (Feature Requirements) | Product | ✅ `docs/PRD.md` |
| 3 | Terms of Service | Legal | ◻️ Draft needed |
| 4 | Privacy Policy (NDPR aligned) | Legal | ◻️ Draft needed |
| 5 | FSD (Functional Specification) | Engineering | ✅ `docs/FSD.md` |
| 6 | SRS (Software Requirements) | Engineering | ✅ `docs/SRS.md` |
| 7 | API Documentation (OpenAPI) | Engineering | ✅ `docs/openapi.yaml` + Swagger UI |
| 8 | Deployment Runbook | DevOps | ✅ `docs/DEPLOYMENT_RUNBOOK.md` |
| 9 | Multi-Tenant Architecture Doc | Engineering | ✅ Partial in FSD.md |
| 10 | RBAC Role Matrix | Engineering | ✅ Defined in UserRole enum + routes |
| 11 | Environment Configuration Guide | DevOps | ✅ In DEPLOYMENT_RUNBOOK.md |
| 12 | Incident Response Plan | Ops + Legal | ◻️ Draft needed |
| 13 | Hotel Onboarding Manual | Customer Success | ◻️ Draft needed |
| 14 | Support Playbooks (top 10 issues) | Customer Success | ◻️ Draft needed |
| 15 | New Developer Onboarding Guide | Engineering | ◻️ Draft needed |

**MVP readiness: 8/15 complete, 7 remaining**

---

# 13. Docs Required for Scale & Enterprise Sales Checklist

These additional documents are required for enterprise hotel chain sales, investor due diligence, and regulatory compliance.

| # | Document | Owner | Status |
|---|----------|-------|--------|
| 1 | All MVP docs (above) | Various | See above |
| 2 | Data Processing Agreement (DPA) | Legal | ◻️ Required |
| 3 | SLA Agreement (tiered) | Ops + Legal | ◻️ Required |
| 4 | Penetration Test Report | Security | ◻️ Required |
| 5 | SOC 2 Type II Readiness Assessment | Security | ◻️ Required |
| 6 | Disaster Recovery Plan | DevOps | ◻️ Required |
| 7 | Business Continuity Plan | Operations | ◻️ Required |
| 8 | Design System (component library) | Design | ◻️ Required |
| 9 | Performance/Load Test Report | QA | ◻️ Required |
| 10 | Data Retention & Deletion Policy | Legal + Eng | ◻️ Required |
| 11 | Accessibility Audit Report | Design + QA | ◻️ Required |
| 12 | Merchant Partner Agreement | Legal | ◻️ Required |
| 13 | Integration Partner Documentation | Engineering | ◻️ Required |
| 14 | Revenue & Churn Analytics Dashboard | Data + Product | ◻️ Required |
| 15 | Multi-Language/Localization Plan | Product + Eng | ◻️ Required |
| 16 | Compliance Matrix (NDPR + GDPR) | Legal | ◻️ Required |
| 17 | Third-Party Sub-Processor Register | Legal | ◻️ Required |
| 18 | Staff & Merchant Training Materials | Customer Success | ◻️ Required |
| 19 | Product Analytics Framework | Product + Data | ◻️ Required |
| 20 | API Versioning & Deprecation Policy | Engineering | ◻️ Required |

**Enterprise readiness: 8/35 complete (including MVP docs), 27 remaining**

---

# 14. Recommended Documentation Folder Structure

```
lodgik/
├── docs/
│   ├── README.md                           # Documentation index / table of contents
│   │
│   ├── 01-product/
│   │   ├── PRODUCT_VISION.md               # Mission, strategy, market positioning
│   │   ├── PRD.md                          # ✅ Exists — Product Requirements Document
│   │   ├── PERSONAS.md                     # Detailed user persona definitions
│   │   ├── ROADMAP.md                      # Quarterly feature roadmap
│   │   ├── MONETIZATION.md                 # Plan tiers, pricing, commission model
│   │   └── SUPPORT_POLICY.md              # Escalation paths, SLAs, channel definitions
│   │
│   ├── 02-legal/
│   │   ├── TERMS_OF_SERVICE.md            # Tenant agreement
│   │   ├── PRIVACY_POLICY.md              # NDPR/GDPR aligned
│   │   ├── DATA_PROCESSING_AGREEMENT.md   # DPA for enterprise tenants
│   │   ├── MERCHANT_PARTNER_AGREEMENT.md  # Merchant terms and commission rules
│   │   ├── DATA_RETENTION_POLICY.md       # Retention periods, deletion procedures
│   │   ├── INCIDENT_RESPONSE_PLAN.md      # Breach response process
│   │   ├── SLA_AGREEMENT.md               # Tiered SLA terms
│   │   └── COMPLIANCE_MATRIX.md           # NDPR + GDPR mapping
│   │
│   ├── 03-design/
│   │   ├── DESIGN_SYSTEM.md               # Colors, typography, components, patterns
│   │   ├── UX_PRINCIPLES.md               # Guest vs staff UX separation
│   │   ├── ACCESSIBILITY.md               # WCAG 2.1 AA compliance plan
│   │   ├── LOCALIZATION.md                # i18n architecture, language support
│   │   └── OFFLINE_UX.md                  # Mobile offline behavior rules
│   │
│   ├── 04-architecture/
│   │   ├── FSD.md                          # ✅ Exists — Functional Specification
│   │   ├── SRS.md                          # ✅ Exists — Software Requirements
│   │   ├── MULTI_TENANT.md                # Tenant isolation architecture
│   │   ├── RBAC.md                         # Role matrix and permission model
│   │   ├── API_STANDARDS.md               # URL conventions, response format, versioning
│   │   ├── INTEGRATION_STANDARDS.md       # Paystack, Termii, OTA patterns
│   │   ├── DATA_FLOW.md                   # Cross-module triggers, event architecture
│   │   └── DATABASE_SCHEMA.md             # ERD, entity relationships, migration guide
│   │
│   ├── 05-engineering/
│   │   ├── WEB_ARCHITECTURE.md            # Angular monorepo, shared library, build
│   │   ├── MOBILE_ARCHITECTURE.md         # Ionic apps, offline sync, native features
│   │   ├── CODING_CONVENTIONS.md          # PHP + TypeScript style guide
│   │   ├── MODULE_DEVELOPMENT_GUIDE.md    # How to add a new module end-to-end
│   │   └── PUSH_NOTIFICATIONS.md          # FCM/APNs architecture
│   │
│   ├── 06-devops/
│   │   ├── DEPLOYMENT_RUNBOOK.md           # ✅ Exists — Full deployment guide
│   │   ├── CI_CD_PIPELINE.md              # Pipeline stages, branch strategy
│   │   ├── ENVIRONMENT_SETUP.md           # Dev/staging/production configuration
│   │   ├── SECRETS_MANAGEMENT.md          # Key rotation, access control
│   │   ├── MONITORING.md                  # Health checks, alerts, dashboards
│   │   ├── DISASTER_RECOVERY.md           # RTO/RPO, failover procedures
│   │   └── docker-compose.yml             # Container orchestration
│   │
│   ├── 07-security/
│   │   ├── AUTH_ARCHITECTURE.md           # JWT, middleware chain, session management
│   │   ├── ENCRYPTION.md                  # At-rest, in-transit, field-level
│   │   ├── VULNERABILITY_MANAGEMENT.md    # OWASP mitigations, scanning, patching
│   │   ├── PENTEST_READINESS.md           # Scope, test accounts, pre-test checklist
│   │   └── SECURITY_CHECKLIST.md          # Production hardening checklist
│   │
│   ├── 08-qa/
│   │   ├── TEST_STRATEGY.md               # Test pyramid, coverage targets
│   │   ├── TEST_CASES/                    # Per-module test case documents
│   │   ├── PERFORMANCE_TEST_PLAN.md       # Load scenarios, tools, baselines
│   │   └── RELEASE_GATES.md              # Quality gates before production
│   │
│   ├── 09-operations/
│   │   ├── INCIDENT_MANAGEMENT.md         # Detection, response, postmortem
│   │   ├── ONBOARDING_WORKFLOW.md         # Hotel activation steps
│   │   ├── SLA_TRACKING.md               # Measurement, reporting, credits
│   │   └── SUPPORT_PLAYBOOKS/            # Per-issue resolution guides
│   │       ├── login-issues.md
│   │       ├── booking-issues.md
│   │       ├── payment-issues.md
│   │       ├── commission-issues.md
│   │       └── mobile-app-issues.md
│   │
│   ├── 10-analytics/
│   │   ├── PRODUCT_ANALYTICS.md           # Event tracking, dashboards
│   │   ├── REVENUE_METRICS.md             # MRR, churn, ARPU definitions
│   │   └── FEEDBACK_LIFECYCLE.md          # Feature request process
│   │
│   ├── 11-training/
│   │   ├── DEVELOPER_ONBOARDING.md        # New developer setup guide
│   │   ├── HOTEL_OWNER_GUIDE.md           # Hotel setup and management
│   │   ├── STAFF_GUIDES/                  # Per-role training
│   │   │   ├── front-desk.md
│   │   │   ├── housekeeping.md
│   │   │   ├── kitchen-bar.md
│   │   │   └── security.md
│   │   ├── MERCHANT_GUIDE.md              # Merchant onboarding and operations
│   │   └── GUEST_APP_GUIDE.md             # Guest mobile app user guide
│   │
│   ├── api/
│   │   ├── openapi.yaml                    # ✅ Exists — 461 endpoints documented
│   │   └── WEBHOOK_EVENTS.md              # Paystack webhook event reference
│   │
│   └── plans/
│       ├── PHASE_8_PLAN.md                 # ✅ Exists
│       └── PHASE_9_MERCHANT_PLAN.md        # ✅ Exists
```

---

# Document Priority Matrix

| Priority | Document Count | Timeline |
|----------|---------------|----------|
| **P0 — Exists** | 8 documents | ✅ Complete |
| **P1 — Pre-launch** | 7 documents | Before first production hotel |
| **P2 — Growth phase** | 10 documents | Within 6 months of launch |
| **P3 — Enterprise** | 10 documents | Before first enterprise deal |

**P0 (Complete):** PRD, FSD, SRS, Deployment Runbook, OpenAPI spec, Phase 8 Plan, Phase 9 Plan, Documentation Framework (this document)

**P1 (Pre-launch — within 4 weeks):** Terms of Service, Privacy Policy, Incident Response Plan, Hotel Onboarding Manual, Support Playbooks (top 10), Developer Onboarding Guide, Product Vision & Strategy

**P2 (Growth — within 6 months):** Design System, UX Principles, Accessibility Plan, Localization Plan, Monitoring & Alerting Guide, CI/CD Pipeline Doc, Revenue Metrics Dashboard, Feature Feedback Process, Staff Training Guides

**P3 (Enterprise — before first enterprise deal):** DPA, SLA Agreement, Pentest Report, SOC 2 Readiness, Disaster Recovery Plan, Business Continuity Plan, Compliance Matrix, Sub-Processor Register, API Versioning Policy, Multi-language Plan

---

*End of Lodgik Documentation Framework v1.0*
