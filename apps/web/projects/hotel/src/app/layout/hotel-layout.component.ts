import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, TokenService, FeatureService, BrandingService, LODGIK_ICONS, ApiService, ActivePropertyService, ToastService } from '@lodgik/shared';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  requiredModule?: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-hotel-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LODGIK_ICONS) }],
  template: `
    <div class="flex h-screen overflow-hidden bg-[#f9fafb]">

      <!-- ═══ Sidebar ═══ -->
      <aside class="bg-white border-r border-gray-100 flex flex-col shrink-0 h-screen overflow-hidden transition-all duration-300"
             [style.width.px]="collapsed() ? 72 : 260">

        <!-- Logo / Brand + Collapse Toggle -->
        <div class="px-4 pt-4 pb-2 flex items-center" [class.justify-center]="collapsed()">
          @if (!collapsed()) {
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                   style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                {{ branding().appName?.charAt(0) || 'L' }}
              </div>
              <h1 class="text-[15px] font-bold text-gray-900 font-heading truncate">{{ branding().appName || 'Lodgik' }}</h1>
            </div>
          }
          <button (click)="collapsed.set(!collapsed())"
                  class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 shrink-0"
                  [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
            <lucide-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="16" [strokeWidth]="2"></lucide-icon>
          </button>
        </div>

        <!-- Property Selector -->
        @if (!collapsed()) {
          <div class="mx-3 mb-2 px-3 py-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors relative"
               (click)="showPropertySwitcher = !showPropertySwitcher">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-md bg-sage-100 flex items-center justify-center text-sage-700 text-xs font-bold shrink-0">
                {{ propertyInitial() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[13px] font-semibold text-gray-800 truncate">{{ propertyName() }}</p>
                <p class="text-[11px] text-gray-400 capitalize">{{ staffRole() }}</p>
              </div>
              <lucide-icon name="chevron-down" [size]="14" class="text-gray-400 shrink-0"></lucide-icon>
            </div>
            @if (showPropertySwitcher && allProperties().length > 1) {
              <div class="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-40 overflow-y-auto" (click)="$event.stopPropagation()">
                @for (p of allProperties(); track p.id) {
                  <button (click)="switchToProperty(p)" class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                          [class.bg-sage-50]="p.id === currentPropertyId()" [class.font-semibold]="p.id === currentPropertyId()">
                    <span class="w-5 h-5 rounded bg-sage-100 flex items-center justify-center text-sage-700 text-[10px] font-bold shrink-0">{{ p.name?.charAt(0) }}</span>
                    <span class="truncate">{{ p.name }}</span>
                    @if (p.id === currentPropertyId()) { <span class="text-sage-600 text-xs ml-auto">✓</span> }
                  </button>
                }
              </div>
            }
          </div>
        }

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto pb-3">
          @for (group of visibleNavGroups(); track group.label; let gi = $index) {

            <!-- Section Header -->
            @if (!collapsed()) {
              <div class="flex items-center justify-between px-5 pt-5 pb-1.5 cursor-pointer select-none group/hdr"
                   (click)="toggleGroup(gi)">
                <span class="text-[11px] font-bold tracking-[0.06em] uppercase text-gray-400 font-heading">
                  {{ group.label }}
                </span>
                <lucide-icon name="chevron-down" [size]="12"
                  class="text-gray-300 group-hover/hdr:text-gray-400 transition-all duration-200"
                  [class.-rotate-90]="isGroupCollapsed(gi)">
                </lucide-icon>
              </div>
            } @else {
              @if (gi > 0) {
                <div class="mx-4 my-2 border-t border-gray-100"></div>
              }
            }

            @if (!isGroupCollapsed(gi) || collapsed()) {
              @for (item of group.items; track item.route) {
                <a [routerLink]="item.route"
                   routerLinkActive="sidebar-active"
                   [routerLinkActiveOptions]="{ exact: true }"
                   class="relative flex items-center gap-3 py-[9px] mx-2 rounded-lg text-[14px] font-medium text-gray-500 hover:bg-sage-50 hover:text-sage-700 transition-all duration-150"
                   [class.px-3]="!collapsed()"
                   [class.justify-center]="collapsed()"
                   [class.px-0]="collapsed()"
                   [title]="collapsed() ? item.label : ''">
                  <lucide-icon [name]="item.icon" [size]="18" [strokeWidth]="1.75" class="shrink-0 opacity-70"></lucide-icon>
                  @if (!collapsed()) {
                    <span class="flex-1 truncate">{{ item.label }}</span>
                    @if (item.badge) {
                      <span class="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-600">{{ item.badge }}</span>
                    }
                  }
                </a>
              }
            }
          }
        </nav>

        <!-- Bottom: Notifications + Settings -->
        <div class="border-t border-gray-100 p-2 space-y-0.5">
          <a routerLink="/notifications" routerLinkActive="sidebar-active"
             class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 font-medium transition-colors"
             [class.justify-center]="collapsed()" [title]="collapsed() ? 'Notifications' : ''">
            <lucide-icon name="bell" [size]="18" [strokeWidth]="1.75" class="shrink-0 opacity-70"></lucide-icon>
            @if (!collapsed()) {
              <span>Notifications</span>
              @if (notificationCount() > 0) {
                <span class="ml-auto min-w-[20px] h-5 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">{{ notificationCount() }}</span>
              }
            }
          </a>
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

        <!-- User Profile -->
        <div class="border-t border-gray-100 p-3">
          <div class="flex items-center gap-3" [class.justify-center]="collapsed()">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                 style="background: linear-gradient(135deg, #293929 0%, #466846 100%)">
              {{ userInitials() }}
            </div>
            @if (!collapsed()) {
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ user()?.full_name || 'User' }}</p>
                <p class="text-[11px] text-gray-400 capitalize">{{ user()?.role?.replace('_', ' ') || '' }}</p>
              </div>
              <button (click)="logout()" class="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400" title="Sign out">
                <lucide-icon name="log-out" [size]="16" [strokeWidth]="1.75"></lucide-icon>
              </button>
            }
          </div>
        </div>
      </aside>

      <!-- ═══ Main Content ═══ -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Top bar with notification bell -->
        <header class="h-14 shrink-0 bg-white border-b border-gray-100 px-6 flex items-center justify-end gap-3">
          <a routerLink="/notifications"
             class="relative p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700"
             title="Notifications">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            @if (notificationCount() > 0) {
              <span class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white
                           text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {{ notificationCount() > 99 ? '99+' : notificationCount() }}
              </span>
            }
          </a>
        </header>

        <main class="flex-1 overflow-y-auto p-6 page-bg">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep a.sidebar-active {
      background-color: #f4f7f4;
      color: #3a543a;
      font-weight: 600;
    }
    :host ::ng-deep a.sidebar-active lucide-icon {
      opacity: 1;
    }
  `],
})
export class HotelLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private activeProperty = inject(ActivePropertyService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private featureService = inject(FeatureService);
  private brandingService = inject(BrandingService);
  protected user = inject(TokenService).user;
  protected branding = this.brandingService.config;

  collapsed = signal(false);
  notificationCount = signal(0);

  private collapsedGroups = signal<Set<number>>(new Set([2, 4, 5, 6, 7, 8]));

  propertyName = computed(() => this.activeProperty.propertyName());
  propertyInitial = computed(() => this.propertyName().charAt(0).toUpperCase());
  staffRole = computed(() => {
    const role = this.user()?.role;
    return role ? role.replace('_', ' ') : '';
  });

  // Property switcher (via ActivePropertyService)
  showPropertySwitcher = false;
  allProperties = this.activeProperty.properties;
  currentPropertyId = this.activeProperty.propertyId;

  switchToProperty(property: any): void {
    this.showPropertySwitcher = false;
    this.activeProperty.switchTo(property.id);
    this.toast.success('Switching to ' + property.name + '...');
  }

  userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return ((u.first_name?.charAt(0) || '') + (u.last_name?.charAt(0) || '')).toUpperCase() || '?';
  });

  // Lucide icon names (kebab-case)
  private allNavGroups: NavGroup[] = [
    {
      label: 'Daily Operation',
      items: [
        { label: 'Dashboard', icon: 'layout-dashboard', route: '/dashboard' },
        { label: 'Bookings', icon: 'clipboard-list', route: '/bookings' },
        { label: 'Rooms', icon: 'bed-double', route: '/rooms' },
        { label: 'Room Types', icon: 'tag', route: '/room-types' },
        { label: 'Guests', icon: 'user-round', route: '/guests' },
        { label: 'Housekeeping', icon: 'spray-can', route: '/housekeeping', requiredModule: 'housekeeping' },
        { label: 'Consumables', icon: 'box', route: '/housekeeping/consumables', requiredModule: 'housekeeping' },
        { label: 'Room Controls', icon: 'sliders-horizontal', route: '/room-controls', requiredModule: 'guest_access_codes' },
      ],
    },
    {
      label: 'Guest Experience',
      items: [
        { label: 'Service Requests', icon: 'concierge-bell', route: '/guest-services', requiredModule: 'service_requests' },
        { label: 'Chat', icon: 'message-circle', route: '/chat', requiredModule: 'guest_chat' },
        { label: 'Service Requests', icon: 'concierge-bell', route: '/service-requests', requiredModule: 'service_requests' },
        { label: 'Loyalty', icon: 'gift', route: '/loyalty', requiredModule: 'loyalty_program' },
        { label: 'Guest Preferences', icon: 'heart', route: '/guest-preferences' },
        { label: 'Security', icon: 'shield', route: '/security', requiredModule: 'security_incidents' },
        { label: 'Guest Cards', icon: 'credit-card', route: '/guest-cards', requiredModule: 'guest_access_codes' },
        { label: 'Card Scanner', icon: 'scan-line', route: '/guest-cards/scanner', requiredModule: 'guest_access_codes' },
        { label: 'Card Events', icon: 'activity', route: '/guest-cards/events', requiredModule: 'guest_access_codes' },
        { label: 'Scan Points', icon: 'radio', route: '/guest-cards/scan-points', requiredModule: 'guest_access_codes' },
      ],
    },
    {
      label: 'F&B & Facilities',
      items: [
        { label: 'POS / Restaurant', icon: 'utensils', route: '/pos', requiredModule: 'bar_pos' },
        { label: 'Menu & Pricing', icon: 'book-open', route: '/pos/menu', requiredModule: 'bar_pos' },
        { label: 'Gym & Fitness', icon: 'dumbbell', route: '/gym', requiredModule: 'gym_membership' },
        { label: 'Spa & Pool', icon: 'bath', route: '/spa' },
        { label: 'Amenities', icon: 'sparkles', route: '/amenities' },
      ],
    },
    {
      label: 'Inventory & Food Cost',
      items: [
        { label: 'Stock & Inventory',    icon: 'package',         route: '/inventory',              requiredModule: 'inventory_management' },
        { label: 'Stock Movements',      icon: 'arrow-left-right',route: '/inventory/movements',    requiredModule: 'inventory_management' },
        { label: 'Goods Received (GRN)', icon: 'truck',           route: '/inventory/grn',          requiredModule: 'inventory_management' },
        { label: 'Vendors',              icon: 'building-2',      route: '/procurement/vendors',    requiredModule: 'inventory_management' },
        { label: 'Purchase Requests',    icon: 'clipboard-list',  route: '/procurement/requests',   requiredModule: 'inventory_management' },
        { label: 'Purchase Orders',      icon: 'file-text',       route: '/procurement/orders',     requiredModule: 'inventory_management' },
        { label: 'Recipe Builder',       icon: 'chef-hat',        route: '/pos/recipes',            requiredModule: 'bar_pos' },
        { label: 'Food Cost',            icon: 'percent',         route: '/pos/food-cost',          requiredModule: 'bar_pos' },
        { label: 'Inventory Reports',    icon: 'bar-chart-2',     route: '/inventory/reports',      requiredModule: 'inventory_management' },
      ],
    },
    {
      label: 'Finance & Reports',
      items: [
        { label: 'Folios', icon: 'folder-open', route: '/folios', requiredModule: 'folio_billing' },
        { label: 'Invoices', icon: 'file-text', route: '/invoices', requiredModule: 'invoice_generation' },
        { label: 'Expenses', icon: 'receipt', route: '/expenses', requiredModule: 'folio_billing' },
        { label: 'Night Audit', icon: 'moon', route: '/night-audit', requiredModule: 'folio_billing' },
        { label: 'Pricing Rules', icon: 'trending-up', route: '/pricing-rules', requiredModule: 'dynamic_pricing' },
        { label: 'Group Bookings', icon: 'users', route: '/group-bookings' },
        { label: 'Analytics', icon: 'chart-bar', route: '/analytics', requiredModule: 'basic_analytics' },
        { label: 'Reports', icon: 'file-chart-column', route: '/reports', requiredModule: 'basic_analytics' },
        { label: 'Police Reports', icon: 'shield-alert', route: '/police-reports' },
      ],
    },
    {
      label: 'Human Resources',
      items: [
        { label: 'Staff', icon: 'user-round', route: '/staff' },
        { label: 'Employees', icon: 'user-round-cog', route: '/employees', requiredModule: 'employee_management' },
        { label: 'Attendance', icon: 'clock', route: '/attendance', requiredModule: 'attendance_shifts' },
        { label: 'Leave', icon: 'tree-palm', route: '/leave', requiredModule: 'leave_management' },
        { label: 'Payroll', icon: 'hand-coins', route: '/payroll', requiredModule: 'payroll' },
        { label: 'Reviews', icon: 'star', route: '/performance-reviews', requiredModule: 'performance_reviews' },
      ],
    },
    {
      label: 'Maintenance & Assets',
      items: [
        { label: 'Assets', icon: 'package', route: '/assets', requiredModule: 'asset_management' },
        { label: 'Incidents', icon: 'triangle-alert', route: '/incidents', requiredModule: 'security_incidents' },
        { label: 'Maintenance', icon: 'wrench', route: '/maintenance', requiredModule: 'asset_management' },
        { label: 'Engineers', icon: 'hard-hat', route: '/engineers', requiredModule: 'asset_management' },
      ],
    },
    {
      label: 'Integrations',
      items: [
        { label: 'OTA Channels', icon: 'globe', route: '/ota' },
        { label: 'WhatsApp', icon: 'smartphone', route: '/whatsapp', requiredModule: 'whatsapp_messaging' },
        { label: 'IoT Devices', icon: 'wifi', route: '/iot' },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Properties', icon: 'building', route: '/properties', requiredModule: 'multi_property' },
        { label: 'Features', icon: 'puzzle', route: '/features' },
        { label: 'Apps', icon: 'zap', route: '/apps' },
        { label: 'Billing', icon: 'credit-card', route: '/billing' },
      ],
    },
  ];

  visibleNavGroups = computed(() => {
    return this.allNavGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.requiredModule) return true;
        return this.featureService.isEnabled(item.requiredModule);
      }),
    })).filter(g => g.items.length > 0);
  });

  isGroupCollapsed(index: number): boolean {
    return this.collapsedGroups().has(index);
  }

  toggleGroup(index: number): void {
    this.collapsedGroups.update(set => {
      const next = new Set(set);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  ngOnInit(): void {
    this.featureService.load();
    this.activeProperty.load();
    const path = this.router.url;
    const visible = this.visibleNavGroups();
    visible.forEach((g, i) => {
      if (g.items.some(item => path.startsWith(item.route))) {
        this.collapsedGroups.update(set => {
          const next = new Set(set);
          next.delete(i);
          return next;
        });
      }
    });
    this.loadNotificationCount();
    // Poll every 60 seconds
    setInterval(() => this.loadNotificationCount(), 60_000);
  }

  private loadNotificationCount(): void {
    this.api.get('/notifications/unread-count').subscribe({
      next: (r: any) => this.notificationCount.set(r?.data?.count ?? 0),
      error: () => {},
    });
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.auth.navigateToLogin());
  }
}
