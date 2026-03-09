import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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
  private route  = inject(ActivatedRoute);

  guestName = signal<string | null>(null);

  readonly navItems = [
    { icon: '🏠', label: 'Home',     route: '/guest/home' },
    { icon: '🧾', label: 'My Bill',  route: '/guest/folio' },
    { icon: '🛎️', label: 'Services', route: '/guest/services' },
    { icon: '💬', label: 'Chat',     route: '/guest/chat' },
  ];

  /** Routes that require a guest session */
  private readonly protectedRoutes = ['/guest/home', '/guest/folio', '/guest/services', '/guest/chat'];

  ngOnInit(): void {
    // Restore session name display
    const stored = localStorage.getItem('guest_session');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        this.guestName.set(s.guest?.name ?? 'Guest');
      } catch {}
    }

    // Guard on every subsequent navigation
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
    ).subscribe((e: any) => {
      this.guardRoute(e.urlAfterRedirects ?? e.url);
    });

    // Guard on initial load (the router may have already navigated)
    this.guardRoute(this.router.url);
  }

  /**
   * If the current URL is a protected route and there is no guest session,
   * redirect to /guest/login while preserving any ?t= and ?c= query params
   * that were on the original URL (e.g. deep-links from hotel QR codes).
   */
  private guardRoute(url: string): void {
    const path = url.split('?')[0];
    const isProtected = this.protectedRoutes.some(r => path.startsWith(r));
    if (!isProtected) return;

    const hasSession = !!localStorage.getItem('guest_session');
    if (hasSession) return;

    // Collect ?t= and ?c= from multiple sources (Angular may have dropped them via redirectTo)
    const params: Record<string, string> = {};

    // 1. From the current URL string passed in
    const qs = url.includes('?') ? url.split('?')[1] : '';
    if (qs) {
      qs.split('&').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        params[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(pair.slice(idx + 1));
      });
    }

    // 2. From the parent route snapshot (populated before any child redirect)
    const snap = this.route.snapshot.queryParams;
    if (snap['t'] && !params['t']) params['t'] = snap['t'];
    if (snap['c'] && !params['c']) params['c'] = snap['c'];

    // 3. From window.location — catches the case where Angular's redirectTo already fired
    //    and stripped the params from the router URL
    try {
      const winQs = window.location.search.slice(1);
      if (winQs) {
        winQs.split('&').forEach(pair => {
          const idx = pair.indexOf('=');
          if (idx === -1) return;
          const k = decodeURIComponent(pair.slice(0, idx));
          const v = decodeURIComponent(pair.slice(idx + 1));
          if (k && !params[k]) params[k] = v;
        });
      }
    } catch {}

    this.router.navigate(
      ['/guest/login'],
      { queryParams: Object.keys(params).length ? params : undefined },
    );
  }

  logout(): void {
    localStorage.removeItem('guest_session');
    localStorage.removeItem('guest_token');
    this.guestName.set(null);
    this.router.navigate(['/guest/login']);
  }
}
