import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LucideAngularModule, Home, Receipt, ConciergeBell, MessageCircle, LogOut, Hotel } from 'lucide-angular';
import { GuestApiService } from '../services/guest-api.service';

@Component({
  selector: 'app-guest-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">

      <!-- Top bar -->
      <header class="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900">
            <lucide-icon [img]="HotelIcon" class="w-4 h-4"></lucide-icon>
          </div>
          <span class="text-sm font-semibold text-white/90">Lodgik Guest</span>
        </div>
        @if (guestName()) {
          <div class="flex items-center gap-2 text-xs text-white/50">
            <span>{{ guestName() }}</span>
            <button (click)="logout()"
              class="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors">
              <lucide-icon [img]="LogOutIcon" class="w-3.5 h-3.5"></lucide-icon>
              <span>Sign out</span>
            </button>
          </div>
        }
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto">
        <router-outlet></router-outlet>
      </main>

      <!-- Bottom nav -->
      @if (guestName()) {
        <nav class="border-t border-white/10 bg-slate-900/80 backdrop-blur-md px-2 py-1 safe-area-bottom">
          <div class="flex justify-around max-w-md mx-auto">

            <a routerLink="/guest/home"
               class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-white/50 hover:text-white transition-colors">
              <lucide-icon [img]="HomeIcon" class="w-5 h-5"></lucide-icon>
              <span class="text-[10px]">Home</span>
            </a>

            <a routerLink="/guest/folio"
               class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-white/50 hover:text-white transition-colors">
              <lucide-icon [img]="ReceiptIcon" class="w-5 h-5"></lucide-icon>
              <span class="text-[10px]">My Bill</span>
            </a>

            <a routerLink="/guest/services"
               class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-white/50 hover:text-white transition-colors">
              <lucide-icon [img]="ConciergeBellIcon" class="w-5 h-5"></lucide-icon>
              <span class="text-[10px]">Services</span>
            </a>

            <a routerLink="/guest/chat"
               class="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-white/50 hover:text-white transition-colors">
              <div class="relative">
                <lucide-icon [img]="MessageCircleIcon" class="w-5 h-5"></lucide-icon>
                @if (unreadCount() > 0) {
                  <span class="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white
                               text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {{ unreadCount() > 9 ? '9+' : unreadCount() }}
                  </span>
                }
              </div>
              <span class="text-[10px]">Chat</span>
            </a>

          </div>
        </nav>
      }
    </div>
  `,
})
export class GuestLayoutComponent implements OnInit, OnDestroy {
  private router   = inject(Router);
  private route    = inject(ActivatedRoute);
  private guestApi = inject(GuestApiService);

  readonly HomeIcon          = Home;
  readonly ReceiptIcon       = Receipt;
  readonly ConciergeBellIcon = ConciergeBell;
  readonly MessageCircleIcon = MessageCircle;
  readonly LogOutIcon        = LogOut;
  readonly HotelIcon         = Hotel;

  guestName   = signal<string | null>(null);
  unreadCount = signal(0);

  private pollTimer: any = null;

  private readonly protectedRoutes = [
    '/guest/home', '/guest/folio', '/guest/services', '/guest/chat', '/guest/checkout',
  ];

  ngOnInit(): void {
    const stored = localStorage.getItem('guest_session');
    if (stored) {
      try { this.guestName.set(JSON.parse(stored).guest?.name ?? 'Guest'); } catch {}
    }

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const s = localStorage.getItem('guest_session');
      if (s) {
        try { this.guestName.set(JSON.parse(s).guest?.name ?? 'Guest'); } catch {}
      } else {
        this.guestName.set(null);
      }
      this.guardRoute(e.urlAfterRedirects ?? e.url);
      this.managePolling(e.urlAfterRedirects ?? e.url);
    });

    this.guardRoute(this.router.url);
    this.managePolling(this.router.url);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  // ── Unread badge polling (every 15s, skipped when on chat page) ─

  private managePolling(url: string): void {
    const onChat = url.startsWith('/guest/chat');
    if (onChat) {
      this.unreadCount.set(0);
      if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
      return;
    }
    if (this.guestName() && !this.pollTimer) {
      this.fetchUnread();
      this.pollTimer = setInterval(() => this.fetchUnread(), 15_000);
    }
  }

  private fetchUnread(): void {
    if (!localStorage.getItem('guest_token')) return;
    this.guestApi.get<any>('/guest/chat/messages').subscribe({
      next: (r: any) => {
        const msgs: any[] = r.data ?? [];
        this.unreadCount.set(msgs.filter((m: any) => m.sender_type === 'staff' && !m.read_at).length);
      },
      error: () => {},
    });
  }

  // ── Route guard ──────────────────────────────────────────────

  private guardRoute(url: string): void {
    const path = url.split('?')[0];
    if (!this.protectedRoutes.some(r => path.startsWith(r))) return;
    if (localStorage.getItem('guest_session')) return;

    const params: Record<string, string> = {};
    const qs = url.includes('?') ? url.split('?')[1] : '';
    if (qs) qs.split('&').forEach(pair => {
      const idx = pair.indexOf('=');
      if (idx >= 0) params[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(pair.slice(idx + 1));
    });
    const snap = this.route.snapshot.queryParams;
    if (snap['t'] && !params['t']) params['t'] = snap['t'];
    if (snap['c'] && !params['c']) params['c'] = snap['c'];
    try {
      window.location.search.slice(1).split('&').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx >= 0) {
          const k = decodeURIComponent(pair.slice(0, idx));
          const v = decodeURIComponent(pair.slice(idx + 1));
          if (k && !params[k]) params[k] = v;
        }
      });
    } catch {}

    this.router.navigate(['/guest/login'], {
      queryParams: Object.keys(params).length ? params : undefined,
    });
  }

  logout(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    localStorage.removeItem('guest_session');
    localStorage.removeItem('guest_token');
    this.guestName.set(null);
    this.router.navigate(['/guest/login']);
  }
}
