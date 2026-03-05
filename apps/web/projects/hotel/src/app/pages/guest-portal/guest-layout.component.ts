import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-guest-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">

      <!-- Top bar -->
      <header class="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900 font-bold text-sm">L</div>
          <span class="text-sm font-semibold text-white/90">Lodgik Guest</span>
        </div>
        @if (guestName()) {
          <div class="text-xs text-white/50">
            {{ guestName() }}
            <button (click)="logout()" class="ml-2 text-amber-400 hover:text-amber-300">Sign out</button>
          </div>
        }
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto">
        <router-outlet></router-outlet>
      </main>

      <!-- Bottom nav (only when authenticated) -->
      @if (guestName()) {
        <nav class="border-t border-white/10 bg-slate-900/80 backdrop-blur-md px-2 py-1 safe-area-bottom">
          <div class="flex justify-around max-w-md mx-auto">
            @for (item of navItems; track item.route) {
              <a [routerLink]="item.route"
                class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-white/50 hover:text-white transition-colors">
                <span class="text-xl leading-none">{{ item.icon }}</span>
                <span class="text-[10px]">{{ item.label }}</span>
              </a>
            }
          </div>
        </nav>
      }
    </div>
  `,
})
export class GuestLayoutComponent implements OnInit {
  private router = inject(Router);

  guestName = signal<string | null>(null);

  readonly navItems = [
    { icon: '🏠', label: 'Home',     route: '/guest/home' },
    { icon: '🧾', label: 'My Bill',  route: '/guest/folio' },
    { icon: '🛎️', label: 'Services', route: '/guest/services' },
    { icon: '💬', label: 'Chat',     route: '/guest/chat' },
  ];

  ngOnInit(): void {
    const stored = localStorage.getItem('guest_session');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        this.guestName.set(s.guest?.name ?? 'Guest');
      } catch {}
    }
  }

  logout(): void {
    localStorage.removeItem('guest_session');
    localStorage.removeItem('guest_token');
    this.router.navigate(['/guest/login']);
  }
}
