import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-merchants',
  standalone: true,
  imports: [DatePipe, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Merchant Management" subtitle="Manage partners, resellers, and agents">
      <button (click)="showOnboard.set(true)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 transition-colors flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Onboard Merchant
      </button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <!-- Filters -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <input [(ngModel)]="search" (keyup.enter)="load()" placeholder="Search merchants..." class="px-3 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none">
        @for (f of filters; track f.value) {
          <button (click)="filterStatus.set(f.value); load()"
            [class]="filterStatus() === f.value ? 'bg-sage-600 text-white border-sage-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'"
            class="px-3 py-1.5 text-xs rounded-full border transition-colors">
            {{ f.label }}
          </button>
        }
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        @for (s of stats(); track s.label) {
          <div class="bg-white rounded-lg border p-3">
            <div class="text-xs text-gray-500">{{ s.label }}</div>
            <div class="text-xl font-bold text-gray-800 mt-1">{{ s.count }}</div>
          </div>
        }
      </div>

      <!-- Table -->
      <div class="bg-white rounded-lg border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              <th class="px-4 py-3 text-left">Merchant</th>
              <th class="px-4 py-3 text-left">Contact</th>
              <th class="px-4 py-3 text-center">Category</th>
              <th class="px-4 py-3 text-center">Region</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-center">Joined</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (m of merchants(); track m.id) {
              <tr class="hover:bg-gray-50 cursor-pointer" (click)="openDetail(m.id)">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900">{{ m.business_name }}</div>
                  <div class="text-xs text-gray-500 font-mono">{{ m.merchant_id }}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-gray-700">{{ m.email }}</div>
                  <div class="text-xs text-gray-500">{{ m.phone || '—' }}</div>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-700 capitalize">{{ formatCategory(m.category) }}</span>
                </td>
                <td class="px-4 py-3 text-center text-gray-600 text-xs">{{ m.operating_region || '—' }}</td>
                <td class="px-4 py-3 text-center"><ui-badge [variant]="statusVariant(m.status)">{{ formatStatus(m.status) }}</ui-badge></td>
                <td class="px-4 py-3 text-center text-gray-500 text-xs">{{ m.created_at | date:'mediumDate' }}</td>
                <td class="px-4 py-3 text-right" (click)="$event.stopPropagation()">
                  <div class="flex gap-2 justify-end">
                    @if (m.status === 'pending_approval' || m.status === 'kyc_in_progress') {
                      <button (click)="approve(m.id)" class="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100">Approve</button>
                    }
                    @if (m.status === 'active') {
                      <button (click)="suspend(m.id)" class="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100">Suspend</button>
                    }
                    @if (m.status === 'suspended') {
                      <button (click)="approve(m.id)" class="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100">Reactivate</button>
                    }
                    <button (click)="openDetail(m.id)" class="text-xs px-2 py-1 rounded bg-sage-50 text-sage-700 hover:bg-sage-100">View</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="px-4 py-12 text-center">
                  <div class="text-gray-400 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                  <div class="text-gray-500 text-sm">No merchants found</div>
                  <button (click)="showOnboard.set(true)" class="mt-3 text-sage-600 text-sm hover:underline">Onboard your first merchant</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Onboard Merchant Modal -->
    @if (showOnboard()) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="showOnboard.set(false)">
        <div class="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Onboard Merchant</h2>
              <p class="text-sm text-gray-500 mt-0.5">Register a new merchant partner</p>
            </div>
            <button (click)="showOnboard.set(false)" class="text-gray-400 hover:text-gray-600 p-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="px-6 py-4 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Legal Name <span class="text-red-500">*</span></label>
                <input [(ngModel)]="form.legal_name" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none" placeholder="e.g. ABC Ltd">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Business Name <span class="text-red-500">*</span></label>
                <input [(ngModel)]="form.business_name" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none" placeholder="Trading name">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email <span class="text-red-500">*</span></label>
                <input type="email" [(ngModel)]="form.email" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none" placeholder="merchant&#64;example.com">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input [(ngModel)]="form.phone" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none" placeholder="+234...">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input [(ngModel)]="form.address" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none" placeholder="Business address">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select [(ngModel)]="form.category" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none bg-white">
                  <option value="sales_agent">Sales Agent</option>
                  <option value="channel_partner">Channel Partner</option>
                  <option value="consultant">Consultant</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select [(ngModel)]="form.type" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none bg-white">
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Operating Region</label>
                <input [(ngModel)]="form.operating_region" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none" placeholder="e.g. Lagos, Nigeria">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Settlement Currency</label>
                <select [(ngModel)]="form.settlement_currency" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 outline-none bg-white">
                  <option value="NGN">NGN — Nigerian Naira</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
            </div>
          </div>
          <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
            <button (click)="showOnboard.set(false)" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button (click)="onboard()" [disabled]="submitting()" class="px-5 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 disabled:opacity-50 transition-colors">
              {{ submitting() ? 'Creating...' : 'Create Merchant' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class MerchantsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);

  loading = signal(true);
  merchants = signal<any[]>([]);
  filterStatus = signal('');
  showOnboard = signal(false);
  submitting = signal(false);
  search = '';

  filters = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending_approval' },
    { label: 'KYC In Progress', value: 'kyc_in_progress' },
    { label: 'Active', value: 'active' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Terminated', value: 'terminated' },
  ];

  form: any = this.resetForm();
  stats = signal<{ label: string; count: number }[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.get(`/admin/merchants?status=${this.filterStatus()}&search=${this.search}`).subscribe({
      next: (r: any) => {
        const list = r.data || [];
        this.merchants.set(list);
        this.computeStats(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  computeStats(list: any[]): void {
    this.stats.set([
      { label: 'Total', count: list.length },
      { label: 'Pending', count: list.filter((m: any) => m.status === 'pending_approval').length },
      { label: 'KYC Review', count: list.filter((m: any) => m.status === 'kyc_in_progress').length },
      { label: 'Active', count: list.filter((m: any) => m.status === 'active').length },
      { label: 'Suspended', count: list.filter((m: any) => m.status === 'suspended').length },
    ]);
  }

  onboard(): void {
    if (!this.form.legal_name || !this.form.business_name || !this.form.email) {
      this.toast.error('Legal name, business name, and email are required');
      return;
    }
    this.submitting.set(true);
    this.api.post('/admin/merchants', this.form).subscribe({
      next: (r: any) => {
        this.toast.success('Merchant onboarded successfully');
        this.showOnboard.set(false);
        this.form = this.resetForm();
        this.submitting.set(false);
        this.load();
        if (r.data?.id) this.router.navigate(['/merchants', r.data.id]);
      },
      error: (err: any) => {
        this.toast.error(err.error?.message || 'Failed to create merchant');
        this.submitting.set(false);
      },
    });
  }

  approve(id: string): void {
    this.api.post(`/admin/merchants/${id}/approve`, {}).subscribe({
      next: () => { this.toast.success('Merchant approved'); this.load(); },
      error: (e: any) => this.toast.error(e.error?.message || 'Failed'),
    });
  }

  suspend(id: string): void {
    const reason = prompt('Suspension reason:');
    if (reason === null) return;
    this.api.post(`/admin/merchants/${id}/suspend`, { reason: reason || 'Admin action' }).subscribe({
      next: () => { this.toast.success('Merchant suspended'); this.load(); },
      error: (e: any) => this.toast.error(e.error?.message || 'Failed'),
    });
  }

  openDetail(id: string): void { this.router.navigate(['/merchants', id]); }

  formatCategory(cat: string): string { return (cat || '').replace(/_/g, ' '); }
  formatStatus(s: string): string { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  statusVariant(s: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
    return ({ active: 'success', suspended: 'danger', terminated: 'danger', pending_approval: 'warning', kyc_in_progress: 'info' } as any)[s] || 'neutral';
  }

  private resetForm() {
    return { legal_name: '', business_name: '', email: '', phone: '', address: '', operating_region: '', category: 'sales_agent', type: 'individual', settlement_currency: 'NGN' };
  }
}
