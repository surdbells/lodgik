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
        path: 'room-types',
        loadComponent: () => import('./pages/room-types/room-types.page').then(m => m.RoomTypesPage),
      },
      {
        path: 'guests',
        loadComponent: () => import('./pages/guests/guests.page').then(m => m.GuestsPage),
      },
      {
        path: 'bookings',
        loadComponent: () => import('./pages/bookings/bookings.page').then(m => m.BookingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
