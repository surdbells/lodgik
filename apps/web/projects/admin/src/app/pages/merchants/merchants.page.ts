import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-merchants',
  standalone: true,
  imports: [DatePipe, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Merchant Management" subtitle="Manage partners, resellers, and agents"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="flex gap-2 mb-4">
        <input [(ngModel)]="search" (keyup.enter)="load()" placeholder="Search merchants..." class="px-3 py-2 border rounded-lg text-sm w-64">
        @for (f of filters; track f.value) {
          <button (click)="filterStatus.set(f.value); load()" [class.bg-sage-100]="filterStatus() === f.value" [class.text-sage-700]="filterStatus() === f.value" class="px-3 py-1 text-xs rounded-full border hover:bg-gray-50">{{ f.label }}</button>
        }
      </div>
      <div class="bg-white rounded-lg border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="px-4 py-2 text-left">ID</th><th class="px-4 py-2 text-left">Business</th><th class="px-4 py-2 text-left">Email</th><th class="px-4 py-2">Category</th><th class="px-4 py-2">Hotels</th><th class="px-4 py-2">Status</th><th class="px-4 py-2">Joined</th><th class="px-4 py-2"></th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            @for (m of merchants(); track m.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 font-mono text-xs">{{ m.merchant_id }}</td>
                <td class="px-4 py-2 font-medium">{{ m.business_name }}</td>
                <td class="px-4 py-2 text-gray-600">{{ m.email }}</td>
                <td class="px-4 py-2 text-center capitalize">{{ m.category }}</td>
                <td class="px-4 py-2 text-center">—</td>
                <td class="px-4 py-2 text-center"><ui-badge [variant]="statusVariant(m.status)">{{ m.status }}</ui-badge></td>
                <td class="px-4 py-2 text-gray-500">{{ m.created_at | date:'shortDate' }}</td>
                <td class="px-4 py-2">
                  <div class="flex gap-1">
                    @if (m.status === 'pending_approval' || m.status === 'kyc_in_progress') { <button (click)="approve(m.id)" class="text-green-600 hover:underline text-xs">Approve</button> }
                    @if (m.status === 'active') { <button (click)="suspend(m.id)" class="text-amber-600 hover:underline text-xs">Suspend</button> }
                    @if (m.status === 'suspended') { <button (click)="approve(m.id)" class="text-green-600 hover:underline text-xs">Reactivate</button> }
                    <button (click)="viewDetail(m)" class="text-sage-600 hover:underline text-xs">Details</button>
                  </div>
                </td>
              </tr>
            } @empty { <tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No merchants found</td></tr> }
          </tbody>
        </table>
      </div>
    }

    @if (detail()) {
      <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50" (click)="detail.set(null)">
        <div class="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">{{ detail().business_name }}</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div><span class="text-gray-500">Legal Name:</span> {{ detail().legal_name }}</div>
            <div><span class="text-gray-500">Merchant ID:</span> {{ detail().merchant_id }}</div>
            <div><span class="text-gray-500">Email:</span> {{ detail().email }}</div>
            <div><span class="text-gray-500">Phone:</span> {{ detail().phone || '—' }}</div>
            <div><span class="text-gray-500">Category:</span> {{ detail().category }}</div>
            <div><span class="text-gray-500">Type:</span> {{ detail().type }}</div>
            <div><span class="text-gray-500">Region:</span> {{ detail().operating_region || '—' }}</div>
            <div><span class="text-gray-500">Status:</span> {{ detail().status }}</div>
            <div><span class="text-gray-500">Hotels:</span> {{ detail().hotel_count || 0 }}</div>
            <div><span class="text-gray-500">KYC:</span> {{ detail().kyc?.status || 'not_submitted' }}</div>
            <div><span class="text-gray-500">Bank:</span> {{ detail().bank_account?.status || 'none' }}</div>
            <div><span class="text-gray-500">Tier:</span> {{ detail().commission_tier?.name || 'Default' }}</div>
          </div>
          <button (click)="detail.set(null)" class="mt-4 px-4 py-2 bg-gray-100 text-sm rounded-lg">Close</button>
        </div>
      </div>
    }
  `,
})
export class MerchantsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true); merchants = signal<any[]>([]); detail = signal<any>(null);
  filterStatus = signal(''); search = '';
  filters = [{ label: 'All', value: '' }, { label: 'Pending', value: 'pending_approval' }, { label: 'KYC', value: 'kyc_in_progress' }, { label: 'Active', value: 'active' }, { label: 'Suspended', value: 'suspended' }];

  ngOnInit(): void { this.load(); }
  load(): void { this.api.get(`/admin/merchants?status=${this.filterStatus()}&search=${this.search}`).subscribe({ next: (r: any) => { this.merchants.set(r.data || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  approve(id: string): void { this.api.post(`/admin/merchants/${id}/approve`, {}).subscribe({ next: () => { this.toast.success('Merchant approved'); this.load(); } }); }
  suspend(id: string): void { this.api.post(`/admin/merchants/${id}/suspend`, { reason: 'Admin action' }).subscribe({ next: () => { this.toast.success('Merchant suspended'); this.load(); } }); }
  viewDetail(m: any): void { this.api.get(`/admin/merchants/${m.id}`).subscribe({ next: (r: any) => this.detail.set(r.data) }); }
  statusVariant(s: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' { return ({ active: 'success', suspended: 'danger', terminated: 'danger', pending_approval: 'warning', kyc_in_progress: 'info' } as any)[s] || 'neutral'; }
}
