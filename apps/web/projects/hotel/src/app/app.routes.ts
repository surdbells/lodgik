import { Routes } from '@angular/router';
import { authGuard } from '@lodgik/shared';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'auth/impersonate',
    loadComponent: () => import('./pages/auth/impersonate.page').then(m => m.ImpersonatePage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/onboarding/onboarding.page').then(m => m.OnboardingPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/hotel-layout.component').then(m => m.HotelLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
      },
      {
        path: 'staff',
        loadComponent: () => import('./pages/staff/staff-list.page').then(m => m.StaffListPage),
      },
      {
        path: 'properties',
        loadComponent: () => import('./pages/properties/property-list.page').then(m => m.PropertyListPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
      },
      {
        path: 'features',
        loadComponent: () => import('./pages/features/features.page').then(m => m.FeaturesPage),
      },
      {
        path: 'apps',
        loadComponent: () => import('./pages/apps/apps.page').then(m => m.AppsPage),
      },
      {
        path: 'billing',
        loadComponent: () => import('./pages/billing/billing.page').then(m => m.BillingPage),
      },
      {
        path: 'rooms',
        loadComponent: () => import('./pages/rooms/rooms.page').then(m => m.RoomsPage),
      },
      {
        path: 'rooms/:id',
        loadComponent: () => import('./pages/rooms/room-detail.page').then(m => m.RoomDetailPage),
      },
      {
        path: 'room-types',
        loadComponent: () => import('./pages/room-types/room-types.page').then(m => m.RoomTypesPage),
      },
      {
        path: 'guests',
        loadComponent: () => import('./pages/guests/guests.page').then(m => m.GuestsPage),
      },
      {
        path: 'guests/:id',
        loadComponent: () => import('./pages/guests/guest-profile.page').then(m => m.GuestProfilePage),
      },
      {
        path: 'bookings',
        loadComponent: () => import('./pages/bookings/bookings.page').then(m => m.BookingsPage),
      },
      {
        path: 'bookings/new',
        loadComponent: () => import('./pages/bookings/new-booking.page').then(m => m.NewBookingPage),
      },
      {
        path: 'bookings/:id',
        loadComponent: () => import('./pages/bookings/booking-detail.page').then(m => m.BookingDetailPage),
      },
      {
        path: 'properties/:id/edit',
        loadComponent: () => import('./pages/properties/property-edit.page').then(m => m.PropertyEditPage),
      },
      {
        path: 'folios',
        loadComponent: () => import('./pages/folios/folios.page').then(m => m.FoliosPage),
      },
      {
        path: 'folios/:id',
        loadComponent: () => import('./pages/folios/folio-detail.page').then(m => m.FolioDetailPage),
      },
      {
        path: 'invoices',
        loadComponent: () => import('./pages/invoices/invoices.page').then(m => m.InvoicesPage),
      },
      {
        path: 'invoices/:id',
        loadComponent: () => import('./pages/invoices/invoice-detail.page').then(m => m.InvoiceDetailPage),
      },
      // Phase 3: HR & Payroll
      {
        path: 'employees',
        loadComponent: () => import('./pages/employees/employees.page').then(m => m.EmployeesPage),
      },
      {
        path: 'employees/:id',
        loadComponent: () => import('./pages/employees/employee-detail.page').then(m => m.EmployeeDetailPage),
      },
      {
        path: 'attendance',
        loadComponent: () => import('./pages/attendance/attendance.page').then(m => m.AttendancePage),
      },
      {
        path: 'leave',
        loadComponent: () => import('./pages/leave/leave.page').then(m => m.LeavePage),
      },
      {
        path: 'payroll',
        loadComponent: () => import('./pages/payroll/payroll.page').then(m => m.PayrollPage),
      },
      // Phase 5: Gym & Fitness
      {
        path: 'gym',
        loadComponent: () => import('./pages/gym/gym-dashboard.page').then(m => m.GymDashboardPage),
      },
      {
        path: 'gym/members',
        loadComponent: () => import('./pages/gym/gym-members.page').then(m => m.GymMembersPage),
      },
      {
        path: 'gym/plans',
        loadComponent: () => import('./pages/gym/gym-plans.page').then(m => m.GymPlansPage),
      },
      {
        path: 'gym/check-in',
        loadComponent: () => import('./pages/gym/gym-checkin.page').then(m => m.GymCheckinPage),
      },
      {
        path: 'gym/classes',
        loadComponent: () => import('./pages/gym/gym-classes.page').then(m => m.GymClassesPage),
      },
      {
        path: 'gym/payments',
        loadComponent: () => import('./pages/gym/gym-payments.page').then(m => m.GymPaymentsPage),
      },
      // Phase 6: Operations & F&B
      {
        path: 'housekeeping',
        loadComponent: () => import('./pages/housekeeping/housekeeping.page').then(m => m.HousekeepingPage),
      },
      {
        path: 'chat',
        loadComponent: () => import('./pages/chat/chat.page').then(m => m.ChatPage),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./pages/notifications/notifications.page').then(m => m.NotificationsPage),
      },
      {
        path: 'pos',
        loadComponent: () => import('./pages/pos/pos.page').then(m => m.PosPage),
      },
      {
        path: 'pos/menu',
        loadComponent: () => import('./pages/pos/menu.page').then(m => m.MenuPage),
      },
      {
        path: 'security',
        loadComponent: () => import('./pages/security/security.page').then(m => m.SecurityPage),
      },
      {
        path: 'room-controls',
        loadComponent: () => import('./pages/room-controls/room-controls.page').then(m => m.RoomControlsPage),
      },
      {
        path: 'guest-services',
        loadComponent: () => import('./pages/guest-services/guest-services.page').then(m => m.GuestServicesPage),
      },
      // ─── Phase 8A ─────────────────────────
      {
        path: 'expenses',
        loadComponent: () => import('./pages/expenses/expenses.page'),
      },
      {
        path: 'night-audit',
        loadComponent: () => import('./pages/night-audit/night-audit.page'),
      },
      {
        path: 'police-reports',
        loadComponent: () => import('./pages/police-reports/police-reports.page'),
      },
      {
        path: 'performance-reviews',
        loadComponent: () => import('./pages/reviews/reviews.page'),
      },
      {
        path: 'pricing-rules',
        loadComponent: () => import('./pages/pricing-rules/pricing-rules.page'),
      },
      {
        path: 'group-bookings',
        loadComponent: () => import('./pages/group-bookings/group-bookings.page'),
      },
      // ─── Phase 8B ─────────────────────────
      {
        path: 'assets',
        loadComponent: () => import('./pages/assets/assets.page'),
      },
      {
        path: 'incidents',
        loadComponent: () => import('./pages/incidents/incidents.page'),
      },
      {
        path: 'maintenance',
        loadComponent: () => import('./pages/maintenance/maintenance.page'),
      },
      {
        path: 'engineers',
        loadComponent: () => import('./pages/engineers/engineers.page'),
      },
      // ─── Phase 8C ─────────────────────────
      {
        path: 'whatsapp',
        loadComponent: () => import('./pages/whatsapp/whatsapp.page'),
      },
      // ─── Phase 8D ─────────────────────────
      {
        path: 'loyalty',
        loadComponent: () => import('./pages/loyalty/loyalty.page'),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./pages/analytics/analytics.page'),
      },
      {
        path: 'guest-preferences',
        loadComponent: () => import('./pages/guest-preferences/guest-preferences.page'),
      },
      // ─── Phase 8E ─────────────────────────
      {
        path: 'ota',
        loadComponent: () => import('./pages/ota-channels/ota-channels.page'),
      },
      {
        path: 'amenities',
        loadComponent: () => import('./pages/amenities/amenities.page'),
      },
      {
        path: 'inventory',
        loadComponent: () => import('./pages/inventory/inventory.page').then(m => m.InventoryPage),
      },
      {
        path: 'inventory/settings',
        loadComponent: () => import('./pages/inventory/inventory-settings.page').then(m => m.InventorySettingsPage),
      },
      {
        path: 'inventory/movements',
        loadComponent: () => import('./pages/inventory/inventory-movements.page').then(m => m.InventoryMovementsPage),
      },
      {
        path: 'inventory/grn',
        loadComponent: () => import('./pages/inventory/inventory-grn.page').then(m => m.InventoryGrnPage),
      },

      // ── Procurement ────────────────────────────────────────────
      {
        path: 'procurement/vendors',
        loadComponent: () => import('./pages/procurement/vendors.page').then(m => m.VendorsPage),
      },
      {
        path: 'procurement/requests',
        loadComponent: () => import('./pages/procurement/purchase-requests.page').then(m => m.PurchaseRequestsPage),
      },
      {
        path: 'procurement/orders',
        loadComponent: () => import('./pages/procurement/purchase-orders.page').then(m => m.PurchaseOrdersPage),
      },

      // POS — Recipe Builder & Food Cost
      {
        path: 'pos/recipes',
        loadComponent: () => import('./pages/pos/recipe-builder.page').then(m => m.RecipeBuilderPage),
      },
      {
        path: 'pos/food-cost',
        loadComponent: () => import('./pages/pos/food-cost.page').then(m => m.FoodCostPage),
      },

      {
        path: 'spa',
        loadComponent: () => import('./pages/spa/spa.page'),
      },
      {
        path: 'iot',
        loadComponent: () => import('./pages/iot/iot.page'),
      },
      {
        path: 'audit-log',
        loadComponent: () => import('./pages/audit-log/audit-log.page').then(m => m.AuditLogPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
