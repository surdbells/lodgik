import { NgModule } from '@angular/core';
import { NativeScriptRouterModule } from '@nativescript/angular';
import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/tables', pathMatch: 'full' },
  { path: 'tables', loadComponent: () => import('./pages/table-map.component').then(m => m.TableMapComponent) },
  { path: 'order/:id', loadComponent: () => import('./pages/order.component').then(m => m.OrderComponent) },
  { path: 'menu', loadComponent: () => import('./pages/menu-manage.component').then(m => m.MenuManageComponent) },
  { path: 'payment/:id', loadComponent: () => import('./pages/payment.component').then(m => m.PaymentComponent) },
];

@NgModule({ imports: [NativeScriptRouterModule.forRoot(routes)], exports: [NativeScriptRouterModule] })
export class AppRoutingModule {}
