# Lodgik — Phase 9: Merchant Module Implementation Plan

## Overview

The Merchant Module is Lodgik's **revenue engine and partner ecosystem backbone**. It enables Lodgik-approved partners (sales agents, resellers, hospitality consultants, channel partners) to onboard hotels, drive subscriptions, earn auditable commissions, and access centralized resources — all within a KYC-compliant financial framework.

**Status:** Planned (after Phase 8 completion)
**Source:** Merchant Module Production-Ready Specification v1.0

---

## Actors

| Actor | Role |
|-------|------|
| Super Admin | Full merchant lifecycle management, KYC review, commission config, resource management |
| Merchant (Partner/Reseller) | Hotel onboarding, subscription management, commission tracking, support |
| Hotel (End Customer) | Receives merchant-initiated services, confirms payments |
| Finance/Compliance Officer | KYC verification, payout processing, fraud detection |

---

## Phase 9A — Backend: Entities + Migration + Core Services

### New Entities (14)

| # | Entity | Key Fields |
|---|--------|-----------|
| 1 | `Merchant` | legal_name, business_name, email (OTP verified), phone (OTP verified), address, operating_region, merchant_id (auto: `MRC-XXXXXX`), type (individual/company/agency), category (sales_agent/channel_partner/consultant), commission_tier_id, settlement_currency, status (pending_approval/kyc_in_progress/active/suspended/terminated) |
| 2 | `MerchantKyc` | merchant_id, kyc_type (individual/business), government_id_type (nin/passport/drivers_license), government_id_number, government_id_url, selfie_url, liveness_verified, proof_of_address_url, cac_certificate_url, director_ids (JSON), business_address_verification_url, company_bank_verified, status (not_submitted/under_review/approved/rejected), rejection_reason, reviewed_by, reviewed_at |
| 3 | `MerchantBankAccount` | merchant_id, bank_name, account_name, account_number, settlement_currency, payment_method (bank_transfer/wallet), tin, status (pending_approval/approved/frozen), change_requires_approval, approved_by, approved_at |
| 4 | `MerchantHotel` | merchant_id, tenant_id, property_id, hotel_name, location, contact_person, contact_phone, contact_email, rooms_count, hotel_category (budget/boutique/luxury), subscription_plan, onboarding_status (pending/in_progress/active/churned), bound_at, is_permanent_bind |
| 5 | `CommissionTier` | name, description, type (percentage/flat), new_subscription_rate, renewal_rate, upgrade_rate, plan_overrides (JSON: {starter: 10, pro: 15, enterprise: 20}), is_default, is_active |
| 6 | `Commission` | merchant_id, hotel_id (MerchantHotel), tenant_id, subscription_id, commission_tier_id, scope (new_subscription/renewal/upgrade), plan_name, billing_cycle, subscription_amount, commission_rate, commission_amount, status (pending/approved/payable/paid/reversed), cooling_period_ends, approved_at, paid_at, payment_reference, reversed_at, reversal_reason |
| 7 | `CommissionPayout` | merchant_id, payout_period, total_amount, commission_ids (JSON), bank_account_id, status (pending/processing/paid/failed), payment_reference, processing_started_at, paid_at, failure_reason |
| 8 | `MerchantResource` | title, description, category (user_manual/training/sales_deck/pricing/release_notes/compliance), sub_category, file_type (pdf/ppt/doc), file_url, file_size, version (v1.0, v1.1), visibility (merchant/hotel/both), status (active/archived), uploaded_by, uploaded_at |
| 9 | `MerchantResourceDownload` | resource_id, merchant_id, downloaded_at, ip_address, user_agent |
| 10 | `MerchantSupportTicket` | merchant_id, hotel_id (nullable — for hotel-behalf tickets), subject, description, priority_tag (sales/finance/technical), status (open/in_progress/resolved/closed), assigned_to, sla_due_at, resolved_at, resolution_notes |
| 11 | `MerchantAuditLog` | merchant_id, actor_id, actor_type (merchant/admin), action, entity_type, entity_id, old_value (JSON), new_value (JSON), ip_address, user_agent, timestamp |
| 12 | `MerchantNotification` | merchant_id, type (subscription_expiry/commission_approved/commission_paid/kyc_update/new_resource/policy_change), title, body, data (JSON), channel (in_app/email/whatsapp), is_read, sent_at |
| 13 | `MerchantLead` | merchant_id, hotel_name, contact_name, contact_phone, contact_email, location, rooms_estimate, status (lead/contacted/demo/negotiation/converted/lost), notes, converted_hotel_id, follow_up_date |
| 14 | `MerchantStatement` | merchant_id, period_start, period_end, opening_balance, total_earned, total_paid, closing_balance, generated_at, file_url |

### New Enums (4)

| Enum | Values |
|------|--------|
| `MerchantStatus` | PENDING_APPROVAL, KYC_IN_PROGRESS, ACTIVE, SUSPENDED, TERMINATED |
| `MerchantCategory` | SALES_AGENT, CHANNEL_PARTNER, CONSULTANT |
| `CommissionScope` | NEW_SUBSCRIPTION, RENEWAL, UPGRADE |
| `CommissionStatus` | PENDING, APPROVED, PAYABLE, PAID, REVERSED |

### New UserRoles (2)

| Role | Access Scope |
|------|-------------|
| `MERCHANT_ADMIN` | Full merchant portal — hotels, commissions, resources, support, bank setup |
| `MERCHANT_AGENT` | Limited — hotel onboarding + commission view only |

### MerchantService (~35 methods)

**Registration & Lifecycle:**
- registerMerchant(data) → creates with PENDING_APPROVAL status
- approveMerchant(id) → moves to KYC_IN_PROGRESS or ACTIVE
- suspendMerchant(id, reason)
- terminateMerchant(id, reason)
- getMerchantProfile(id)
- listMerchants(filters, pagination)

**KYC:**
- submitKyc(merchantId, documents)
- reviewKyc(id, status, reason?) → approved unlocks payouts
- getKycStatus(merchantId)

**Bank Account:**
- addBankAccount(merchantId, details)
- updateBankAccount(id, details) → requires admin re-approval
- approveBankAccount(id, adminId)
- freezeBankAccount(id, reason)

**Hotel Management:**
- registerHotel(merchantId, hotelData) → auto-bind permanently
- listMerchantHotels(merchantId, filters)
- getHotelDetail(merchantId, hotelId)
- getHotelOnboardingProgress(hotelId)
- initiateUpgrade(hotelId, newPlan)
- openHotelSupportTicket(merchantId, hotelId, data)
- viewHotelCommissions(merchantId, hotelId)

**Commission Engine (CRITICAL):**
- calculateCommission(subscriptionEvent) → auto on payment confirmed
- approveCommission(id)
- reverseCommission(id, reason)
- listCommissions(merchantId, filters)
- getMerchantEarnings(merchantId) → totals, by month, by hotel, pending vs paid
- generatePayout(merchantId, periodStart, periodEnd)
- processPayout(payoutId)
- listPayouts(merchantId)
- generateStatement(merchantId, periodStart, periodEnd) → PDF/CSV

**Resources:**
- listResources(visibility?, category?)
- getResource(id)
- downloadResource(id, merchantId) → tracks download
- createResource(data) — admin only
- updateResource(id, data) — admin only
- archiveResource(id) — admin only
- getResourceAnalytics(id)

**Support:**
- createTicket(merchantId, data)
- createHotelTicket(merchantId, hotelId, data)
- listTickets(merchantId, filters)
- updateTicketStatus(id, status, notes)
- assignTicket(id, staffId)

**Leads (Conversion Funnel):**
- createLead(merchantId, data)
- updateLead(id, status, notes)
- convertLead(id, hotelData)
- listLeads(merchantId, filters)

**Notifications:**
- createNotification(merchantId, type, title, body, channel)
- listNotifications(merchantId, unreadOnly?)
- markRead(id)
- markAllRead(merchantId)

### MerchantController (~30 endpoints)

### Routes — 7 RBAC-protected groups:

| Group | Path | Roles |
|-------|------|-------|
| Merchant Profile | `/merchants` | super_admin, merchant_admin |
| KYC & Bank | `/merchants/{id}/kyc`, `/merchants/{id}/bank` | super_admin, merchant_admin |
| Hotel Management | `/merchant-hotels` | merchant_admin, merchant_agent |
| Commissions | `/commissions` | super_admin, merchant_admin, merchant_agent (view only) |
| Payouts | `/commission-payouts` | super_admin (process), merchant_admin (view) |
| Resources | `/merchant-resources` | super_admin (manage), merchant_admin, merchant_agent |
| Support | `/merchant-support` | super_admin, merchant_admin, merchant_agent |

### Migration
- 14 new tables
- ~20 indexes

### Tests
- ~25-30 new tests covering:
  - Merchant lifecycle (pending → active → suspended)
  - KYC workflow (submit → review → approve/reject)
  - Commission calculation accuracy
  - Commission lifecycle (pending → approved → payable → paid)
  - Commission reversal
  - Payout generation
  - Hotel binding
  - Bank account approval flow
  - Lead conversion funnel

---

## Phase 9B — Merchant Portal (New Angular Web App)

### New app: `apps/web/projects/merchant/`

| Page | Features |
|------|----------|
| Login | Merchant auth (separate from hotel auth) |
| Dashboard | Conversion funnel chart, revenue trend, commission summary, active hotels count, pending KPIs |
| Hotels | List all bound hotels, onboarding status, subscription details, commission per hotel, register new hotel |
| Hotel Detail | Subscription info, upgrade initiation, support tickets, commission history |
| Commissions | Earnings table (filterable by hotel/period/status), pending vs paid, monthly breakdown |
| Payouts | Payout history, upcoming payout, download statements (PDF/CSV) |
| Leads | Lead pipeline (kanban or table), create/edit leads, convert to hotel |
| Resources | Categorized resource library, search, download tracking, version badges |
| Support | Ticket list, create ticket, create hotel-behalf ticket, SLA indicators |
| Profile | Business info, KYC status + upload, bank account management |
| Notifications | In-app notification center |

### UI Requirements
- Merchant-branded sidebar (different from hotel app)
- Commission charts (monthly trend, by plan, by hotel)
- KYC progress stepper
- Real-time notification badge

---

## Phase 9C — Admin Portal Integration

### Admin Web Additions (3-5 new pages)

| Page | Features |
|------|----------|
| Merchant Management | List merchants, approve/suspend/terminate, view bound hotels, performance metrics |
| KYC Review | Pending KYC queue, document viewer, approve/reject with reason |
| Commission Config | Tier management (CRUD), plan rate overrides, merchant-specific overrides |
| Payout Processing | Pending payouts queue, process/batch payout, payment reference entry |
| Resource Management | Upload/version/archive resources, download analytics |
| Merchant Reports | Performance ranking, commission liability, fraud indicators, conversion funnel |

---

## Phase 9D — Notifications + Integration

### Auto-Triggers

| Event | Notification | Channel |
|-------|-------------|---------|
| Hotel subscription payment confirmed | Commission calculated | In-app + Email |
| Commission approved | Ready for payout | In-app |
| Commission paid | Payment confirmation | In-app + Email |
| KYC approved | Account fully activated | In-app + Email |
| KYC rejected | Resubmit with reason | In-app + Email |
| Hotel subscription expiring (7 days) | Renewal reminder | In-app + Email |
| Bank account changed | Requires admin approval | In-app |
| New resource uploaded | Available for download | In-app |
| Policy/pricing change | Update notification | In-app + Email |

### Integration Points

| System | Integration |
|--------|------------|
| Subscription Module | Auto-trigger commission on payment |
| Tenant Module | Auto-create tenant on hotel registration |
| Paystack | Subscription payment verification |
| WhatsApp (Termii) | Optional notification channel (Phase 8C dependency) |

---

## Security & Governance

| Control | Implementation |
|---------|---------------|
| Data Isolation | Merchant can ONLY see own hotels/commissions/leads |
| RBAC | merchant_admin vs merchant_agent scoping |
| Audit Trail | Full MerchantAuditLog on all financial + lifecycle actions |
| Commission Tamper Protection | Immutable once approved, reversal requires admin + reason |
| Bank Changes | Require admin re-approval, settlement freeze on mismatch |
| IP/Device Logging | All merchant actions logged with IP + user agent |
| KYC Gate | 🚫 No commission payout without KYC approval |
| Cooling Period | Commission enters PENDING with configurable cooling period before APPROVED |

---

## Estimated Totals

| Metric | Count |
|--------|-------|
| New Entities | 14 |
| New Enums | 4 |
| New UserRoles | 2 |
| Backend Endpoints | ~30 |
| Service Methods | ~35 |
| Merchant Portal Pages | ~11 |
| Admin New Pages | ~5 |
| Tests | ~25-30 |

---

## Implementation Order

```
Phase 9A (Backend)
    └── Phase 9B (Merchant Portal)
         └── Phase 9C (Admin Integration)
              └── Phase 9D (Notifications + Integrations)
```

Phase 9A must complete first — all other phases depend on the backend.
Phase 9D requires Phase 8C (WhatsApp/Termii) for optional WhatsApp notifications.
