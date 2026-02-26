import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, StatsCardComponent, ToastService } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Invoices" icon="file-text" [breadcrumbs]="['Finance', 'Invoices']" subtitle="Tax invoices and billing"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <ui-stats-card label="Total Invoices" [value]="invoices().length" icon="file-text"></ui-stats-card>
        <ui-stats-card label="Issued" [value]="countByStatus('issued')" icon="file-text"></ui-stats-card>
        <ui-stats-card label="Paid" [value]="countByStatus('paid')" icon="circle-check"></ui-stats-card>
        <ui-stats-card label="Total Revenue" [value]="'₦' + totalRevenue().toLocaleString()" icon="hand-coins"></ui-stats-card>
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
  private toast = inject(ToastService);

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
    { key: 'status', label: 'Status', render: (v: string) => {
      const colors: Record<string, string> = { issued: '#f59e0b', paid: '#22c55e', void: '#ef4444', draft: '#6b7280' };
      return `<span style="color:${colors[v] || '#6b7280'};font-weight:600">${(v || '').toUpperCase()}</span>`;
    }},
    { key: 'grand_total', label: 'Total', render: (v: any) => `₦${(+v).toLocaleString()}` },
    { key: 'tax_total', label: 'VAT', render: (v: any) => `₦${(+v).toLocaleString()}` },
    { key: 'invoice_date', label: 'Date', render: (v: string) => v ? new Date(v).toLocaleDateString() : '—' },
  ];

  actions: TableAction[] = [
    { label: 'View', handler: (r) => this.router.navigate(['/invoices', r.id]) },
    { label: 'Mark Paid', handler: (r) => this.markPaid(r), hidden: (r) => r.status !== 'issued' },
    { label: 'Void', handler: (r) => this.voidInvoice(r), hidden: (r) => r.status === 'void' || r.status === 'paid' },
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

  markPaid(row: any): void {
    this.api.post(`/invoices/${row.id}/pay`, { payment_method: 'bank_transfer' }).subscribe((r: any) => {
      if (r.success) { this.toast.success('Invoice marked as paid'); this.loadInvoices(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  voidInvoice(row: any): void {
    if (!confirm(`Void invoice ${row.invoice_number}?`)) return;
    this.api.post(`/invoices/${row.id}/void`, {}).subscribe((r: any) => {
      if (r.success) { this.toast.success('Invoice voided'); this.loadInvoices(); }
      else this.toast.error(r.message || 'Failed');
    });
  }
}
