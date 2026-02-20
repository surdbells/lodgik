import { NgModule } from '@angular/core';
import { NativeScriptRouterModule } from '@nativescript/angular';
import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/reception-dashboard.component').then(m => m.ReceptionDashboardComponent) },
  { path: 'checkin', loadComponent: () => import('./pages/quick-checkin.component').then(m => m.QuickCheckinComponent) },
  { path: 'checkout', loadComponent: () => import('./pages/quick-checkout.component').then(m => m.QuickCheckoutComponent) },
  { path: 'walkin', loadComponent: () => import('./pages/walkin-booking.component').then(m => m.WalkinBookingComponent) },
  { path: 'chat', loadComponent: () => import('./pages/chat-list.component').then(m => m.ChatListComponent) },
  { path: 'chat/:bookingId', loadComponent: () => import('./pages/chat-conversation.component').then(m => m.ChatConversationComponent) },
  { path: 'housekeeping', loadComponent: () => import('./pages/housekeeping-view.component').then(m => m.HousekeepingViewComponent) },
  { path: 'guests', loadComponent: () => import('./pages/guest-list.component').then(m => m.GuestListComponent) },
];

@NgModule({ imports: [NativeScriptRouterModule.forRoot(routes)], exports: [NativeScriptRouterModule] })
export class AppRoutingModule {}
