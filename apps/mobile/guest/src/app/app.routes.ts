import { Routes } from '@angular/router';
import { guestAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'bill',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/bill/bill.component').then(m => m.BillComponent),
  },
  {
    path: 'service-request',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/service-request/service-request.component').then(m => m.ServiceRequestComponent),
  },
  {
    path: 'chat',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent),
  },
  {
    path: 'extend-stay',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/extend-stay/extend-stay.component').then(m => m.ExtendStayComponent),
  },
  {
    path: 'checkout',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent),
  },
  {
    path: 'access-code',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/access-code/access-code.component').then(m => m.AccessCodeComponent),
  },
];
