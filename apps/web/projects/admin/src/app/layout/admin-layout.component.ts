import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, TokenService } from '@lodgik/shared';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-gray-50">
      <!-- Sidebar -->
      <aside class="w-64 bg-[var(--lodgik-primary-900,#0f1f33)] text-white flex flex-col shrink-0">
        <div class="p-5 border-b border-white/10">
          <h1 class="text-xl font-bold tracking-tight">Lodgik</h1>
          <p class="text-xs text-blue-300 mt-0.5">Super Admin Console</p>
        </div>
        <nav class="flex-1 py-3 overflow-y-auto">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="bg-white/15 border-r-2 border-amber-400"
               class="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <span class="text-base">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="p-4 border-t border-white/10">
          <div class="text-xs text-gray-400 mb-2">{{ user()?.email }}</div>
          <button (click)="logout()" class="text-xs text-red-300 hover:text-red-200">Sign out</button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0">
          <h2 class="text-base font-semibold text-gray-800">Admin Panel</h2>
        </header>
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);
  protected user = inject(TokenService).user;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { label: 'Tenants', icon: '🏨', route: '/tenants' },
    { label: 'Plans', icon: '📋', route: '/plans' },
    { label: 'Features', icon: '🧩', route: '/features' },
    { label: 'Apps', icon: '📱', route: '/apps' },
    { label: 'Usage', icon: '📈', route: '/usage' },
    { label: 'Invitations', icon: '✉️', route: '/invitations' },
    { label: 'Settings', icon: '⚙️', route: '/settings' },
  ];

  logout(): void {
    this.auth.logout().subscribe(() => this.auth.navigateToLogin());
  }
}
