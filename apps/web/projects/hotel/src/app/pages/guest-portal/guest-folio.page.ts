import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, ShoppingCart, CreditCard, Copy, CheckCheck, CircleDollarSign, Wallet, AlertCircle, CheckCircle2 } from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';

@Component({
  selector: 'app-guest-folio',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, RouterLink, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="text-white/50 hover:text-white transition-colors">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <h2 class="text-lg font-bold text-white">My Bill</h2>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16">
          <div class="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      @if (!loading() && folio()) {

        <!-- Balance summary card -->
        <div class="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-5 mb-5 border border-white/10">
          <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="text-center">
              <div class="flex justify-center mb-1">
                <lucide-icon [img]="CircleDollarSignIcon" class="w-4 h-4 text-white/40"></lucide-icon>
              </div>
              <p class="text-[11px] text-white/40 mb-0.5">Total Charges</p>
              <p class="text-base font-bold text-white">₦{{ fmt(folio()!.total_charges) }}</p>
            </div>
            <div class="text-center">
              <div class="flex justify-center mb-1">
                <lucide-icon [img]="WalletIcon" class="w-4 h-4 text-emerald-400/60"></lucide-icon>
              </div>
              <p class="text-[11px] text-white/40 mb-0.5">Paid</p>
              <p class="text-base font-bold text-emerald-400">₦{{ fmt(folio()!.total_payments) }}</p>
            </div>
            <div class="text-center">
              <div class="flex justify-center mb-1">
                <lucide-icon [img]="(+folio()!.balance) > 0 ? AlertCircleIcon : CheckCircle2Icon"
                  class="w-4 h-4" [class]="(+folio()!.balance) > 0 ? 'text-red-400/60' : 'text-emerald-400/60'">
                </lucide-icon>
              </div>
              <p class="text-[11px] text-white/40 mb-0.5">Balance</p>
              <p class="text-base font-bold" [class]="(+folio()!.balance) > 0 ? 'text-red-400' : 'text-emerald-400'">
                ₦{{ fmt(folio()!.balance) }}
              </p>
            </div>
          </div>
          <div class="text-center">
            <span class="inline-flex px-3 py-1 rounded-full text-xs font-medium"
              [class]="folio()!.status === 'settled' ? 'bg-emerald-500/20 text-emerald-300' :
                       folio()!.status === 'closed'  ? 'bg-blue-500/20 text-blue-300' :
                                                       'bg-amber-500/20 text-amber-300'">
              {{ folio()!.status | titlecase }}
            </span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex bg-white/5 rounded-xl p-0.5 mb-4 border border-white/10">
          <button (click)="activeTab.set('charges')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all"
            [class]="activeTab() === 'charges'
              ? 'bg-amber-400 text-slate-900 shadow'
              : 'text-white/50 hover:text-white'">
            <lucide-icon [img]="ShoppingCartIcon" class="w-3.5 h-3.5"></lucide-icon>
            Charges
            @if (folio()!.charges?.length) {
              <span class="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                [class]="activeTab() === 'charges' ? 'bg-slate-900/20' : 'bg-white/10'">
                {{ folio()!.charges.length }}
              </span>
            }
          </button>
          <button (click)="activeTab.set('payments')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all"
            [class]="activeTab() === 'payments'
              ? 'bg-amber-400 text-slate-900 shadow'
              : 'text-white/50 hover:text-white'">
            <lucide-icon [img]="CreditCardIcon" class="w-3.5 h-3.5"></lucide-icon>
            Payments
            @if (folio()!.payments?.length) {
              <span class="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                [class]="activeTab() === 'payments' ? 'bg-slate-900/20' : 'bg-white/10'">
                {{ folio()!.payments.length }}
              </span>
            }
          </button>
        </div>

        <!-- Charges tab -->
        @if (activeTab() === 'charges') {
          <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
            @for (c of folio()!.charges; track c.id) {
              <div class="px-4 py-3 flex items-start justify-between border-b border-white/5 last:border-0">
                <div>
                  <p class="text-sm text-white/80">{{ c.description }}</p>
                  <p class="text-[11px] text-white/40">{{ c.category }} · {{ c.date | date:'dd MMM' }}</p>
                </div>
                <p class="text-sm font-semibold text-white">₦{{ fmt(+c.unit_price * c.quantity) }}</p>
              </div>
            } @empty {
              <div class="px-4 py-10 text-center">
                <lucide-icon [img]="ShoppingCartIcon" class="w-8 h-8 text-white/15 mx-auto mb-2"></lucide-icon>
                <p class="text-white/30 text-sm">No charges yet</p>
              </div>
            }
          </div>
        }

        <!-- Payments tab -->
        @if (activeTab() === 'payments') {
          <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
            @for (p of folio()!.payments; track p.id) {
              <div class="px-4 py-3 flex items-start justify-between border-b border-white/5 last:border-0">
                <div>
                  <p class="text-sm text-emerald-300 font-semibold">₦{{ fmt(p.amount) }}</p>
                  <p class="text-[11px] text-white/40">{{ p.payment_method | titlecase }} · {{ p.payment_date | date:'dd MMM HH:mm' }}</p>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full"
                  [class]="p.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'">
                  {{ p.status }}
                </span>
              </div>
            } @empty {
              <div class="px-4 py-10 text-center">
                <lucide-icon [img]="CreditCardIcon" class="w-8 h-8 text-white/15 mx-auto mb-2"></lucide-icon>
                <p class="text-white/30 text-sm">No payments recorded</p>
              </div>
            }
          </div>
        }

        <!-- Pay via bank transfer — only when balance > 0 -->
        @if (+folio()!.balance > 0 && folio()!.bank_accounts?.length) {
          <div class="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-4 mb-4">
            <h3 class="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <lucide-icon [img]="CreditCardIcon" class="w-4 h-4"></lucide-icon>
              Payment Details
            </h3>
            <p class="text-xs text-white/50 mb-4">
              Transfer <strong class="text-white">₦{{ fmt(folio()!.balance) }}</strong>
              to the account below and notify the front desk.
            </p>
            @for (acct of folio()!.bank_accounts; track acct.id) {
              <div class="bg-white/10 rounded-xl p-3 mb-2 last:mb-0">
                @if (acct.is_primary) {
                  <span class="text-[10px] text-amber-400 font-semibold mb-1 block">Primary Account</span>
                }
                <div class="space-y-1.5 text-sm">
                  <div class="flex justify-between">
                    <span class="text-white/50">Bank</span>
                    <span class="text-white font-medium">{{ acct.bank_name }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-white/50">Account No.</span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-white font-mono font-bold tracking-wider">{{ acct.account_number }}</span>
                      <button (click)="copy(acct.account_number)"
                        class="text-white/30 hover:text-amber-400 transition-colors">
                        <lucide-icon [img]="copied() === acct.account_number ? CheckCheckIcon : CopyIcon" class="w-3.5 h-3.5"></lucide-icon>
                      </button>
                    </div>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-white/50">Account Name</span>
                    <span class="text-white font-medium">{{ acct.account_name }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        @if (+folio()!.balance === 0) {
          <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <lucide-icon [img]="CheckCircle2Icon" class="w-10 h-10 text-emerald-400 mx-auto mb-2"></lucide-icon>
            <p class="text-sm font-semibold text-emerald-300">Account fully settled</p>
            <p class="text-xs text-white/40 mt-1">Thank you for staying with us!</p>
          </div>
        }
      }

      @if (!loading() && !folio()) {
        <div class="text-center py-16">
          <lucide-icon [img]="CreditCardIcon" class="w-12 h-12 text-white/15 mx-auto mb-3"></lucide-icon>
          <p class="text-white/40 text-sm">No bill found for your booking.</p>
          <p class="text-white/25 text-xs mt-1">Check back after check-in or contact the front desk.</p>
        </div>
      }
    </div>
  `,
})
export default class GuestFolioPage implements OnInit {
  private guestApi = inject(GuestApiService);

  readonly ArrowLeftIcon      = ArrowLeft;
  readonly ShoppingCartIcon   = ShoppingCart;
  readonly CreditCardIcon     = CreditCard;
  readonly CopyIcon           = Copy;
  readonly CheckCheckIcon     = CheckCheck;
  readonly CircleDollarSignIcon = CircleDollarSign;
  readonly WalletIcon         = Wallet;
  readonly AlertCircleIcon    = AlertCircle;
  readonly CheckCircle2Icon   = CheckCircle2;

  loading   = signal(true);
  folio     = signal<any | null>(null);
  activeTab = signal<'charges' | 'payments'>('charges');
  copied    = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  fmt(v: number | string): string {
    return (+v || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  copy(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(text);
      setTimeout(() => this.copied.set(null), 2000);
    }).catch(() => {});
  }

  private load(): void {
    this.guestApi.get<any>('/guest/folio').subscribe({
      next: (r: any) => {
        if (r.data?.folio) {
          this.folio.set({ ...r.data.folio, charges: r.data.charges ?? [], payments: r.data.payments ?? [], adjustments: r.data.adjustments ?? [], bank_accounts: r.data.bank_accounts ?? [] });
        } else {
          this.folio.set(r.data ?? null);
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }
}
