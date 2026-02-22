import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-payout-processing',
  standalone: true,
  imports: [DatePipe, SlicePipe, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Payout Processing" subtitle="Generate and process merchant commission payouts">
      <div class="flex gap-2">
        <button (click)="showGenerate.set(true)" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Generate Payout</button>
      </div>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showGenerate()) {
      <div class="bg-white rounded-lg border p-5 mb-6">
        <h3 class="text-sm font-semibold mb-4">Generate New Payout</h3>
        <div class="grid grid-cols-3 gap-4">
          <div><label class="block text-xs font-medium mb-1">Merchant ID *</label><input [(ngModel)]="genForm.merchant_id" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="UUID"></div>
          <div><label class="block text-xs font-medium mb-1">Period Start *</label><input [(ngModel)]="genForm.period_start" type="date" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium mb-1">Period End *</label><input [(ngModel)]="genForm.period_end" type="date" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="generate()" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Generate</button>
          <button (click)="showGenerate.set(false)" class="px-4 py-2 bg-gray-100 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    @if (!loading()) {
      <div class="flex gap-2 mb-4">
        @for (f of filters; track f.value) {
          <button (click)="filterStatus.set(f.value); load()" [class.bg-blue-100]="filterStatus() === f.value" class="px-3 py-1 text-xs rounded-full border hover:bg-gray-50">{{ f.label }}</button>
        }
      </div>
      <div class="bg-white rounded-lg border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="px-4 py-2 text-left">Period</th><th class="px-4 py-2 text-left">Merchant</th><th class="px-4 py-2 text-right">Amount</th><th class="px-4 py-2 text-center">Commissions</th><th class="px-4 py-2">Status</th><th class="px-4 py-2">Paid</th><th class="px-4 py-2"></th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            @for (p of payouts(); track p.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2">{{ p.payout_period }}</td>
                <td class="px-4 py-2 font-mono text-xs">{{ p.merchant_id | slice:0:8 }}...</td>
                <td class="px-4 py-2 text-right font-semibold">₦{{ (+p.total_amount).toLocaleString() }}</td>
                <td class="px-4 py-2 text-center">{{ p.commission_ids?.length || 0 }}</td>
                <td class="px-4 py-2 text-center"><ui-badge [variant]="p.status === 'paid' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'">{{ p.status }}</ui-badge></td>
                <td class="px-4 py-2 text-gray-500">{{ p.paid_at | date:'shortDate' }}</td>
                <td class="px-4 py-2">
                  @if (p.status === 'pending') {
                    <button (click)="process(p)" class="text-green-600 hover:underline text-xs">Process</button>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No payouts</td></tr> }
          </tbody>
        </table>
      </div>
    }

    @if (processTarget()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" (click)="processTarget.set(null)">
        <div class="bg-white rounded-xl p-6 w-96" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">Process Payout</h3>
          <p class="text-sm text-gray-600 mb-3">Amount: ₦{{ (+processTarget().total_amount).toLocaleString() }}</p>
          <div><label class="block text-xs font-medium mb-1">Payment Reference *</label><input [(ngModel)]="payRef" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g., TRX-12345"></div>
          <div class="flex gap-2 mt-4">
            <button (click)="confirmProcess()" class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg">Confirm Payment</button>
            <button (click)="processTarget.set(null)" class="px-4 py-2 bg-gray-100 text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PayoutProcessingPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true); payouts = signal<any[]>([]); showGenerate = signal(false); processTarget = signal<any>(null);
  filterStatus = signal(''); payRef = '';
  genForm: any = { merchant_id: '', period_start: '', period_end: '' };
  filters = [{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Paid', value: 'paid' }, { label: 'Failed', value: 'failed' }];

  ngOnInit(): void { this.load(); }
  load(): void { this.api.get(`/admin/merchants/payouts?status=${this.filterStatus()}`).subscribe({ next: (d: any) => { this.payouts.set(d); this.loading.set(false); } }); }
  generate(): void {
    this.api.post('/admin/merchants/payouts', this.genForm).subscribe({
      next: () => { this.toast.success('Payout generated'); this.showGenerate.set(false); this.load(); },
      error: (e: any) => this.toast.error(e?.error?.error || 'Failed')
    });
  }
  process(p: any): void { this.processTarget.set(p); this.payRef = ''; }
  confirmProcess(): void {
    this.api.post(`/admin/merchants/payouts/${this.processTarget().id}/process`, { payment_reference: this.payRef }).subscribe({
      next: () => { this.toast.success('Payout processed'); this.processTarget.set(null); this.load(); },
      error: (e: any) => this.toast.error(e?.error?.error || 'Failed')
    });
  }
}
