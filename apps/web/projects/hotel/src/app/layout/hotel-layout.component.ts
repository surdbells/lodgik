import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, TokenService, FeatureService, BrandingService, LODGIK_ICONS, ApiService, ActivePropertyService, ToastService } from '@lodgik/shared';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import type { UserRole } from '@lodgik/shared';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  requiredModule?: string;
  requiredRoles?: UserRole[];
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
    <div class="flex h-screen overflow-hidden bg-[#f9fafb]" (click)="unlockAudio()">

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
                <span class="text-[11px] font-bold tracking-[0.06em] uppercase font-heading transition-colors duration-150"
                      [class.text-gray-900]="!isGroupCollapsed(gi)"
                      [class.text-gray-400]="isGroupCollapsed(gi)">
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

    <!-- ── Floating Chat Bubble ─────────────────────────────────────── -->
    @if (chatUnreadCount() >= 0) {
      <a routerLink="/chat"
        class="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95"
        style="background:linear-gradient(135deg,#466846,#5a825a)"
        title="Guest Chat {{ chatUnreadCount() > 0 ? '(' + chatUnreadCount() + ' unread)' : '' }}">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        @if (chatUnreadCount() > 0) {
          <span class="absolute -top-1 -right-1 min-w-[22px] h-[22px] flex items-center justify-center text-[11px] font-black bg-red-500 text-white rounded-full px-1.5 shadow-lg border-2 border-white animate-pulse">
            {{ chatUnreadCount() > 99 ? '99+' : chatUnreadCount() }}
          </span>
        }
      </a>
    }
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
  protected tokenService = inject(TokenService);
  protected user = this.tokenService.user;
  protected branding = this.brandingService.config;

  collapsed = signal(false);
  notificationCount = signal(0);
  chatUnreadCount   = signal(0);
  showChatBubble    = signal(true);

  private collapsedGroups = signal<Set<number>>(new Set([0,1,2,3,4,5,6,7,8,9,10,11]));

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
        { label: 'Bookings',          icon: 'clipboard-list',   route: '/bookings' },
        { label: 'Live Room Monitor',  icon: 'activity',          route: '/bookings/checkout-tracker',
          requiredRoles: ['property_admin','manager','front_desk'] },
        { label: 'Guest Validation',    icon: 'user-check',        route: '/bookings/guest-validation',
          requiredRoles: ['property_admin','manager','front_desk'] },
        { label: 'Rooms',             icon: 'bed-double',        route: '/rooms' },
        { label: 'Room Types',icon: 'tag',               route: '/room-types' },
        { label: 'Guests',    icon: 'user-round',        route: '/guests' },
      ],
    },
    {
      label: 'Reservations & Events',
      items: [
        { label: 'Group Bookings',     icon: 'users',         route: '/group-bookings',   requiredRoles: ['property_admin','manager','front_desk','accountant'] },
        { label: 'Corporate Profiles', icon: 'building-2',    route: '/corporate-profiles', requiredRoles: ['property_admin','manager','accountant'] },
        { label: 'Events & Banquets',  icon: 'calendar-days', route: '/events',           requiredRoles: ['property_admin','manager','front_desk','accountant','concierge'] },
        { label: 'OTA Channels',       icon: 'globe',         route: '/ota',              requiredRoles: ['property_admin','manager'] },
        { label: 'Pricing Rules',      icon: 'trending-up',   route: '/pricing-rules', requiredModule: 'dynamic_pricing', requiredRoles: ['property_admin','manager','accountant'] },
      ],
    },
    {
      label: 'Guest Experience',
      items: [
        { label: 'Service Requests',  icon: 'concierge-bell', route: '/service-requests',  requiredModule: 'service_requests' },
        { label: 'Guest Services',    icon: 'users',          route: '/guest-services',    requiredModule: 'service_requests' },
        { label: 'Chat',              icon: 'message-circle', route: '/chat',              requiredModule: 'guest_chat' },
        { label: 'Loyalty',           icon: 'gift',           route: '/loyalty',           requiredModule: 'loyalty_program' },
        { label: 'Guest Preferences', icon: 'heart',          route: '/guest-preferences' },
        { label: 'Guest Cards',       icon: 'credit-card',    route: '/guest-cards',       requiredModule: 'guest_access_codes' },
        { label: 'Card Scanner',      icon: 'scan-line',      route: '/guest-cards/scanner',    requiredModule: 'guest_access_codes' },
        { label: 'Card Events',       icon: 'activity',       route: '/guest-cards/events',     requiredModule: 'guest_access_codes' },
        { label: 'Scan Points',       icon: 'radio',          route: '/guest-cards/scan-points', requiredModule: 'guest_access_codes' },
        { label: 'Room Controls',     icon: 'sliders-horizontal', route: '/room-controls', requiredModule: 'guest_access_codes' },
      ],
    },
    {
      label: 'Housekeeping',
      items: [
        { label: 'Housekeeping', icon: 'spray-can', route: '/housekeeping', requiredModule: 'housekeeping', requiredRoles: ['property_admin','manager','housekeeping'] },
        { label: 'Consumables',  icon: 'box',        route: '/housekeeping/consumables', requiredModule: 'housekeeping', requiredRoles: ['property_admin','manager','housekeeping'] },
      ],
    },
    {
      label: 'F&B & Facilities',
      items: [
        { label: 'POS / Restaurant', icon: 'utensils',  route: '/pos',      requiredModule: 'bar_pos' },
        { label: 'Menu & Pricing',   icon: 'book-open', route: '/pos/menu', requiredModule: 'bar_pos' },
        { label: 'Gym & Fitness',    icon: 'dumbbell',  route: '/gym',      requiredModule: 'gym_membership' },
        { label: 'Spa & Pool',       icon: 'bath',      route: '/spa' },
        { label: 'Amenities',        icon: 'sparkles',  route: '/amenities' },
      ],
    },
    {
      label: 'Inventory & Food Cost',
      items: [
        { label: 'Stock & Inventory',    icon: 'package',          route: '/inventory',           requiredModule: 'inventory_management' },
        { label: 'Stock Movements',      icon: 'arrow-left-right', route: '/inventory/movements', requiredModule: 'inventory_management' },
        { label: 'Goods Received (GRN)', icon: 'truck',            route: '/inventory/grn',       requiredModule: 'inventory_management' },
        { label: 'Vendors',              icon: 'building-2',       route: '/procurement/vendors', requiredModule: 'inventory_management' },
        { label: 'Purchase Requests',    icon: 'clipboard-list',   route: '/procurement/requests',requiredModule: 'inventory_management' },
        { label: 'Purchase Orders',      icon: 'file-text',        route: '/procurement/orders',  requiredModule: 'inventory_management' },
        { label: 'Recipe Builder',       icon: 'chef-hat',         route: '/pos/recipes',         requiredModule: 'bar_pos' },
        { label: 'Food Cost',            icon: 'percent',          route: '/pos/food-cost',        requiredModule: 'bar_pos' },
        { label: 'Inventory Reports',    icon: 'bar-chart-2',      route: '/inventory/reports',   requiredModule: 'inventory_management' },
      ],
    },
    {
      label: 'Finance & Reports',
      items: [
        { label: 'Folios',      icon: 'folder-open',       route: '/folios',      requiredModule: 'folio_billing',       requiredRoles: ['property_admin','manager','front_desk','accountant'] },
        { label: 'Invoices',    icon: 'file-text',         route: '/invoices',    requiredModule: 'invoice_generation',   requiredRoles: ['property_admin','manager','accountant'] },
        { label: 'Expenses',    icon: 'receipt',           route: '/expenses',    requiredModule: 'folio_billing',       requiredRoles: ['property_admin','manager','accountant'] },
        { label: 'Night Audit', icon: 'moon',              route: '/night-audit', requiredModule: 'folio_billing',       requiredRoles: ['property_admin','manager','accountant'] },
        { label: 'Analytics',   icon: 'chart-bar',         route: '/analytics',   requiredModule: 'basic_analytics',     requiredRoles: ['property_admin','manager','accountant'] },
        { label: 'Reports',     icon: 'file-chart-column', route: '/reports',     requiredModule: 'basic_analytics',     requiredRoles: ['property_admin','manager','accountant'] },
      ],
    },
    {
      label: 'Security & Compliance',
      items: [
        { label: 'Security',       icon: 'shield',        route: '/security',       requiredModule: 'security_incidents', requiredRoles: ['property_admin','manager','security'] },
        { label: 'Incidents',      icon: 'triangle-alert',route: '/incidents',      requiredModule: 'security_incidents', requiredRoles: ['property_admin','manager','security'] },
        { label: 'Police Reports', icon: 'shield-alert',  route: '/police-reports',                                       requiredRoles: ['property_admin','manager','security'] },
        { label: 'Audit Log',      icon: 'history',       route: '/audit-log',      requiredModule: 'audit_logging',      requiredRoles: ['property_admin','manager'] },
      ],
    },
    {
      label: 'Human Resources',
      items: [
        { label: 'Staff',      icon: 'user-round',     route: '/staff',                                                requiredRoles: ['property_admin','manager'] },
        { label: 'Employees',  icon: 'user-round-cog', route: '/employees',           requiredModule: 'employee_management',  requiredRoles: ['property_admin','manager'] },
        { label: 'Attendance', icon: 'clock',          route: '/attendance',          requiredModule: 'attendance_shifts',    requiredRoles: ['property_admin','manager'] },
        { label: 'Leave',      icon: 'tree-palm',      route: '/leave',               requiredModule: 'leave_management',     requiredRoles: ['property_admin','manager'] },
        { label: 'Payroll',    icon: 'hand-coins',     route: '/payroll',             requiredModule: 'payroll',              requiredRoles: ['property_admin','manager'] },
        { label: 'Reviews',    icon: 'star',           route: '/performance-reviews', requiredModule: 'performance_reviews',  requiredRoles: ['property_admin','manager'] },
      ],
    },
    {
      label: 'Maintenance & Assets',
      items: [
        { label: 'Assets',      icon: 'package',  route: '/assets',      requiredModule: 'asset_management', requiredRoles: ['property_admin','manager','maintenance'] },
        { label: 'Maintenance', icon: 'wrench',   route: '/maintenance', requiredModule: 'asset_management', requiredRoles: ['property_admin','manager','maintenance'] },
        { label: 'Engineers',   icon: 'hard-hat', route: '/engineers',   requiredModule: 'asset_management', requiredRoles: ['property_admin','manager','maintenance'] },
      ],
    },
    {
      label: 'Integrations',
      items: [
        { label: 'WhatsApp',    icon: 'smartphone', route: '/whatsapp', requiredModule: 'whatsapp_messaging', requiredRoles: ['property_admin','manager'] },
        { label: 'IoT Devices', icon: 'wifi',       route: '/iot',                                            requiredRoles: ['property_admin','manager'] },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Properties', icon: 'building',    route: '/properties', requiredModule: 'multi_property', requiredRoles: ['property_admin'] },
        { label: 'Features',   icon: 'puzzle',      route: '/features',                                     requiredRoles: ['property_admin'] },
        { label: 'Role Permissions', icon: 'shield-check',  route: '/settings/rbac',                                          requiredRoles: ['property_admin'] },
        { label: 'Apps',       icon: 'zap',         route: '/apps',                                         requiredRoles: ['property_admin'] },
        { label: 'Billing',    icon: 'credit-card', route: '/billing',                                      requiredRoles: ['property_admin'] },
      ],
    },
  ];
  visibleNavGroups = computed(() => {
    const role = this.tokenService.role();
    return this.allNavGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        // Feature module gate
        if (item.requiredModule && !this.featureService.isEnabled(item.requiredModule)) return false;
        // Role gate — if no requiredRoles, item is visible to all authenticated users
        if (item.requiredRoles && item.requiredRoles.length > 0) {
          if (!role || !item.requiredRoles.includes(role as any)) return false;
        }
        return true;
      }),
    })).filter(g => g.items.length > 0);
  });

  isGroupCollapsed(index: number): boolean {
    return this.collapsedGroups().has(index);
  }

  toggleGroup(index: number): void {
    const total = this.visibleNavGroups().length;
    this.collapsedGroups.update(set => {
      const next = new Set(set);
      if (!next.has(index)) {
        // Section is currently OPEN — just collapse it
        next.add(index);
      } else {
        // Section is currently COLLAPSED — open it, collapse all others
        for (let i = 0; i < total; i++) {
          if (i === index) next.delete(i); // open clicked
          else             next.add(i);    // collapse all others
        }
      }
      return next;
    });
  }

  ngOnInit(): void {
    this.featureService.load();
    this.activeProperty.load();

    this.loadNotificationCount();
    this.loadChatUnread();
    // Poll every 30 seconds for chat, 60 for notifications
    setInterval(() => this.loadNotificationCount(), 60_000);
    setInterval(() => this.loadChatUnread(), 30_000);
  }

  private lastChatUnread = -1;   // -1 = not yet initialised; avoids false sound on first load
  private audioCtx: AudioContext | null = null;
  private audioUnlocked = false;

  /** Call once on first user gesture to unlock AudioContext (browser policy). */
  unlockAudio(): void {
    if (this.audioUnlocked) return;
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      this.audioUnlocked = true;
    } catch {}
  }

  private loadChatUnread(): void {
    const pid = this.activeProperty.propertyId();
    if (!pid) return;
    this.api.get('/chat/active', { property_id: pid }).subscribe({
      next: (r: any) => {
        const chats: any[] = r?.data ?? [];
        const total = chats.reduce((sum: number, ch: any) => sum + (ch.unread_count ?? 0), 0);
        this.chatUnreadCount.set(total);
        // Sound on new messages — skip very first poll (lastChatUnread === -1)
        if (this.lastChatUnread >= 0 && total > this.lastChatUnread) {
          this.playChatSound();
        }
        this.lastChatUnread = total;
      },
      error: () => {},
    });
  }

  private playChatSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') { ctx.resume(); }

      // Two-tone ping: 880 Hz → 1100 Hz
      const t = ctx.currentTime;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880,  t);
      osc.frequency.setValueAtTime(1100, t + 0.12);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    } catch { /* audio blocked or unsupported */ }
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
