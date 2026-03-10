import {
  Component, inject, signal, computed, effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, BadgeComponent, EmptyStateComponent,
} from '@lodgik/shared';
import { ActivePropertyService } from '@lodgik/shared';

interface CorporateProfile {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address: string | null;
  tax_id: string | null;
  credit_limit_type: 'fixed' | 'unlimited';
  credit_limit_kobo: number | null;
  credit_limit_ngn: number | null;
  negotiated_rate_discount: string;
  payment_terms: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

interface Intelligence {
  corporate_profile: CorporateProfile;
  total_bookings: number;
  total_revenue_ngn: number;
  total_paid_ngn: number;
  outstanding_ngn: number;
  recent_bookings: any[];
}

const EMPTY_FORM = () => ({
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  billing_address: '',
  tax_id: '',
  credit_limit_type: 'fixed' as 'fixed' | 'unlimited',
  credit_limit_ngn: null as number | null,
  negotiated_rate_discount: 0,
  payment_terms: '',
  is_active: true,
  notes: '',
});

@Component({
  selector: 'app-corporate-profiles',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, EmptyStateComponent, DecimalPipe, DatePipe],
  template: `
    <ui-page-header title="Corporate Profiles" icon="building-2"
      [breadcrumbs]="['Finance & Reports', 'Corporate Profiles']"
      subtitle="Manage company accounts, negotiated rates and credit limits">
      <button (click)="openCreate()"
        class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">
        + New Corporate Profile
      </button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {

      <!-- Stats row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border p-4 text-center">
          <p class="text-2xl font-bold text-gray-900">{{ stats().total }}</p>
          <p class="text-xs text-gray-500 mt-1">Total Profiles</p>
        </div>
        <div class="bg-white rounded-xl border p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ stats().active }}</p>
          <p class="text-xs text-gray-500 mt-1">Active</p>
        </div>
        <div class="bg-white rounded-xl border p-4 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ stats().withDiscount }}</p>
          <p class="text-xs text-gray-500 mt-1">Negotiated Rates</p>
        </div>
        <div class="bg-white rounded-xl border p-4 text-center">
          <p class="text-2xl font-bold text-purple-600">{{ stats().withCredit }}</p>
          <p class="text-xs text-gray-500 mt-1">Credit Accounts</p>
        </div>
      </div>

      <!-- Search + filter -->
      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <input [(ngModel)]="searchQ" placeholder="Search company name, contact..."
          class="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
        <select [(ngModel)]="filterActive" class="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      @if (filtered().length === 0) {
        <ui-empty-state icon="building-2" title="No corporate profiles yet"
          description="Add your corporate client accounts to manage negotiated rates and credit limits.">
        </ui-empty-state>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (c of filtered(); track c.id) {
            <div class="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <!-- Card header -->
              <div class="p-4 border-b flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900 truncate">{{ c.company_name }}</h3>
                  <p class="text-sm text-gray-500">{{ c.contact_name }}</p>
                </div>
                <ui-badge [variant]="c.is_active ? 'success' : 'neutral'">{{ c.is_active ? 'Active' : 'Inactive' }}</ui-badge>
              </div>

              <!-- Card body -->
              <div class="p-4 space-y-2 text-sm">
                @if (c.contact_email) {
                  <div class="flex gap-2 text-gray-600">
                    <span class="text-gray-400">✉</span>
                    <span class="truncate">{{ c.contact_email }}</span>
                  </div>
                }
                @if (c.contact_phone) {
                  <div class="flex gap-2 text-gray-600">
                    <span class="text-gray-400">📞</span>
                    <span>{{ c.contact_phone }}</span>
                  </div>
                }
                @if (c.tax_id) {
                  <div class="flex gap-2 text-gray-600">
                    <span class="text-gray-400">🪪</span>
                    <span>RC/TIN: {{ c.tax_id }}</span>
                  </div>
                }
                <div class="pt-2 grid grid-cols-2 gap-2 border-t">
                  <div class="bg-blue-50 rounded-lg px-3 py-2 text-center">
                    <p class="text-xs text-blue-600 font-medium">Negotiated Rate</p>
                    <p class="text-sm font-bold text-blue-800">
                      {{ +c.negotiated_rate_discount > 0 ? (c.negotiated_rate_discount + '%  off') : '—' }}
                    </p>
                  </div>
                  <div class="bg-purple-50 rounded-lg px-3 py-2 text-center">
                    <p class="text-xs text-purple-600 font-medium">Credit Limit</p>
                    <p class="text-sm font-bold text-purple-800">
                      @if (c.credit_limit_type === 'unlimited') { Unlimited }
                      @else if (c.credit_limit_ngn) { ₦{{ c.credit_limit_ngn | number:'1.0-0' }} }
                      @else { None }
                    </p>
                  </div>
                </div>
                @if (c.payment_terms) {
                  <p class="text-xs text-gray-400">Payment terms: <span class="text-gray-600 font-medium">{{ c.payment_terms }}</span></p>
                }
              </div>

              <!-- Card actions -->
              <div class="px-4 pb-4 flex gap-2">
                <button (click)="viewIntelligence(c)"
                  class="flex-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  📊 Analytics
                </button>
                <button (click)="openEdit(c)"
                  class="flex-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  ✏️ Edit
                </button>
                <button (click)="toggleActive(c)"
                  class="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 transition-colors"
                  [class]="c.is_active ? 'text-orange-600' : 'text-green-600'">
                  {{ c.is_active ? '🔒 Deactivate' : '✅ Activate' }}
                </button>
              </div>
            </div>
          }
        </div>
      }
    }

    <!-- ═══════════ Create / Edit Modal ═══════════ -->
    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click.self)="showForm.set(false)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="p-5 border-b flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">{{ editingId() ? 'Edit Corporate Profile' : 'New Corporate Profile' }}</h3>
            <button (click)="showForm.set(false)" class="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <div class="p-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-500 mb-1">Company Name *</label>
                <input [(ngModel)]="form.company_name" placeholder="Dangote Industries Ltd"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Primary Contact *</label>
                <input [(ngModel)]="form.contact_name" placeholder="Ade Johnson"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Contact Phone</label>
                <input [(ngModel)]="form.contact_phone" placeholder="+234 801 234 5678"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Contact Email</label>
                <input type="email" [(ngModel)]="form.contact_email" placeholder="ade@company.com"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">RC / TIN (CAC Number)</label>
                <input [(ngModel)]="form.tax_id" placeholder="RC-1234567"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-500 mb-1">Billing Address</label>
                <textarea [(ngModel)]="form.billing_address" rows="2" placeholder="15 Broad Street, Marina, Lagos"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none resize-none"></textarea>
              </div>
            </div>

            <div class="border-t pt-4">
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Negotiated Rate & Credit</p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Rate Discount (%)</label>
                  <input type="number" min="0" max="100" step="0.5" [(ngModel)]="form.negotiated_rate_discount"
                    placeholder="0" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                  <p class="text-xs text-gray-400 mt-1">% off standard room rate</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Credit Limit Type</label>
                  <select [(ngModel)]="form.credit_limit_type" class="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="fixed">Fixed Limit</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>
                @if (form.credit_limit_type === 'fixed') {
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Credit Limit (₦)</label>
                    <input type="number" min="0" [(ngModel)]="form.credit_limit_ngn" placeholder="500000"
                      class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                  </div>
                }
              </div>
              <div class="mt-3">
                <label class="block text-xs font-medium text-gray-500 mb-1">Payment Terms</label>
                <select [(ngModel)]="form.payment_terms" class="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">— Select —</option>
                  <option value="On Checkout">On Checkout</option>
                  <option value="NET 7">NET 7</option>
                  <option value="NET 14">NET 14</option>
                  <option value="NET 30">NET 30</option>
                  <option value="NET 60">NET 60</option>
                  <option value="Prepaid">Prepaid</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Internal Notes</label>
              <textarea [(ngModel)]="form.notes" rows="2" placeholder="Any special instructions..."
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none resize-none"></textarea>
            </div>
          </div>
          <div class="p-5 border-t flex justify-end gap-3">
            <button (click)="showForm.set(false)"
              class="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button (click)="save()" [disabled]="saving()"
              class="px-6 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-50 transition-colors">
              {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create Profile') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════ Intelligence Modal ═══════════ -->
    @if (intelligenceData()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click.self)="intelligenceData.set(null)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="p-5 border-b flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-gray-800">{{ intelligenceData()!.corporate_profile.company_name }}</h3>
              <p class="text-sm text-gray-500">Account Intelligence</p>
            </div>
            <button (click)="intelligenceData.set(null)" class="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <div class="p-5 space-y-5">
            <!-- KPI cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="bg-blue-50 rounded-xl p-3 text-center">
                <p class="text-2xl font-bold text-blue-700">{{ intelligenceData()!.total_bookings }}</p>
                <p class="text-xs text-blue-500 mt-1">Total Bookings</p>
              </div>
              <div class="bg-green-50 rounded-xl p-3 text-center">
                <p class="text-lg font-bold text-green-700">₦{{ intelligenceData()!.total_revenue_ngn | number:'1.0-0' }}</p>
                <p class="text-xs text-green-500 mt-1">Total Revenue</p>
              </div>
              <div class="bg-emerald-50 rounded-xl p-3 text-center">
                <p class="text-lg font-bold text-emerald-700">₦{{ intelligenceData()!.total_paid_ngn | number:'1.0-0' }}</p>
                <p class="text-xs text-emerald-500 mt-1">Total Paid</p>
              </div>
              <div class="rounded-xl p-3 text-center"
                [class]="intelligenceData()!.outstanding_ngn > 0 ? 'bg-red-50' : 'bg-gray-50'">
                <p class="text-lg font-bold"
                  [class]="intelligenceData()!.outstanding_ngn > 0 ? 'text-red-700' : 'text-gray-500'">
                  ₦{{ intelligenceData()!.outstanding_ngn | number:'1.0-0' }}
                </p>
                <p class="text-xs mt-1"
                  [class]="intelligenceData()!.outstanding_ngn > 0 ? 'text-red-400' : 'text-gray-400'">Outstanding</p>
              </div>
            </div>

            <!-- Recent bookings -->
            @if (intelligenceData()!.recent_bookings.length > 0) {
              <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Recent Group Bookings</h4>
                <div class="space-y-2">
                  @for (b of intelligenceData()!.recent_bookings; track b.id) {
                    <div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <p class="font-medium text-gray-800">{{ b.name }}</p>
                        <p class="text-xs text-gray-500">{{ b.check_in }} → {{ b.check_out }} · {{ b.total_rooms }} rooms</p>
                      </div>
                      <ui-badge
                        [variant]="b.status === 'confirmed' ? 'success' : b.status === 'tentative' ? 'warning' : b.status === 'cancelled' ? 'danger' : 'neutral'">
                        {{ b.status }}
                      </ui-badge>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <p class="text-sm text-gray-500 text-center py-4">No booking history found for this company.</p>
            }
          </div>
          <div class="p-5 border-t flex justify-end">
            <button (click)="intelligenceData.set(null)"
              class="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 transition-colors">Close</button>
          </div>
        </div>
      </div>
    }
  `,
})
export default class CorporateProfilesPage {
  private api      = inject(ApiService);
  private propSvc  = inject(ActivePropertyService);
  private toast    = inject(ToastService);

  loading         = signal(true);
  saving          = signal(false);
  showForm        = signal(false);
  editingId       = signal<string | null>(null);
  profiles        = signal<CorporateProfile[]>([]);
  intelligenceData = signal<Intelligence | null>(null);
  searchQ         = '';
  filterActive    = '';
  form            = EMPTY_FORM();

  constructor() {
    effect(() => {
      const pid = this.propSvc.propertyId();
      if (pid) this.load(pid);
    });
  }

  filtered = computed(() => {
    let list = this.profiles();
    const q  = this.searchQ.toLowerCase().trim();
    if (q) list = list.filter(c =>
      c.company_name.toLowerCase().includes(q) ||
      c.contact_name.toLowerCase().includes(q) ||
      (c.contact_email ?? '').toLowerCase().includes(q)
    );
    if (this.filterActive === 'active')   list = list.filter(c => c.is_active);
    if (this.filterActive === 'inactive') list = list.filter(c => !c.is_active);
    return list;
  });

  stats = computed(() => ({
    total:       this.profiles().length,
    active:      this.profiles().filter(c => c.is_active).length,
    withDiscount: this.profiles().filter(c => +c.negotiated_rate_discount > 0).length,
    withCredit:  this.profiles().filter(c => c.credit_limit_ngn !== null || c.credit_limit_type === 'unlimited').length,
  }));

  load(pid: string): void {
    this.loading.set(true);
    this.api.get('/corporate-profiles', { property_id: pid }).subscribe({
      next: (r: any) => { this.profiles.set(r.data ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load corporate profiles'); },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form = EMPTY_FORM();
    this.showForm.set(true);
  }

  openEdit(c: CorporateProfile): void {
    this.editingId.set(c.id);
    this.form = {
      company_name:             c.company_name,
      contact_name:             c.contact_name,
      contact_email:            c.contact_email ?? '',
      contact_phone:            c.contact_phone ?? '',
      billing_address:          c.billing_address ?? '',
      tax_id:                   c.tax_id ?? '',
      credit_limit_type:        c.credit_limit_type,
      credit_limit_ngn:         c.credit_limit_ngn,
      negotiated_rate_discount: +(c.negotiated_rate_discount),
      payment_terms:            c.payment_terms ?? '',
      is_active:                c.is_active,
      notes:                    c.notes ?? '',
    };
    this.showForm.set(true);
  }

  save(): void {
    if (!this.form.company_name.trim()) { this.toast.error('Company name is required'); return; }
    if (!this.form.contact_name.trim()) { this.toast.error('Contact name is required'); return; }

    this.saving.set(true);
    const pid = this.propSvc.propertyId();
    const payload = { ...this.form, property_id: pid };
    const req = this.editingId()
      ? this.api.put(`/corporate-profiles/${this.editingId()}`, payload)
      : this.api.post('/corporate-profiles', payload);

    req.subscribe({
      next: (r: any) => {
        const profile = r.data;
        if (this.editingId()) {
          this.profiles.update(list => list.map(c => c.id === this.editingId() ? profile : c));
          this.toast.success('Corporate profile updated');
        } else {
          this.profiles.update(list => [profile, ...list]);
          this.toast.success('Corporate profile created');
        }
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to save profile');
      },
    });
  }

  toggleActive(c: CorporateProfile): void {
    this.api.post(`/corporate-profiles/${c.id}/toggle-active`, {}).subscribe({
      next: (r: any) => {
        this.profiles.update(list => list.map(p => p.id === c.id ? r.data : p));
        this.toast.success(`Profile ${r.data.is_active ? 'activated' : 'deactivated'}`);
      },
      error: () => this.toast.error('Failed to update status'),
    });
  }

  viewIntelligence(c: CorporateProfile): void {
    this.api.get(`/corporate-profiles/${c.id}/intelligence`).subscribe({
      next: (r: any) => this.intelligenceData.set(r.data),
      error: () => this.toast.error('Failed to load analytics'),
    });
  }
}
