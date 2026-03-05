import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-guest-folio',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="text-white/50 hover:text-white text-xl">←</a>
        <h2 class="text-lg font-bold text-white">My Bill</h2>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16">
          <div class="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      @if (!loading() && folio()) {
        <!-- Balance summary -->
        <div class="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-5 mb-5 border border-white/10">
          <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="text-center">
              <p class="text-[11px] text-white/40 mb-1">Total Charges</p>
              <p class="text-base font-bold text-white">₦{{ fmt(folio()!.total_charges) }}</p>
            </div>
            <div class="text-center">
              <p class="text-[11px] text-white/40 mb-1">Paid</p>
              <p class="text-base font-bold text-emerald-400">₦{{ fmt(folio()!.total_payments) }}</p>
            </div>
            <div class="text-center">
              <p class="text-[11px] text-white/40 mb-1">Balance</p>
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

        <!-- Charges -->
        <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
          <div class="px-4 py-3 border-b border-white/10">
            <h3 class="text-sm font-semibold text-white/80">Charges</h3>
          </div>
          @for (c of folio()!.charges; track c.id) {
            <div class="px-4 py-3 flex items-start justify-between border-b border-white/5 last:border-0">
              <div>
                <p class="text-sm text-white/80">{{ c.description }}</p>
                <p class="text-[11px] text-white/40">{{ c.category }} · {{ c.date | date:'dd MMM' }}</p>
              </div>
              <p class="text-sm font-semibold text-white">₦{{ fmt(+c.unit_price * c.quantity) }}</p>
            </div>
          } @empty {
            <p class="px-4 py-6 text-center text-white/30 text-sm">No charges yet</p>
          }
        </div>

        <!-- Payments -->
        @if (folio()!.payments?.length) {
          <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
            <div class="px-4 py-3 border-b border-white/10">
              <h3 class="text-sm font-semibold text-white/80">Payments</h3>
            </div>
            @for (p of folio()!.payments; track p.id) {
              <div class="px-4 py-3 flex items-start justify-between border-b border-white/5 last:border-0">
                <div>
                  <p class="text-sm text-emerald-300">₦{{ fmt(p.amount) }}</p>
                  <p class="text-[11px] text-white/40">{{ p.payment_method | titlecase }} · {{ p.payment_date | date:'dd MMM HH:mm' }}</p>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full"
                  [class]="p.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'">
                  {{ p.status }}
                </span>
              </div>
            }
          </div>
        }

        <!-- Pay via bank transfer — only when balance > 0 -->
        @if (+folio()!.balance > 0 && folio()!.bank_accounts?.length) {
          <div class="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-4 mb-4">
            <h3 class="text-sm font-semibold text-amber-300 mb-3">💳 Payment Details</h3>
            <p class="text-xs text-white/50 mb-4">
              Transfer <strong class="text-white">₦{{ fmt(folio()!.balance) }}</strong>
              to the account below and notify the front desk.
            </p>
            @for (acct of folio()!.bank_accounts; track acct.id) {
              <div class="bg-white/10 rounded-xl p-3 mb-2 last:mb-0">
                @if (acct.is_primary) {
                  <span class="text-[10px] text-amber-400 font-semibold mb-1 block">Primary Account</span>
                }
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-white/50">Bank</span>
                    <span class="text-white font-medium">{{ acct.bank_name }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-white/50">Account No.</span>
                    <span class="text-white font-mono font-bold tracking-wider">{{ acct.account_number }}</span>
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
            <p class="text-2xl mb-1">✅</p>
            <p class="text-sm font-semibold text-emerald-300">Account fully settled</p>
            <p class="text-xs text-white/40 mt-1">Thank you for staying with us!</p>
          </div>
        }
      }

      @if (!loading() && !folio()) {
        <div class="text-center py-16">
          <p class="text-white/40 text-sm">No bill found for your booking.</p>
        </div>
      }
    </div>
  `,
})
export default class GuestFolioPage implements OnInit {
  private http = inject(HttpClient);

  loading = signal(true);
  folio   = signal<any | null>(null);

  ngOnInit(): void { this.load(); }

  private load(): void {
    const token   = localStorage.getItem('guest_token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const baseUrl = (window as any).__LODGIK_API_URL__ ?? '/api';

    this.http.get<any>(`${baseUrl}/api/guest/folio`, { headers }).subscribe({
      next: r => { this.folio.set(r.data ?? null); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  fmt(v: number | string): string {
    return (+v || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }
}
