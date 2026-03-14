import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService,
  ConfirmDialogService, ConfirmDialogComponent,
  HasPermDirective, PermDisableDirective, TokenService,
  QrFileUploadComponent,
} from '@lodgik/shared';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [
    DatePipe, RouterLink, FormsModule,
    PageHeaderComponent, LoadingSpinnerComponent, ConfirmDialogComponent,
    HasPermDirective, PermDisableDirective,
    QrFileUploadComponent,
  ],
  template: `
    <ui-confirm-dialog/>

    <ui-page-header [title]="invoice()?.invoice_number || 'Invoice'" subtitle="Invoice detail & payment">
      <div class="flex gap-2 flex-wrap">
        <a routerLink="/invoices" class="px-3 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50">← Back</a>
        @if (invoice()?.status === 'issued') {
          <button (click)="openPayModal()" [permDisable]="'invoices.record_payment'"
            class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700">
            💳 Record Payment
          </button>
        }
        <button (click)="downloadPdf()" [disabled]="downloadingPdf()" [permDisable]="'invoices.download_pdf'"
          class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50 flex items-center gap-1.5">
          @if (downloadingPdf()) {
            <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Generating…
          } @else {
            📄 Export PDF
          }
        </button>
        <button (click)="emailInvoice()" [permDisable]="'invoices.email'"
          class="px-4 py-2 border border-sage-400 text-sage-700 text-sm font-medium rounded-xl hover:bg-sage-50">
          📧 Email
        </button>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"/>

    @if (!loading() && invoice()) {
      <!-- Balance due banner -->
      @if (invoice()!.status === 'issued' && balanceDue() > 0) {
        <div class="mb-5 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <div>
            <p class="text-sm font-semibold text-amber-800">Payment Outstanding</p>
            <p class="text-xs text-amber-600 mt-0.5">₦{{ (+invoice()!.amount_paid).toLocaleString() }} paid of ₦{{ (+invoice()!.grand_total).toLocaleString() }}</p>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold text-amber-700">₦{{ balanceDue().toLocaleString() }}</p>
            <p class="text-xs text-amber-500">balance due</p>
          </div>
        </div>
      }
      @if (invoice()!.status === 'paid') {
        <div class="mb-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3">
          <span class="text-emerald-600 text-xl">✓</span>
          <div>
            <p class="text-sm font-semibold text-emerald-800">Fully Paid — ₦{{ (+invoice()!.grand_total).toLocaleString() }}</p>
            @if (invoice()!.payment_method) {
              <p class="text-xs text-emerald-600 mt-0.5">
                {{ methodLabel(invoice()!.payment_method) }}
                @if (invoice()!.payment_reference) { · Ref: {{ invoice()!.payment_reference }} }
              </p>
            }
          </div>
          @if (invoice()!.receipt_url) {
            <a [href]="invoice()!.receipt_url" target="_blank" rel="noopener"
               class="ml-auto text-xs text-emerald-700 border border-emerald-300 rounded-lg px-3 py-1.5 hover:bg-emerald-100">
              View Receipt ↗
            </a>
          }
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Invoice Preview -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-card p-6">
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
                      [style.background-color]="statusColor()">
                  {{ invoice()!.status.toUpperCase() }}
                </span>
              </p>
            </div>
          </div>

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
              <div class="flex justify-between py-1"><span class="text-gray-500">Amount Paid</span><span class="text-emerald-600 font-medium">₦{{ (+invoice()!.amount_paid).toLocaleString() }}</span></div>
              @if (balanceDue() > 0) {
                <div class="flex justify-between py-1 border-t border-dashed border-amber-300">
                  <span class="text-amber-700 font-semibold">Balance Due</span>
                  <span class="text-amber-700 font-bold">₦{{ balanceDue().toLocaleString() }}</span>
                </div>
              }
            </div>
          </div>

          @if (invoice()!.bank_name) {
            <div class="mt-6 p-4 bg-sage-50 border border-sage-200 rounded-lg">
              <h4 class="text-xs font-semibold text-sage-700 uppercase mb-2">Bank Details for Payment</h4>
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div><span class="text-gray-400 text-xs">Bank</span><p class="font-bold text-gray-900">{{ invoice()!.bank_name }}</p></div>
                <div><span class="text-gray-400 text-xs">Account #</span><p class="font-bold text-gray-900">{{ invoice()!.bank_account_number }}</p></div>
                <div><span class="text-gray-400 text-xs">Account Name</span><p class="font-bold text-gray-900">{{ invoice()!.bank_account_name }}</p></div>
              </div>
            </div>
          }
        </div>

        <!-- Sidebar -->
        <div class="space-y-4">
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Links</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-400">Booking</span><a [routerLink]="['/bookings', invoice()!.booking_id]" class="text-sage-600 hover:underline">View →</a></div>
              <div class="flex justify-between"><span class="text-gray-400">Folio</span><a [routerLink]="['/folios', invoice()!.folio_id]" class="text-sage-600 hover:underline">View →</a></div>
              @if (invoice()!.emailed_at) {
                <div class="flex justify-between"><span class="text-gray-400">Emailed</span><span class="text-xs text-gray-500">{{ invoice()!.emailed_at | date:'short' }}</span></div>
              }
            </div>
          </div>

          @if (invoice()!.status === 'issued') {
            <button (click)="openPayModal()" [permDisable]="'invoices.record_payment'"
              class="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
              💳 Record Payment
            </button>
          }

          @if (invoice()!.status !== 'void' && invoice()!.status !== 'paid') {
            <button (click)="voidInvoice()" [permDisable]="'invoices.void'"
              class="w-full px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors">
              Void Invoice
            </button>
          }
        </div>
      </div>
    }

    <!-- ── Payment Modal ──────────────────────────────────────────── -->
    @if (showPayModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,.45)">
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 class="text-base font-semibold text-gray-900">Record Payment</h3>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ invoice()!.invoice_number }} &nbsp;·&nbsp; Balance ₦{{ balanceDue().toLocaleString() }}
              </p>
            </div>
            <button (click)="closePayModal()" class="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">×</button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 space-y-4">

            <!-- Amount -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Amount (₦)</label>
              <input type="number" [(ngModel)]="payForm.amount" [max]="balanceDue()"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-400 focus:outline-none"
                [placeholder]="balanceDue().toString()"/>
            </div>

            <!-- Method -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
              <select [(ngModel)]="payForm.method" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-sage-300 focus:outline-none">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="pos_card">POS / Card</option>
              </select>
            </div>

            <!-- Bank Transfer specific fields -->
            @if (payForm.method === 'bank_transfer') {
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Transfer Reference</label>
                <input [(ngModel)]="payForm.reference" placeholder="e.g. NXP2024123456"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-300 focus:outline-none"/>
              </div>

              <!-- Receipt upload with QR -->
              <div>
                <ui-qr-file-upload
                  context="document"
                  label="Transfer Receipt"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  [mobileUploadBase]="hotelAppUrl"
                  [currentUrl]="payForm.receipt_url || null"
                  (uploaded)="onReceiptUploaded($event)"
                  (cleared)="payForm.receipt_url = ''"
                />
              </div>

              <!-- Receipt uploaded confirmation -->
              @if (payForm.receipt_url) {
                <div class="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs">
                  <span class="text-emerald-600 font-medium">✓ Receipt attached</span>
                  <a [href]="payForm.receipt_url" target="_blank" rel="noopener"
                     class="ml-auto text-emerald-700 underline">View ↗</a>
                </div>
              }
            }

            <!-- Notes -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
              <input [(ngModel)]="payForm.notes" placeholder="Additional remarks…"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-300 focus:outline-none"/>
            </div>

          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-100 flex gap-2">
            <button (click)="submitPayment()" [disabled]="savingPayment()" [permDisable]="'invoices.record_payment'"
              class="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              @if (savingPayment()) {
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Recording…
              } @else {
                Record Payment
              }
            </button>
            <button (click)="closePayModal()" class="px-4 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>

        </div>
      </div>
    }
  `,
})
export class InvoiceDetailPage implements OnInit {
  private api       = inject(ApiService);
  private http      = inject(HttpClient);
  private route     = inject(ActivatedRoute);
  private toast     = inject(ToastService);
  private confirm   = inject(ConfirmDialogService);
  private tokenSvc  = inject(TokenService);

  readonly hotelAppUrl = window.location.origin;

  loading        = signal(true);
  invoice        = signal<any>(null);
  items          = signal<any[]>([]);
  showPayModal   = signal(false);
  savingPayment  = signal(false);
  downloadingPdf = signal(false);

  payForm: {
    amount: number;
    method: string;
    reference: string;
    notes: string;
    receipt_url: string;
  } = { amount: 0, method: 'cash', reference: '', notes: '', receipt_url: '' };

  private invoiceId = '';

  balanceDue = computed(() => {
    const inv = this.invoice();
    if (!inv) return 0;
    return Math.max(0, (+inv.grand_total) - (+inv.amount_paid));
  });

  ngOnInit(): void {
    this.invoiceId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.invoiceId) this.loadInvoice();
  }

  loadInvoice(): void {
    this.loading.set(true);
    this.api.get(`/invoices/${this.invoiceId}`).subscribe(r => {
      if (r.success) {
        this.invoice.set(r.data.invoice ?? r.data);
        this.items.set(r.data.items ?? []);
      }
      this.loading.set(false);
    });
  }

  statusColor(): string {
    const c: Record<string, string> = { issued: '#f59e0b', paid: '#22c55e', void: '#ef4444', draft: '#6b7280' };
    return c[this.invoice()?.status ?? ''] ?? '#6b7280';
  }

  methodLabel(m: string): string {
    return { cash: 'Cash', bank_transfer: 'Bank Transfer', pos_card: 'POS / Card' }[m] ?? m;
  }

  // ── Authenticated PDF download ────────────────────────────────────────────
  // We cannot use window.open() because the PDF endpoint requires Authorization.
  // Instead we fetch as a blob via HttpClient (interceptor adds the token),
  // then trigger a browser download from the Blob URL.
  downloadPdf(): void {
    if (this.downloadingPdf()) return;
    this.downloadingPdf.set(true);

    const apiBase = (environment as any).apiUrl ?? '';
    const url     = `${apiBase}/invoices/${this.invoiceId}/pdf`;
    const token   = this.tokenSvc.getAccessToken();

    this.http.get(url, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdf.set(false);
        const invoiceNo = this.invoice()?.invoice_number ?? 'invoice';
        const objectUrl = URL.createObjectURL(blob);
        const a         = document.createElement('a');
        a.href          = objectUrl;
        a.download      = `${invoiceNo}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      },
      error: () => {
        this.downloadingPdf.set(false);
        this.toast.error('Failed to generate PDF. Please try again.');
      },
    });
  }

  emailInvoice(): void {
    this.api.post(`/invoices/${this.invoiceId}/email`).subscribe(r => {
      r.success ? this.toast.success('Invoice emailed to guest') : this.toast.error(r.message || 'Failed');
      this.loadInvoice();
    });
  }

  async voidInvoice(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Void Invoice', message: 'Void this invoice? This cannot be undone.', variant: 'warning' });
    if (ok) {
      this.api.post(`/invoices/${this.invoiceId}/void`).subscribe(r => {
        r.success ? (this.toast.success('Voided'), this.loadInvoice()) : this.toast.error(r.message || 'Failed');
      });
    }
  }

  openPayModal(): void {
    this.payForm = { amount: this.balanceDue(), method: 'cash', reference: '', notes: '', receipt_url: '' };
    this.showPayModal.set(true);
  }

  closePayModal(): void { this.showPayModal.set(false); }

  onReceiptUploaded(file: { url: string }): void {
    this.payForm.receipt_url = file.url;
  }

  submitPayment(): void {
    if (!this.payForm.amount || this.payForm.amount <= 0) {
      this.toast.error('Enter a valid amount');
      return;
    }
    this.savingPayment.set(true);
    this.api.post(`/invoices/${this.invoiceId}/pay`, {
      amount:          this.payForm.amount,
      payment_method:  this.payForm.method,
      reference:       this.payForm.reference  || undefined,
      notes:           this.payForm.notes       || undefined,
      receipt_url:     this.payForm.receipt_url || undefined,
    }).subscribe(r => {
      this.savingPayment.set(false);
      if (r.success) {
        this.toast.success('Payment recorded');
        this.closePayModal();
        this.loadInvoice();
      } else {
        this.toast.error(r.message || 'Failed');
      }
    });
  }
}
