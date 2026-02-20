import { NgModule } from '@angular/core';
import { NativeScriptRouterModule } from '@nativescript/angular';
import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/queue', pathMatch: 'full' },
  { path: 'queue', loadComponent: () => import('./pages/kitchen-queue.component').then(m => m.KitchenQueueComponent) },
];

@NgModule({ imports: [NativeScriptRouterModule.forRoot(routes)], exports: [NativeScriptRouterModule] })
export class AppRoutingModule {}
