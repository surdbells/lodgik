import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Tablet idle / splash screen.
 * If guest_token is already set → redirect straight to home.
 * If not → redirect to guest login with returnTo=/tablet/home.
 */
@Component({ selector: 'app-tablet-idle', standalone: true, imports: [],
  template: `
    <div class="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <div class="absolute w-96 h-96 rounded-full border border-white/5 animate-pulse"></div>
      <div class="absolute w-[520px] h-[520px] rounded-full border border-white/5" style="animation:pulse 3s ease-in-out infinite 1s"></div>
      <div class="text-center z-10">
        <div class="text-7xl mb-6">🏨</div>
        <h1 class="text-white text-3xl font-bold mb-2">{{ hotelName() }}</h1>
        <p class="text-slate-400 mb-8">In-Room Concierge</p>
        <div class="flex items-center justify-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
          <span class="text-slate-400 text-sm">Loading…</span>
        </div>
      </div>
      <div class="absolute bottom-6 text-slate-600 text-xs">{{ time() }}</div>
    </div>
  `,
})
export class TabletIdlePage implements OnInit, OnDestroy {
  private router = inject(Router);
  time      = signal('');
  hotelName = signal('Lodgik Hotel');
  private clockTimer: any;

  ngOnInit(): void {
    this.tick();
    this.clockTimer = setInterval(() => this.tick(), 60_000);

    // Load hotel name from cached session if available
    try {
      const s = JSON.parse(localStorage.getItem('guest_session') ?? '{}');
      if (s?.property?.name) this.hotelName.set(s.property.name);
    } catch {}

    // Route based on session state
    setTimeout(() => {
      if (localStorage.getItem('guest_token')) {
        this.router.navigate(['/tablet/home'], { replaceUrl: true });
      } else {
        // Send to guest login, which will return to tablet/home after auth
        this.router.navigate(['/guest/login'], {
          queryParams: { returnTo: '/tablet/home' },
          replaceUrl: true,
        });
      }
    }, 1200);
  }

  ngOnDestroy(): void { clearInterval(this.clockTimer); }
  tick(): void { this.time.set(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })); }
}
