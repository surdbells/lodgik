import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GuestApiService } from '../../services/guest-api.service';

@Component({
  selector: 'app-guest-checkout',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/guest/home" class="text-white/50 hover:text-white text-xl">←</a>
        <h2 class="text-lg font-bold text-white">Check Out</h2>
      </div>

      @if (!done()) {
        <!-- Folio summary before checkout -->
        @if (folio()) {
          <div class="bg-white/8 border border-white/10 rounded-2xl p-5 mb-5">
            <h3 class="text-sm font-semibold text-white/70 mb-3">Account Summary</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p class="text-white/40 text-xs">Total Charges</p>
                <p class="text-white font-bold">₦{{ fmt(folio()!.total_charges) }}</p>
              </div>
              <div>
                <p class="text-white/40 text-xs">Balance Due</p>
                <p class="font-bold" [class]="(+folio()!.balance) > 0 ? 'text-red-400' : 'text-emerald-400'">
                  ₦{{ fmt(folio()!.balance) }}
                </p>
              </div>
            </div>
          </div>
        }

        @if (hasPendingBalance()) {
          <div class="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-5">
            <p class="text-sm font-semibold text-red-300 mb-1">⚠️ Outstanding Balance</p>
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
                 hover:bg-amber-300 disabled:opacity-50 transition-colors text-sm">
          {{ submitting() ? 'Processing…' : '✅ Confirm Check Out' }}
        </button>

        <button routerLink="/guest/home"
          class="w-full mt-3 py-3 border border-white/20 text-white/60 font-medium rounded-2xl
                 hover:bg-white/5 transition-colors text-sm">
          Not yet, go back
        </button>
      }

      @if (done()) {
        <div class="text-center py-12">
          <p class="text-6xl mb-5">🏨</p>
          <h3 class="text-2xl font-bold text-white mb-2">Goodbye!</h3>
          <p class="text-white/50 text-sm mb-1">Thank you for staying with us.</p>
          <p class="text-white/30 text-xs mb-8">We hope to welcome you back soon.</p>
          <button (click)="signOut()"
            class="px-8 py-3 bg-white/10 border border-white/20 text-white rounded-2xl text-sm hover:bg-white/15">
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

  folio      = signal<any | null>(null);
  submitting = signal(false);
  done       = signal(false);
  error      = signal<string | null>(null);

  readonly hasPendingBalance = () => this.folio() && (+this.folio()!.balance) > 0;

  ngOnInit(): void {
    // Load folio so we can show the balance summary
    this.guestApi.get<any>('/guest/folio').subscribe({
      next: (r: any) => {
        if (r.data?.folio) {
          this.folio.set({ ...r.data.folio, ...r.data });
        } else {
          this.folio.set(r.data ?? null);
        }
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

    // Guest-initiated checkout — notifies front desk via a service request
    this.guestApi.post<any>('/guest/service-requests', {
      category:    'concierge',
      title:       'Guest requesting checkout',
      description: 'Guest has requested checkout via the PWA. Please process at the front desk.',
      priority:    3,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
      },
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
