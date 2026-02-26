import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, AuthService, ActivePropertyService} from '@lodgik/shared';
import { LineChartComponent, ChartDataPoint, ChartSeries } from '@lodgik/charts';

@Component({
  selector: 'app-gym-payments',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, LineChartComponent],
  template: `
    <ui-page-header title="Gym Payments" subtitle="Payment recording, history, and revenue reports"></ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Revenue Chart -->
      <div class="bg-white border rounded-xl p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Monthly Revenue Trend (₦)</h3>
        @if (revenueData().length) {
          <chart-line [series]="revenueSeries()" [labels]="revenueLabels()" [height]="220"></chart-line>
        } @else {
          <div class="text-gray-400 text-sm py-8 text-center">No revenue data yet</div>
        }
      </div>

      <!-- Payment History Table -->
      <div class="bg-white border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b">
          <h3 class="font-semibold text-gray-700">Payment History</h3>
          <div class="flex gap-2">
            <input [(ngModel)]="memberFilter" (ngModelChange)="load()" placeholder="Filter by member ID..." class="border rounded-lg px-3 py-1.5 text-sm w-48"/>
          </div>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Member</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Method</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
            </tr>
          </thead>
          <tbody>
            @for (p of payments(); track p.id) {
              <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3 text-xs">{{ p.payment_date }}</td>
                <td class="px-4 py-3 text-xs font-mono">{{ p.member_id?.substring(0, 8) }}...</td>
                <td class="px-4 py-3 font-medium">₦{{ formatAmount(p.amount) }}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 bg-gray-100 rounded text-xs">{{ p.payment_method_label }}</span></td>
                <td class="px-4 py-3"><span class="text-xs" [class]="p.payment_type === 'renewal' ? 'text-sage-600' : 'text-gray-600'">{{ p.payment_type }}</span></td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-xs" [class]="p.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">{{ p.status_label }}</span></td>
                <td class="px-4 py-3 text-xs text-gray-400">{{ p.transfer_reference || '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (payments().length === 0) {
          <div class="p-8 text-center text-gray-400">No payments found</div>
        }
      </div>
    }
  `,
})
export class GymPaymentsPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  loading = signal(true);
  payments = signal<any[]>([]);
  revenueData = signal<ChartDataPoint[]>([]);
  revenueSeries = computed(() => {
    const data = this.revenueData();
    return data.length ? [{ name: 'Revenue', data: data.map(d => d.value), color: '#10b981' }] : [];
  });
  revenueLabels = computed(() => this.revenueData().map(d => d.label));
  memberFilter = '';

  ngOnInit() { this.load(); this.loadRevenue(); }

  load() {
    let url = `/gym/payments?property_id=${this.activeProperty.propertyId()}&limit=100`;
    if (this.memberFilter) url += `&member_id=${this.memberFilter}`;
    this.api.get(url).subscribe({
      next: (r: any) => { this.payments.set(r.data || []); this.loading.set(false); },
    });
  }

  loadRevenue() {
    this.api.get(`/gym/payments/monthly-revenue?property_id=${this.activeProperty.propertyId()}&months=12`).subscribe({
      next: (r: any) => {
        this.revenueData.set((r.data || []).map((d: any) => ({ label: d.month || '', value: +(d.total || 0) / 100 })));
      },
    });
  }

  formatAmount(kobo: any): string { return (+kobo / 100).toLocaleString('en-NG'); }
}
