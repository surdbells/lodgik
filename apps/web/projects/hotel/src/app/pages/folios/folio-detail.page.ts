import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, ConfirmDialogService, ActivePropertyService, QrFileUploadComponent, UploadedFile, ReceiptActionsComponent, HasPermDirective, PermDisableDirective, TokenService } from '@lodgik/shared';
import { AuthService, TokenService } from '@lodgik/shared';

@Component({
  selector: 'app-folio-detail',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, PageHeaderComponent, LoadingSpinnerComponent, QrFileUploadComponent, ReceiptActionsComponent, HasPermDirective, PermDisableDirective],
  template: `
    <ui-page-header [title]="folio()?.folio_number || 'Folio'" subtitle="Charges, payments and balance">
      <div class="flex gap-2">
        <a routerLink="/folios" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Back</a>
        @if (folio()?.status === 'open') {
          <button *hasPerm="'folios.add_charge'" (click)="showChargeForm = true" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Charge</button>
          <button *hasPerm="'folios.add_payment'" (click)="showPaymentForm = true" class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">+ Payment</button>
        }
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && folio()) {
      <!-- Balance Banner -->
      <div class="rounded-lg p-4 mb-6 flex items-center justify-between" [style.background-color]="folio()!.status_color + '12'" [style.border-left]="'4px solid ' + folio()!.status_color">
        <div>
          <span class="text-xs font-medium text-gray-500">Status</span>
          <p class="text-lg font-bold" [style.color]="folio()!.status_color">{{ folio()!.status_label }}</p>
        </div>
        <div class="grid grid-cols-4 gap-6 text-center">
          <div><span class="text-xs text-gray-400">Charges</span><p class="text-sm font-bold">₦{{ (+folio()!.total_charges).toLocaleString() }}</p></div>
          <div><span class="text-xs text-gray-400">Paid</span><p class="text-sm font-bold text-emerald-600">₦{{ (+folio()!.total_payments).toLocaleString() }}</p></div>
          <div><span class="text-xs text-gray-400">Adjustments</span><p class="text-sm font-bold">₦{{ (+folio()!.total_adjustments).toLocaleString() }}</p></div>
          <div><span class="text-xs text-gray-400">Balance</span><p class="text-lg font-bold" [class]="(+folio()!.balance) > 0 ? 'text-red-600' : 'text-emerald-600'">₦{{ (+folio()!.balance).toLocaleString() }}</p></div>
        </div>
      </div>

      <!-- Hotel Bank Account (prominent) -->
      @if (bankAccount()) {
        <div class="bg-sage-50 border border-sage-200 rounded-lg p-4 mb-6">
          <h4 class="text-xs font-semibold text-sage-700 uppercase mb-2">Hotel Bank Account for Payment</h4>
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div><span class="text-gray-400">Bank</span><p class="font-bold text-gray-900">{{ bankAccount()!.bank_name }}</p></div>
            <div><span class="text-gray-400">Account Number</span><p class="font-bold text-gray-900">{{ bankAccount()!.account_number }}</p></div>
            <div><span class="text-gray-400">Account Name</span><p class="font-bold text-gray-900">{{ bankAccount()!.account_name }}</p></div>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Charges -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Charges</h3>
          <div class="space-y-2 max-h-[400px] overflow-y-auto">
            @for (c of charges(); track c.id) {
              <div class="flex justify-between items-start py-2 border-b border-gray-50 text-sm" [class.opacity-40]="c.is_voided" [class.line-through]="c.is_voided">
                <div>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{{ c.category_label }}</span>
                  <p class="mt-1">{{ c.description }}</p>
                  <p class="text-xs text-gray-400">{{ c.charge_date }}</p>
                </div>
                <span class="font-medium whitespace-nowrap">₦{{ (+c.line_total).toLocaleString() }}</span>
              </div>
            }
            @if (charges().length === 0) {
              <p class="text-gray-400 text-sm py-4 text-center">No charges</p>
            }
          </div>
        </div>

        <!-- Payments -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Payments</h3>
          <div class="space-y-2 max-h-[400px] overflow-y-auto">
            @for (p of payments(); track p.id) {
              <div class="py-2 border-b border-gray-50 text-sm">
                <div class="flex justify-between items-center">
                  <div>
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" [style.background-color]="p.status_color">{{ p.status_label }}</span>
                    <span class="ml-1 text-xs text-gray-400">{{ p.payment_method_label }}</span>
                  </div>
                  <span class="font-medium">₦{{ (+p.amount).toLocaleString() }}</span>
                </div>
                @if (p.sender_name) {
                  <p class="text-xs text-gray-500 mt-1">From: {{ p.sender_name }} · Ref: {{ p.transfer_reference }}</p>
                }
                <p class="text-xs text-gray-400 mt-1">{{ p.payment_date }}</p>
                <!-- Receipt actions: View / Download / Share -->
                @if (p.proof_image_url) {
                  <div class="mt-2">
                    <app-receipt-actions
                      [url]="p.proof_image_url"
                      [shareUrl]="'/folios/payments/' + p.id + '/share-receipt'"
                      label="payment receipt">
                    </app-receipt-actions>
                  </div>
                }
                <!-- Confirm/Reject actions for pending -->
                @if (p.status === 'pending') {
                  <div class="flex gap-2 mt-2">
                    <button (click)="confirmPayment(p.id)" class="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Confirm</button>
                    <button (click)="rejectPayment(p.id)" class="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Reject</button>
                  </div>
                }
              </div>
            }
            @if (payments().length === 0) {
              <p class="text-gray-400 text-sm py-4 text-center">No payments</p>
            }
          </div>
        </div>

        <!-- Adjustments + Actions -->
        <div class="space-y-6">
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Adjustments</h3>
            @for (a of adjustments(); track a.id) {
              <div class="flex justify-between py-2 border-b border-gray-50 text-sm">
                <div><span class="text-xs text-gray-400">{{ a.type }}</span><p>{{ a.description }}</p></div>
                <span class="font-medium text-orange-600">-₦{{ (+a.amount).toLocaleString() }}</span>
              </div>
            }
            @if (adjustments().length === 0) {
              <p class="text-gray-400 text-sm py-4 text-center">No adjustments</p>
            }
            @if (folio()!.status === 'open') {
              <button *hasPerm="'folios.add_adjustment'" (click)="showAdjForm = true" class="mt-3 text-xs text-sage-600 hover:underline">+ Add Adjustment</button>
            }
          </div>

          <!-- Folio Actions -->
          @if (folio()!.status === 'open') {
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Actions</h3>
              <div class="space-y-2">
                <button (click)="closeFolio()" [permDisable]="'folios.close'" class="w-full px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800">Close Folio</button>
                <button (click)="voidFolio()" [permDisable]="'folios.close'" class="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Void Folio</button>
              </div>
            </div>
          }
          @if (folio()!.status === 'closed') {
            @if (existingInvoiceId()) {
              <a [routerLink]="['/invoices', existingInvoiceId()]"
                 class="block text-center px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
                📄 View Invoice
              </a>
            } @else {
              <button (click)="generateInvoice()"
                [disabled]="generatingInvoice()"
                class="block w-full text-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ generatingInvoice() ? 'Generating…' : '🧾 Generate Invoice' }}
              </button>
            }
          }
        </div>
      </div>

      <!-- Add Charge Dialog -->
      @if (showChargeForm) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showChargeForm = false">
          <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" (click)="$event.stopPropagation()">
            <h3 class="text-base font-semibold mb-4">Add Charge</h3>
            <div class="space-y-3">
              <select [(ngModel)]="chargeForm.category" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option value="room">Room</option><option value="service">Service</option><option value="minibar">Minibar</option>
                <option value="bar">Bar</option><option value="laundry">Laundry</option><option value="restaurant">Restaurant</option>
                <option value="telephone">Telephone</option><option value="other">Other</option>
              </select>
              <input [(ngModel)]="chargeForm.description" placeholder="Description" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <div class="grid grid-cols-2 gap-3">
                <input [(ngModel)]="chargeForm.amount" type="number" placeholder="Amount (₦)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <input [(ngModel)]="chargeForm.quantity" type="number" min="1" placeholder="Qty" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <button (click)="showChargeForm = false" class="px-4 py-2 text-sm text-gray-500 border rounded-lg">Cancel</button>
              <button (click)="submitCharge()" [permDisable]="'folios.add_charge'" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg">Add</button>
            </div>
          </div>
        </div>
      }

      <!-- Record Payment Dialog -->
      @if (showPaymentForm) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showPaymentForm = false">
          <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" (click)="$event.stopPropagation()">
            <h3 class="text-base font-semibold mb-4">Record Payment</h3>
            <div class="space-y-3">
              <select [(ngModel)]="payForm.payment_method" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="pos_card">POS Card</option>
              </select>
              <input [(ngModel)]="payForm.amount" type="number" placeholder="Amount (₦)" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              @if (payForm.payment_method === 'bank_transfer') {
                <input [(ngModel)]="payForm.sender_name" placeholder="Sender Name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <input [(ngModel)]="payForm.transfer_reference" placeholder="Transfer Reference" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <!-- Receipt / proof of payment — supports manual upload AND QR phone capture -->
                <ui-qr-file-upload
                  context="document"
                  label="Receipt / Proof of Payment (optional)"
                  [currentUrl]="payForm.proof_image_url"
                  (uploaded)="payForm.proof_image_url = $event.url; payForm.proof_filename = $event.original"
                  (cleared)="payForm.proof_image_url = ''; payForm.proof_filename = ''"
                />
              }
              <textarea [(ngModel)]="payForm.notes" placeholder="Notes (optional)" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></textarea>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <button (click)="showPaymentForm = false" class="px-4 py-2 text-sm text-gray-500 border rounded-lg">Cancel</button>
              <button (click)="submitPayment()" [permDisable]="'folios.add_payment'" class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg">Record</button>
            </div>
          </div>
        </div>
      }

      <!-- Adjustment Dialog -->
      @if (showAdjForm) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showAdjForm = false">
          <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" (click)="$event.stopPropagation()">
            <h3 class="text-base font-semibold mb-4">Add Adjustment</h3>
            <div class="space-y-3">
              <select [(ngModel)]="adjForm.type" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option value="discount">Discount</option><option value="refund">Refund</option><option value="correction">Correction</option><option value="comp">Complimentary</option>
              </select>
              <input [(ngModel)]="adjForm.description" placeholder="Description" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <input [(ngModel)]="adjForm.amount" type="number" placeholder="Amount (₦)" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <textarea [(ngModel)]="adjForm.reason" placeholder="Reason" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></textarea>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <button (click)="showAdjForm = false" class="px-4 py-2 text-sm text-gray-500 border rounded-lg">Cancel</button>
              <button (click)="submitAdj()" [permDisable]="'folios.add_adjustment'" class="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg">Add</button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class FolioDetailPage implements OnInit {
  private api = inject(ApiService);

  existingInvoiceId  = signal<string | null>(null);
  generatingInvoice  = signal(false);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  folio = signal<any>(null);
  charges = signal<any[]>([]);
  payments = signal<any[]>([]);
  adjustments = signal<any[]>([]);
  bankAccount = signal<any>(null);

  showChargeForm = false;
  showPaymentForm = false;
  showAdjForm = false;

  chargeForm = { category: 'service', description: '', amount: null as any, quantity: 1 };
  payForm = { payment_method: 'cash', amount: null as any, sender_name: '', transfer_reference: '', notes: '', proof_image_url: '', proof_filename: '' };
  adjForm = { type: 'discount', description: '', amount: null as any, reason: '' };

  private folioId = '';

  ngOnInit(): void {
    // Loaded after folio is fetched — see load()
    this.folioId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.folioId) this.loadFolio();
    this.loadBankAccount();
  }

  loadFolio(): void {
    this.api.get(`/folios/${this.folioId}`).subscribe(r => {
      if (r.success) { this.checkExistingInvoice(r.data.booking_id); }
      if (r.success) {
        this.folio.set(r.data.folio);
        this.charges.set(r.data.charges ?? []);
        this.payments.set(r.data.payments ?? []);
        this.adjustments.set(r.data.adjustments ?? []);
      }
      this.loading.set(false);
    });
  }

  loadBankAccount(): void {
    const propId = this.activeProperty.propertyId();
    if (propId) {
      this.api.get(`/properties/${propId}/bank-accounts`).subscribe(r => {
        if (r.success) {
          const primary = (r.data ?? []).find((b: any) => b.is_primary);
          if (primary) this.bankAccount.set(primary);
          else if (r.data?.length > 0) this.bankAccount.set(r.data[0]);
        }
      });
    }
  }

  submitCharge(): void {
    this.api.post(`/folios/${this.folioId}/charges`, {
      category: this.chargeForm.category, description: this.chargeForm.description,
      amount: String(this.chargeForm.amount || 0), quantity: this.chargeForm.quantity,
    }).subscribe(r => {
      if (r.success) { this.toast.success('Charge added'); this.showChargeForm = false; this.loadFolio(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  submitPayment(): void {
    const payload: any = {
      payment_method: this.payForm.payment_method, amount: String(this.payForm.amount || 0),
      sender_name: this.payForm.sender_name || null, transfer_reference: this.payForm.transfer_reference || null,
      notes: this.payForm.notes || null,
    };
    if (this.payForm.proof_image_url) payload.proof_image_url = this.payForm.proof_image_url;
    this.api.post(`/folios/${this.folioId}/payments`, payload).subscribe(r => {
      if (r.success) {
        this.toast.success('Payment recorded');
        this.showPaymentForm = false;
        this.payForm = { payment_method: 'cash', amount: null, sender_name: '', transfer_reference: '', notes: '', proof_image_url: '', proof_filename: '' };
        this.loadFolio();
      } else this.toast.error(r.message || 'Failed');
    });
  }

  submitAdj(): void {
    this.api.post(`/folios/${this.folioId}/adjustments`, {
      type: this.adjForm.type, description: this.adjForm.description,
      amount: String(this.adjForm.amount || 0), reason: this.adjForm.reason || null,
    }).subscribe(r => {
      if (r.success) { this.toast.success('Adjustment added'); this.showAdjForm = false; this.loadFolio(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  async confirmPayment(paymentId: string): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Confirm Payment', message: 'Confirm this payment has been received?', variant: 'info' });
    if (ok) this.api.post(`/folios/payments/${paymentId}/confirm`).subscribe(r => {
      if (r.success) { this.toast.success('Payment confirmed'); this.loadFolio(); } else this.toast.error(r.message || 'Failed');
    });
  }

  async rejectPayment(paymentId: string): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Reject Payment', message: 'Reject this payment?', variant: 'warning' });
    if (ok) this.api.post(`/folios/payments/${paymentId}/reject`, { reason: 'Rejected by staff' }).subscribe(r => {
      if (r.success) { this.toast.success('Payment rejected'); this.loadFolio(); } else this.toast.error(r.message || 'Failed');
    });
  }

  async closeFolio(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Close Folio', message: 'Close this folio? No more charges/payments can be added.', variant: 'warning' });
    if (ok) this.api.post(`/folios/${this.folioId}/close`).subscribe(r => {
      if (r.success) { this.toast.success('Folio closed'); this.loadFolio(); } else this.toast.error(r.message || 'Failed');
    });
  }

  async voidFolio(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Void Folio', message: 'Void this folio? This cannot be undone.', variant: 'warning' });
    if (ok) this.api.post(`/folios/${this.folioId}/void`).subscribe(r => {
      if (r.success) { this.toast.success('Folio voided'); this.loadFolio(); } else this.toast.error(r.message || 'Failed');
    });
  }
  checkExistingInvoice(bookingId: string): void {
    if (!bookingId) return;
    this.api.get<any>(`/invoices/by-booking/${bookingId}`).subscribe({
      next: r => { if (r.success && r.data?.id) this.existingInvoiceId.set(r.data.id); },
      error: () => { /* no invoice yet — normal */ },
    });
  }

  generateInvoice(): void {
    const folioId = this.folio()?.id;
    if (!folioId) return;
    this.generatingInvoice.set(true);
    this.api.post<any>('/invoices', { folio_id: folioId }).subscribe({
      next: r => {
        this.generatingInvoice.set(false);
        if (r.success) {
          this.existingInvoiceId.set(r.data.id);
          this.toast.success('Invoice generated');
        }
      },
      error: err => {
        this.generatingInvoice.set(false);
        const msg = err?.error?.error?.message ?? 'Failed to generate invoice';
        this.toast.error(msg);
      },
    });
  }


}