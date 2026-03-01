import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, ConfirmDialogService, ConfirmDialogComponent
} from '@lodgik/shared';

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  payment_terms: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  tax_id: string | null;
  notes: string | null;
  is_active: boolean;
  preferred_items: string[];
  created_at: string;
}

const BLANK_FORM = () => ({
  name: '', email: '', phone: '', contact_person: '',
  address: '', city: '', country: '',
  payment_terms: 'net30',
  bank_name: '', bank_account_number: '', bank_sort_code: '',
  tax_id: '', notes: '', is_active: true,
});

@Component({
  selector: 'app-vendors',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, ConfirmDialogComponent],
  template: `
<ui-page-header
  title="Vendors"
  icon="building-2"
  [breadcrumbs]="['Procurement', 'Vendors']"
  subtitle="Manage your supplier directory">
  <button (click)="openModal()"
    class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors">
    + Add Vendor
  </button>
</ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>
<ui-confirm-dialog></ui-confirm-dialog>

@if (!loading()) {
<div class="px-6 max-w-6xl">

  <!-- Search + filter bar -->
  <div class="flex flex-wrap gap-3 mb-5">
    <input type="text" [(ngModel)]="search" (ngModelChange)="applyFilter()"
      placeholder="Search vendors…"
      class="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-sage-500">
    <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
      <input type="checkbox" [(ngModel)]="showInactive" (ngModelChange)="applyFilter()" class="accent-sage-600">
      Show inactive
    </label>
    <span class="ml-auto text-sm text-gray-500 self-center">{{ filtered().length }} vendor(s)</span>
  </div>

  <!-- Table -->
  @if (filtered().length === 0) {
    <div class="text-center py-16 text-gray-400">
      <p class="text-lg">No vendors found</p>
      <p class="text-sm mt-1">Click + Add Vendor to create your first supplier record</p>
    </div>
  } @else {
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Vendor</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Payment Terms</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (v of filtered(); track v.id) {
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800">{{ v.name }}</p>
                @if (v.city || v.country) {
                  <p class="text-xs text-gray-400">{{ cityCountry(v) }}</p>
                }
              </td>
              <td class="px-4 py-3">
                @if (v.contact_person) { <p class="text-gray-700">{{ v.contact_person }}</p> }
                @if (v.email) { <p class="text-xs text-gray-400">{{ v.email }}</p> }
                @if (v.phone) { <p class="text-xs text-gray-400">{{ v.phone }}</p> }
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium">
                  {{ termsLabel(v.payment_terms) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span [class]="v.is_active
                  ? 'px-2 py-1 bg-green-50 text-green-700 text-xs rounded-lg font-medium'
                  : 'px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded-lg font-medium'">
                  {{ v.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button (click)="openModal(v)"
                  class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 mr-2">
                  Edit
                </button>
                <button (click)="deleteVendor(v)"
                  class="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                  Delete
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
</div>
}

<!-- Vendor Modal -->
@if (showModal()) {
<div class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-16 px-4">
  <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="font-semibold text-gray-800">{{ editingId() ? 'Edit Vendor' : 'New Vendor' }}</h2>
      <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
    </div>
    <div class="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

      <!-- Name -->
      <div class="sm:col-span-2">
        <label class="block text-xs text-gray-500 font-medium mb-1">Vendor Name <span class="text-red-500">*</span></label>
        <input type="text" [(ngModel)]="form.name" placeholder="e.g. Emeka Farms Ltd"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <!-- Contact person -->
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Contact Person</label>
        <input type="text" [(ngModel)]="form.contact_person" placeholder="Full name"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <!-- Email -->
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Email</label>
        <input type="email" [(ngModel)]="form.email" placeholder="vendor@example.com"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <!-- Phone -->
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Phone</label>
        <input type="text" [(ngModel)]="form.phone" placeholder="+234…"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <!-- Payment terms -->
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Payment Terms</label>
        <select [(ngModel)]="form.payment_terms"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
          <option value="cod">Cash on Delivery</option>
          <option value="net7">Net 7 Days</option>
          <option value="net15">Net 15 Days</option>
          <option value="net30">Net 30 Days</option>
        </select>
      </div>

      <!-- Address -->
      <div class="sm:col-span-2">
        <label class="block text-xs text-gray-500 font-medium mb-1">Address</label>
        <input type="text" [(ngModel)]="form.address" placeholder="Street address"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <!-- City + Country -->
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">City</label>
        <input type="text" [(ngModel)]="form.city"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Country</label>
        <input type="text" [(ngModel)]="form.country" placeholder="Nigeria"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <!-- Bank details -->
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Bank Name</label>
        <input type="text" [(ngModel)]="form.bank_name"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Account Number</label>
        <input type="text" [(ngModel)]="form.bank_account_number" class="font-mono
          w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Sort Code</label>
        <input type="text" [(ngModel)]="form.bank_sort_code" class="font-mono
          w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Tax ID / RC Number</label>
        <input type="text" [(ngModel)]="form.tax_id" class="font-mono
          w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <!-- Notes -->
      <div class="sm:col-span-2">
        <label class="block text-xs text-gray-500 font-medium mb-1">Notes</label>
        <textarea [(ngModel)]="form.notes" rows="2" placeholder="Any additional notes…"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"></textarea>
      </div>

      <!-- Active toggle (edit only) -->
      @if (editingId()) {
        <div class="sm:col-span-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="form.is_active" class="accent-sage-600 w-4 h-4">
            <span class="text-sm text-gray-700">Active vendor</span>
          </label>
        </div>
      }
    </div>

    <div class="px-6 pb-5 flex gap-3">
      <button (click)="save()" [disabled]="saving()"
        class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-60 transition-colors">
        {{ saving() ? 'Saving…' : (editingId() ? 'Update Vendor' : 'Create Vendor') }}
      </button>
      <button (click)="closeModal()"
        class="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
        Cancel
      </button>
    </div>
  </div>
</div>
}
  `,
})
export class VendorsPage implements OnInit {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  loading   = signal(true);
  saving    = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);

  vendors  = signal<Vendor[]>([]);
  filtered = signal<Vendor[]>([]);

  search       = '';
  showInactive = false;

  form = BLANK_FORM();

  ngOnInit() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.get('/procurement/vendors').subscribe({
      next: r => {
        this.vendors.set(r.data ?? []);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => { this.toast.error('Failed to load vendors'); this.loading.set(false); },
    });
  }

  applyFilter(): void {
    const q = this.search.toLowerCase();
    this.filtered.set(
      this.vendors().filter(v => {
        if (!this.showInactive && !v.is_active) return false;
        if (!q) return true;
        return v.name.toLowerCase().includes(q)
            || (v.email ?? '').toLowerCase().includes(q)
            || (v.contact_person ?? '').toLowerCase().includes(q);
      })
    );
  }

  openModal(v?: Vendor): void {
    this.editingId.set(v?.id ?? null);
    this.form = v ? {
      name: v.name, email: v.email ?? '', phone: v.phone ?? '',
      contact_person: v.contact_person ?? '', address: v.address ?? '',
      city: v.city ?? '', country: v.country ?? '',
      payment_terms: v.payment_terms,
      bank_name: v.bank_name ?? '', bank_account_number: v.bank_account_number ?? '',
      bank_sort_code: v.bank_sort_code ?? '', tax_id: v.tax_id ?? '',
      notes: v.notes ?? '', is_active: v.is_active,
    } : BLANK_FORM();
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.editingId.set(null); }

  save(): void {
    if (!this.form.name.trim()) { this.toast.error('Vendor name is required'); return; }
    this.saving.set(true);

    const payload = { ...this.form };
    const eid = this.editingId();
    const call = eid
      ? this.api.put(`/procurement/vendors/${eid}`, payload)
      : this.api.post('/procurement/vendors', payload);

    call.subscribe({
      next: () => {
        this.toast.success(eid ? 'Vendor updated' : 'Vendor created');
        this.saving.set(false);
        this.closeModal();
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed to save vendor'); this.saving.set(false); },
    });
  }

  async deleteVendor(v: Vendor): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete Vendor',
      message: `Delete "${v.name}"? This cannot be undone. Vendors with purchase orders on record cannot be deleted.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    this.api.delete(`/procurement/vendors/${v.id}`).subscribe({
      next: () => { this.toast.success('Vendor deleted'); this.load(); },
      error: (e: any) => this.toast.error(e.error?.message ?? 'Cannot delete this vendor'),
    });
  }

  cityCountry(v: Vendor): string {
    return [v.city, v.country].filter(s => !!s).join(', ');
  }

  termsLabel(t: string): string {
    return { cod: 'Cash on Delivery', net7: 'Net 7', net15: 'Net 15', net30: 'Net 30' }[t] ?? t;
  }
}
