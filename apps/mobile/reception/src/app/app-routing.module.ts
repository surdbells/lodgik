import { NgModule } from '@angular/core';
import { NativeScriptRouterModule } from '@nativescript/angular';
import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/reception-dashboard.component').then(m => m.ReceptionDashboardComponent) },
  { path: 'checkin', loadComponent: () => import('./pages/quick-checkin.component').then(m => m.QuickCheckinComponent) },
  { path: 'walkin', loadComponent: () => import('./pages/walkin-booking.component').then(m => m.WalkinBookingComponent) },
];

@NgModule({ imports: [NativeScriptRouterModule.forRoot(routes)], exports: [NativeScriptRouterModule] })
export class AppRoutingModule {}
