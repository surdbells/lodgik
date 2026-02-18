import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, BadgeComponent, StatusVariantPipe, ToastService, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Tenants" subtitle="Manage hotel tenants on the platform">
      <button class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700" (click)="inviteTenant()">
        + Invite Tenant
      </button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <ui-data-table
        [columns]="columns"
        [data]="tenants()"
        [actions]="actions"
        [totalItems]="total()"
        [page]="page"
        [limit]="20"
        searchPlaceholder="Search tenants..."
        (pageChange)="onPage($event)"
        (search)="onSearch($event)">
      </ui-data-table>
    }
  `,
})
export class TenantListPage implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = signal(true);
  tenants = signal<any[]>([]);
  total = signal(0);
  page = 1;

  columns: TableColumn[] = [
    { key: 'name', label: 'Hotel Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'subscription_status', label: 'Status', sortable: true,
      render: (v: string) => `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${this.statusClass(v)}">${v}</span>` },
    { key: 'plan_name', label: 'Plan' },
    { key: 'max_rooms', label: 'Rooms', align: 'center' },
    { key: 'created_at', label: 'Joined', render: (v: string) => v ? new Date(v).toLocaleDateString() : '—' },
  ];

  actions: TableAction[] = [
    { label: 'View', handler: (row) => this.router.navigate(['/tenants', row.id]) },
    { label: 'Suspend', color: 'danger', handler: (row) => this.suspend(row),
      hidden: (row) => row.subscription_status === 'suspended' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get('/admin/tenants', { page: this.page, limit: 20 }).subscribe({
      next: res => {
        if (res.success) { this.tenants.set(res.data); this.total.set(res.meta?.total ?? 0); }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: any): void { this.page = e.page; this.load(); }
  onSearch(q: string): void { /* client-side filtering handled by DataTable */ }
  inviteTenant(): void { this.router.navigate(['/invitations']); }

  suspend(row: any): void {
    this.api.patch(`/admin/tenants/${row.id}/suspend`).subscribe(res => {
      if (res.success) { this.toast.success('Tenant suspended'); this.load(); }
    });
  }

  private statusClass(s: string): string {
    const map: Record<string, string> = {
      active: 'bg-emerald-50 text-emerald-700', trial: 'bg-blue-50 text-blue-700',
      suspended: 'bg-red-50 text-red-700', cancelled: 'bg-gray-100 text-gray-600',
      past_due: 'bg-amber-50 text-amber-700', expired: 'bg-gray-100 text-gray-500',
    };
    return map[s] || 'bg-gray-100 text-gray-600';
  }
}
