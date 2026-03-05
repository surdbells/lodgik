import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, StatsCardComponent, ActivePropertyService} from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-folios',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Folios" icon="folder-open" [breadcrumbs]="['Finance', 'Folios']" subtitle="Guest accounts and charges"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <ui-stats-card label="Open Folios" [value]="stats().open" icon="folder-open"></ui-stats-card>
        <ui-stats-card label="Pending Payments" [value]="stats().pending" icon="clock"></ui-stats-card>
        <ui-stats-card label="Outstanding Balance" [value]="'₦' + stats().outstanding.toLocaleString('en-NG', {minimumFractionDigits:0})" icon="hand-coins"></ui-stats-card>
        <ui-stats-card label="Collected Today" [value]="'₦' + stats().collectedToday.toLocaleString('en-NG', {minimumFractionDigits:0})" icon="circle-check"></ui-stats-card>
      </div>

      <!-- Filter -->
      <div class="flex gap-2 mb-4">
        @for (tab of statusTabs; track tab.value) {
          <button (click)="filterStatus = tab.value; loadFolios()" class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
            [class]="filterStatus === tab.value ? 'bg-sage-600 text-white border-sage-600' : 'border-gray-300 text-gray-500 hover:bg-gray-50'">
            {{ tab.label }}
          </button>
        }
      </div>

      <ui-data-table [data]="folios()" [columns]="columns" [actions]="actions" emptyMessage="No folios found"></ui-data-table>
    }
  `,
})
export class FoliosPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  folios = signal<any[]>([]);
  stats = signal({ open: 0, pending: 0, outstanding: 0, closedToday: 0, collectedToday: 0 });
  filterStatus = '';
  propertyId = '';

  statusTabs = [
    { label: 'All', value: '' }, { label: 'Open', value: 'open' }, { label: 'Closed', value: 'closed' },
  ];

  columns: TableColumn[] = [
    { key: 'folio_number', label: 'Folio #' },
    { key: 'status_label', label: 'Status', type: 'badge', badgeColor: (r) => r.status_color || '#6b7280', badgeLabel: (r) => r.status_label || r.status },
    { key: 'total_charges', label: 'Charges', render: (v) => `₦${(+v).toLocaleString()}` },
    { key: 'total_payments', label: 'Paid', render: (v) => `₦${(+v).toLocaleString()}` },
    { key: 'balance', label: 'Balance', render: (v) => `<span style="color:${+v > 0 ? '#ef4444' : '#22c55e'};font-weight:600">₦${(+v).toLocaleString()}</span>` },
    { key: 'created_at', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ];

  actions: TableAction[] = [
    { label: 'View', handler: (r) => this.router.navigate(['/folios', r.id]) },
  ];

  ngOnInit(): void {
    this.propertyId = this.activeProperty.propertyId();
    this.loadFolios();
  }

  loadFolios(): void {
    this.loading.set(true);
    const params: any = { property_id: this.propertyId, limit: 50 };
    if (this.filterStatus) params.status = this.filterStatus;
    this.api.get('/folios', params).subscribe(r => {
      if (r.success) {
        const data = r.data ?? [];
        this.folios.set(data);
        const open = data.filter((f: any) => f.status === 'open');
        this.stats.set({
          open: open.length,
          pending: 0,
          outstanding: open.reduce((s: number, f: any) => s + Math.max(0, +f.balance), 0),
          closedToday: data.filter((f: any) => f.status === 'closed' && f.closed_at?.startsWith(new Date().toISOString().slice(0, 10))).length,
          collectedToday: data.filter((f: any) => f.status === 'closed' && f.closed_at?.startsWith(new Date().toISOString().slice(0, 10))).reduce((s: number, f: any) => s + Math.max(0, +f.total_charges), 0),
        });
      }
      this.loading.set(false);
    });

    // Get pending payments count
    this.api.get('/folios/pending-payments', { property_id: this.propertyId }).subscribe(r => {
      if (r.success) this.stats.update(s => ({ ...s, pending: (r.data ?? []).length }));
    });

    // Collected today — from daily-revenue report (advanced_analytics gate handles 403 gracefully)
    const today = new Date().toISOString().slice(0, 10);
    this.api.get<any>('/reports/daily-revenue', {
      property_id: this.propertyId, date: today,
    }).subscribe({
      next: r => {
        if (r.success && r.data?.summary) {
          const s = r.data.summary;
          const total = (+s.cash_total || 0) + (+s.bank_transfer_total || 0) + (+s.pos_card_total || 0);
          this.stats.update(st => ({ ...st, collectedToday: total }));
        }
      },
      error: () => { /* advanced_analytics may not be enabled — silently skip */ },
    });
  }
}
