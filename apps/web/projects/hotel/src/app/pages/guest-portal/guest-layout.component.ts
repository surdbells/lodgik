import { Component, signal, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { RouterOutlet, RouterLink, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  LucideAngularModule,
  Home, Receipt, ConciergeBell, MessageCircle, LogOut, Hotel, Sun, Moon,
} from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, LucideAngularModule],
  template: `
    <!-- Root shell — theme class applied here -->
    <div [class]="th.page() + ' h-dvh flex flex-col overflow-hidden'">

      <!-- Top bar -->
      <header class="px-4 py-3 flex items-center justify-between border-b" [class]="th.header()">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900">
            <lucide-icon [img]="HotelIcon" class="w-4 h-4"></lucide-icon>
          </div>
          <span class="text-sm font-semibold" [class]="th.text()">Lodgik Guest</span>
        </div>
        <div class="flex items-center gap-3">
          <!-- Theme toggle -->
          <button (click)="th.toggle()" class="transition-colors" [class]="th.muted()">
            @if (th.isDark()) {
              <lucide-icon [img]="SunIcon" class="w-4 h-4"></lucide-icon>
            } @else {
              <lucide-icon [img]="MoonIcon" class="w-4 h-4"></lucide-icon>
            }
          </button>
          @if (guestName()) {
            <div class="flex items-center gap-2 text-xs" [class]="th.muted()">
              <span>{{ guestName() }}</span>
              <button (click)="logout()"
                class="flex items-center gap-1 transition-colors" [class]="th.accent()">
                <lucide-icon [img]="LogOutIcon" class="w-3.5 h-3.5"></lucide-icon>
                <span>Sign out</span>
              </button>
            </div>
          }
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <router-outlet></router-outlet>
      </main>

      <!-- Bottom nav -->
      @if (guestName()) {
        <nav class="shrink-0 border-t px-2 py-1 safe-area-bottom" [class]="th.navBg()">
          <div class="flex justify-around max-w-md mx-auto">

            <a routerLink="/guest/home"
               class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors"
               [class]="currentPath().startsWith('/guest/home') ? th.navActive() : th.navItem()">
              <lucide-icon [img]="HomeIcon" class="w-5 h-5"></lucide-icon>
              <span class="text-[10px]">Home</span>
            </a>

            <a routerLink="/guest/folio"
               class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors"
               [class]="currentPath().startsWith('/guest/folio') ? th.navActive() : th.navItem()">
              <lucide-icon [img]="ReceiptIcon" class="w-5 h-5"></lucide-icon>
              <span class="text-[10px]">My Bill</span>
            </a>

            <a routerLink="/guest/services"
               class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors"
               [class]="currentPath().startsWith('/guest/services') ? th.navActive() : th.navItem()">
              <lucide-icon [img]="ConciergeBellIcon" class="w-5 h-5"></lucide-icon>
              <span class="text-[10px]">Services</span>
            </a>

            <a routerLink="/guest/chat"
               class="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors"
               [class]="currentPath().startsWith('/guest/chat') ? th.navActive() : th.navItem()">
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
  readonly th      = inject(GuestThemeService);

  readonly HomeIcon          = Home;
  readonly ReceiptIcon       = Receipt;
  readonly ConciergeBellIcon = ConciergeBell;
  readonly MessageCircleIcon = MessageCircle;
  readonly LogOutIcon        = LogOut;
  readonly HotelIcon         = Hotel;
  readonly SunIcon           = Sun;
  readonly MoonIcon          = Moon;

  guestName   = signal<string | null>(null);
  unreadCount = signal(0);
  currentPath = signal('');

  private pollTimer: any = null;

  private readonly protectedRoutes = [
    '/guest/home', '/guest/folio', '/guest/services', '/guest/chat', '/guest/checkout',
    '/guest/visitor-codes', '/guest/stay-extension', '/guest/room-controls',
    '/guest/lost-found', '/guest/hotel-info', '/guest/spa',
  ];

  ngOnInit(): void {
    const stored = localStorage.getItem('guest_session');
    if (stored) {
      try { this.guestName.set(JSON.parse(stored).guest?.name ?? 'Guest'); } catch {}
    }
    this.currentPath.set(this.router.url.split('?')[0]);

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url = e.urlAfterRedirects ?? e.url;
      this.currentPath.set(url.split('?')[0]);
      const s = localStorage.getItem('guest_session');
      if (s) {
        try { this.guestName.set(JSON.parse(s).guest?.name ?? 'Guest'); } catch {}
      } else {
        this.guestName.set(null);
      }
      this.guardRoute(url);
      this.managePolling(url);
    });

    this.guardRoute(this.router.url);
    this.managePolling(this.router.url);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

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
