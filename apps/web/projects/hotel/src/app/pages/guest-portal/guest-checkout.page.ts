import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, ReceiptText, Wallet, AlertTriangle, LogOut, CheckCircle2 } from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';

@Component({
  selector: 'app-guest-checkout',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/guest/home" class="text-white/50 hover:text-white transition-colors">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div class="flex items-center gap-2">
          <lucide-icon [img]="LogOutIcon" class="w-5 h-5 text-amber-400"></lucide-icon>
          <h2 class="text-lg font-bold text-white">Check Out</h2>
        </div>
      </div>

      @if (!done()) {

        <!-- Folio summary -->
        @if (folio()) {
          <div class="bg-white/8 border border-white/10 rounded-2xl p-5 mb-5">
            <h3 class="text-sm font-semibold text-white/70 mb-3">Account Summary</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <lucide-icon [img]="ReceiptTextIcon" class="w-3.5 h-3.5 text-white/30"></lucide-icon>
                  <p class="text-white/40 text-xs">Total Charges</p>
                </div>
                <p class="text-white font-bold">₦{{ fmt(folio()!.total_charges) }}</p>
              </div>
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <lucide-icon [img]="WalletIcon" class="w-3.5 h-3.5"
                    [class]="(+folio()!.balance) > 0 ? 'text-red-400/50' : 'text-emerald-400/50'">
                  </lucide-icon>
                  <p class="text-white/40 text-xs">Balance Due</p>
                </div>
                <p class="font-bold" [class]="(+folio()!.balance) > 0 ? 'text-red-400' : 'text-emerald-400'">
                  ₦{{ fmt(folio()!.balance) }}
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Outstanding balance warning -->
        @if (hasPendingBalance()) {
          <div class="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-5">
            <div class="flex items-center gap-2 mb-1">
              <lucide-icon [img]="AlertTriangleIcon" class="w-4 h-4 text-red-300"></lucide-icon>
              <p class="text-sm font-semibold text-red-300">Outstanding Balance</p>
            </div>
            <p class="text-xs text-white/50">
              You have an unpaid balance of <strong class="text-white">₦{{ fmt(folio()!.balance) }}</strong>.
              Please settle your bill at the front desk before checking out.
            </p>
            <a routerLink="/guest/folio"
               class="inline-block mt-3 px-4 py-2 bg-amber-400 text-slate-900 text-xs font-semibold rounded-xl">
              View Bill
            </a>
          </div>
        }

        <!-- Info -->
        <div class="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <p class="text-sm text-white/70 leading-relaxed">
            By checking out, your room access will be deactivated and a receipt will be sent
            to the email on your booking.
          </p>
          <p class="text-xs text-white/40 mt-2">
            Please ensure you have collected all your belongings and returned the room key.
          </p>
        </div>

        @if (error()) {
          <p class="text-red-400 text-xs mb-4 px-1">{{ error() }}</p>
        }

        <button (click)="confirmCheckout()" [disabled]="submitting()"
          class="w-full py-4 bg-amber-400 text-slate-900 font-bold rounded-2xl
                 hover:bg-amber-300 disabled:opacity-50 transition-colors text-sm
                 flex items-center justify-center gap-2">
          <lucide-icon [img]="CheckCircle2Icon" class="w-4 h-4"></lucide-icon>
          {{ submitting() ? 'Processing…' : 'Confirm Check Out' }}
        </button>

        <a routerLink="/guest/home"
          class="w-full mt-3 py-3 border border-white/20 text-white/60 font-medium rounded-2xl
                 hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2">
          <lucide-icon [img]="ArrowLeftIcon" class="w-4 h-4"></lucide-icon>
          Not yet, go back
        </a>
      }

      <!-- Done state -->
      @if (done()) {
        <div class="text-center py-12">
          <div class="w-20 h-20 bg-amber-400/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <lucide-icon [img]="CheckCircle2Icon" class="w-10 h-10 text-amber-400"></lucide-icon>
          </div>
          <h3 class="text-2xl font-bold text-white mb-2">Goodbye!</h3>
          <p class="text-white/50 text-sm mb-1">Thank you for staying with us.</p>
          <p class="text-white/30 text-xs mb-8">We hope to welcome you back soon.</p>
          <button (click)="signOut()"
            class="flex items-center gap-2 px-8 py-3 bg-white/10 border border-white/20 text-white
                   rounded-2xl text-sm hover:bg-white/15 mx-auto transition-colors">
            <lucide-icon [img]="LogOutIcon" class="w-4 h-4"></lucide-icon>
            Sign Out
          </button>
        </div>
      }

    </div>
  `,
})
export default class GuestCheckoutPage implements OnInit {
  private guestApi = inject(GuestApiService);
  private router   = inject(Router);

  readonly ArrowLeftIcon    = ArrowLeft;
  readonly ReceiptTextIcon  = ReceiptText;
  readonly WalletIcon       = Wallet;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly LogOutIcon       = LogOut;
  readonly CheckCircle2Icon = CheckCircle2;

  folio      = signal<any | null>(null);
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
    this.error.set(null); this.submitting.set(true);
    this.guestApi.post<any>('/guest/service-requests', {
      category:    'concierge',
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
