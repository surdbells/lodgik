import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Receipt, ConciergeBell, MessageCircle, DoorOpen, CircleDollarSign, Wallet, AlertCircle, CheckCircle2, Moon } from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';

@Component({
  selector: 'app-guest-home',
  standalone: true,
  imports: [DatePipe, RouterLink, LucideAngularModule],
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
              <p class="text-lg font-black">{{ session()!.booking!.room_number ?? '—' }}</p>
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
            <div class="flex items-center gap-1.5">
              <lucide-icon [img]="MoonIcon" class="w-3.5 h-3.5 opacity-70"></lucide-icon>
              <div>
                <p class="text-[11px] opacity-70">Nights left</p>
                <p class="font-semibold">{{ nightsLeft() }}</p>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Quick actions -->
      <div class="grid grid-cols-2 gap-3 mb-5">
        <a routerLink="/guest/folio"
           class="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-4
                  flex flex-col items-center gap-2 transition-all active:scale-95">
          <lucide-icon [img]="ReceiptIcon" class="w-6 h-6 text-amber-400"></lucide-icon>
          <span class="text-xs font-medium text-white/80">My Bill</span>
        </a>
        <a routerLink="/guest/services"
           class="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-4
                  flex flex-col items-center gap-2 transition-all active:scale-95">
          <lucide-icon [img]="ConciergeBellIcon" class="w-6 h-6 text-amber-400"></lucide-icon>
          <span class="text-xs font-medium text-white/80">Room Service</span>
        </a>
        <a routerLink="/guest/chat"
           class="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-4
                  flex flex-col items-center gap-2 transition-all active:scale-95">
          <lucide-icon [img]="MessageCircleIcon" class="w-6 h-6 text-amber-400"></lucide-icon>
          <span class="text-xs font-medium text-white/80">Chat Staff</span>
        </a>
        <a routerLink="/guest/checkout"
           class="bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-4
                  flex flex-col items-center gap-2 transition-all active:scale-95">
          <lucide-icon [img]="DoorOpenIcon" class="w-6 h-6 text-amber-400"></lucide-icon>
          <span class="text-xs font-medium text-white/80">Checkout</span>
        </a>
      </div>

      <!-- Balance summary -->
      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div class="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      @if (!loading() && folio()) {
        <div class="bg-white/10 border border-white/10 rounded-2xl p-4 mb-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold text-white/80">Account Balance</p>
            <a routerLink="/guest/folio" class="text-amber-400 text-xs hover:text-amber-300 transition-colors">
              View details →
            </a>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <div class="flex items-center gap-1 mb-0.5">
                <lucide-icon [img]="CircleDollarSignIcon" class="w-3 h-3 text-white/30"></lucide-icon>
                <p class="text-[10px] text-white/40">Total</p>
              </div>
              <p class="text-sm font-bold text-white">₦{{ fmt(folio()!.total_charges) }}</p>
            </div>
            <div>
              <div class="flex items-center gap-1 mb-0.5">
                <lucide-icon [img]="WalletIcon" class="w-3 h-3 text-emerald-400/60"></lucide-icon>
                <p class="text-[10px] text-white/40">Paid</p>
              </div>
              <p class="text-sm font-bold text-emerald-400">₦{{ fmt(folio()!.total_payments) }}</p>
            </div>
            <div>
              <div class="flex items-center gap-1 mb-0.5">
                <lucide-icon [img]="(+folio()!.balance) > 0 ? AlertCircleIcon : CheckCircle2Icon"
                  class="w-3 h-3" [class]="(+folio()!.balance) > 0 ? 'text-red-400/60' : 'text-emerald-400/60'">
                </lucide-icon>
                <p class="text-[10px] text-white/40">Balance</p>
              </div>
              <p class="text-sm font-bold" [class]="(+folio()!.balance) > 0 ? 'text-red-400' : 'text-emerald-400'">
                ₦{{ fmt(folio()!.balance) }}
              </p>
            </div>
          </div>
          @if (+folio()!.balance > 0) {
            <div class="mt-3 bg-amber-400/20 border border-amber-400/30 rounded-xl p-3">
              <p class="text-xs text-amber-300 font-medium">Payment due</p>
              <p class="text-xs text-amber-200/70 mt-0.5">Please view your bill for payment details.</p>
            </div>
          }
        </div>
      }

    </div>
  `,
})
export default class GuestHomePage implements OnInit {
  private guestApi = inject(GuestApiService);

  readonly ReceiptIcon        = Receipt;
  readonly ConciergeBellIcon  = ConciergeBell;
  readonly MessageCircleIcon  = MessageCircle;
  readonly DoorOpenIcon       = DoorOpen;
  readonly CircleDollarSignIcon = CircleDollarSign;
  readonly WalletIcon         = Wallet;
  readonly AlertCircleIcon    = AlertCircle;
  readonly CheckCircle2Icon   = CheckCircle2;
  readonly MoonIcon           = Moon;

  session = signal<any | null>(null);
  folio   = signal<any | null>(null);
  loading = signal(true);

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  });

  readonly nightsLeft = computed(() => {
    const s = this.session();
    if (!s?.booking?.check_out) return 0;
    return Math.max(0, Math.ceil((new Date(s.booking.check_out).getTime() - Date.now()) / 86_400_000));
  });

  ngOnInit(): void {
    const stored = localStorage.getItem('guest_session');
    if (stored) { try { this.session.set(JSON.parse(stored)); } catch {} }
    this.loadFolio();
  }

  fmt(v: number | string): string {
    return (+v || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  private loadFolio(): void {
    if (!this.session()?.booking?.id) { this.loading.set(false); return; }
    this.guestApi.get<any>('/guest/folio').subscribe({
      next: (r: any) => {
        this.folio.set(r.data?.folio ? { ...r.data.folio, ...r.data } : (r.data ?? null));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }
}
