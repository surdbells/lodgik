import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft, ReceiptText, Wallet, AlertTriangle, LogOut, CheckCircle2,
} from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-checkout',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div class="flex items-center gap-2">
          <lucide-icon [img]="LogOutIcon" class="w-5 h-5 text-amber-400"></lucide-icon>
          <h2 class="text-lg font-bold" [class]="th.text()">Check Out</h2>
        </div>
      </div>

      @if (!done()) {

        <!-- Folio summary -->
        @if (folio()) {
          <div class="rounded-2xl p-5 mb-5" [class]="th.card()">
            <h3 class="text-sm font-semibold mb-3" [class]="th.muted()">Account Summary</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <lucide-icon [img]="ReceiptTextIcon" class="w-3.5 h-3.5" [class]="th.subtle()"></lucide-icon>
                  <p class="text-xs" [class]="th.subtle()">Total Charges</p>
                </div>
                <p class="font-bold" [class]="th.text()">₦{{ fmt(folio()!.total_charges) }}</p>
              </div>
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <lucide-icon [img]="WalletIcon" class="w-3.5 h-3.5"
                    [class]="(+folio()!.balance) > 0 ? 'text-red-400/50' : 'text-emerald-400/50'">
                  </lucide-icon>
                  <p class="text-xs" [class]="th.subtle()">Balance Due</p>
                </div>
                <p class="font-bold"
                  [class]="(+folio()!.balance) > 0 ? 'text-red-400' : 'text-emerald-400'">
                  ₦{{ fmt(folio()!.balance) }}
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Unpaid balance warning -->
        @if (hasPendingBalance()) {
          <div class="rounded-2xl p-4 mb-5 flex items-start gap-3" [class]="th.danger()">
            <lucide-icon [img]="AlertTriangleIcon" class="w-5 h-5 shrink-0 mt-0.5"></lucide-icon>
            <div>
              <p class="text-sm font-bold">Unpaid Balance</p>
              <p class="text-xs mt-0.5 opacity-80">
                You have an outstanding balance of ₦{{ fmt(folio()!.balance) }}.
                Please settle your bill at the front desk before checking out.
              </p>
              <a routerLink="/guest/folio" class="inline-block mt-2 text-xs font-semibold underline">
                View payment details →
              </a>
            </div>
          </div>
        }

        <!-- Confirm checkout button -->
        <div class="rounded-2xl p-5" [class]="th.card()">
          <p class="text-sm mb-4" [class]="th.muted()">
            Ready to check out? Tap the button below to notify the front desk.
            A member of staff will assist you with key return and final billing.
          </p>

          @if (error()) {
            <div class="rounded-xl px-3 py-2.5 text-xs mb-4" [class]="th.danger()">{{ error() }}</div>
          }

          <button (click)="confirmCheckout()" [disabled]="submitting()"
            class="w-full py-4 bg-amber-400 text-slate-900 font-bold rounded-2xl
                   disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2">
            @if (submitting()) {
              <span class="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
              Processing…
            } @else {
              <lucide-icon [img]="LogOutIcon" class="w-5 h-5"></lucide-icon>
              Request Checkout
            }
          </button>
        </div>

      }

      <!-- Done state -->
      @if (done()) {
        <div class="text-center py-12">
          <div class="w-20 h-20 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <lucide-icon [img]="CheckCircle2Icon" class="w-10 h-10 text-emerald-400"></lucide-icon>
          </div>
          <h3 class="text-2xl font-bold mb-2" [class]="th.text()">Checkout Requested!</h3>
          <p class="text-sm mb-8" [class]="th.muted()">
            Our team has been notified. Please proceed to the front desk with your belongings and room key.
            Thank you for staying with us!
          </p>
          <button (click)="signOut()"
            class="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm mx-auto transition-colors"
            [class]="th.cardHover()">
            <lucide-icon [img]="LogOutIcon" class="w-4 h-4 text-amber-400"></lucide-icon>
            <span [class]="th.muted()">Sign out</span>
          </button>
        </div>
      }

    </div>
  `,
})
export default class GuestCheckoutPage implements OnInit {
  private router   = inject(Router);
  private guestApi = inject(GuestApiService);
  readonly th      = inject(GuestThemeService);

  readonly ArrowLeftIcon    = ArrowLeft;
  readonly ReceiptTextIcon  = ReceiptText;
  readonly WalletIcon       = Wallet;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly LogOutIcon       = LogOut;
  readonly CheckCircle2Icon = CheckCircle2;

  folio     = signal<any | null>(null);
  submitting = signal(false);
  done       = signal(false);
  error      = signal<string | null>(null);

  readonly hasPendingBalance = () => this.folio() && (+this.folio()!.balance) > 0;

  ngOnInit(): void {
    this.guestApi.get<any>('/guest/folio').subscribe({
      next: (r: any) => {
        this.folio.set(r.data?.folio ? { ...r.data.folio, ...r.data } : (r.data ?? null));
      },
      error: () => {},
    });
  }

  fmt(v: number | string): string {
    return (+v || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  confirmCheckout(): void {
    this.error.set(null);
    this.submitting.set(true);
    this.guestApi.post<any>('/guest/service-requests', {
      category:    'other',
      title:       'Guest requesting checkout',
      description: 'Guest has requested checkout via the PWA. Please process at the front desk.',
      priority:    3,
    }).subscribe({
      next: () => { this.submitting.set(false); this.done.set(true); },
      error: (err: any) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? 'Could not process checkout. Please visit the front desk.');
      },
    });
  }

  signOut(): void {
    localStorage.removeItem('guest_session');
    localStorage.removeItem('guest_token');
    this.router.navigate(['/guest/login']);
  }
}
