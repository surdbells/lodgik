import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, ToastService, LoadingSpinnerComponent, ConfirmDialogService } from '@lodgik/shared';

@Component({
  selector: 'app-plan-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="Subscription Plans" subtitle="Manage pricing plans">
      <button class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700" (click)="showCreate = !showCreate">
        {{ showCreate ? 'Cancel' : '+ New Plan' }}
      </button>
    </ui-page-header>

    @if (showCreate) {
      <div class="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Create Plan</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <input [(ngModel)]="form.name" placeholder="Plan name" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <select [(ngModel)]="form.tier" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="starter">Starter</option><option value="professional">Professional</option>
            <option value="business">Business</option><option value="enterprise">Enterprise</option>
          </select>
          <input [(ngModel)]="form.monthly_price" type="number" placeholder="Monthly (NGN)" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <input [(ngModel)]="form.annual_price" type="number" placeholder="Annual (NGN)" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <input [(ngModel)]="form.max_rooms" type="number" placeholder="Max rooms" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <input [(ngModel)]="form.max_staff" type="number" placeholder="Max staff" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <button (click)="create()" class="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Create</button>
      </div>
    }

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="plans()" [actions]="actions" [totalItems]="plans().length" [searchable]="false"></ui-data-table>
    }
  `,
})
export class PlanListPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  loading = signal(true);
  plans = signal<any[]>([]);
  showCreate = false;
  form: any = { name: '', tier: 'starter', monthly_price: 0, annual_price: 0, max_rooms: 10, max_staff: 5 };

  columns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'tier', label: 'Tier', sortable: true },
    { key: 'monthly_price', label: 'Monthly (NGN)', align: 'right', render: (v: number) => `₦${(v||0).toLocaleString()}` },
    { key: 'annual_price', label: 'Annual (NGN)', align: 'right', render: (v: number) => `₦${(v||0).toLocaleString()}` },
    { key: 'max_rooms', label: 'Rooms', align: 'center' },
    { key: 'max_staff', label: 'Staff', align: 'center' },
    { key: 'is_active', label: 'Active', render: (v: boolean) => v ? '<span class="text-emerald-600">Yes</span>' : '<span class="text-gray-400">No</span>' },
  ];
  actions: TableAction[] = [
    { label: 'Delete', color: 'danger', handler: (r) => this.deletePlan(r) },
  ];

  ngOnInit(): void { this.load(); }
  load(): void {
    this.api.get('/plans').subscribe({ next: r => { if (r.success) this.plans.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  create(): void {
    this.api.post('/admin/plans', this.form).subscribe(r => {
      if (r.success) { this.toast.success('Plan created'); this.showCreate = false; this.load(); }
    });
  }
  async deletePlan(row: any): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Delete Plan', message: `Delete "${row.name}"?`, variant: 'danger' });
    if (ok) this.api.delete(`/admin/plans/${row.id}`).subscribe(r => { if (r.success) { this.toast.success('Deleted'); this.load(); } });
  }
}
