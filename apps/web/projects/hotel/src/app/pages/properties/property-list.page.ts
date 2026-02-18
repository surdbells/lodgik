import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Properties" subtitle="Manage your hotel properties"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="properties()" [totalItems]="properties().length" [searchable]="true"></ui-data-table>
    }
  `,
})
export class PropertyListPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true); properties = signal<any[]>([]);

  columns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'star_rating', label: 'Stars', align: 'center', render: (v: number) => v ? '⭐'.repeat(v) : '—' },
    { key: 'check_in_time', label: 'Check-in' },
    { key: 'check_out_time', label: 'Check-out' },
    { key: 'is_active', label: 'Active', render: (v: boolean) => v ? '<span class="text-emerald-600">Yes</span>' : '<span class="text-gray-400">No</span>' },
  ];

  ngOnInit(): void {
    this.api.get('/tenant/properties').subscribe({ next: r => { if (r.success) this.properties.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
}
