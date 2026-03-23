import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GuestApiService } from '../../services/guest-api.service';

@Component({ selector: 'app-tablet-bill', standalone: true, imports: [],
  template: `
    <div class="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      <div class="flex items-center gap-4 px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <button (click)="router.navigate(['/tablet/home'])" class="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-lg">←</button>
        <h1 class="text-white font-bold text-xl flex-1">My Bill</h1>
        @if (folio()) {
          <div class="text-right">
            <p class="text-emerald-400 font-bold text-lg">₦{{ (+folio()!.total_charged || 0).toLocaleString() }}</p>
            <p class="text-slate-500 text-xs">Total charges</p>
          </div>
        }
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        @if (loading()) {
          <div class="flex justify-center pt-16"><div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div></div>
        }

        @if (!loading() && folio()) {
          <!-- Summary row -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center">
              <p class="text-slate-400 text-xs mb-1">Total Charged</p>
              <p class="text-emerald-400 font-bold text-xl">₦{{ (+folio()!.total_charged || 0).toLocaleString() }}</p>
            </div>
            <div class="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center">
              <p class="text-slate-400 text-xs mb-1">Paid</p>
              <p class="text-blue-400 font-bold text-xl">₦{{ (+folio()!.total_paid || 0).toLocaleString() }}</p>
            </div>
            <div class="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center">
              <p class="text-slate-400 text-xs mb-1">Balance Due</p>
              <p class="font-bold text-xl" [class]="(+folio()!.balance_due || 0) > 0 ? 'text-red-400' : 'text-emerald-400'">₦{{ (+folio()!.balance_due || 0).toLocaleString() }}</p>
            </div>
          </div>

          <!-- Charges list -->
          <h3 class="text-slate-400 text-xs uppercase tracking-wider font-bold mb-3">Charges</h3>
          <div class="space-y-2">
            @for (charge of charges(); track charge.id) {
              <div class="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p class="text-white text-sm font-medium">{{ charge.description }}</p>
                  <p class="text-slate-500 text-xs mt-0.5">{{ fmtDate(charge.created_at) }}</p>
                </div>
                <p class="text-emerald-400 font-bold">₦{{ (+charge.amount || 0).toLocaleString() }}</p>
              </div>
            }
            @if (charges().length === 0) {
              <div class="text-center py-8 text-slate-500 text-sm">No charges yet</div>
            }
          </div>
        }

        @if (!loading() && !folio()) {
          <div class="text-center py-16 text-slate-500">No folio found</div>
        }
      </div>

      <!-- Bank details for payment -->
      @if (!loading() && bankAccount()) {
        <div class="flex-shrink-0 border-t border-slate-800 px-6 py-4">
          <p class="text-slate-400 text-xs mb-2">Pay via bank transfer:</p>
          <p class="text-white text-sm font-bold">{{ bankAccount()!.bank_name }} — {{ bankAccount()!.account_number }}</p>
          <p class="text-slate-400 text-xs">{{ bankAccount()!.account_name }}</p>
        </div>
      }
    </div>
  `,
})
export class TabletBillPage implements OnInit {
  readonly router = inject(Router);
  private svc     = inject(GuestApiService);

  loading     = signal(true);
  folio       = signal<any>(null);
  charges     = signal<any[]>([]);
  bankAccount = signal<any>(null);

  ngOnInit(): void {
    this.svc.get('/guest/folio').subscribe({
      next: (r: any) => {
        if (r.success) {
          this.folio.set(r.data.folio ?? r.data);
          this.charges.set(r.data.charges ?? []);
          this.bankAccount.set(r.data.bank_account ?? null);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  fmtDate(dt: string): string {
    return dt ? new Date(dt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  }
}
