import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, BadgeComponent } from '@lodgik/shared';
import { ActivePropertyService } from '@lodgik/shared';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-group-bookings',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, DatePipe, DecimalPipe],
  template: `
    <ui-page-header title="Group Bookings" icon="groups" [breadcrumbs]="['Bookings','Group Bookings']"
      subtitle="Manage group and corporate bookings">
      <button (click)="showForm = !showForm"
        class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">
        + New Group Booking
      </button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {

      <!-- Create form -->
      @if (showForm) {
        <div class="bg-white rounded-xl border p-5 mb-5 shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">New Group Booking</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Group Name *</label>
              <input [(ngModel)]="form.name" placeholder="ABC Corp — Q1 Visit" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select [(ngModel)]="form.booking_type" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="overnight">Overnight</option>
                <option value="corporate">Corporate</option>
                <option value="travel_agent">Travel Agent</option>
                <option value="event">Event</option>
                <option value="wedding">Wedding</option>
              </select></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Contact Name *</label>
              <input [(ngModel)]="form.contact_name" placeholder="John Doe" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Company</label>
              <input [(ngModel)]="form.company_name" placeholder="Acme Ltd" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Check-in *</label>
              <input type="date" [(ngModel)]="form.check_in" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Check-out *</label>
              <input type="date" [(ngModel)]="form.check_out" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Total Rooms</label>
              <input type="number" min="1" [(ngModel)]="form.total_rooms" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-500 mb-1">Discount %</label>
              <input type="number" min="0" max="100" [(ngModel)]="form.discount_percentage" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          </div>
          <div class="flex gap-3">
            <button (click)="create()" class="px-5 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Create</button>
            <button (click)="showForm = false" class="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      }

      <!-- List -->
      <div class="space-y-3">
        @for (g of groups(); track g.id) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

            <!-- Summary row -->
            <div class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                 (click)="toggleExpand(g.id)">
              <div class="flex items-center gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold text-gray-800">{{ g.name }}</p>
                    @if (g.is_corporate) {
                      <span class="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Corporate</span>
                    }
                  </div>
                  <p class="text-xs text-gray-400 mt-0.5">
                    {{ g.company_name || g.contact_name }} ·
                    {{ g.check_in | date:'dd MMM' }} – {{ g.check_out | date:'dd MMM yyyy' }} ·
                    {{ g.total_rooms }} rooms
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <ui-badge [variant]="g.status === 'confirmed' ? 'success' : g.status === 'cancelled' ? 'danger' : 'warning'">
                  {{ g.status }}
                </ui-badge>
                @if (g.status === 'tentative') {
                  <button (click)="confirm(g.id, $event)" class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">Confirm</button>
                  <button (click)="cancel(g.id, $event)" class="px-3 py-1.5 text-xs border text-red-600 border-red-200 rounded-lg hover:bg-red-50">Cancel</button>
                }
                <svg class="w-4 h-4 text-gray-400 transition-transform"
                     [class.rotate-180]="expandedId() === g.id"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>

            <!-- Expanded panel -->
            @if (expandedId() === g.id) {
              <div class="border-t border-gray-100 p-4 bg-gray-50">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  <!-- Left: Corporate Settings -->
                  <div class="bg-white rounded-lg border p-4">
                    <div class="flex items-center gap-2 mb-3">
                      <svg class="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                      <h4 class="text-sm font-semibold text-gray-700">Corporate Folio Settings</h4>
                    </div>

                    <div class="space-y-3">
                      <!-- Toggle corporate -->
                      <div class="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p class="text-sm text-gray-700 font-medium">Corporate Account</p>
                          <p class="text-xs text-gray-400">Enable deferred/consolidated billing</p>
                        </div>
                        <button type="button" (click)="corpForm.is_corporate = !corpForm.is_corporate"
                          class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200
                                 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                          [class.bg-purple-600]="corpForm.is_corporate"
                          [class.bg-gray-200]="!corpForm.is_corporate">
                          <span class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200"
                                [class.translate-x-5]="corpForm.is_corporate"
                                [class.translate-x-0]="!corpForm.is_corporate"></span>
                        </button>
                      </div>

                      @if (corpForm.is_corporate) {
                        <!-- Credit limit type -->
                        <div>
                          <label class="block text-xs font-medium text-gray-500 mb-1">Credit Limit</label>
                          <select [(ngModel)]="corpForm.credit_limit_type" class="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="fixed">Fixed Amount</option>
                            <option value="unlimited">Unlimited</option>
                          </select>
                        </div>
                        @if (corpForm.credit_limit_type === 'fixed') {
                          <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Credit Limit (₦)</label>
                            <input type="number" min="0" step="1000" [(ngModel)]="corpForm.credit_limit_ngn"
                              placeholder="500000" class="w-full px-3 py-2 border rounded-lg text-sm">
                          </div>
                        }
                        <!-- Billing contact -->
                        <div>
                          <label class="block text-xs font-medium text-gray-500 mb-1">Billing Email</label>
                          <input type="email" [(ngModel)]="corpForm.corporate_contact_email"
                            placeholder="accounts@company.com" class="w-full px-3 py-2 border rounded-lg text-sm">
                        </div>
                        <!-- PO ref -->
                        <div>
                          <label class="block text-xs font-medium text-gray-500 mb-1">PO / LPO Reference</label>
                          <input [(ngModel)]="corpForm.corporate_ref_number"
                            placeholder="LPO-2026-001" class="w-full px-3 py-2 border rounded-lg text-sm">
                        </div>
                        <!-- Checkout without payment -->
                        <div class="flex items-center gap-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                          <input type="checkbox" [(ngModel)]="corpForm.allow_checkout_without_payment"
                            id="awp_{{g.id}}" class="rounded text-amber-600">
                          <label [for]="'awp_'+g.id" class="text-xs text-amber-800 leading-relaxed cursor-pointer">
                            Allow checkout with outstanding balance (deferred payment)
                          </label>
                        </div>
                      }
                    </div>

                    <div class="mt-3 flex gap-2">
                      <button (click)="saveCorporate(g.id)" [disabled]="savingCorp()"
                        class="px-4 py-2 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
                        @if (savingCorp()) { Saving… } @else { Save Corporate Settings }
                      </button>
                    </div>
                  </div>

                  <!-- Right: Folio Summary + Send Invoice -->
                  <div class="bg-white rounded-lg border p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-sm font-semibold text-gray-700">Corporate Folio Summary</h4>
                      <button (click)="loadCorporateSummary(g.id)"
                        class="text-xs text-sage-600 hover:underline">Refresh</button>
                    </div>

                    @if (corporateSummary()) {
                      <div class="grid grid-cols-2 gap-3 mb-3">
                        <div class="bg-gray-50 rounded-lg p-3">
                          <p class="text-xs text-gray-400">Total Charges</p>
                          <p class="text-sm font-semibold text-gray-800">₦{{ corporateSummary()!.total_charges | number:'1.2-2' }}</p>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-3">
                          <p class="text-xs text-gray-400">Total Paid</p>
                          <p class="text-sm font-semibold text-green-700">₦{{ corporateSummary()!.total_payments | number:'1.2-2' }}</p>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-3">
                          <p class="text-xs text-gray-400">Adjustments</p>
                          <p class="text-sm font-semibold text-gray-700">₦{{ corporateSummary()!.total_adjustments | number:'1.2-2' }}</p>
                        </div>
                        <div class="rounded-lg p-3" [class.bg-red-50]="corporateSummary()!.outstanding > 0" [class.bg-green-50]="corporateSummary()!.outstanding <= 0">
                          <p class="text-xs text-gray-400">Outstanding</p>
                          <p class="text-sm font-bold" [class.text-red-700]="corporateSummary()!.outstanding > 0" [class.text-green-700]="corporateSummary()!.outstanding <= 0">
                            ₦{{ corporateSummary()!.outstanding | number:'1.2-2' }}
                          </p>
                        </div>
                      </div>
                      <p class="text-xs text-gray-400 mb-3">{{ corporateSummary()!.folio_count }} folio(s) linked to this group booking</p>

                      @if (g.is_corporate && g.corporate_contact_email) {
                        <button (click)="sendInvoice(g.id)" [disabled]="sendingInvoice()"
                          class="w-full flex items-center justify-center gap-2 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 disabled:opacity-50 transition-colors">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                          </svg>
                          @if (sendingInvoice()) { Sending… } @else { Send Consolidated Invoice }
                        </button>
                        <p class="text-xs text-gray-400 text-center mt-1">→ {{ g.corporate_contact_email }}</p>
                      } @else if (g.is_corporate) {
                        <p class="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg text-center">
                          Set a billing email above to enable invoice sending
                        </p>
                      }
                    } @else {
                      <div class="text-center py-6">
                        <button (click)="loadCorporateSummary(g.id)"
                          class="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          Load Folio Summary
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        } @empty {
          <div class="bg-white rounded-xl border p-10 text-center">
            <p class="text-gray-400 text-sm">No group bookings yet. Create one above.</p>
          </div>
        }
      </div>
    }
  `,
})
export default class GroupBookingsPage implements OnInit, OnDestroy {
  private api  = inject(ApiService);
  private toast = inject(ToastService);
  private propSvc = inject(ActivePropertyService);
  private sub!: Subscription;

  loading         = signal(true);
  groups          = signal<any[]>([]);
  expandedId      = signal<string | null>(null);
  savingCorp      = signal(false);
  sendingInvoice  = signal(false);
  corporateSummary = signal<any>(null);

  showForm = false;
  form: any = {
    name: '', booking_type: 'overnight', contact_name: '', company_name: '',
    check_in: '', check_out: '', total_rooms: 1, discount_percentage: 0,
  };

  corpForm: any = {
    is_corporate: false,
    credit_limit_type: 'fixed',
    credit_limit_ngn: null,
    corporate_contact_email: '',
    corporate_ref_number: '',
    allow_checkout_without_payment: true,
  };

  ngOnInit(): void {
    this.loadGroups();
    this.sub = this.propSvc.propertySwitched$.subscribe(() => this.loadGroups());
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private loadGroups(): void {
    this.loading.set(true);
    this.api.get('/group-bookings', { property_id: this.propSvc.propertyId() }).subscribe({
      next: (r: any) => { this.groups.set(r?.data || []); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load group bookings'); this.loading.set(false); },
    });
  }

  create(): void {
    if (!this.form.name || !this.form.contact_name || !this.form.check_in || !this.form.check_out) {
      this.toast.error('Please fill in all required fields');
      return;
    }
    const payload = { ...this.form, property_id: this.propSvc.propertyId() };
    this.api.post('/group-bookings', payload).subscribe({
      next: (r: any) => {
        if (r?.success) {
          this.toast.success('Group booking created');
          this.showForm = false;
          this.form = { name: '', booking_type: 'overnight', contact_name: '', company_name: '', check_in: '', check_out: '', total_rooms: 1, discount_percentage: 0 };
          this.loadGroups();
        } else {
          this.toast.error(r?.message || 'Failed to create');
        }
      },
      error: (e: any) => this.toast.error(e?.error?.message || 'Failed to create group booking'),
    });
  }

  confirm(id: string, event: Event): void {
    event.stopPropagation();
    this.api.post(`/group-bookings/${id}/confirm`, {}).subscribe({
      next: (r: any) => { if (r?.success) { this.toast.success('Confirmed'); this.loadGroups(); } },
      error: () => this.toast.error('Failed to confirm'),
    });
  }

  cancel(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Cancel this group booking?')) return;
    this.api.post(`/group-bookings/${id}/cancel`, {}).subscribe({
      next: (r: any) => { if (r?.success) { this.toast.success('Cancelled'); this.loadGroups(); } },
      error: () => this.toast.error('Failed to cancel'),
    });
  }

  toggleExpand(id: string): void {
    const same = this.expandedId() === id;
    this.expandedId.set(same ? null : id);
    this.corporateSummary.set(null);

    if (!same) {
      // Hydrate corporate form with current values from this group booking
      const g = this.groups().find((x: any) => x.id === id);
      if (g) {
        this.corpForm = {
          is_corporate:                   !!g.is_corporate,
          credit_limit_type:              g.credit_limit_type || 'fixed',
          credit_limit_ngn:               g.credit_limit_ngn ?? null,
          corporate_contact_email:        g.corporate_contact_email || '',
          corporate_ref_number:           g.corporate_ref_number || '',
          allow_checkout_without_payment: g.allow_checkout_without_payment !== false,
        };
        if (g.is_corporate) {
          this.loadCorporateSummary(id);
        }
      }
    }
  }

  saveCorporate(id: string): void {
    this.savingCorp.set(true);
    this.api.patch(`/group-bookings/${id}/corporate`, this.corpForm).subscribe({
      next: (r: any) => {
        this.savingCorp.set(false);
        if (r?.success) {
          this.toast.success('Corporate settings saved');
          // Update the group in the local list
          this.groups.update(gs => gs.map((g: any) => g.id === id ? { ...g, ...r.data } : g));
        } else {
          this.toast.error(r?.message || 'Failed to save');
        }
      },
      error: () => { this.savingCorp.set(false); this.toast.error('Failed to save settings'); },
    });
  }

  loadCorporateSummary(id: string): void {
    this.api.get(`/group-bookings/${id}/corporate-summary`).subscribe({
      next: (r: any) => { if (r?.success) this.corporateSummary.set(r.data); },
      error: () => this.toast.error('Failed to load folio summary'),
    });
  }

  sendInvoice(id: string): void {
    this.sendingInvoice.set(true);
    this.api.post(`/group-bookings/${id}/send-invoice`, {}).subscribe({
      next: (r: any) => {
        this.sendingInvoice.set(false);
        if (r?.success) this.toast.success(r.message || 'Invoice sent');
        else this.toast.error(r?.message || 'Failed to send invoice');
      },
      error: (e: any) => {
        this.sendingInvoice.set(false);
        this.toast.error(e?.error?.message || 'Failed to send invoice');
      },
    });
  }
}
