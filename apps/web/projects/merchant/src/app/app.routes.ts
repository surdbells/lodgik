import { Routes } from '@angular/router';
import { authGuard } from '@lodgik/shared';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/merchant-layout.component').then(m => m.MerchantLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage) },
      { path: 'hotels', loadComponent: () => import('./pages/hotels/hotels.page').then(m => m.HotelsPage) },
      { path: 'hotels/:id', loadComponent: () => import('./pages/hotel-detail/hotel-detail.page').then(m => m.HotelDetailPage) },
      { path: 'commissions', loadComponent: () => import('./pages/commissions/commissions.page').then(m => m.CommissionsPage) },
      { path: 'payouts', loadComponent: () => import('./pages/payouts/payouts.page').then(m => m.PayoutsPage) },
      { path: 'leads', loadComponent: () => import('./pages/leads/leads.page').then(m => m.LeadsPage) },
      { path: 'resources', loadComponent: () => import('./pages/resources/resources.page').then(m => m.ResourcesPage) },
      { path: 'support', loadComponent: () => import('./pages/support/support.page').then(m => m.SupportPage) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications.page').then(m => m.NotificationsPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
