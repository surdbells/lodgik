import { Routes } from '@angular/router';
import { authGuard } from '@lodgik/shared';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
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
    ],
  },
  { path: '**', redirectTo: '' },
];
