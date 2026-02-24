import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-room-types',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Room Types" icon="🏷️" [breadcrumbs]="['Room Operation', 'Room Types']" subtitle="Manage room categories and pricing">
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
        <div class="flex gap-2 mt-3">
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

  loading = signal(true);
  items = signal<any[]>([]);
  total = signal(0);
  page = 1;
  showForm = false;
  editId = '';
  propertyId = '';

  form: any = { name: '', base_rate: null, hourly_rate: null, max_occupancy: 2, description: '', sort_order: 0 };

  columns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'base_rate', label: 'Nightly (₦)', render: (v: any) => `₦${Number(v).toLocaleString()}` },
    { key: 'hourly_rate', label: 'Hourly (₦)', render: (v: any) => v ? `₦${Number(v).toLocaleString()}` : '—' },
    { key: 'max_occupancy', label: 'Max Guests' },
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
    this.form = { name: '', base_rate: null, hourly_rate: null, max_occupancy: 2, description: '', sort_order: 0 };
  }

  edit(row: any): void {
    this.editId = row.id;
    this.form = { name: row.name, base_rate: Number(row.base_rate), hourly_rate: row.hourly_rate ? Number(row.hourly_rate) : null, max_occupancy: row.max_occupancy, description: row.description ?? '', sort_order: row.sort_order ?? 0 };
    this.showForm = true;
  }

  save(): void {
    if (!this.form.name || !this.form.base_rate) {
      this.toast.error('Name and nightly rate are required');
      return;
    }
    const body = { ...this.form, property_id: this.propertyId, base_rate: String(this.form.base_rate), hourly_rate: this.form.hourly_rate ? String(this.form.hourly_rate) : null };

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
