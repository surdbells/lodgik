import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TabletService } from './tablet.service';

@Component({ selector: 'app-tablet-idle', standalone: true, imports: [],
  template: `
    <div class="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 relative overflow-hidden">
      <!-- Ambient rings -->
      <div class="absolute w-96 h-96 rounded-full border border-white/5 animate-pulse"></div>
      <div class="absolute w-[500px] h-[500px] rounded-full border border-white/5" style="animation:pulse 3s ease-in-out infinite 1s"></div>

      <!-- Not registered -->
      @if (!svc.isRegistered) {
        <div class="text-center px-12">
          <div class="text-7xl mb-6">⚙️</div>
          <h1 class="text-white text-3xl font-bold mb-3">Setup Required</h1>
          <p class="text-slate-400 text-lg mb-8">This tablet needs to be registered to a room</p>
          <button (click)="goSetup()"
            class="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-500 active:scale-95 transition-all">
            Register Tablet
          </button>
        </div>
      }

      <!-- Registered — waiting for guest -->
      @if (svc.isRegistered) {
        <div class="text-center px-12 z-10">
          <div class="text-8xl mb-8 drop-shadow-2xl">🏨</div>
          <h1 class="text-white text-4xl font-bold mb-3">Welcome</h1>
          <p class="text-slate-300 text-xl mb-2">{{ hotelName() }}</p>
          <p class="text-slate-400 text-base mb-12">Waiting for guest check-in…</p>

          <!-- Pulsing indicator -->
          <div class="flex items-center justify-center gap-3 mb-12">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
            <span class="text-slate-400 text-sm">Monitoring room assignment</span>
          </div>
        </div>

        <!-- Clock -->
        <div class="absolute bottom-8 right-8 text-right">
          <p class="text-white/60 text-sm">{{ time() }}</p>
        </div>
      }
    </div>
  `,
})
export class TabletIdlePage implements OnInit, OnDestroy {
  readonly svc   = inject(TabletService);
  private router = inject(Router);
  time    = signal('');
  hotelName = signal('Lodgik Hotel');
  private clockTimer: any;

  ngOnInit(): void {
    this.tick();
    this.clockTimer = setInterval(() => this.tick(), 60_000);
    // Load hotel name from localStorage
    try {
      const s = JSON.parse(localStorage.getItem('guest_session') ?? '{}');
      if (s?.property?.name) this.hotelName.set(s.property.name);
    } catch {}
  }
  ngOnDestroy(): void { clearInterval(this.clockTimer); }

  tick(): void {
    this.time.set(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }));
  }

  goSetup(): void { this.router.navigate(['/tablet/setup']); }
}
