import {
  Component, inject, OnInit, OnDestroy, signal, computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, ActivePropertyService, HasPermDirective, TourService } from '@lodgik/shared';
import { PAGE_TOURS } from '../../services/page-tours';

interface TrackerBooking {
  id: string; booking_ref: string; booking_type: string; booking_type_label: string;
  guest_name: string; guest_phone: string; guest_email: string;
  room_number: string; room_type_name: string;
  check_in: string; check_out: string; checked_in_at: string;
  seconds_to_checkout: number; minutes_to_checkout: number;
  progress_pct: number; color_tier: string; is_overdue: boolean;
  tier_label: string; time_remaining_label: string;
  total_amount: string; folio: { id: string; balance: number; status: string } | null;
  adults: number; children: number;
}

const TIER_CONFIG: Record<string, { bg: string; border: string; badge: string; text: string; dot: string }> = {
  overdue:  { bg: 'bg-red-50',     border: 'border-red-400',    badge: 'bg-red-500 text-white',       text: 'text-red-700',    dot: 'bg-red-500'    },
  critical: { bg: 'bg-red-50',     border: 'border-red-300',    badge: 'bg-red-400 text-white',       text: 'text-red-600',    dot: 'bg-red-400'    },
  urgent:   { bg: 'bg-orange-50',  border: 'border-orange-300', badge: 'bg-orange-500 text-white',    text: 'text-orange-700', dot: 'bg-orange-500' },
  warning:  { bg: 'bg-amber-50',   border: 'border-amber-300',  badge: 'bg-amber-400 text-white',     text: 'text-amber-700',  dot: 'bg-amber-400'  },
  caution:  { bg: 'bg-yellow-50',  border: 'border-yellow-300', badge: 'bg-yellow-400 text-gray-800', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  notice:   { bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-400 text-white',      text: 'text-blue-700',   dot: 'bg-blue-400'   },
  ok:       { bg: 'bg-emerald-50', border: 'border-emerald-200',badge: 'bg-emerald-500 text-white',   text: 'text-emerald-700',dot: 'bg-emerald-500'},
};

@Component({
  selector: 'app-checkout-tracker',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, HasPermDirective],
  template: `
    <!-- Fullscreen overlay — covers sidebar + topbar when fullscreen active -->
    @if (isFullscreen()) {
      <div class="fixed inset-0 z-[9999] bg-gray-950 flex flex-col overflow-hidden">
        <!-- Fullscreen header -->
        <div class="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-white font-bold text-sm">Live Room Monitor</span>
            <span class="text-gray-400 text-xs">{{ bookings().length }} rooms checked in</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-400 text-xs">Auto-refreshes every 60s</span>
            <button (click)="load()" class="px-3 py-1.5 text-xs border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800">↺ Refresh</button>
            <button (click)="toggleFullscreen()" class="px-3 py-1.5 text-xs border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M15 15v4.5M15 15h4.5M9 15H4.5M9 15v4.5"/></svg>
              Exit Fullscreen
            </button>
          </div>
        </div>

        <!-- Fullscreen room grid -->
        @if (loading()) {
          <div class="flex-1 flex items-center justify-center">
            <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
        @if (!loading()) {
          <div class="flex-1 overflow-y-auto p-4">
            @if (bookings().length === 0) {
              <div class="flex items-center justify-center h-full text-gray-500 text-sm">No guests currently checked in</div>
            }
            <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              @for (b of bookings(); track b.id) {
                <div class="rounded-2xl border p-4 flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                     [style.border-color]="tierColor(b)"
                     [style.background]="tierBg(b)"
                     (click)="openNotify(b)">
                  <div class="flex items-start justify-between">
                    <span class="text-2xl font-black" [style.color]="tierColor(b)">{{ b.room_number }}</span>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" [style.background]="tierColor(b)">
                      {{ tierCfg(b) ? colorTierLabel(b) : '' }}
                    </span>
                  </div>
                  <p class="text-sm font-semibold text-white/90 leading-tight truncate">{{ b.guest_name }}</p>
                  <p class="text-xs text-white/50">{{ timeLabel(b) }}</p>
                  <p class="text-[11px] text-white/40 uppercase tracking-wide">{{ b.booking_type_label }}</p>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }

    <!-- Normal view (hidden when fullscreen) -->
    <ui-page-header title="Live Room Monitor" icon="monitor" subtitle="Live countdown for all checked-in guests"
      tourKey="checkout-tracker" (tourClick)="startTour()">
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 text-xs text-gray-400">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Live · refreshes every 60s
        </div>
        <button (click)="load()" class="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">↺ Refresh</button>
        <button (click)="toggleFullscreen()"
          class="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
          @if (isFullscreen()) {
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M15 15v4.5M15 15h4.5M9 15H4.5M9 15v4.5"/></svg>
            Exit
          } @else {
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
            Fullscreen
          }
        </button>
      </div>
    </ui-page-header>

    <!-- Summary strip -->
    @if (!loading() && bookings().length > 0) {
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        @for (tier of tierSummary(); track tier.key) {
          <div class="rounded-xl border px-4 py-3 flex items-center gap-3" [class]="tier.cfg.bg + ' ' + tier.cfg.border">
            <div class="w-3 h-3 rounded-full flex-shrink-0" [class]="tier.cfg.dot"></div>
            <div>
              <p class="text-xs font-medium" [class]="tier.cfg.text">{{ tier.label }}</p>
              <p class="text-xl font-bold" [class]="tier.cfg.text">{{ tier.count }}</p>
            </div>
          </div>
        }
      </div>
    }

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-5">
      <select [(ngModel)]="filterType" (ngModelChange)="applyFilters()"
        class="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white min-w-40">
        <option value="">All Types</option>
        <option value="lodge">Lodge</option>
        <option value="short_rest_1hr">Short Rest 1hr</option>
        <option value="short_rest_2hr">Short Rest 2hrs</option>
        <option value="short_rest_3hr">Short Rest 3hrs</option>
        <option value="half_day">Half Day</option>
        <option value="corporate">Corporate</option>
      </select>
      <select [(ngModel)]="filterTier" (ngModelChange)="applyFilters()"
        class="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white min-w-40">
        <option value="">All Urgency</option>
        <option value="overdue">Overdue</option>
        <option value="critical">≤ 15 min</option>
        <option value="urgent">≤ 30 min</option>
        <option value="warning">≤ 1 hr</option>
        <option value="caution">≤ 2 hrs</option>
        <option value="notice">≤ 3 hrs</option>
        <option value="ok">&gt; 3 hrs</option>
      </select>
      <div class="ml-auto text-xs text-gray-400 self-center">
        {{ filtered().length }} guest{{ filtered().length !== 1 ? 's' : '' }} checked in
      </div>
    </div>

    <ui-loading [loading]="loading()"/>

    @if (!loading() && filtered().length === 0) {
      <div class="text-center py-20">
        <div class="text-5xl mb-4">✓</div>
        <p class="text-gray-600 font-semibold">No guests currently checked in</p>
        <p class="text-gray-400 text-sm mt-1">{{ filterType || filterTier ? 'Try clearing the filters' : 'All rooms are free' }}</p>
      </div>
    }

    <!-- Tracker cards grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      @for (b of filtered(); track b.id) {
        <div class="rounded-2xl border-2 p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
             [class]="tierCfg(b).bg + ' ' + tierCfg(b).border">

          <!-- Top row: room + countdown badge -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                   [class]="'bg-white border ' + tierCfg(b).border + ' ' + tierCfg(b).text">
                {{ b.room_number }}
              </div>
              <div>
                <p class="font-bold text-gray-900 text-sm leading-tight">{{ b.guest_name }}</p>
                <p class="text-[11px] text-gray-500 mt-0.5">{{ b.room_type_name }} · {{ b.booking_type_label }}</p>
              </div>
            </div>
            <div class="flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold text-center min-w-20"
                 [class]="tierCfg(b).badge">
              @if (b.is_overdue) {
                ⚠ OVERDUE
              } @else {
                {{ countdownDisplay(b.seconds_to_checkout) }}
              }
            </div>
          </div>

          <!-- Progress bar -->
          <div>
            <div class="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>{{ formatShort(b.check_in) }}</span>
              <span class="font-medium" [class]="tierCfg(b).text">
                {{ b.is_overdue ? 'Overdue by ' + countdownDisplay(-b.seconds_to_checkout) : 'Checkout ' + formatShort(b.check_out) }}
              </span>
            </div>
            <div class="h-2 bg-white rounded-full overflow-hidden border" [class]="'border-' + tierCfg(b).dot.replace('bg-','')">
              <div class="h-full rounded-full transition-all duration-1000"
                   [class]="b.is_overdue ? 'bg-red-500' : tierCfg(b).dot"
                   [style.width.%]="b.is_overdue ? 100 : b.progress_pct">
              </div>
            </div>
          </div>

          <!-- Info row -->
          <div class="grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <p class="text-gray-400">Check-in</p>
              <p class="font-medium text-gray-700">{{ formatShort(b.checked_in_at || b.check_in) }}</p>
            </div>
            <div>
              <p class="text-gray-400">Guests</p>
              <p class="font-medium text-gray-700">{{ b.adults }}A {{ b.children > 0 ? b.children + 'C' : '' }}</p>
            </div>
            <div>
              <p class="text-gray-400">Balance</p>
              @if (b.folio) {
                <p class="font-medium" [class]="b.folio.balance > 0 ? 'text-amber-600' : 'text-emerald-600'">
                  {{ b.folio.balance > 0 ? '₦' + (b.folio.balance | number:'1.0-0') : '✓ Clear' }}
                </p>
              } @else {
                <p class="text-gray-400">—</p>
              }
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-1 border-t" [class]="'border-' + tierCfg(b).border.replace('border-','')">
            <!-- Notify -->
            <button (click)="openNotify(b)" *hasPerm="'bookings.view'"
              class="flex-1 py-2 text-[11px] font-semibold rounded-lg border transition-colors"
              [class]="'bg-white border-gray-200 ' + tierCfg(b).text + ' hover:bg-white'">
              📣 Notify
            </button>
            <!-- Extend stay — lodge bookings only -->
            @if (isLodge(b)) {
              <button (click)="openExtendUpsell(b)" *hasPerm="'bookings.extend_stay'"
                class="flex-1 py-2 text-[11px] font-semibold rounded-lg bg-white border border-gray-200 text-sage-700 hover:bg-sage-50 transition-colors">
                ⏰ Extend
              </button>
            } @else {
              <div class="flex-1"></div>
            }
            <!-- View booking -->
            <a [routerLink]="['/bookings', b.id]"
              class="flex-1 py-2 text-[11px] font-semibold rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-center">
              View →
            </a>
          </div>
        </div>
      }
    </div>

    <!-- ── Notify Modal ── -->
    @if (notifyBooking()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,.45)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 class="text-base font-bold text-gray-900">Notify Guest</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ notifyBooking()!.guest_name }} · Room {{ notifyBooking()!.room_number }}</p>
            </div>
            <button (click)="notifyBooking.set(null)" class="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">×</button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <!-- Channels -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-2">Send via</label>
              <div class="flex gap-2 flex-wrap">
                @for (ch of notifyChannelOptions; track ch.value) {
                  <button (click)="toggleChannel(ch.value)"
                    class="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
                    [class.bg-sage-100]="notifyChannels.includes(ch.value)"
                    [class.border-sage-400]="notifyChannels.includes(ch.value)"
                    [class.text-sage-700]="notifyChannels.includes(ch.value)"
                    [class.bg-gray-50]="!notifyChannels.includes(ch.value)"
                    [class.border-gray-200]="!notifyChannels.includes(ch.value)"
                    [class.text-gray-600]="!notifyChannels.includes(ch.value)">
                    {{ ch.icon }} {{ ch.label }}
                  </button>
                }
              </div>
            </div>
            <!-- Quick templates -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-2">Quick messages</label>
              <div class="flex flex-wrap gap-2">
                @for (t of notifyTemplates; track t.label) {
                  <button (click)="notifyMessage = t.message"
                    class="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 hover:border-sage-300 hover:bg-sage-50 text-gray-600 transition-colors">
                    {{ t.label }}
                  </button>
                }
              </div>
            </div>
            <!-- Message -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Message</label>
              <textarea [(ngModel)]="notifyMessage" rows="3"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-300 focus:outline-none resize-none">
              </textarea>
            </div>
          </div>
          <div class="px-6 py-4 border-t border-gray-100 flex gap-2">
            <button (click)="sendNotification()" [disabled]="sendingNotify() || !notifyMessage || !notifyChannels.length"
              class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-bold rounded-xl hover:bg-sage-700 disabled:opacity-50 flex items-center justify-center gap-2">
              @if (sendingNotify()) {
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Sending…
              } @else {
                📣 Send Notification
              }
            </button>
            <button (click)="notifyBooking.set(null)" class="px-4 py-2.5 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Extend / Upsell Modal ── -->
    @if (extendBooking()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,.45)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 class="text-base font-bold text-gray-900">Extend Stay</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ extendBooking()!.guest_name }} · Room {{ extendBooking()!.room_number }}</p>
            </div>
            <button (click)="extendBooking.set(null)" class="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">×</button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              <p class="text-amber-800 font-medium">Current checkout</p>
              <p class="text-amber-900 font-bold">{{ formatShort(extendBooking()!.check_out) }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">New Checkout Date</label>
              <input type="date" [(ngModel)]="extendDate" [min]="extendMinDate()"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-300 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Reason (optional)</label>
              <input type="text" [(ngModel)]="extendReason" placeholder="e.g. Guest requested extension"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-300 focus:outline-none">
            </div>
            <!-- Notify guest about extension -->
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" [(ngModel)]="extendNotifyGuest" class="accent-sage-600 w-4 h-4">
              <span class="text-gray-700">Also send WhatsApp/SMS about extension</span>
            </label>
          </div>
          <div class="px-6 py-4 border-t border-gray-100 flex gap-2">
            <button (click)="submitExtend()" [disabled]="!extendDate || extendingStay()"
              class="flex-1 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
              @if (extendingStay()) {
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Extending…
              } @else {
                ⏰ Confirm Extension
              }
            </button>
            <button (click)="extendBooking.set(null)" class="px-4 py-2.5 border border-gray-200 text-sm rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CheckoutTrackerPage implements OnInit, OnDestroy {
  private tour = inject(TourService);
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  loading        = signal(true);
  bookings       = signal<TrackerBooking[]>([]);
  notifyBooking  = signal<TrackerBooking | null>(null);
  extendBooking  = signal<TrackerBooking | null>(null);
  sendingNotify  = signal(false);
  extendingStay  = signal(false);

  filterType = '';
  filterTier = '';

  notifyChannels: string[] = ['sms'];
  notifyMessage  = '';
  extendDate     = '';
  extendReason   = '';
  extendNotifyGuest = true;

  private pollInterval: any;
  isFullscreen = signal(false);

  notifyChannelOptions = [
    { value: 'sms',      icon: '💬', label: 'SMS' },
    { value: 'whatsapp', icon: '📱', label: 'WhatsApp' },
    { value: 'email',    icon: '📧', label: 'Email' },
  ];

  notifyTemplates = [
    { label: '⏰ Checkout reminder',   message: 'Dear guest, this is a reminder that your checkout is approaching. Please visit reception when ready. Thank you for staying with us.' },
    { label: '💰 Balance reminder',    message: 'Dear guest, please note there is an outstanding balance on your account. Kindly visit reception to settle before checkout.' },
    { label: '🌟 Extend stay offer',   message: 'Dear guest, we would love to have you stay longer! Ask reception about extending your stay at a special rate.' },
    { label: '✅ Thank you',           message: 'Thank you for staying with us! We hope you had a wonderful experience. Safe travels and we look forward to welcoming you again.' },
  ];

  filtered = computed(() => {
    let result = this.bookings();
    if (this.filterType) result = result.filter(b => b.booking_type === this.filterType);
    if (this.filterTier) result = result.filter(b => b.color_tier === this.filterTier);
    return result;
  });

  tierSummary = computed(() => {
    const all = this.bookings();
    const tiers = [
      { key: 'overdue',  label: 'Overdue',  cfg: TIER_CONFIG['overdue']  },
      { key: 'critical', label: '≤ 15 min', cfg: TIER_CONFIG['critical'] },
      { key: 'urgent',   label: '≤ 30 min', cfg: TIER_CONFIG['urgent']   },
      { key: 'ok',       label: 'On track', cfg: TIER_CONFIG['ok']       },
    ];
    return tiers
      .map(t => ({ ...t, count: all.filter(b => t.key === 'ok' ? ['ok','notice','caution','warning'].includes(b.color_tier) : b.color_tier === t.key).length }))
      .filter(t => t.count > 0);
  });

  ngOnInit(): void {
    this.load();
    this.pollInterval = setInterval(() => this.load(), 60_000);
    document.addEventListener('fullscreenchange', this._fsListener);
  }
  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    document.removeEventListener('fullscreenchange', this._fsListener);
  }

  private _fsListener = () => this.isFullscreen.set(!!document.fullscreenElement);

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  load(): void {
    const pid = this.activeProperty.propertyId();
    if (!pid) { this.loading.set(false); return; }
    this.api.get('/bookings/checkout-tracker', { property_id: pid }).subscribe(r => {
      if (r.success) this.bookings.set(r.data ?? []);
      this.loading.set(false);
    });
  }

  applyFilters(): void {}  // computed handles it reactively

  tierCfg(b: TrackerBooking) { return TIER_CONFIG[b.color_tier] ?? TIER_CONFIG['ok']; }

  private static readonly TIER_HEX: Record<string, { color: string; bg: string }> = {
    overdue:  { color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
    critical: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
    urgent:   { color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
    warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    caution:  { color: '#eab308', bg: 'rgba(234,179,8,0.12)'   },
    notice:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
    ok:       { color: '#34d399', bg: 'rgba(52,211,153,0.10)'  },
  };

  colorTierLabel(b: TrackerBooking): string {
    const labels: Record<string, string> = {
      overdue: 'Overdue', critical: '< 15m', urgent: '< 30m',
      warning: '< 1h', caution: '< 2h', notice: '< 4h', ok: 'On time',
    };
    return labels[b.color_tier] ?? b.color_tier;
  }

  timeLabel(b: TrackerBooking): string {
    if (b.is_overdue) return 'Overdue';
    const m = b.minutes_to_checkout;
    if (m < 60) return `${m}m left`;
    return `${Math.floor(m / 60)}h ${m % 60}m left`;
  }

  tierColor(b: TrackerBooking): string {
    return CheckoutTrackerPage.TIER_HEX[b.color_tier]?.color ?? '#34d399';
  }

  tierBg(b: TrackerBooking): string {
    return CheckoutTrackerPage.TIER_HEX[b.color_tier]?.bg ?? 'rgba(52,211,153,0.10)';
  }

  countdownDisplay(seconds: number): string {
    const abs = Math.abs(seconds);
    const d   = Math.floor(abs / 86400);
    const h   = Math.floor((abs % 86400) / 3600);
    const m   = Math.floor((abs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  formatShort(dt: string): string {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleString('en-NG', { weekday:'short', hour:'2-digit', minute:'2-digit', hour12:true, day:'numeric', month:'short' });
  }

  isLodge(b: TrackerBooking): boolean {
    return ['lodge', 'corporate', 'overnight'].includes(b.booking_type);
  }

  toggleChannel(ch: string): void {
    const idx = this.notifyChannels.indexOf(ch);
    idx >= 0 ? this.notifyChannels.splice(idx, 1) : this.notifyChannels.push(ch);
  }

  openNotify(b: TrackerBooking): void {
    this.notifyBooking.set(b);
    this.notifyMessage  = '';
    this.notifyChannels = ['sms'];
  }

  sendNotification(): void {
    const b = this.notifyBooking();
    if (!b || !this.notifyMessage || !this.notifyChannels.length) return;
    this.sendingNotify.set(true);
    this.api.post(`/bookings/${b.id}/notify-guest`, {
      channels: this.notifyChannels,
      message:  this.notifyMessage,
    }).subscribe(r => {
      this.sendingNotify.set(false);
      if (r.success) {
        const sent = r.data?.sent?.join(', ') || 'none';
        this.toast.success(`Notification sent via: ${sent}`);
        if (r.data?.failed?.length) this.toast.error(`Failed: ${r.data.failed.join(', ')}`);
        this.notifyBooking.set(null);
      } else {
        this.toast.error(r.message || 'Failed to send');
      }
    });
  }

  openExtendUpsell(b: TrackerBooking): void {
    this.extendBooking.set(b);
    const co = new Date(b.check_out);
    co.setDate(co.getDate() + 1);
    this.extendDate   = co.toISOString().slice(0, 10);
    this.extendReason = '';
    this.extendNotifyGuest = true;
  }

  extendMinDate(): string {
    const b = this.extendBooking();
    if (!b) return '';
    const co = new Date(b.check_out);
    co.setDate(co.getDate() + 1);
    return co.toISOString().slice(0, 10);
  }

  submitExtend(): void {
    const b = this.extendBooking();
    if (!b || !this.extendDate) return;
    this.extendingStay.set(true);
    this.api.post(`/bookings/${b.id}/extend-checkout`, {
      new_checkout_date: this.extendDate,
      reason:            this.extendReason || undefined,
    }).subscribe(r => {
      this.extendingStay.set(false);
      if (r.success) {
        this.toast.success('Stay extended successfully');
        if (this.extendNotifyGuest) {
          this.api.post(`/bookings/${b.id}/notify-guest`, {
            channels: ['sms', 'whatsapp'],
            message:  `Great news! Your stay has been extended to ${this.extendDate}. Please visit reception if you have any questions.`,
          }).subscribe();
        }
        this.extendBooking.set(null);
        this.load();
      } else {
        this.toast.error(r.message || 'Failed to extend');
      }
    });
  }

  startTour(): void {
    this.tour.start(PAGE_TOURS['checkout-tracker'] ?? [], 'checkout-tracker');
  }
}
