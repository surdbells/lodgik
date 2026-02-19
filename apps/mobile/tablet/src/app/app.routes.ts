import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/idle', pathMatch: 'full' },
  {
    path: 'setup',
    loadComponent: () => import('./pages/setup/setup.component').then(m => m.SetupComponent),
  },
  {
    path: 'idle',
    loadComponent: () => import('./pages/idle/idle.component').then(m => m.IdleComponent),
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then(m => m.TabletHomeComponent),
  },
  {
    path: 'room-service',
    loadComponent: () => import('./pages/room-service/room-service.component').then(m => m.RoomServiceComponent),
  },
  {
    path: 'tablet-bill',
    loadComponent: () => import('./pages/bill/bill.component').then(m => m.TabletBillComponent),
  },
  {
    path: 'tablet-chat',
    loadComponent: () => import('./pages/chat/chat.component').then(m => m.TabletChatComponent),
  },
  {
    path: 'local-info',
    loadComponent: () => import('./pages/info/info.component').then(m => m.LocalInfoComponent),
  },
];
