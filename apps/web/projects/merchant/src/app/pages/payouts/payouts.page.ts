import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-payouts',
  standalone: true,
  imports: [DatePipe, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Payouts" subtitle="Your payout history and statements"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div class="px-5 py-3 border-b border-gray-100 flex justify-between items-center"><h3 class="text-sm font-semibold">Payout History</h3></div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="px-4 py-2 text-left">Period</th><th class="px-4 py-2 text-right">Amount</th><th class="px-4 py-2 text-left">Reference</th><th class="px-4 py-2 text-left">Status</th><th class="px-4 py-2 text-left">Paid At</th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            @for (p of payouts(); track p.id) {
              <tr><td class="px-4 py-2">{{ p.payout_period }}</td><td class="px-4 py-2 text-right font-semibold">₦{{ (+p.total_amount).toLocaleString() }}</td><td class="px-4 py-2 text-gray-500">{{ p.payment_reference || '—' }}</td><td class="px-4 py-2"><ui-badge [variant]="p.status === 'paid' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'">{{ p.status }}</ui-badge></td><td class="px-4 py-2">{{ p.paid_at | date:'shortDate' }}</td></tr>
            } @empty { <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No payouts yet</td></tr> }
          </tbody>
        </table>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100"><h3 class="text-sm font-semibold">Statements</h3></div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="px-4 py-2 text-left">Period</th><th class="px-4 py-2 text-right">Earned</th><th class="px-4 py-2 text-right">Paid</th><th class="px-4 py-2 text-right">Balance</th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            @for (s of statements(); track s.id) {
              <tr><td class="px-4 py-2">{{ s.period_start }} to {{ s.period_end }}</td><td class="px-4 py-2 text-right">₦{{ (+s.total_earned).toLocaleString() }}</td><td class="px-4 py-2 text-right">₦{{ (+s.total_paid).toLocaleString() }}</td><td class="px-4 py-2 text-right font-semibold">₦{{ (+s.closing_balance).toLocaleString() }}</td></tr>
            } @empty { <tr><td colspan="4" class="px-4 py-6 text-center text-gray-400">No statements yet</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class PayoutsPage implements OnInit {
  private api = inject(MerchantApiService);
  loading = signal(true); payouts = signal<any[]>([]); statements = signal<any[]>([]);
  ngOnInit(): void {
    this.api.listPayouts().subscribe({ next: (p: any[]) => this.payouts.set(p) });
    this.api.listStatements().subscribe({ next: (s: any[]) => { this.statements.set(s); this.loading.set(false); } });
  }
}
