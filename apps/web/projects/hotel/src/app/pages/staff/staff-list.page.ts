import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService } from '@lodgik/shared';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="Staff" subtitle="Manage hotel staff members">
      <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700" (click)="showAdd = !showAdd">
        {{ showAdd ? 'Cancel' : '+ Add Staff' }}
      </button>
    </ui-page-header>

    @if (showAdd) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Add Staff Member</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input [(ngModel)]="form.first_name" placeholder="First name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.last_name" placeholder="Last name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.email" type="email" placeholder="Email" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.password" type="password" placeholder="Password" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <select [(ngModel)]="form.role" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="manager">Manager</option><option value="front_desk">Front Desk</option>
            <option value="housekeeping">Housekeeping</option><option value="maintenance">Maintenance</option>
            <option value="restaurant">Restaurant</option><option value="bar">Bar</option>
            <option value="kitchen">Kitchen</option><option value="accountant">Accountant</option>
            <option value="security">Security</option><option value="concierge">Concierge</option>
          </select>
        </div>
        <button (click)="addStaff()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Add</button>
      </div>
    }

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="staff()" [actions]="actions" [totalItems]="total()" (pageChange)="onPage($event)"></ui-data-table>
    }
  `,
})
export class StaffListPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  loading = signal(true); staff = signal<any[]>([]); total = signal(0); page = 1;
  showAdd = false;
  form: any = { first_name: '', last_name: '', email: '', password: '', role: 'front_desk' };

  columns: TableColumn[] = [
    { key: 'first_name', label: 'First Name', sortable: true },
    { key: 'last_name', label: 'Last Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (v: string) => `<span class="px-2 py-0.5 bg-gray-100 rounded text-xs">${v}</span>` },
    { key: 'is_active', label: 'Active', render: (v: boolean) => v ? '<span class="text-emerald-600">Active</span>' : '<span class="text-gray-400">Inactive</span>' },
  ];
  actions: TableAction[] = [
    { label: 'Deactivate', color: 'danger', handler: (r) => this.deactivate(r), hidden: (r) => !r.is_active },
  ];

  ngOnInit(): void { this.load(); }
  load(): void {
    this.api.get('/staff', { page: this.page, limit: 20 }).subscribe({ next: r => { if (r.success) { this.staff.set(r.data); this.total.set(r.meta?.total ?? 0); } this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  onPage(e: any): void { this.page = e.page; this.load(); }
  addStaff(): void {
    this.api.post('/staff', this.form).subscribe(r => {
      if (r.success) { this.toast.success('Staff added'); this.showAdd = false; this.load(); }
      else this.toast.error(r.message || 'Failed');
    });
  }
  async deactivate(row: any): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Deactivate Staff', message: `Deactivate ${row.first_name} ${row.last_name}?`, variant: 'warning' });
    if (ok) this.api.patch(`/staff/${row.id}`, { is_active: false }).subscribe(r => { if (r.success) { this.toast.success('Deactivated'); this.load(); } });
  }
}
