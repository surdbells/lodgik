import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, BadgeComponent } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-commissions',
  standalone: true,
  imports: [DatePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, BadgeComponent],
  template: `
    <ui-page-header title="Commissions" icon="hand-coins" [breadcrumbs]="['Finance', 'Commissions']" subtitle="Track your earnings"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Total Earned" [value]="'₦' + (+earnings().total_earned || 0).toLocaleString()" icon="hand-coins"></ui-stats-card>
        <ui-stats-card label="Pending" [value]="'₦' + (+earnings().pending || 0).toLocaleString()" icon="clock"></ui-stats-card>
        <ui-stats-card label="Paid" [value]="'₦' + (+earnings().paid || 0).toLocaleString()" icon="circle-check"></ui-stats-card>
        <ui-stats-card label="Commissions" [value]="earnings().commission_count || 0" icon="chart-bar"></ui-stats-card>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 shadow-card mb-4">
        <div class="flex gap-2 p-3 border-b border-gray-100">
          @for (f of filters; track f) {
            <button (click)="filterStatus.set(f.value); loadCommissions()" [class.bg-emerald-100]="filterStatus() === f.value" [class.text-emerald-700]="filterStatus() === f.value" class="px-3 py-1 text-xs rounded-full border hover:bg-gray-50">{{ f.label }}</button>
          }
        </div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="px-4 py-2 text-left">Date</th><th class="px-4 py-2 text-left">Scope</th><th class="px-4 py-2 text-left">Plan</th><th class="px-4 py-2 text-right">Sub Amount</th><th class="px-4 py-2 text-right">Rate</th><th class="px-4 py-2 text-right">Commission</th><th class="px-4 py-2">Status</th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            @for (c of commissions(); track c.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2">{{ c.created_at | date:'shortDate' }}</td><td class="px-4 py-2 capitalize">{{ c.scope?.replace('_', ' ') }}</td>
                <td class="px-4 py-2">{{ c.plan_name || '—' }}</td><td class="px-4 py-2 text-right">₦{{ (+c.subscription_amount).toLocaleString() }}</td>
                <td class="px-4 py-2 text-right">{{ c.commission_rate }}%</td><td class="px-4 py-2 text-right font-semibold text-emerald-700">₦{{ (+c.commission_amount).toLocaleString() }}</td>
                <td class="px-4 py-2"><ui-badge [variant]="c.status === 'paid' ? 'success' : c.status === 'reversed' ? 'danger' : c.status === 'approved' ? 'info' : 'warning'">{{ c.status }}</ui-badge></td>
              </tr>
            } @empty { <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No commissions found</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class CommissionsPage implements OnInit {
  private api = inject(MerchantApiService);
  loading = signal(true); commissions = signal<any[]>([]); earnings = signal<any>({});
  filterStatus = signal<string>('');
  filters = [{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Paid', value: 'paid' }, { label: 'Reversed', value: 'reversed' }];

  ngOnInit(): void { this.api.earnings().subscribe({ next: (e: any) => this.earnings.set(e), error: () => {} }); this.loadCommissions(); }
  loadCommissions(): void { this.api.listCommissions(this.filterStatus() ? { status: this.filterStatus() } : {}).subscribe({ next: (c: any[]) => { this.commissions.set(c || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
}
