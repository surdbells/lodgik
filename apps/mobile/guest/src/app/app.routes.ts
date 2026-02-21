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
  {
    path: 'visitor-codes',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/visitor-codes/visitor-codes.component').then(m => m.VisitorCodesComponent),
  },
  {
    path: 'amenity-vouchers',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/amenity-vouchers/amenity-vouchers.component').then(m => m.AmenityVouchersComponent),
  },
  {
    path: 'gate-pass',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/gate-pass/gate-pass.component').then(m => m.GatePassComponent),
  },
  {
    path: 'room-controls',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/room-controls/room-controls.component').then(m => m.RoomControlsComponent),
  },
  {
    path: 'waitlist',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/waitlist/waitlist.component').then(m => m.WaitlistComponent),
  },
  {
    path: 'charge-transfer',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/charge-transfer/charge-transfer.component').then(m => m.ChargeTransferComponent),
  },
  {
    path: 'loyalty',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/loyalty/loyalty.component').then(m => m.LoyaltyComponent),
  },
  {
    path: 'spa',
    canActivate: [guestAuthGuard],
    loadComponent: () => import('./pages/spa/spa.component').then(m => m.SpaComponent),
  },
];
