import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-app-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="App Releases" subtitle="Manage platform app distribution"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="releases()" [actions]="actions" [totalItems]="total()"></ui-data-table>
    }
  `,
})
export class AppListPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);
  releases = signal<any[]>([]);
  total = signal(0);

  columns: TableColumn[] = [
    { key: 'app_type', label: 'Platform', sortable: true },
    { key: 'version', label: 'Version', sortable: true },
    { key: 'build_number', label: 'Build', align: 'center' },
    { key: 'status', label: 'Status', render: (v: string) => {
      const cls: Record<string,string> = { draft: 'bg-gray-100 text-gray-600', published: 'bg-emerald-50 text-emerald-700', deprecated: 'bg-red-50 text-red-600' };
      return `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${cls[v] || ''}">${v}</span>`;
    }},
    { key: 'is_latest', label: 'Latest', render: (v: boolean) => v ? '✅' : '' },
    { key: 'download_count', label: 'Downloads', align: 'center' },
  ];
  actions: TableAction[] = [
    { label: 'Publish', handler: (r) => this.publish(r), hidden: (r) => r.status === 'published' },
    { label: 'Deprecate', color: 'warning', handler: (r) => this.deprecate(r), hidden: (r) => r.status !== 'published' },
  ];

  ngOnInit(): void { this.load(); }
  load(): void {
    this.api.get('/admin/releases').subscribe({ next: r => { if (r.success) { this.releases.set(r.data); this.total.set(r.meta?.total ?? 0); } this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  publish(row: any): void { this.api.post(`/admin/releases/${row.id}/publish`).subscribe(r => { if (r.success) { this.toast.success('Published'); this.load(); } }); }
  deprecate(row: any): void { this.api.post(`/admin/releases/${row.id}/deprecate`).subscribe(r => { if (r.success) { this.toast.success('Deprecated'); this.load(); } }); }
}
