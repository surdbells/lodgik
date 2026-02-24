import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, TokenService, LODGIK_ICONS } from '@lodgik/shared';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { MerchantApiService } from '../services/merchant-api.service';

interface NavItem { label: string; icon: string; route: string; badge?: number; }

@Component({
  selector: 'app-merchant-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LODGIK_ICONS) }],
  template: `
    <div class="flex h-screen overflow-hidden bg-[#f9fafb]">

      <!-- Sidebar -->
      <aside class="bg-white border-r border-gray-100 flex flex-col shrink-0 h-screen overflow-hidden transition-all duration-300"
             [style.width.px]="collapsed() ? 72 : 256">

        <!-- Logo + Collapse -->
        <div class="px-4 pt-4 pb-2 flex items-center" [class.justify-center]="collapsed()">
          @if (!collapsed()) {
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                   style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">L</div>
              <div class="min-w-0">
                <h1 class="text-[15px] font-bold text-gray-900 font-heading truncate">Lodgik</h1>
                <p class="text-[10px] text-sage-500 font-semibold uppercase tracking-wider">Merchant</p>
              </div>
            </div>
          }
          <button (click)="collapsed.set(!collapsed())"
                  class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 shrink-0">
            <lucide-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="16" [strokeWidth]="2"></lucide-icon>
          </button>
        </div>

        <!-- Merchant name -->
        @if (!collapsed() && merchantName()) {
          <div class="mx-3 mb-2 px-3 py-2.5 bg-gray-50 rounded-lg">
            <p class="text-[13px] font-semibold text-gray-800 truncate">{{ merchantName() }}</p>
            <p class="text-[11px] text-gray-400">Merchant Account</p>
          </div>
        }

        <!-- Nav -->
        <nav class="flex-1 overflow-y-auto pb-3">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="sidebar-active"
               [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
               class="relative flex items-center gap-3 py-[9px] mx-2 rounded-lg text-[14px] font-medium text-gray-500 hover:bg-sage-50 hover:text-sage-700 transition-all duration-150"
               [class.px-3]="!collapsed()" [class.justify-center]="collapsed()" [class.px-0]="collapsed()"
               [title]="collapsed() ? item.label : ''">
              <lucide-icon [name]="item.icon" [size]="18" [strokeWidth]="1.75" class="shrink-0 opacity-70"></lucide-icon>
              @if (!collapsed()) {
                <span class="flex-1 truncate">{{ item.label }}</span>
                @if (item.badge && item.badge > 0) {
                  <span class="min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">{{ item.badge }}</span>
                }
              }
            </a>
          }
        </nav>

        <!-- User -->
        <div class="border-t border-gray-100 p-3">
          <div class="flex items-center gap-3" [class.justify-center]="collapsed()">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                 style="background: linear-gradient(135deg, #293929 0%, #466846 100%)">
              {{ userInitials() }}
            </div>
            @if (!collapsed()) {
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ user()?.full_name || 'User' }}</p>
                <p class="text-[11px] text-gray-400 truncate">{{ user()?.email }}</p>
              </div>
              <button (click)="logout()" class="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400" title="Sign out">
                <lucide-icon name="log-out" [size]="16" [strokeWidth]="1.75"></lucide-icon>
              </button>
            }
          </div>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main class="flex-1 overflow-y-auto p-6 page-bg">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep a.sidebar-active { background-color: #f4f7f4; color: #3a543a; font-weight: 600; }
    :host ::ng-deep a.sidebar-active lucide-icon { opacity: 1; }
  `],
})
export class MerchantLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(MerchantApiService);
  private router = inject(Router);
  protected user = inject(TokenService).user;

  collapsed = signal(false);
  merchantName = signal('');
  unreadCount = signal(0);

  userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return ((u.first_name?.charAt(0) || '') + (u.last_name?.charAt(0) || '')).toUpperCase() || '?';
  });

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'layout-dashboard', route: '/dashboard' },
    { label: 'Hotels', icon: 'hotel', route: '/hotels' },
    { label: 'Commissions', icon: 'hand-coins', route: '/commissions' },
    { label: 'Payouts', icon: 'credit-card', route: '/payouts' },
    { label: 'Leads', icon: 'users', route: '/leads' },
    { label: 'Resources', icon: 'folder-open', route: '/resources' },
    { label: 'Support', icon: 'message-circle', route: '/support' },
    { label: 'Profile', icon: 'user-round', route: '/profile' },
    { label: 'Notifications', icon: 'bell', route: '/notifications' },
  ];

  ngOnInit(): void {
    this.api.profile().subscribe({ next: (p: any) => this.merchantName.set(p.business_name || '') });
    this.api.listNotifications(true).subscribe({ next: (n: any[]) => {
      this.unreadCount.set(n.length);
      const notifItem = this.navItems.find(i => i.route === '/notifications');
      if (notifItem) notifItem.badge = n.length;
    }});
  }

  logout(): void { this.auth.logout().subscribe(() => this.auth.navigateToLogin()); }
}
