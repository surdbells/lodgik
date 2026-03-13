import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, map, of } from 'rxjs';
import {
  ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction,
  LoadingSpinnerComponent, StatsCardComponent, ToastService, ActivePropertyService,
  ConfirmDialogService, ConfirmDialogComponent, SearchableDropdownComponent,
  HasPermDirective, PermDisableDirective, TokenService,
} from '@lodgik/shared';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent,
    StatsCardComponent, ConfirmDialogComponent, SearchableDropdownComponent,
    HasPermDirective, PermDisableDirective,
  ],
  template: `
    <ui-confirm-dialog/>

    <ui-page-header title="Invoices" icon="file-text" [breadcrumbs]="['Finance', 'Invoices']" subtitle="Tax invoices and billing records">
      <button (click)="showCreate = !showCreate" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors">
        {{ showCreate ? '✕ Cancel' : '+ Create Invoice' }}
      </button>
    </ui-page-header>

    @if (showCreate) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-1">Create Invoice</h3>
        <p class="text-xs text-gray-400 mb-4">Search by booking ref, guest name, folio number, or email.</p>
        <div class="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
          <button (click)="createTab = 'booking'" class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            [class.bg-white]="createTab==='booking'" [class.shadow-sm]="createTab==='booking'"
            [class.text-gray-900]="createTab==='booking'" [class.text-gray-500]="createTab!=='booking'">By Booking</button>
          <button (click)="createTab = 'folio'" class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            [class.bg-white]="createTab==='folio'" [class.shadow-sm]="createTab==='folio'"
            [class.text-gray-900]="createTab==='folio'" [class.text-gray-500]="createTab!=='folio'">By Folio</button>
        </div>
        @if (createTab === 'booking') {
          <div class="max-w-md">
            <label class="block text-xs font-medium text-gray-500 mb-1">Search Booking</label>
            <ui-searchable-dropdown [searchFn]="searchBookings" labelKey="booking_ref" sublabelKey="guest_name" placeholder="Booking ref or guest name…" noResultsText="No bookings found" (selected)="onBookingSelected($event)"/>
          </div>
        } @else {
          <div class="max-w-md">
            <label class="block text-xs font-medium text-gray-500 mb-1">Search Folio</label>
            <ui-searchable-dropdown [searchFn]="searchFolios" labelKey="folio_number" sublabelKey="guest_name" placeholder="Folio number or guest name…" noResultsText="No invoiceable folios found" (selected)="onFolioSelected($event)"/>
          </div>
        }
        @if (selectedFolioPreview()) {
          <div class="mt-4 max-w-md p-4 bg-sage-50 border border-sage-200 rounded-xl">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ selectedFolioPreview()!.guest_name }}</p>
                <p class="text-xs text-gray-500 mt-0.5">Folio {{ selectedFolioPreview()!.folio_number }}
                  @if (selectedFolioPreview()!.booking_ref) { · Booking {{ selectedFolioPreview()!.booking_ref }} }</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold text-sage-700">₦{{ (+selectedFolioPreview()!.balance).toLocaleString() }}</p>
                <p class="text-xs text-gray-400 mt-0.5">Balance</p>
              </div>
            </div>
            @if (selectedFolioPreview()!.folio_status !== 'closed') {
              <p class="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">⚠️ Folio is <strong>{{ selectedFolioPreview()!.folio_status }}</strong> — only closed folios can be invoiced.</p>
            } @else {
              <button (click)="createInvoice()" [disabled]="creatingInvoice()" [permDisable]="'invoices.create'"
                class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-50 transition-colors">
                {{ creatingInvoice() ? 'Generating…' : '🧾 Generate Invoice' }}
              </button>
            }
          </div>
        }
      </div>
    }

    <ui-loading [loading]="loading()"/>

    @if (!loading()) {
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <ui-stats-card label="Total" [value]="invoices().length" icon="file-text"/>
        <ui-stats-card label="Issued" [value]="countByStatus('issued')" icon="clock"/>
        <ui-stats-card label="Paid" [value]="countByStatus('paid')" icon="circle-check"/>
        <ui-stats-card label="Revenue" [value]="'₦' + totalRevenue().toLocaleString()" icon="hand-coins"/>
      </div>
      <div class="flex flex-wrap gap-2 mb-4">
        @for (tab of statusTabs; track tab.value) {
          <button (click)="filterStatus = tab.value; loadInvoices()" class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
            [class]="filterStatus === tab.value ? 'bg-sage-600 text-white border-sage-600' : 'border-gray-300 text-gray-500 hover:bg-gray-50'">{{ tab.label }}</button>
        }
      </div>
      <ui-data-table [data]="invoices()" [columns]="columns" [actions]="actions" emptyMessage="No invoices found"/>
    }

    @if (payModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40" (click)="closePayModal()"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h3 class="text-base font-semibold text-gray-900 mb-1">Record Payment</h3>
          <p class="text-xs text-gray-400 mb-4">Invoice {{ payModal()!.invoice_number }} · Balance ₦{{ balanceDue().toLocaleString() }}</p>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Amount (₦)</label>
              <input type="number" [(ngModel)]="payForm.amount" [max]="balanceDue()" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" [placeholder]="balanceDue().toString()"/>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
              <select [(ngModel)]="payForm.method" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="pos_card">POS / Card</option>
              </select>
            </div>
            @if (payForm.method === 'bank_transfer') {
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Transfer Reference</label>
                <input [(ngModel)]="payForm.reference" placeholder="e.g. NXP2024123456" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
            }
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
              <input [(ngModel)]="payForm.notes" placeholder="Additional remarks…" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
            </div>
          </div>
          <div class="flex gap-2 mt-6">
            <button (click)="submitPayment()" [disabled]="recordingPayment()" [permDisable]="'invoices.record_payment'"
              class="flex-1 px-4 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50 transition-colors">
              {{ recordingPayment() ? 'Recording…' : 'Record Payment' }}
            </button>
            <button (click)="closePayModal()" class="px-4 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class InvoicesPage implements OnInit {
  private api            = inject(ApiService);
  private router         = inject(Router);
  private token          = inject(TokenService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);
  private confirm        = inject(ConfirmDialogService);

  loading          = signal(true);
  invoices         = signal<any[]>([]);
  filterStatus     = '';
  propertyId       = '';
  showCreate       = false;
  createTab: 'booking' | 'folio' = 'booking';
  creatingInvoice  = signal(false);
  recordingPayment = signal(false);
  payModal         = signal<any>(null);
  payForm          = { amount: 0, method: 'cash', reference: '', notes: '' };
  selectedFolioPreview = signal<any>(null);

  statusTabs = [
    { label: 'All', value: '' },
    { label: 'Issued', value: 'issued' },
    { label: 'Paid', value: 'paid' },
    { label: 'Void', value: 'void' },
  ];

  columns: TableColumn[] = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'guest_name', label: 'Guest' },
    { key: 'status', label: 'Status', render: (v: string) => {
      const c: Record<string,string> = { issued:'#f59e0b', paid:'#22c55e', void:'#ef4444', draft:'#6b7280' };
      return `<span style="color:${c[v]||'#6b7280'};font-weight:600;font-size:11px;text-transform:uppercase">${v}</span>`;
    }},
    { key: 'grand_total', label: 'Total', render: (v: any) => `₦${(+v).toLocaleString()}` },
    { key: 'amount_paid',  label: 'Paid',  render: (v: any) => `₦${(+v).toLocaleString()}` },
    { key: 'tax_total',    label: 'VAT',   render: (v: any) => `₦${(+v).toLocaleString()}` },
    { key: 'invoice_date', label: 'Date',  render: (v: string) => v ? new Date(v).toLocaleDateString() : '—' },
  ];

  get actions(): TableAction[] {
    return [
      { label: 'View',  handler: (r) => this.router.navigate(['/invoices', r.id]) },
      { label: 'Pay',   handler: (r) => this.openPayModal(r),  hidden: (r) => r.status !== 'issued'  || !this.token.can('invoices.record_payment') },
      { label: 'Email', handler: (r) => this.emailInvoice(r),  hidden: (_r) => !this.token.can('invoices.email') },
      { label: 'PDF',   handler: (r) => this.downloadPdf(r.id), hidden: (_r) => !this.token.can('invoices.download_pdf') },
      { label: 'Void',  handler: (r) => this.voidInvoice(r),   hidden: (r) => r.status === 'void' || r.status === 'paid' || !this.token.can('invoices.void') },
    ];
  }

  ngOnInit(): void {
    this.propertyId = this.activeProperty.propertyId();
    this.loadInvoices();
  }

  searchBookings = (q: string): Observable<any[]> => {
    if (!q.trim()) return of([]);
    return this.api.get<any>('/bookings/search', { property_id: this.propertyId, q }).pipe(map(r => r.success ? (r.data ?? []) : []));
  };

  searchFolios = (q: string): Observable<any[]> => {
    if (!q.trim()) return of([]);
    return this.api.get<any>('/folios/search', { property_id: this.propertyId, q }).pipe(map(r => r.success ? (r.data ?? []) : []));
  };

  onBookingSelected(item: any): void {
    if (!item) { this.selectedFolioPreview.set(null); return; }
    this.selectedFolioPreview.set({
      folio_id: item.folio_id,
      folio_number: item.folio_number || '—',
      folio_status: item.folio_status || 'none',
      balance: item.balance ?? 0,
      guest_name: item.guest_name,
      booking_ref: item.booking_ref,
    });
  }

  onFolioSelected(item: any): void {
    if (!item) { this.selectedFolioPreview.set(null); return; }
    this.selectedFolioPreview.set(item);
  }

  createInvoice(): void {
    const p = this.selectedFolioPreview();
    if (!p?.folio_id) { this.toast.error('No folio selected'); return; }
    if (p.folio_status !== 'closed') { this.toast.error('Folio must be closed before invoicing'); return; }
    this.creatingInvoice.set(true);
    this.api.post('/invoices', { folio_id: p.folio_id }).subscribe((r: any) => {
      this.creatingInvoice.set(false);
      if (r.success) {
        this.toast.success('Invoice generated');
        this.showCreate = false;
        this.selectedFolioPreview.set(null);
        this.loadInvoices();
        const id = r.data?.invoice?.id ?? r.data?.id;
        if (id) this.router.navigate(['/invoices', id]);
      } else {
        this.toast.error(r.message || 'Failed to generate invoice');
      }
    });
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

  countByStatus(s: string): number { return this.invoices().filter((i: any) => i.status === s).length; }
  totalRevenue(): number { return this.invoices().filter((i: any) => i.status !== 'void').reduce((sum: number, i: any) => sum + (+i.grand_total), 0); }
  downloadPdf(id: string): void { window.open(`/api/invoices/${id}/pdf`, '_blank'); }

  emailInvoice(row: any): void {
    this.api.post(`/invoices/${row.id}/email`).subscribe((r: any) => {
      r.success ? this.toast.success('Invoice emailed') : this.toast.error(r.message || 'Failed');
    });
  }

  async voidInvoice(row: any): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Void Invoice', message: `Void ${row.invoice_number}? Cannot be undone.`, confirmLabel: 'Void', variant: 'danger' });
    if (!ok) return;
    this.api.post(`/invoices/${row.id}/void`, {}).subscribe((r: any) => {
      r.success ? (this.toast.success('Voided'), this.loadInvoices()) : this.toast.error(r.message || 'Failed');
    });
  }

  balanceDue = computed(() => {
    const inv = this.payModal();
    return inv ? Math.max(0, (+inv.grand_total) - (+inv.amount_paid)) : 0;
  });

  openPayModal(row: any): void {
    this.payModal.set(row);
    this.payForm = { amount: Math.max(0, (+row.grand_total) - (+row.amount_paid)), method: 'cash', reference: '', notes: '' };
  }

  closePayModal(): void { this.payModal.set(null); }

  submitPayment(): void {
    const inv = this.payModal();
    if (!inv || this.payForm.amount <= 0) { this.toast.error('Enter a valid amount'); return; }
    this.recordingPayment.set(true);
    this.api.post(`/invoices/${inv.id}/pay`, {
      amount: this.payForm.amount,
      payment_method: this.payForm.method,
      reference: this.payForm.reference || undefined,
      notes: this.payForm.notes || undefined,
    }).subscribe((r: any) => {
      this.recordingPayment.set(false);
      if (r.success) { this.toast.success('Payment recorded'); this.closePayModal(); this.loadInvoices(); }
      else this.toast.error(r.message || 'Failed');
    });
  }
}
