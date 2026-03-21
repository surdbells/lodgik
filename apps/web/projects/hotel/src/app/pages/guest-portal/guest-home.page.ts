import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  Receipt, ConciergeBell, MessageCircle, DoorOpen,
  CircleDollarSign, Wallet, AlertCircle, CheckCircle2, Moon,
  Users, CalendarPlus, SlidersHorizontal, SearchX, Info, Sparkles,
} from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

const QUICK_ACTIONS = [
  { label: 'My Bill',       icon: 'receipt',      route: '/guest/folio',          color: 'text-amber-400' },
  { label: 'Room Service',  icon: 'bell',         route: '/guest/services',       color: 'text-amber-400' },
  { label: 'Chat Staff',    icon: 'chat',         route: '/guest/chat',           color: 'text-amber-400' },
  { label: 'Restaurant',     icon: 'utensils',     route: '/guest/restaurant',     color: 'text-orange-400' },
  { label: 'Visitors',      icon: 'users',        route: '/guest/visitor-codes',  color: 'text-blue-400'  },
  { label: 'Notify Contacts', icon: 'shield',    route: '/guest/stay-notifications', color: 'text-green-400' },
  { label: 'Extend Stay',   icon: 'calendar',     route: '/guest/stay-extension', color: 'text-purple-400' },
  { label: 'Room Controls', icon: 'sliders',      route: '/guest/room-controls',  color: 'text-emerald-400' },
  { label: 'Lost & Found',  icon: 'searchx',      route: '/guest/lost-found',     color: 'text-pink-400'  },
  { label: 'Hotel Info',    icon: 'info',         route: '/guest/hotel-info',     color: 'text-cyan-400'  },
  { label: 'Spa & Gym',     icon: 'sparkles',     route: '/guest/spa',            color: 'text-rose-400'  },
  { label: 'Preferences',   icon: 'sliders', route: '/guest/preferences', color: 'text-violet-400' },
  { label: 'Stay Alert',    icon: 'bell',         route: '/guest/stay-notifications', color: 'text-orange-400' },
  { label: 'Check Out',     icon: 'dooropen',     route: '/guest/checkout',       color: 'text-red-400'   },
];

@Component({
  selector: 'app-guest-home',
  standalone: true,
  imports: [DatePipe, RouterLink, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Greeting -->
      <div class="mb-6">
        <h2 class="text-xl font-bold" [class]="th.text()">
          {{ greeting() }}, {{ session()?.guest?.name?.split(' ')[0] ?? 'Guest' }} 👋
        </h2>
        <p class="text-sm mt-0.5" [class]="th.muted()">Welcome to your stay</p>
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

      <!-- Balance summary -->
      @if (loading()) {
        <div class="flex items-center justify-center py-6">
          <div class="w-5 h-5 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
        </div>
      }

      @if (!loading() && folio()) {
        <div class="rounded-2xl p-4 mb-5" [class]="th.card()">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold" [class]="th.muted()">Account Balance</p>
            <a routerLink="/guest/folio" class="text-xs transition-colors" [class]="th.accent()">
              View details →
            </a>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <div class="flex items-center gap-1 mb-0.5">
                <lucide-icon [img]="CircleDollarSignIcon" class="w-3 h-3" [class]="th.subtle()"></lucide-icon>
                <p class="text-[10px]" [class]="th.subtle()">Total</p>
              </div>
              <p class="text-sm font-bold" [class]="th.text()">₦{{ fmt(folio()!.total_charges) }}</p>
            </div>
            <div>
              <div class="flex items-center gap-1 mb-0.5">
                <lucide-icon [img]="WalletIcon" class="w-3 h-3 text-emerald-400/70"></lucide-icon>
                <p class="text-[10px]" [class]="th.subtle()">Paid</p>
              </div>
              <p class="text-sm font-bold text-emerald-400">₦{{ fmt(folio()!.total_payments) }}</p>
            </div>
            <div>
              <div class="flex items-center gap-1 mb-0.5">
                <lucide-icon [img]="(+folio()!.balance) > 0 ? AlertCircleIcon : CheckCircle2Icon"
                  class="w-3 h-3" [class]="(+folio()!.balance) > 0 ? 'text-red-400/70' : 'text-emerald-400/70'">
                </lucide-icon>
                <p class="text-[10px]" [class]="th.subtle()">Balance</p>
              </div>
              <p class="text-sm font-bold" [class]="(+folio()!.balance) > 0 ? 'text-red-400' : 'text-emerald-400'">
                ₦{{ fmt(folio()!.balance) }}
              </p>
            </div>
          </div>
          @if (+folio()!.balance > 0) {
            <div class="mt-3 rounded-xl p-3" [class]="th.accentBg()">
              <p class="text-xs font-medium" [class]="th.accentText()">Payment due</p>
              <p class="text-xs mt-0.5" [class]="th.isDark() ? 'text-amber-200/60' : 'text-amber-700/70'">
                Please view your bill for payment details.
              </p>
            </div>
          }
        </div>
      }

      <!-- Quick actions grid -->
      <div class="mb-2">
        <p class="text-xs font-semibold uppercase tracking-wide mb-3" [class]="th.muted()">Quick Actions</p>
        <div class="grid grid-cols-4 gap-2.5">
          @for (a of actions; track a.route) {
            <a [routerLink]="a.route"
               class="rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all active:scale-95 relative"
               [class]="th.cardHover()">
              <lucide-icon [img]="iconFor(a.icon)" class="w-5 h-5" [class]="a.color"></lucide-icon>
              @if (a.icon === 'chat' && chatUnread() > 0) {
                <span class="absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full px-1 leading-none">
                  {{ chatUnread() > 9 ? '9+' : chatUnread() }}
                </span>
              }
              <span class="text-[10px] font-medium text-center leading-tight" [class]="th.muted()">{{ a.label }}</span>
            </a>
          }
        </div>
      </div>

    </div>
  `,
})
export default class GuestHomePage implements OnInit {
  private guestApi = inject(GuestApiService);
  readonly th      = inject(GuestThemeService);

  readonly ReceiptIcon          = Receipt;
  readonly ConciergeBellIcon    = ConciergeBell;
  readonly MessageCircleIcon    = MessageCircle;
  readonly DoorOpenIcon         = DoorOpen;
  readonly CircleDollarSignIcon = CircleDollarSign;
  readonly WalletIcon           = Wallet;
  readonly AlertCircleIcon      = AlertCircle;
  readonly CheckCircle2Icon     = CheckCircle2;
  readonly MoonIcon             = Moon;
  readonly UsersIcon            = Users;
  readonly CalendarPlusIcon     = CalendarPlus;
  readonly SlidersHorizontalIcon = SlidersHorizontal;
  readonly SearchXIcon          = SearchX;
  readonly InfoIcon             = Info;
  readonly SparklesIcon         = Sparkles;

  readonly actions = QUICK_ACTIONS;

  session      = signal<any | null>(null);
  folio        = signal<any | null>(null);
  chatUnread   = signal(0);
  private chatTimer: any;
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

  iconFor(key: string): any {
    const map: Record<string, any> = {
      receipt:  Receipt,
      bell:     ConciergeBell,
      chat:     MessageCircle,
      users:    Users,
      calendar: CalendarPlus,
      sliders:  SlidersHorizontal,
      searchx:  SearchX,
      info:     Info,
      sparkles: Sparkles,
      dooropen: DoorOpen,
    };
    return map[key] ?? Info;
  }

  ngOnDestroy(): void { clearInterval(this.chatTimer); }

  ngOnInit(): void {
    const stored = localStorage.getItem('guest_session');
    if (stored) { try { this.session.set(JSON.parse(stored)); } catch {} }
    this.loadFolio();
    this.loadChatUnread();
    this.chatTimer = setInterval(() => this.loadChatUnread(), 20_000);
  }

  private loadChatUnread(): void {
    this.guestApi.get('/guest/chat/unread').subscribe({
      next: (r: any) => this.chatUnread.set(r?.data?.unread ?? 0),
      error: () => {},
    });
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
      error: () => this.loading.set(false),
    });
  }
}
