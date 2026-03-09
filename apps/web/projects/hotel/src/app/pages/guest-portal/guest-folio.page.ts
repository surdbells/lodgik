import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft, ShoppingCart, CreditCard, Copy, CheckCheck,
  CircleDollarSign, Wallet, AlertCircle, CheckCircle2,
} from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-folio',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, RouterLink, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <h2 class="text-lg font-bold" [class]="th.text()">My Bill</h2>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16">
          <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
        </div>
      }

      @if (!loading() && folio()) {

        <!-- Balance summary card -->
        <div class="rounded-2xl p-5 mb-5" [class]="th.card()">
          <div class="grid grid-cols-3 gap-3 mb-4">
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <lucide-icon [img]="CircleDollarSignIcon" class="w-3.5 h-3.5" [class]="th.subtle()"></lucide-icon>
                <p class="text-[11px]" [class]="th.subtle()">Total Charges</p>
              </div>
              <p class="text-lg font-black" [class]="th.text()">₦{{ fmt(folio()!.total_charges) }}</p>
            </div>
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <lucide-icon [img]="WalletIcon" class="w-3.5 h-3.5 text-emerald-400/60"></lucide-icon>
                <p class="text-[11px]" [class]="th.subtle()">Paid</p>
              </div>
              <p class="text-lg font-black text-emerald-400">₦{{ fmt(folio()!.total_payments) }}</p>
            </div>
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <lucide-icon
                  [img]="(+folio()!.balance) > 0 ? AlertCircleIcon : CheckCircle2Icon"
                  class="w-3.5 h-3.5"
                  [class]="(+folio()!.balance) > 0 ? 'text-red-400/60' : 'text-emerald-400/60'">
                </lucide-icon>
                <p class="text-[11px]" [class]="th.subtle()">Balance Due</p>
              </div>
              <p class="text-lg font-black"
                [class]="(+folio()!.balance) > 0 ? 'text-red-400' : 'text-emerald-400'">
                ₦{{ fmt(folio()!.balance) }}
              </p>
            </div>
          </div>

          <!-- Status pill -->
          <div class="flex justify-center">
            <span class="text-xs font-semibold px-3 py-1 rounded-full"
              [class]="folio()!.status === 'paid'
                ? (th.isDark() ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                : (th.isDark() ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')">
              {{ folio()!.status | titlecase }}
            </span>
          </div>
        </div>

        <!-- Payment info (bank details) -->
        @if ((+folio()!.balance) > 0 && bankAccounts().length > 0) {
          <div class="rounded-2xl p-5 mb-5" [class]="th.accentBg()">
            <div class="flex items-center gap-2 mb-3">
              <lucide-icon [img]="CreditCardIcon" class="w-4 h-4" [class]="th.accentText()"></lucide-icon>
              <p class="text-sm font-bold" [class]="th.accentText()">Payment Instructions</p>
            </div>
            <p class="text-xs mb-3 opacity-80" [class]="th.accentText()">
              Transfer ₦{{ fmt(folio()!.balance) }} to any of the accounts below,
              then inform the front desk with your reference.
            </p>
            @for (account of bankAccounts(); track account.id) {
              <div class="rounded-xl p-3 mb-2" [class]="th.cardSubtle()">
                <p class="text-xs font-semibold mb-1.5" [class]="th.text()">{{ account.bank_name }}</p>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-base font-black font-mono tracking-widest" [class]="th.text()">
                      {{ account.account_number }}
                    </p>
                    <p class="text-xs" [class]="th.muted()">{{ account.account_name }}</p>
                  </div>
                  <button (click)="copyAccount(account.account_number)"
                    class="flex items-center gap-1 text-xs transition-colors" [class]="th.accent()">
                    @if (copiedAccount() === account.account_number) {
                      <lucide-icon [img]="CheckCheckIcon" class="w-3.5 h-3.5"></lucide-icon>
                      Copied
                    } @else {
                      <lucide-icon [img]="CopyIcon" class="w-3.5 h-3.5"></lucide-icon>
                      Copy
                    }
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Tabs: Charges | Payments -->
        <div class="flex rounded-xl p-0.5 mb-4" [class]="th.isDark() ? 'bg-white/5' : 'bg-gray-100'">
          <button (click)="activeTab.set('charges')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all"
            [class]="activeTab() === 'charges'
              ? 'bg-amber-400 text-slate-900 shadow-sm'
              : th.muted()">
            <lucide-icon [img]="ShoppingCartIcon" class="w-4 h-4"></lucide-icon>
            Charges
          </button>
          <button (click)="activeTab.set('payments')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all"
            [class]="activeTab() === 'payments'
              ? 'bg-amber-400 text-slate-900 shadow-sm'
              : th.muted()">
            <lucide-icon [img]="WalletIcon" class="w-4 h-4"></lucide-icon>
            Payments
          </button>
        </div>

        <!-- Charges list -->
        @if (activeTab() === 'charges') {
          @if (charges().length === 0) {
            <p class="text-center text-sm py-10" [class]="th.muted()">No charges posted yet.</p>
          }
          @for (charge of charges(); track charge.id) {
            <div class="flex items-start justify-between py-3 border-b" [class]="th.divider()">
              <div class="flex-1 pr-4">
                <p class="text-sm font-medium" [class]="th.text()">{{ charge.description }}</p>
                <p class="text-xs mt-0.5" [class]="th.subtle()">
                  {{ charge.created_at | date:'dd MMM, HH:mm' }}
                  · {{ charge.charge_type | titlecase }}
                </p>
              </div>
              <p class="text-sm font-bold shrink-0" [class]="th.text()">₦{{ fmt(charge.amount) }}</p>
            </div>
          }
        }

        <!-- Payments list -->
        @if (activeTab() === 'payments') {
          @if (payments().length === 0) {
            <p class="text-center text-sm py-10" [class]="th.muted()">No payments recorded yet.</p>
          }
          @for (payment of payments(); track payment.id) {
            <div class="flex items-start justify-between py-3 border-b" [class]="th.divider()">
              <div class="flex-1 pr-4">
                <p class="text-sm font-medium text-emerald-400">₦{{ fmt(payment.amount) }}</p>
                <p class="text-xs mt-0.5" [class]="th.subtle()">
                  {{ payment.payment_method | titlecase }}
                  @if (payment.reference) { · Ref: {{ payment.reference }} }
                </p>
                <p class="text-xs" [class]="th.subtle()">{{ payment.payment_date | date:'dd MMM, HH:mm' }}</p>
              </div>
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                [class]="th.isDark() ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'">
                Received
              </span>
            </div>
          }
        }

      }

      @if (!loading() && !folio()) {
        <div class="text-center py-16">
          <p class="text-sm" [class]="th.muted()">No folio found for your booking.</p>
          <p class="text-xs mt-2" [class]="th.subtle()">Please contact the front desk if you believe this is an error.</p>
        </div>
      }

    </div>
  `,
})
export default class GuestFolioPage implements OnInit {
  private guestApi = inject(GuestApiService);
  readonly th      = inject(GuestThemeService);

  readonly ArrowLeftIcon       = ArrowLeft;
  readonly ShoppingCartIcon    = ShoppingCart;
  readonly CreditCardIcon      = CreditCard;
  readonly CopyIcon            = Copy;
  readonly CheckCheckIcon      = CheckCheck;
  readonly CircleDollarSignIcon = CircleDollarSign;
  readonly WalletIcon          = Wallet;
  readonly AlertCircleIcon     = AlertCircle;
  readonly CheckCircle2Icon    = CheckCircle2;

  folio        = signal<any | null>(null);
  charges      = signal<any[]>([]);
  payments     = signal<any[]>([]);
  bankAccounts = signal<any[]>([]);
  loading      = signal(true);
  activeTab    = signal<'charges' | 'payments'>('charges');
  copiedAccount = signal<string | null>(null);

  ngOnInit(): void {
    this.guestApi.get<any>('/guest/folio').subscribe({
      next: (r: any) => {
        const d = r.data ?? {};
        this.folio.set(d.folio ?? d);
        this.charges.set(d.charges ?? []);
        this.payments.set(d.payments ?? []);
        this.bankAccounts.set(d.bank_accounts ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  fmt(v: any): string {
    return (+v || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  copyAccount(number: string): void {
    navigator.clipboard.writeText(number).then(() => {
      this.copiedAccount.set(number);
      setTimeout(() => this.copiedAccount.set(null), 2000);
    }).catch(() => {});
  }
}
