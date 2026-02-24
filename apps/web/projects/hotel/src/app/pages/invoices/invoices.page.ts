import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, StatsCardComponent } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Invoices" icon="📄" [breadcrumbs]="['Finance', 'Invoices']" subtitle="Tax invoices and billing"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <ui-stats-card label="Total Invoices" [value]="invoices().length" icon="📄"></ui-stats-card>
        <ui-stats-card label="Issued" [value]="countByStatus('issued')" icon="📬"></ui-stats-card>
        <ui-stats-card label="Paid" [value]="countByStatus('paid')" icon="✅"></ui-stats-card>
        <ui-stats-card label="Total Revenue" [value]="'₦' + totalRevenue().toLocaleString()" icon="💰"></ui-stats-card>
      </div>

      <div class="flex gap-2 mb-4">
        @for (tab of statusTabs; track tab.value) {
          <button (click)="filterStatus = tab.value; loadInvoices()" class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
            [class]="filterStatus === tab.value ? 'bg-sage-600 text-white border-sage-600' : 'border-gray-300 text-gray-500 hover:bg-gray-50'">
            {{ tab.label }}
          </button>
        }
      </div>

      <ui-data-table [data]="invoices()" [columns]="columns" [actions]="actions" emptyMessage="No invoices found"></ui-data-table>
    }
  `,
})
export class InvoicesPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(true);
  invoices = signal<any[]>([]);
  filterStatus = '';
  propertyId = '';

  statusTabs = [
    { label: 'All', value: '' }, { label: 'Issued', value: 'issued' }, { label: 'Paid', value: 'paid' }, { label: 'Void', value: 'void' },
  ];

  columns: TableColumn[] = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'guest_name', label: 'Guest' },
    { key: 'status', label: 'Status', render: (r) => {
      const colors: Record<string, string> = { issued: '#f59e0b', paid: '#22c55e', void: '#ef4444' };
      return `<span style="color:${colors[r.status] || '#6b7280'};font-weight:600">${r.status.toUpperCase()}</span>`;
    }},
    { key: 'grand_total', label: 'Total', render: (r) => `₦${(+r.grand_total).toLocaleString()}` },
    { key: 'tax_total', label: 'VAT', render: (r) => `₦${(+r.tax_total).toLocaleString()}` },
    { key: 'invoice_date', label: 'Date' },
  ];

  actions: TableAction[] = [
    { label: 'View', handler: (r) => this.router.navigate(['/invoices', r.id]) },
    { label: 'PDF', handler: (r) => this.downloadPdf(r.id) },
  ];

  ngOnInit(): void {
    this.propertyId = this.auth.currentUser?.property_id ?? '';
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading.set(true);
    const params: any = { property_id: this.propertyId, limit: 50 };
    if (this.filterStatus) params.status = this.filterStatus;
    this.api.get('/invoices', params).subscribe(r => {
      if (r.success) this.invoices.set(r.data ?? []);
      this.loading.set(false);
    });
  }

  countByStatus(status: string): number {
    return this.invoices().filter((i: any) => i.status === status).length;
  }

  totalRevenue(): number {
    return this.invoices().filter((i: any) => i.status !== 'void').reduce((s: number, i: any) => s + (+i.grand_total), 0);
  }

  downloadPdf(id: string): void {
    window.open(`/api/invoices/${id}/pdf`, '_blank');
  }
}
