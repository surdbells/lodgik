import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, TokenService } from '@lodgik/shared';
import { MerchantApiService } from '../services/merchant-api.service';

interface NavItem { label: string; icon: string; route: string; badge?: number; }

@Component({
  selector: 'app-merchant-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-gray-50">
      <aside class="w-60 bg-gradient-to-b from-emerald-900 to-emerald-950 text-white flex flex-col shrink-0">
        <div class="p-5 border-b border-white/10">
          <h1 class="text-xl font-bold tracking-tight">Lodgik</h1>
          <p class="text-xs text-emerald-300 mt-0.5">Merchant Portal</p>
        </div>
        <nav class="flex-1 py-3 overflow-y-auto">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="bg-white/15 border-r-2 border-amber-400"
               [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
               class="flex items-center gap-3 px-5 py-2.5 text-sm text-emerald-200 hover:text-white hover:bg-white/10 transition-colors">
              <span class="text-base">{{ item.icon }}</span>
              <span class="flex-1">{{ item.label }}</span>
              @if (item.badge && item.badge > 0) {
                <span class="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{{ item.badge }}</span>
              }
            </a>
          }
        </nav>
        <div class="p-4 border-t border-white/10">
          <div class="text-xs text-emerald-300 mb-1">{{ merchantName() }}</div>
          <div class="text-xs text-emerald-400/60 mb-2">{{ user()?.email }}</div>
          <button (click)="logout()" class="text-xs text-red-300 hover:text-red-200">Sign out</button>
        </div>
      </aside>

      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h2 class="text-sm font-semibold text-gray-800">Merchant Portal</h2>
          <div class="flex items-center gap-3">
            <a routerLink="/notifications" class="relative text-gray-500 hover:text-gray-700">
              <span class="text-lg">🔔</span>
              @if (unreadCount() > 0) {
                <span class="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{{ unreadCount() }}</span>
              }
            </a>
            <span class="text-xs text-gray-400 bg-emerald-50 text-emerald-700 px-2 py-1 rounded">{{ user()?.role }}</span>
          </div>
        </header>
        <main class="flex-1 overflow-y-auto p-6"><router-outlet /></main>
      </div>
    </div>
  `,
})
export class MerchantLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(MerchantApiService);
  protected user = inject(TokenService).user;
  merchantName = signal('');
  unreadCount = signal(0);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { label: 'Hotels', icon: '🏨', route: '/hotels' },
    { label: 'Commissions', icon: '💰', route: '/commissions' },
    { label: 'Payouts', icon: '🏦', route: '/payouts' },
    { label: 'Leads', icon: '🎯', route: '/leads' },
    { label: 'Resources', icon: '📁', route: '/resources' },
    { label: 'Support', icon: '🎫', route: '/support' },
    { label: 'Profile', icon: '👤', route: '/profile' },
    { label: 'Notifications', icon: '🔔', route: '/notifications' },
  ];

  ngOnInit(): void {
    this.api.profile().subscribe({ next: (p: any) => this.merchantName.set(p.business_name || '') });
    this.api.listNotifications(true).subscribe({ next: (n: any[]) => this.unreadCount.set(n.length) });
  }

  logout(): void { this.auth.logout().subscribe(() => this.auth.navigateToLogin()); }
}
