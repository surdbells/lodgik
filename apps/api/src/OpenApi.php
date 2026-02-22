<?php
declare(strict_types=1);
namespace Lodgik;

use OpenApi\Attributes as OA;

#[OA\Info(
    title: "Lodgik Hotel Management System API",
    version: "1.0.0",
    description: "Comprehensive REST API for the Lodgik multi-tenant SaaS hotel management platform. Covers property management, guest services, finance, HR, F&B, merchant ecosystem, IoT, and more. **Authentication:** Bearer JWT token required for all endpoints except /api/health, /api/auth/login, /api/auth/register, and /api/subscriptions/webhook.",
    contact: new OA\Contact(name: "Lodgik Support", email: "support@lodgik.com", url: "https://lodgik.com")
)]
#[OA\Server(url: "http://localhost:8080", description: "Development")]
#[OA\Server(url: "https://api.lodgik.com", description: "Production")]
#[OA\SecurityScheme(
    securityScheme: "bearerAuth",
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "JWT access token obtained from /api/auth/login"
)]

// ─── Tags ────────────────────────────────────────────────────

#[OA\Tag(name: "Health", description: "System health check")]
#[OA\Tag(name: "Auth", description: "Authentication — login, register, refresh, forgot/reset password")]
#[OA\Tag(name: "Staff", description: "Staff user management")]
#[OA\Tag(name: "Tenant", description: "Tenant/property configuration")]
#[OA\Tag(name: "Admin", description: "Super admin — tenants, plans, features, platform management")]
#[OA\Tag(name: "Feature", description: "Feature flag management per tenant")]
#[OA\Tag(name: "Onboarding", description: "Tenant onboarding wizard steps")]
#[OA\Tag(name: "AppDistribution", description: "Mobile app release management and download tracking")]
#[OA\Tag(name: "Subscription", description: "SaaS subscription billing via Paystack")]
#[OA\Tag(name: "Usage", description: "Platform usage metrics and quotas")]
#[OA\Tag(name: "Room", description: "Room types, inventory, status management")]
#[OA\Tag(name: "Guest", description: "Guest profiles, documents, preferences")]
#[OA\Tag(name: "Booking", description: "Reservations, group bookings, addons, status lifecycle")]
#[OA\Tag(name: "Dashboard", description: "Hotel operational dashboard and KPIs")]
#[OA\Tag(name: "Folio", description: "Guest folios — charges, payments, adjustments")]
#[OA\Tag(name: "Invoice", description: "Invoice generation and management")]
#[OA\Tag(name: "Employee", description: "Employee management, departments, positions")]
#[OA\Tag(name: "Attendance", description: "Staff clock in/out and attendance records")]
#[OA\Tag(name: "Leave", description: "Leave types, requests, approvals, balances")]
#[OA\Tag(name: "Payroll", description: "Payroll processing, tax brackets, salary items")]
#[OA\Tag(name: "GuestAuth", description: "Guest mobile app authentication")]
#[OA\Tag(name: "ServiceRequest", description: "Guest service requests (room service, maintenance, etc.)")]
#[OA\Tag(name: "Chat", description: "Multi-department guest-staff real-time messaging")]
#[OA\Tag(name: "Notification", description: "Push and in-app notifications, device tokens")]
#[OA\Tag(name: "Gym", description: "Gym facility — memberships, classes, bookings, visits")]
#[OA\Tag(name: "Housekeeping", description: "Room cleaning tasks, assignments, inspections")]
#[OA\Tag(name: "Pos", description: "Point of sale — menus, orders, kitchen display, split bills")]
#[OA\Tag(name: "Security", description: "Visitor access codes, gate passes, police reports")]
#[OA\Tag(name: "RoomControl", description: "In-room IoT controls (AC, lighting, DND)")]
#[OA\Tag(name: "GuestServices", description: "Smart guest services — amenity vouchers, waitlist, charge transfers")]
#[OA\Tag(name: "Finance", description: "Night audit, expense tracking, revenue analytics, tax config")]
#[OA\Tag(name: "Asset", description: "Hotel asset management, maintenance, incidents")]
#[OA\Tag(name: "WhatsApp", description: "WhatsApp messaging via Termii integration")]
#[OA\Tag(name: "Loyalty", description: "Guest loyalty program — points, tiers, promotions")]
#[OA\Tag(name: "Analytics", description: "Revenue, occupancy, and performance analytics")]
#[OA\Tag(name: "Spa", description: "Spa and pool management — services, bookings")]
#[OA\Tag(name: "Ota", description: "OTA channel management (Booking.com, Expedia)")]
#[OA\Tag(name: "IoT", description: "IoT device management and automation rules")]
#[OA\Tag(name: "Merchant", description: "Merchant partner ecosystem — KYC, commissions, payouts, leads")]

class OpenApi {}
