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
      // ─── Phase 8 ───────────────────────────
      {
        path: 'whatsapp-config',
        loadComponent: () => import('./pages/whatsapp-config/whatsapp-config.page').then(m => m.WhatsAppConfigPage),
      },
      {
        path: 'platform-analytics',
        loadComponent: () => import('./pages/platform-analytics/platform-analytics.page').then(m => m.PlatformAnalyticsPage),
      },
      // ─── Phase 9: Merchant Admin ───────────
      {
        path: 'merchants',
        loadComponent: () => import('./pages/merchants/merchants.page').then(m => m.MerchantsPage),
      },
      {
        path: 'merchants/:id',
        loadComponent: () => import('./pages/merchant-detail/merchant-detail.page').then(m => m.MerchantDetailPage),
      },
      {
        path: 'kyc-review',
        loadComponent: () => import('./pages/kyc-review/kyc-review.page').then(m => m.KycReviewPage),
      },
      {
        path: 'commission-config',
        loadComponent: () => import('./pages/commission-config/commission-config.page').then(m => m.CommissionConfigPage),
      },
      {
        path: 'payout-processing',
        loadComponent: () => import('./pages/payout-processing/payout-processing.page').then(m => m.PayoutProcessingPage),
      },
      {
        path: 'merchant-resources',
        loadComponent: () => import('./pages/merchant-resources/merchant-resources.page').then(m => m.MerchantResourcesPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
