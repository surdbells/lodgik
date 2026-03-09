import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  Receipt, ConciergeBell, MessageCircle, DoorOpen, CircleDollarSign,
  Wallet, AlertCircle, CheckCircle2, Moon, Users, CalendarPlus,
  SlidersHorizontal, SearchX, Info, Sparkles,
} from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

const ACTIONS = [
  { label: 'My Bill',        icon: 'receipt',    route: '/guest/folio'          },
  { label: 'Room Service',   icon: 'concierge',  route: '/guest/services'       },
  { label: 'Chat Staff',     icon: 'chat',       route: '/guest/chat'           },
  { label: 'Check Out',      icon: 'door',       route: '/guest/checkout'       },
  { label: 'Visitor Codes',  icon: 'users',      route: '/guest/visitor-codes'  },
  { label: 'Extend Stay',    icon: 'calendar',   route: '/guest/stay-extension' },
  { label: 'Room Controls',  icon: 'sliders',    route: '/guest/room-controls'  },
  { label: 'Lost & Found',   icon: 'search',     route: '/guest/lost-found'     },
  { label: 'Hotel Info',     icon: 'info',       route: '/guest/hotel-info'     },
  { label: 'Spa & Gym',      icon: 'sparkles',   route: '/guest/spa'            },
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
          {{ greeting() }}, {{ firstName() }} 👋
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

      <!-- Quick actions grid -->
      <div class="grid grid-cols-4 gap-2.5 mb-5">
        @for (action of visibleActions(); track action.route) {
          <a [routerLink]="action.route"
             class="rounded-2xl p-3 flex flex-col items-center gap-2 transition-all active:scale-95"
             [class]="th.cardHover()">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-400/20">
              <lucide-icon [img]="iconFor(action.icon)" class="w-5 h-5 text-amber-400"></lucide-icon>
            </div>
            <span class="text-[10px] font-medium text-center leading-tight" [class]="th.muted()">
              {{ action.label }}
            </span>
          </a>
        }
        @if (!showAll() && ACTIONS.length > 8) {
          <button (click)="showAll.set(true)"
            class="rounded-2xl p-3 flex flex-col items-center gap-2 transition-all active:scale-95"
            [class]="th.cardHover()">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" [class]="th.iconCircle()">
              <span class="text-lg font-bold" [class]="th.muted()">+{{ ACTIONS.length - 8 }}</span>
            </div>
            <span class="text-[10px] font-medium" [class]="th.muted()">More</span>
          </button>
        }
      </div>

      <!-- Balance summary -->
      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div class="w-6 h-6 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
        </div>
      }

      @if (!loading() && folio()) {
        <div class="rounded-2xl p-4 mb-4" [class]="th.card()">
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
                <lucide-icon [img]="WalletIcon" class="w-3 h-3 text-emerald-400/60"></lucide-icon>
                <p class="text-[10px]" [class]="th.subtle()">Paid</p>
              </div>
              <p class="text-sm font-bold text-emerald-400">₦{{ fmt(folio()!.total_payments) }}</p>
            </div>
            <div>
              <div class="flex items-center gap-1 mb-0.5">
                <lucide-icon
                  [img]="(+folio()!.balance) > 0 ? AlertCircleIcon : CheckCircle2Icon"
                  class="w-3 h-3"
                  [class]="(+folio()!.balance) > 0 ? 'text-red-400/60' : 'text-emerald-400/60'">
                </lucide-icon>
                <p class="text-[10px]" [class]="th.subtle()">Balance</p>
              </div>
              <p class="text-sm font-bold"
                [class]="(+folio()!.balance) > 0 ? 'text-red-400' : 'text-emerald-400'">
                ₦{{ fmt(folio()!.balance) }}
              </p>
            </div>
          </div>
          @if (+folio()!.balance > 0) {
            <div class="mt-3 rounded-xl p-3" [class]="th.accentBg()">
              <p class="text-xs font-medium" [class]="th.accentText()">Payment due</p>
              <p class="text-xs mt-0.5 opacity-80" [class]="th.accentText()">
                View your bill for bank details and payment instructions.
              </p>
            </div>
          }
        </div>
      }

    </div>
  `,
})
export default class GuestHomePage implements OnInit {
  private guestApi = inject(GuestApiService);
  readonly th      = inject(GuestThemeService);

  readonly ACTIONS = ACTIONS;

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

  session  = signal<any | null>(null);
  folio    = signal<any | null>(null);
  loading  = signal(true);
  showAll  = signal(false);

  readonly firstName = computed(() =>
    this.session()?.guest?.name?.split(' ')[0] ?? 'Guest'
  );

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

  readonly visibleActions = computed(() =>
    this.showAll() ? ACTIONS : ACTIONS.slice(0, 8)
  );

  ngOnInit(): void {
    const stored = localStorage.getItem('guest_session');
    if (stored) { try { this.session.set(JSON.parse(stored)); } catch {} }
    this.loadFolio();
  }

  iconFor(icon: string): any {
    const map: Record<string, any> = {
      receipt:  this.ReceiptIcon,
      concierge: this.ConciergeBellIcon,
      chat:     this.MessageCircleIcon,
      door:     this.DoorOpenIcon,
      users:    this.UsersIcon,
      calendar: this.CalendarPlusIcon,
      sliders:  this.SlidersHorizontalIcon,
      search:   this.SearchXIcon,
      info:     this.InfoIcon,
      sparkles: this.SparklesIcon,
    };
    return map[icon] ?? this.InfoIcon;
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
