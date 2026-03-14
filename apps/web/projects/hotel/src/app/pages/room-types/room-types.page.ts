import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService, ActivePropertyService} from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-room-types',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, DecimalPipe],
  template: `
    <ui-page-header title="Room Types" icon="tag" [breadcrumbs]="['Room Operation', 'Room Types']" subtitle="Manage room categories and pricing">
      <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700" (click)="showForm = !showForm; resetForm()">
        {{ showForm ? 'Cancel' : '+ Add Room Type' }}
      </button>
    </ui-page-header>

    @if (showForm) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">{{ editId ? 'Edit' : 'New' }} Room Type</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input [(ngModel)]="form.name" placeholder="Name (e.g. Deluxe)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.base_rate" type="number" placeholder="Nightly Rate (₦)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.hourly_rate" type="number" placeholder="Hourly Rate (₦)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.max_occupancy" type="number" placeholder="Max Occupancy" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.sort_order" type="number" placeholder="Sort Order" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <textarea [(ngModel)]="form.description" placeholder="Description" rows="1" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></textarea>
        </div>

        <!-- VAT toggle -->
        <div class="mt-4 pt-4 border-t border-gray-100">
          <div class="flex items-start gap-4 max-w-xl">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-700">Price is VAT-Inclusive</p>
              <p class="text-xs text-gray-400 mt-0.5">
                When enabled, the nightly rate already includes VAT (7.5%).
                The invoice will extract and display the VAT component — the guest's total stays the same.
                <br>When disabled, VAT is added on top of this rate on the invoice.
              </p>
            </div>
            <button type="button" (click)="form.price_includes_vat = !form.price_includes_vat"
              class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none mt-0.5"
              [class.bg-sage-600]="form.price_includes_vat" [class.bg-gray-200]="!form.price_includes_vat">
              <span class="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                [class.translate-x-5]="form.price_includes_vat" [class.translate-x-0]="!form.price_includes_vat"></span>
            </button>
          </div>

          <!-- Live preview of inclusive math -->
          @if (form.price_includes_vat && form.base_rate > 0) {
            <div class="mt-3 max-w-xs bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 space-y-1">
              <p class="font-semibold">VAT-inclusive breakdown (7.5%):</p>
              <div class="flex justify-between">
                <span>Total price charged</span>
                <span class="font-medium">₦{{ form.base_rate | number:'1.0-0' }}</span>
              </div>
              <div class="flex justify-between">
                <span>ex-VAT amount</span>
                <span class="font-medium">₦{{ (form.base_rate / 1.075) | number:'1.0-2' }}</span>
              </div>
              <div class="flex justify-between border-t border-emerald-200 pt-1">
                <span>VAT extracted (7.5%)</span>
                <span class="font-medium">₦{{ (form.base_rate - form.base_rate / 1.075) | number:'1.0-2' }}</span>
              </div>
            </div>
          }
          @if (!form.price_includes_vat && form.base_rate > 0) {
            <div class="mt-3 max-w-xs bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
              <p class="font-semibold">VAT-exclusive breakdown (7.5%):</p>
              <div class="flex justify-between">
                <span>Room price</span>
                <span class="font-medium">₦{{ form.base_rate | number:'1.0-0' }}</span>
              </div>
              <div class="flex justify-between">
                <span>VAT added (7.5%)</span>
                <span class="font-medium">₦{{ (form.base_rate * 0.075) | number:'1.0-2' }}</span>
              </div>
              <div class="flex justify-between border-t border-amber-200 pt-1 font-semibold">
                <span>Invoice total</span>
                <span>₦{{ (form.base_rate * 1.075) | number:'1.0-2' }}</span>
              </div>
            </div>
          }
        </div>

        <div class="flex gap-2 mt-4">
          <button (click)="save()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">
            {{ editId ? 'Update' : 'Create' }}
          </button>
          @if (editId) {
            <button (click)="showForm = false; editId = ''" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          }
        </div>
      </div>
    }

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="items()" [actions]="actions" [totalItems]="total()" (pageChange)="onPage($event)"></ui-data-table>
    }
  `,
})
export class RoomTypesPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  items = signal<any[]>([]);
  total = signal(0);
  page = 1;
  showForm = false;
  editId = '';
  propertyId = '';

  form: any = {
    name: '', base_rate: null, hourly_rate: null,
    max_occupancy: 2, description: '', sort_order: 0,
    price_includes_vat: true,   // Default: VAT-inclusive (standard in Nigeria)
  };

  columns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'base_rate', label: 'Nightly (₦)', render: (v: any) => `₦${Number(v).toLocaleString()}` },
    { key: 'hourly_rate', label: 'Hourly (₦)', render: (v: any) => v ? `₦${Number(v).toLocaleString()}` : '—' },
    { key: 'max_occupancy', label: 'Max Guests' },
    {
      key: 'price_includes_vat',
      label: 'VAT',
      render: (v: boolean) => v
        ? '<span class="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Inclusive</span>'
        : '<span class="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Exclusive</span>',
    },
    { key: 'is_active', label: 'Active', render: (v: boolean) => v ? '<span class="text-emerald-600">Yes</span>' : '<span class="text-gray-400">No</span>' },
  ];

  actions: TableAction[] = [
    { label: 'Edit', handler: (r) => this.edit(r) },
    { label: 'Deactivate', color: 'danger', handler: (r) => this.toggleActive(r), hidden: (r) => !r.is_active },
    { label: 'Activate', handler: (r) => this.toggleActive(r), hidden: (r) => r.is_active },
  ];

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (user?.property_id) this.propertyId = user.property_id;
    this.load();
  }

  load(): void {
    this.api.get('/room-types', { property_id: this.propertyId, page: this.page, limit: 50 }).subscribe({
      next: r => { if (r.success) { this.items.set(r.data ?? []); this.total.set(r.meta?.total ?? 0); } this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: any): void { this.page = e.page; this.load(); }

  resetForm(): void {
    this.editId = '';
    this.form = {
      name: '', base_rate: null, hourly_rate: null,
      max_occupancy: 2, description: '', sort_order: 0,
      price_includes_vat: true,
    };
  }

  edit(row: any): void {
    this.editId = row.id;
    this.form = {
      name:              row.name,
      base_rate:         Number(row.base_rate),
      hourly_rate:       row.hourly_rate ? Number(row.hourly_rate) : null,
      max_occupancy:     row.max_occupancy,
      description:       row.description ?? '',
      sort_order:        row.sort_order ?? 0,
      price_includes_vat: row.price_includes_vat !== false,  // default true if field absent
    };
    this.showForm = true;
  }

  save(): void {
    if (!this.form.name || !this.form.base_rate) {
      this.toast.error('Name and nightly rate are required');
      return;
    }
    const body = {
      ...this.form,
      property_id: this.propertyId,
      base_rate:   String(this.form.base_rate),
      hourly_rate: this.form.hourly_rate ? String(this.form.hourly_rate) : null,
      price_includes_vat: !!this.form.price_includes_vat,
    };

    const req = this.editId
      ? this.api.put(`/room-types/${this.editId}`, body)
      : this.api.post('/room-types', body);

    req.subscribe(r => {
      if (r.success) { this.toast.success(this.editId ? 'Updated' : 'Created'); this.showForm = false; this.resetForm(); this.load(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  async toggleActive(row: any): Promise<void> {
    const action = row.is_active ? 'Deactivate' : 'Activate';
    const ok = await this.confirm.confirm({ title: `${action} Room Type`, message: `${action} "${row.name}"?`, variant: row.is_active ? 'warning' : 'info' });
    if (ok) {
      this.api.put(`/room-types/${row.id}`, { is_active: !row.is_active }).subscribe(r => {
        if (r.success) { this.toast.success(`${action}d`); this.load(); }
      });
    }
  }
}
