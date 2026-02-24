import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, ConfirmDialogService } from '@lodgik/shared';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header [title]="invoice()?.invoice_number || 'Invoice'" subtitle="Invoice details">
      <div class="flex gap-2">
        <a routerLink="/invoices" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Back</a>
        <button (click)="downloadPdf()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">📄 PDF</button>
        <button (click)="emailInvoice()" class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">📧 Email</button>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && invoice()) {
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Invoice Preview -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-card p-6">
          <!-- Header -->
          <div class="flex justify-between items-start mb-6">
            <div>
              <h2 class="text-xl font-bold text-gray-900">INVOICE</h2>
              <p class="text-lg font-semibold text-sage-700 mt-1">{{ invoice()!.invoice_number }}</p>
            </div>
            <div class="text-right text-sm">
              <p>Date: {{ invoice()!.invoice_date }}</p>
              @if (invoice()!.due_date) { <p>Due: {{ invoice()!.due_date }}</p> }
              <p class="mt-1">
                <span class="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      [style.background-color]="statusColor()">{{ invoice()!.status.toUpperCase() }}</span>
              </p>
            </div>
          </div>

          <!-- Bill To -->
          <div class="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <span class="text-xs font-semibold text-gray-400 uppercase">Bill To</span>
              <p class="font-medium mt-1">{{ invoice()!.guest_name }}</p>
              @if (invoice()!.guest_email) { <p class="text-gray-500">{{ invoice()!.guest_email }}</p> }
              @if (invoice()!.guest_phone) { <p class="text-gray-500">{{ invoice()!.guest_phone }}</p> }
            </div>
            <div class="text-right">
              <span class="text-xs font-semibold text-gray-400 uppercase">Currency</span>
              <p class="font-medium mt-1">{{ invoice()!.currency }}</p>
            </div>
          </div>

          <!-- Items Table -->
          <table class="w-full text-sm mb-6">
            <thead>
              <tr class="border-b-2 border-gray-200">
                <th class="text-left py-2 text-xs font-semibold text-gray-500">Description</th>
                <th class="text-center py-2 text-xs font-semibold text-gray-500 w-16">Qty</th>
                <th class="text-right py-2 text-xs font-semibold text-gray-500 w-28">Unit Price</th>
                <th class="text-right py-2 text-xs font-semibold text-gray-500 w-28">Amount</th>
                <th class="text-right py-2 text-xs font-semibold text-gray-500 w-20">VAT</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr class="border-b border-gray-100">
                  <td class="py-2">{{ item.description }}</td>
                  <td class="py-2 text-center">{{ item.quantity }}</td>
                  <td class="py-2 text-right">₦{{ (+item.unit_price).toLocaleString() }}</td>
                  <td class="py-2 text-right">₦{{ (+item.line_total).toLocaleString() }}</td>
                  <td class="py-2 text-right text-gray-400">₦{{ (+item.tax_amount).toLocaleString() }}</td>
                </tr>
              }
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex justify-end">
            <div class="w-64 space-y-1 text-sm">
              <div class="flex justify-between py-1"><span class="text-gray-500">Subtotal</span><span>₦{{ (+invoice()!.subtotal).toLocaleString() }}</span></div>
              <div class="flex justify-between py-1"><span class="text-gray-500">VAT (7.5%)</span><span>₦{{ (+invoice()!.tax_total).toLocaleString() }}</span></div>
              @if (+invoice()!.discount_total > 0) {
                <div class="flex justify-between py-1 text-orange-600"><span>Discount</span><span>-₦{{ (+invoice()!.discount_total).toLocaleString() }}</span></div>
              }
              <div class="flex justify-between py-2 border-t-2 border-gray-800 text-lg font-bold">
                <span>TOTAL</span><span class="text-emerald-700">₦{{ (+invoice()!.grand_total).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between py-1"><span class="text-gray-500">Amount Paid</span><span>₦{{ (+invoice()!.amount_paid).toLocaleString() }}</span></div>
            </div>
          </div>

          <!-- Bank Details -->
          @if (invoice()!.bank_name) {
            <div class="mt-6 p-4 bg-sage-50 border border-sage-200 rounded-lg">
              <h4 class="text-xs font-semibold text-sage-700 uppercase mb-2">Bank Details for Payment</h4>
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div><span class="text-gray-400">Bank</span><p class="font-bold text-gray-900">{{ invoice()!.bank_name }}</p></div>
                <div><span class="text-gray-400">Account</span><p class="font-bold text-gray-900">{{ invoice()!.bank_account_number }}</p></div>
                <div><span class="text-gray-400">Name</span><p class="font-bold text-gray-900">{{ invoice()!.bank_account_name }}</p></div>
              </div>
            </div>
          }
        </div>

        <!-- Sidebar Info -->
        <div class="space-y-6">
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Details</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-400">Booking</span><a [routerLink]="['/bookings', invoice()!.booking_id]" class="text-sage-600 hover:underline">View →</a></div>
              <div class="flex justify-between"><span class="text-gray-400">Folio</span><a [routerLink]="['/folios', invoice()!.folio_id]" class="text-sage-600 hover:underline">View →</a></div>
              @if (invoice()!.emailed_at) {
                <div class="flex justify-between"><span class="text-gray-400">Emailed</span><span>{{ invoice()!.emailed_at | date:'short' }}</span></div>
              }
            </div>
          </div>

          @if (invoice()!.status !== 'void') {
            <button (click)="voidInvoice()" class="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Void Invoice</button>
          }
        </div>
      </div>
    }
  `,
})
export class InvoiceDetailPage implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  loading = signal(true);
  invoice = signal<any>(null);
  items = signal<any[]>([]);
  private invoiceId = '';

  ngOnInit(): void {
    this.invoiceId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.invoiceId) this.loadInvoice();
  }

  loadInvoice(): void {
    this.api.get(`/invoices/${this.invoiceId}`).subscribe(r => {
      if (r.success) {
        this.invoice.set(r.data.invoice);
        this.items.set(r.data.items ?? []);
      }
      this.loading.set(false);
    });
  }

  statusColor(): string {
    const colors: Record<string, string> = { issued: '#f59e0b', paid: '#22c55e', void: '#ef4444' };
    return colors[this.invoice()?.status ?? ''] ?? '#6b7280';
  }

  downloadPdf(): void {
    window.open(`/api/invoices/${this.invoiceId}/pdf`, '_blank');
  }

  emailInvoice(): void {
    this.api.post(`/invoices/${this.invoiceId}/email`).subscribe(r => {
      if (r.success) this.toast.success('Invoice emailed to guest');
      else this.toast.error(r.message || 'Failed to send email');
      this.loadInvoice();
    });
  }

  async voidInvoice(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Void Invoice', message: 'Void this invoice? This cannot be undone.', variant: 'warning' });
    if (ok) this.api.post(`/invoices/${this.invoiceId}/void`).subscribe(r => {
      if (r.success) { this.toast.success('Invoice voided'); this.loadInvoice(); } else this.toast.error(r.message || 'Failed');
    });
  }
}
