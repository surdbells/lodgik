import { NgModule } from '@angular/core';
import { NativeScriptRouterModule } from '@nativescript/angular';
import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/tasks', pathMatch: 'full' },
  { path: 'tasks', loadComponent: () => import('./pages/task-list.component').then(m => m.TaskListComponent) },
  { path: 'tasks/:id', loadComponent: () => import('./pages/task-detail.component').then(m => m.TaskDetailComponent) },
  { path: 'notifications', loadComponent: () => import('./pages/notifications.component').then(m => m.HousekeepingNotificationsComponent) },
  { path: 'lost-found', loadComponent: () => import('./pages/lost-found.component').then(m => m.LostFoundComponent) },
];

@NgModule({ imports: [NativeScriptRouterModule.forRoot(routes)], exports: [NativeScriptRouterModule] })
export class AppRoutingModule {}
