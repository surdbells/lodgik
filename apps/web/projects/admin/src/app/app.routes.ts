import { Routes } from '@angular/router';
import { adminGuard } from '@lodgik/shared';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
      },
      {
        path: 'tenants',
        loadComponent: () => import('./pages/tenants/tenant-list.page').then(m => m.TenantListPage),
      },
      {
        path: 'tenants/:id',
        loadComponent: () => import('./pages/tenants/tenant-detail.page').then(m => m.TenantDetailPage),
      },
      {
        path: 'plans',
        loadComponent: () => import('./pages/plans/plan-list.page').then(m => m.PlanListPage),
      },
      {
        path: 'features',
        loadComponent: () => import('./pages/features/feature-list.page').then(m => m.FeatureListPage),
      },
      {
        path: 'apps',
        loadComponent: () => import('./pages/apps/app-list.page').then(m => m.AppListPage),
      },
      {
        path: 'usage',
        loadComponent: () => import('./pages/usage/usage.page').then(m => m.UsagePage),
      },
      {
        path: 'invitations',
        loadComponent: () => import('./pages/invitations/invitation-list.page').then(m => m.InvitationListPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
