import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, TokenService, LODGIK_ICONS } from '@lodgik/shared';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

interface NavItem { label: string; icon: string; route: string; }
interface NavGroup { label: string; items: NavItem[]; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LODGIK_ICONS) }],
  template: `
    <div class="flex h-screen overflow-hidden bg-[#f9fafb]">

      <!-- ═══ Sidebar ═══ -->
      <aside class="bg-white border-r border-gray-100 flex flex-col shrink-0 h-screen overflow-hidden transition-all duration-300"
             [style.width.px]="collapsed() ? 72 : 260">

        <!-- Logo + Collapse -->
        <div class="px-4 pt-4 pb-2 flex items-center" [class.justify-center]="collapsed()">
          @if (!collapsed()) {
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                   style="background: linear-gradient(135deg, #293929 0%, #3a543a 100%)">L</div>
              <div class="min-w-0">
                <h1 class="text-[15px] font-bold text-gray-900 font-heading truncate">Lodgik</h1>
                <p class="text-[10px] text-sage-500 font-semibold uppercase tracking-wider">Admin</p>
              </div>
            </div>
          }
          <button (click)="collapsed.set(!collapsed())"
                  class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 shrink-0">
            <lucide-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="16" [strokeWidth]="2"></lucide-icon>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto pb-3">
          @for (group of navGroups; track group.label; let gi = $index) {
            @if (!collapsed()) {
              <div class="flex items-center justify-between px-5 pt-5 pb-1.5 cursor-pointer select-none group/hdr"
                   (click)="toggleGroup(gi)">
                <span class="text-[11px] font-bold tracking-[0.06em] uppercase text-gray-400 font-heading">{{ group.label }}</span>
                <lucide-icon name="chevron-down" [size]="12"
                  class="text-gray-300 group-hover/hdr:text-gray-400 transition-all duration-200"
                  [class.-rotate-90]="isGroupCollapsed(gi)"></lucide-icon>
              </div>
            } @else {
              @if (gi > 0) { <div class="mx-4 my-2 border-t border-gray-100"></div> }
            }

            @if (!isGroupCollapsed(gi) || collapsed()) {
              @for (item of group.items; track item.route) {
                <a [routerLink]="item.route"
                   routerLinkActive="sidebar-active"
                   [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
                   class="relative flex items-center gap-3 py-[9px] mx-2 rounded-lg text-[14px] font-medium text-gray-500 hover:bg-sage-50 hover:text-sage-700 transition-all duration-150"
                   [class.px-3]="!collapsed()" [class.justify-center]="collapsed()" [class.px-0]="collapsed()"
                   [title]="collapsed() ? item.label : ''">
                  <lucide-icon [name]="item.icon" [size]="18" [strokeWidth]="1.75" class="shrink-0 opacity-70"></lucide-icon>
                  @if (!collapsed()) { <span class="flex-1 truncate">{{ item.label }}</span> }
                </a>
              }
            }
          }
        </nav>

        <!-- Settings & Audit -->
        <div class="border-t border-gray-100 p-2 space-y-1">
          <a routerLink="/audit-log" routerLinkActive="sidebar-active"
             class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 font-medium transition-colors"
             [class.justify-center]="collapsed()" [title]="collapsed() ? 'Audit Log' : ''">
            <lucide-icon name="shield-check" [size]="18" [strokeWidth]="1.75" class="shrink-0 opacity-70"></lucide-icon>
            @if (!collapsed()) { <span>Audit Log</span> }
          </a>
          <a routerLink="/settings" routerLinkActive="sidebar-active"
             class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 font-medium transition-colors"
             [class.justify-center]="collapsed()" [title]="collapsed() ? 'Settings' : ''">
            <lucide-icon name="settings" [size]="18" [strokeWidth]="1.75" class="shrink-0 opacity-70"></lucide-icon>
            @if (!collapsed()) { <span>Settings</span> }
          </a>
        </div>

        <!-- User -->
        <div class="border-t border-gray-100 p-3">
          <div class="flex items-center gap-3" [class.justify-center]="collapsed()">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                 style="background: linear-gradient(135deg, #293929 0%, #466846 100%)">
              {{ userInitials() }}
            </div>
            @if (!collapsed()) {
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ user()?.full_name || 'Admin' }}</p>
                <p class="text-[11px] text-gray-400">Super Admin</p>
              </div>
              <button (click)="logout()" class="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400" title="Sign out">
                <lucide-icon name="log-out" [size]="16" [strokeWidth]="1.75"></lucide-icon>
              </button>
            }
          </div>
        </div>
      </aside>

      <!-- ═══ Main ═══ -->
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
export class AdminLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  protected user = inject(TokenService).user;

  collapsed = signal(false);
  private collapsedGroups = signal<Set<number>>(new Set([2, 3]));

  userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return ((u.first_name?.charAt(0) || '') + (u.last_name?.charAt(0) || '')).toUpperCase() || '?';
  });

  navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: 'layout-dashboard', route: '/dashboard' },
        { label: 'Tenants', icon: 'hotel', route: '/tenants' },
        { label: 'Plans', icon: 'clipboard-list', route: '/plans' },
        { label: 'Features', icon: 'puzzle', route: '/features' },
        { label: 'Apps', icon: 'smartphone', route: '/apps' },
        { label: 'Usage', icon: 'trending-up', route: '/usage' },
        { label: 'Invitations', icon: 'gift', route: '/invitations' },
        { label: 'Platform Analytics', icon: 'chart-bar', route: '/platform-analytics' },
      ],
    },
    {
      label: 'Configuration',
      items: [
        { label: 'WhatsApp Config', icon: 'message-circle', route: '/whatsapp-config' },
      ],
    },
    {
      label: 'Marketplace',
      items: [
        { label: 'Merchants', icon: 'users', route: '/merchants' },
        { label: 'Hotel Approvals', icon: 'hotel', route: '/hotel-approvals' },
        { label: 'KYC Review', icon: 'shield', route: '/kyc-review' },
        { label: 'Commission Config', icon: 'hand-coins', route: '/commission-config' },
        { label: 'Payout Processing', icon: 'credit-card', route: '/payout-processing' },
        { label: 'Merchant Resources', icon: 'folder-open', route: '/merchant-resources' },
      ],
    },
  ];

  isGroupCollapsed(index: number): boolean { return this.collapsedGroups().has(index); }

  toggleGroup(index: number): void {
    this.collapsedGroups.update(set => {
      const next = new Set(set);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  ngOnInit(): void {
    const path = this.router.url;
    this.navGroups.forEach((g, i) => {
      if (g.items.some(item => path.startsWith(item.route))) {
        this.collapsedGroups.update(s => { const n = new Set(s); n.delete(i); return n; });
      }
    });
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.auth.navigateToLogin());
  }
}
