import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '@lodgik/shared';
import { HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-guest-home',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Greeting -->
      <div class="mb-6">
        <h2 class="text-xl font-bold text-white">
          {{ greeting() }}, {{ session()?.guest?.name?.split(' ')[0] ?? 'Guest' }} 👋
        </h2>
        <p class="text-white/50 text-sm mt-0.5">Welcome to your stay</p>
      </div>

      <!-- Booking card -->
      @if (session()?.booking) {
        <div class="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-5 mb-5 shadow-lg text-slate-900">
          <div class="flex items-start justify-between mb-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-widest opacity-70">Booking Ref</p>
              <p class="text-lg font-black font-mono">{{ session()!.booking!.ref }}</p>
            </div>
            <div class="bg-slate-900/20 rounded-xl px-3 py-1.5 text-center">
              <p class="text-xs font-semibold opacity-80">Room</p>
              <p class="text-lg font-black">{{ roomNumber() ?? '—' }}</p>
            </div>
          </div>
          <div class="flex gap-4 text-sm">
            <div>
              <p class="text-[11px] opacity-70">Check-in</p>
              <p class="font-semibold">{{ session()!.booking!.check_in | date:'dd MMM' }}</p>
            </div>
            <div>
              <p class="text-[11px] opacity-70">Check-out</p>
              <p class="font-semibold">{{ session()!.booking!.check_out | date:'dd MMM' }}</p>
            </div>
            <div>
              <p class="text-[11px] opacity-70">Nights</p>
              <p class="font-semibold">{{ nightsLeft() }}</p>
            </div>
          </div>
        </div>
      }

      <!-- Quick actions -->
      <div class="grid grid-cols-2 gap-3 mb-5">
        @for (action of quickActions; track action.label) {
          <a [routerLink]="action.route"
             class="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95">
            <span class="text-2xl">{{ action.icon }}</span>
            <span class="text-xs font-medium text-white/80">{{ action.label }}</span>
          </a>
        }
      </div>

      <!-- Balance summary -->
      @if (folio()) {
        <div class="bg-white/10 border border-white/10 rounded-2xl p-4 mb-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold text-white/80">Account Balance</p>
            <a routerLink="/guest/folio" class="text-amber-400 text-xs hover:text-amber-300">View details →</a>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-white/40">Total charges</p>
              <p class="text-base font-bold text-white">₦{{ (+folio()!.total_charges).toLocaleString() }}</p>
            </div>
            <div>
              <p class="text-xs text-white/40">Balance due</p>
              <p class="text-base font-bold" [class]="(+folio()!.balance) > 0 ? 'text-red-400' : 'text-emerald-400'">
                ₦{{ (+folio()!.balance).toLocaleString() }}
              </p>
            </div>
          </div>
          @if (+folio()!.balance > 0) {
            <div class="mt-3 bg-amber-400/20 border border-amber-400/30 rounded-xl p-3">
              <p class="text-xs text-amber-300 font-medium">Payment due</p>
              <p class="text-xs text-amber-200/70 mt-0.5">Please visit the front desk or view bill for bank details.</p>
            </div>
          }
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="flex items-center justify-center py-10">
          <div class="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    </div>
  `,
})
export default class GuestHomePage implements OnInit {
  private api = inject(ApiService);

  session = signal<any | null>(null);
  folio   = signal<any | null>(null);
  loading = signal(true);

  readonly quickActions = [
    { icon: '🧾', label: 'My Bill',      route: '/guest/folio' },
    { icon: '🛎️', label: 'Room Service', route: '/guest/services' },
    { icon: '💬', label: 'Chat Staff',   route: '/guest/chat' },
    { icon: '🔑', label: 'Checkout',     route: '/guest/checkout' },
  ];

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  });

  readonly roomNumber = computed(() => this.session()?.booking?.room_number ?? null);

  readonly nightsLeft = computed(() => {
    const s = this.session();
    if (!s?.booking?.check_out) return 0;
    const diff = new Date(s.booking.check_out).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86_400_000));
  });

  ngOnInit(): void {
    const stored = localStorage.getItem('guest_session');
    if (stored) {
      try { this.session.set(JSON.parse(stored)); } catch {}
    }
    this.loadFolio();
  }

  private loadFolio(): void {
    const bookingId = this.session()?.booking?.id;
    if (!bookingId) { this.loading.set(false); return; }
    this.api.get('/guest/folio').subscribe({
      next: (r: any) => { this.folio.set(r.data ?? null); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private guestHeaders(): Record<string, string> {
    const token = localStorage.getItem('guest_token') ?? '';
    return { Authorization: `Bearer ${token}` };
  }
}
