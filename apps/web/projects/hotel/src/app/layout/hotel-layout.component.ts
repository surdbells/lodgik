import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, TokenService, FeatureService, BrandingService } from '@lodgik/shared';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  requiredModule?: string;
}

@Component({
  selector: 'app-hotel-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-gray-50">
      <!-- Sidebar -->
      <aside class="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div class="p-4 border-b border-gray-100">
          @if (branding().logoUrl) {
            <img [src]="branding().logoUrl!" [alt]="branding().appName" class="h-8 object-contain">
          } @else {
            <h1 class="text-lg font-bold" [style.color]="branding().primaryColor">{{ branding().appName }}</h1>
          }
        </div>
        <nav class="flex-1 py-2 overflow-y-auto">
          @for (item of visibleNavItems(); track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="bg-blue-50 text-blue-700 border-r-2"
               [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
               [style.border-color]="branding().primaryColor"
               class="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <span class="text-base w-5 text-center">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="p-3 border-t border-gray-100 text-xs text-gray-400">
          Powered by Lodgik
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div class="flex items-center gap-3">
            <h2 class="text-sm font-medium text-gray-700">{{ user()?.full_name }}</h2>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{{ user()?.role }}</span>
            <button (click)="logout()" class="text-xs text-gray-500 hover:text-red-600">Sign out</button>
          </div>
        </header>
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class HotelLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private featureService = inject(FeatureService);
  private brandingService = inject(BrandingService);
  protected user = inject(TokenService).user;
  protected branding = this.brandingService.config;

  sidebarCollapsed = signal(false);

  allNavItems: NavItem[] = [
    { label: 'Dashboard', icon: '🏠', route: '/dashboard' },
    { label: 'Bookings', icon: '📋', route: '/bookings' },
    { label: 'Rooms', icon: '🚪', route: '/rooms' },
    { label: 'Room Types', icon: '🏷️', route: '/room-types' },
    { label: 'Guests', icon: '🧑', route: '/guests' },
    { label: 'Folios', icon: '📂', route: '/folios' },
    { label: 'Invoices', icon: '📄', route: '/invoices' },
    { label: 'Housekeeping', icon: '🧹', route: '/housekeeping', requiredModule: 'housekeeping' },
    { label: 'Chat', icon: '💬', route: '/chat' },
    { label: 'POS', icon: '🧾', route: '/pos', requiredModule: 'pos' },
    { label: 'Security', icon: '🛡️', route: '/security' },
    { label: 'Room Controls', icon: '🎛️', route: '/room-controls' },
    { label: 'Guest Services', icon: '🛎️', route: '/guest-services' },
    { label: 'Gym', icon: '🏋️', route: '/gym', requiredModule: 'gym' },
    // ─── Phase 8A: Financial ───
    { label: 'Expenses', icon: '💸', route: '/expenses' },
    { label: 'Night Audit', icon: '🌙', route: '/night-audit' },
    { label: 'Police Reports', icon: '🚔', route: '/police-reports' },
    { label: 'Pricing Rules', icon: '📈', route: '/pricing-rules' },
    { label: 'Group Bookings', icon: '👥', route: '/group-bookings' },
    { label: 'Reviews', icon: '⭐', route: '/performance-reviews' },
    // ─── Phase 8B: Assets ───
    { label: 'Assets', icon: '📦', route: '/assets' },
    { label: 'Incidents', icon: '🚨', route: '/incidents' },
    { label: 'Maintenance', icon: '🔧', route: '/maintenance' },
    { label: 'Engineers', icon: '👷', route: '/engineers' },
    // ─── Phase 8C: WhatsApp ───
    { label: 'WhatsApp', icon: '📱', route: '/whatsapp' },
    // ─── Phase 8D: CRM & Analytics ───
    { label: 'Loyalty', icon: '🎁', route: '/loyalty' },
    { label: 'Analytics', icon: '📊', route: '/analytics' },
    { label: 'Guest Prefs', icon: '❤️', route: '/guest-preferences' },
    // ─── Phase 8E: Advanced ───
    { label: 'OTA Channels', icon: '🌐', route: '/ota' },
    { label: 'Spa & Pool', icon: '💆', route: '/spa', requiredModule: 'spa' },
    { label: 'IoT Devices', icon: '📡', route: '/iot' },
    // ─── System ───
    { label: 'Employees', icon: '🧑‍💼', route: '/employees' },
    { label: 'Attendance', icon: '🕐', route: '/attendance' },
    { label: 'Leave', icon: '🏖️', route: '/leave' },
    { label: 'Payroll', icon: '💵', route: '/payroll' },
    { label: 'Staff', icon: '👤', route: '/staff' },
    { label: 'Properties', icon: '🏨', route: '/properties' },
    { label: 'Features', icon: '🧩', route: '/features' },
    { label: 'Apps', icon: '📲', route: '/apps' },
    { label: 'Billing', icon: '💳', route: '/billing' },
    { label: 'Settings', icon: '⚙️', route: '/settings' },
  ];

  visibleNavItems = computed(() => {
    return this.allNavItems.filter(item => {
      if (!item.requiredModule) return true;
      return this.featureService.isEnabled(item.requiredModule);
    });
  });

  ngOnInit(): void {
    this.featureService.load();
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.auth.navigateToLogin());
  }
}
