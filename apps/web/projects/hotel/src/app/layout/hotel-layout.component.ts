import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, TokenService, FeatureService, BrandingService } from '@lodgik/shared';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  requiredModule?: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  collapsed: boolean;
  items: NavItem[];
}

@Component({
  selector: 'app-hotel-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen overflow-hidden bg-[var(--gray-50)]">

      <!-- ═══ Sidebar ═══ -->
      <aside class="w-[260px] bg-white border-r border-gray-100 flex flex-col shrink-0 h-screen overflow-hidden">

        <!-- Logo / Brand -->
        <div class="px-5 pt-5 pb-3 flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
               style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
            {{ branding().appName?.charAt(0) || 'L' }}
          </div>
          <div class="min-w-0">
            <h1 class="text-[15px] font-bold text-gray-900 font-heading truncate">{{ branding().appName || 'Lodgik' }}</h1>
          </div>
        </div>

        <!-- Property Selector -->
        <div class="mx-4 mb-3 px-3 py-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-md bg-sage-100 flex items-center justify-center text-sage-700 text-xs font-bold">
              {{ propertyInitial() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-semibold text-gray-800 truncate">{{ propertyName() }}</p>
              <p class="text-[11px] text-gray-400 capitalize">{{ staffRole() }}</p>
            </div>
            <svg class="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto pb-3">
          @for (group of navGroups(); track group.label) {
            <!-- Section Header -->
            <div class="flex items-center justify-between px-5 pt-5 pb-1.5 cursor-pointer select-none"
                 (click)="toggleGroup(group)">
              <span class="text-[11px] font-bold tracking-[0.06em] uppercase text-gray-400 font-heading">
                {{ group.label }}
              </span>
              <span class="text-gray-300 text-[10px] transition-transform duration-200"
                    [class.-rotate-90]="group.collapsed">
                ▼
              </span>
            </div>

            @if (!group.collapsed) {
              @for (item of group.items; track item.route) {
                <a [routerLink]="item.route"
                   routerLinkActive="!bg-sage-50 !text-sage-700 !font-semibold"
                   [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
                   class="group relative flex items-center gap-3 px-3 py-[9px] mx-2 rounded-lg text-[14px] font-medium text-gray-500 hover:bg-sage-50 hover:text-sage-700 transition-all duration-150">
                  <span class="w-5 h-5 flex items-center justify-center text-[15px] opacity-60 group-hover:opacity-100 transition-opacity">{{ item.icon }}</span>
                  <span class="flex-1">{{ item.label }}</span>
                  @if (item.badge) {
                    <span class="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-600">{{ item.badge }}</span>
                  }
                </a>
              }
            }
          }
        </nav>

        <!-- Bottom: Notifications + Settings -->
        <div class="border-t border-gray-100 p-3 space-y-0.5">
          <a routerLink="/chat" routerLinkActive="!bg-sage-50 !text-sage-700"
             class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <span class="text-[15px] opacity-60">🔔</span>
            <span>Notifications</span>
            @if (notificationCount() > 0) {
              <span class="ml-auto min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">{{ notificationCount() }}</span>
            }
          </a>
          <a routerLink="/settings" routerLinkActive="!bg-sage-50 !text-sage-700"
             class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <span class="text-[15px] opacity-60">⚙️</span>
            <span>Settings</span>
          </a>
        </div>

        <!-- User Profile -->
        <div class="border-t border-gray-100 p-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                 style="background: linear-gradient(135deg, #293929 0%, #466846 100%)">
              {{ userInitials() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-gray-800 truncate">{{ user()?.full_name || 'User' }}</p>
              <p class="text-[11px] text-gray-400 capitalize">{{ user()?.role?.replace('_', ' ') || '' }}</p>
            </div>
            <button (click)="logout()" class="p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="Sign out">
              <svg class="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none">
                <path d="M6 14H3.33A1.33 1.33 0 012 12.67V3.33A1.33 1.33 0 013.33 2H6M10.67 11.33L14 8l-3.33-3.33M14 8H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- ═══ Main Content ═══ -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main class="flex-1 overflow-y-auto p-6 page-bg">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class HotelLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private featureService = inject(FeatureService);
  private brandingService = inject(BrandingService);
  protected user = inject(TokenService).user;
  protected branding = this.brandingService.config;

  notificationCount = signal(0);

  propertyName = computed(() => this.user()?.property_name || this.branding().appName || 'My Hotel');
  propertyInitial = computed(() => this.propertyName().charAt(0).toUpperCase());
  staffRole = computed(() => {
    const role = this.user()?.role;
    return role ? role.replace('_', ' ') : '';
  });

  userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return ((u.first_name?.charAt(0) || '') + (u.last_name?.charAt(0) || '')).toUpperCase() || '?';
  });

  private allNavGroups: NavGroup[] = [
    {
      label: 'Daily Operation',
      collapsed: false,
      items: [
        { label: 'Dashboard', icon: '📊', route: '/dashboard' },
        { label: 'Bookings', icon: '📋', route: '/bookings' },
        { label: 'Rooms', icon: '🏨', route: '/rooms' },
        { label: 'Room Types', icon: '🏷️', route: '/room-types' },
        { label: 'Guests', icon: '👤', route: '/guests' },
        { label: 'Housekeeping', icon: '🧹', route: '/housekeeping', requiredModule: 'housekeeping' },
        { label: 'Room Controls', icon: '🎛️', route: '/room-controls' },
      ],
    },
    {
      label: 'Guest Experience',
      collapsed: false,
      items: [
        { label: 'Service Requests', icon: '🛎️', route: '/guest-services' },
        { label: 'Chat', icon: '💬', route: '/chat' },
        { label: 'Loyalty', icon: '🎁', route: '/loyalty' },
        { label: 'Guest Preferences', icon: '❤️', route: '/guest-preferences' },
        { label: 'Security', icon: '🛡️', route: '/security' },
      ],
    },
    {
      label: 'F&B & Facilities',
      collapsed: true,
      items: [
        { label: 'POS / Restaurant', icon: '🍽️', route: '/pos', requiredModule: 'pos' },
        { label: 'Gym & Fitness', icon: '🏋️', route: '/gym', requiredModule: 'gym' },
        { label: 'Spa & Pool', icon: '💆', route: '/spa', requiredModule: 'spa' },
      ],
    },
    {
      label: 'Finance & Reports',
      collapsed: true,
      items: [
        { label: 'Folios', icon: '📂', route: '/folios' },
        { label: 'Invoices', icon: '📄', route: '/invoices' },
        { label: 'Expenses', icon: '💸', route: '/expenses' },
        { label: 'Night Audit', icon: '🌙', route: '/night-audit' },
        { label: 'Pricing Rules', icon: '📈', route: '/pricing-rules' },
        { label: 'Group Bookings', icon: '👥', route: '/group-bookings' },
        { label: 'Analytics', icon: '📊', route: '/analytics' },
        { label: 'Police Reports', icon: '🚔', route: '/police-reports' },
      ],
    },
    {
      label: 'Human Resources',
      collapsed: true,
      items: [
        { label: 'Staff', icon: '👤', route: '/staff' },
        { label: 'Employees', icon: '🧑‍💼', route: '/employees' },
        { label: 'Attendance', icon: '🕐', route: '/attendance' },
        { label: 'Leave', icon: '🏖️', route: '/leave' },
        { label: 'Payroll', icon: '💵', route: '/payroll' },
        { label: 'Reviews', icon: '⭐', route: '/performance-reviews' },
      ],
    },
    {
      label: 'Maintenance & Assets',
      collapsed: true,
      items: [
        { label: 'Assets', icon: '📦', route: '/assets' },
        { label: 'Incidents', icon: '🚨', route: '/incidents' },
        { label: 'Maintenance', icon: '🔧', route: '/maintenance' },
        { label: 'Engineers', icon: '👷', route: '/engineers' },
      ],
    },
    {
      label: 'Integrations',
      collapsed: true,
      items: [
        { label: 'OTA Channels', icon: '🌐', route: '/ota' },
        { label: 'WhatsApp', icon: '📱', route: '/whatsapp' },
        { label: 'IoT Devices', icon: '📡', route: '/iot' },
      ],
    },
    {
      label: 'System',
      collapsed: true,
      items: [
        { label: 'Properties', icon: '🏨', route: '/properties' },
        { label: 'Features', icon: '🧩', route: '/features' },
        { label: 'Apps', icon: '📲', route: '/apps' },
        { label: 'Billing', icon: '💳', route: '/billing' },
      ],
    },
  ];

  navGroups = computed(() => {
    return this.allNavGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.requiredModule) return true;
        return this.featureService.isEnabled(item.requiredModule);
      }),
    })).filter(g => g.items.length > 0);
  });

  ngOnInit(): void {
    this.featureService.load();
    // Auto-expand the group matching current route
    const path = this.router.url;
    this.allNavGroups.forEach(g => {
      if (g.items.some(i => path.startsWith(i.route))) {
        g.collapsed = false;
      }
    });
  }

  toggleGroup(group: NavGroup): void {
    const g = this.allNavGroups.find(ng => ng.label === group.label);
    if (g) g.collapsed = !g.collapsed;
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.auth.navigateToLogin());
  }
}
