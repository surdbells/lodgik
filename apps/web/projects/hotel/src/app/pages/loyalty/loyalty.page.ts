import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ActivePropertyService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Loyalty & Promotions" icon="heart" [breadcrumbs]="['Guest Experience', 'Loyalty']"
      subtitle="CRM loyalty tiers, points, and promotional codes">
      <div class="flex gap-2">
        @if (tab === 'tiers') {
          <button (click)="openCreateTier()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Add Tier</button>
        }
        @if (tab === 'promos') {
          <button (click)="openCreatePromo()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Add Promo</button>
        }
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- ── Create Tier Modal ──────────────────────────────── -->
    @if (showTierForm) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="showTierForm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">{{ editingTier ? 'Edit Tier' : 'Create Loyalty Tier' }}</h3>
            <button (click)="showTierForm = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="text-xs font-medium text-gray-500 mb-1 block">Tier Name *</label>
              <input [(ngModel)]="tierForm.name" placeholder="e.g. Gold, Platinum" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Min Points</label>
              <input type="number" [(ngModel)]="tierForm.min_points" placeholder="0" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Discount %</label>
              <input type="number" [(ngModel)]="tierForm.discount_percentage" placeholder="5" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Points Multiplier</label>
              <input type="number" [(ngModel)]="tierForm.points_multiplier" placeholder="1.0" step="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Color</label>
              <input type="color" [(ngModel)]="tierForm.color" class="w-full h-9 px-1 py-1 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer">
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="saveTier()" [disabled]="savingTier" class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ savingTier ? 'Saving...' : (editingTier ? 'Update Tier' : 'Create Tier') }}
            </button>
            <button (click)="showTierForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Create Promo Modal ─────────────────────────────── -->
    @if (showPromoForm) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="showPromoForm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Create Promotion</h3>
            <button (click)="showPromoForm = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Promo Code *</label>
              <input [(ngModel)]="promoForm.code" placeholder="e.g. SUMMER20" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 font-mono uppercase">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
              <input [(ngModel)]="promoForm.name" placeholder="Promotion name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Type</label>
              <select [(ngModel)]="promoForm.type" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="free_night">Free Night</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Value</label>
              <input type="number" [(ngModel)]="promoForm.value" [placeholder]="promoForm.type === 'percentage' ? '10 (%)' : '5000 (kobo)'" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Start Date</label>
              <input type="date" [(ngModel)]="promoForm.start_date" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">End Date</label>
              <input type="date" [(ngModel)]="promoForm.end_date" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Usage Limit</label>
              <input type="number" [(ngModel)]="promoForm.usage_limit" placeholder="Leave empty = unlimited" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Min Stay Nights</label>
              <input type="number" [(ngModel)]="promoForm.min_stay_nights" placeholder="1" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div class="col-span-2">
              <label class="text-xs font-medium text-gray-500 mb-1 block">Description</label>
              <textarea [(ngModel)]="promoForm.description" rows="2" placeholder="Optional description" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none"></textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="savePromo()" [disabled]="savingPromo" class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ savingPromo ? 'Creating...' : 'Create Promotion' }}
            </button>
            <button (click)="showPromoForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    @if (!loading()) {
      <!-- Tabs -->
      <div class="flex gap-2 mb-6">
        @for (t of tabs; track t.key) {
          <button (click)="tab = t.key"
            [class]="tab === t.key ? 'px-4 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium' : 'px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50'">
            {{ t.label }}
          </button>
        }
      </div>

      <!-- Tiers Tab -->
      @if (tab === 'tiers') {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          @for (t of tiers(); track t.id) {
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center relative group"
              [style.border-left-color]="t.color || '#ccc'" style="border-left-width: 4px">
              <button (click)="openEditTier(t)"
                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-0.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50">
                Edit
              </button>
              <div class="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" [style.background-color]="(t.color || '#9ca3af') + '20'">
                <span class="text-lg">⭐</span>
              </div>
              <p class="text-sm font-bold text-gray-800">{{ t.name }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ t.min_points | number }} pts min</p>
              <p class="text-2xl font-bold mt-2" [style.color]="t.color || '#6b7280'">{{ t.discount_percentage }}%</p>
              <p class="text-xs text-gray-400">discount</p>
              @if (t.points_multiplier && t.points_multiplier !== 1) {
                <p class="text-xs text-sage-600 mt-1 font-medium">{{ t.points_multiplier }}x points</p>
              }
            </div>
          } @empty {
            <div class="col-span-5 text-center py-12 text-gray-400">
              <p class="text-2xl mb-2">⭐</p>
              <p class="text-sm font-medium">No loyalty tiers configured</p>
              <button (click)="openCreateTier()" class="mt-3 text-sm text-sage-600 hover:underline">Create your first tier</button>
            </div>
          }
        </div>
      }

      <!-- Promotions Tab -->
      @if (tab === 'promos') {
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Value</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Used</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              @for (p of promos(); track p.id) {
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-bold text-sage-600 text-xs">{{ p.code }}</td>
                  <td class="px-4 py-3 text-gray-800">{{ p.name }}</td>
                  <td class="px-4 py-3">
                    <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{{ p.type }}</span>
                  </td>
                  <td class="px-4 py-3 text-right font-semibold">
                    {{ p.type === 'percentage' ? p.value + '%' : '₦' + ((+p.value) / 100).toLocaleString() }}
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-500">
                    {{ p.start_date ? p.start_date.substring(0, 10) : '—' }} → {{ p.end_date ? p.end_date.substring(0, 10) : '—' }}
                  </td>
                  <td class="px-4 py-3 text-center text-sm">{{ p.usage_count }}{{ p.usage_limit ? '/' + p.usage_limit : '' }}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full" [class]="p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'">
                      {{ p.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">
                  <p class="text-sm font-medium">No promotions yet</p>
                  <button (click)="openCreatePromo()" class="mt-2 text-sm text-sage-600 hover:underline">Create first promotion</button>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export default class LoyaltyPage implements OnInit {
  private api = inject(ApiService);
  private activeProperty = inject(ActivePropertyService);
  private toast = inject(ToastService);

  loading = signal(true);
  tiers = signal<any[]>([]);
  promos = signal<any[]>([]);
  tab = 'tiers';

  tabs = [
    { key: 'tiers', label: '⭐ Loyalty Tiers' },
    { key: 'promos', label: '🎁 Promotions' },
  ];

  showTierForm = false;
  showPromoForm = false;
  savingTier = false;
  savingPromo = false;
  editingTier: any = null;

  tierForm: any = { name: '', min_points: 0, discount_percentage: 0, points_multiplier: 1, color: '#10b981' };
  promoForm: any = { code: '', name: '', type: 'percentage', value: '', start_date: '', end_date: '', usage_limit: '', min_stay_nights: 1, description: '' };

  ngOnInit() { this.load(); }

  load() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/loyalty/tiers?property_id=${pid}`).subscribe({
      next: (r: any) => { this.tiers.set(r?.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.get(`/loyalty/promotions?property_id=${pid}`).subscribe({
      next: (r: any) => this.promos.set(r?.data || []),
    });
  }

  // ── Tiers ────────────────────────────────────────────────────

  openCreateTier() {
    this.editingTier = null;
    this.tierForm = { name: '', min_points: 0, discount_percentage: 0, points_multiplier: 1, color: '#10b981' };
    this.showTierForm = true;
  }

  openEditTier(tier: any) {
    this.editingTier = tier;
    this.tierForm = { name: tier.name, min_points: tier.min_points, discount_percentage: tier.discount_percentage, points_multiplier: tier.points_multiplier || 1, color: tier.color || '#10b981' };
    this.showTierForm = true;
  }

  saveTier() {
    if (!this.tierForm.name) { this.toast.error('Tier name is required'); return; }
    this.savingTier = true;
    const pid = this.activeProperty.propertyId();
    const body = { ...this.tierForm, property_id: pid };
    const req = this.editingTier
      ? this.api.put(`/loyalty/tiers/${this.editingTier.id}`, body)
      : this.api.post('/loyalty/tiers', body);
    req.subscribe({
      next: (r: any) => {
        this.savingTier = false;
        if (r.success) {
          this.toast.success(this.editingTier ? 'Tier updated' : 'Tier created');
          this.showTierForm = false; this.load();
        } else { this.toast.error(r.message || 'Failed to save tier'); }
      },
      error: () => { this.savingTier = false; this.toast.error('Failed to save tier'); },
    });
  }

  // ── Promotions ───────────────────────────────────────────────

  openCreatePromo() {
    this.promoForm = { code: '', name: '', type: 'percentage', value: '', start_date: '', end_date: '', usage_limit: '', min_stay_nights: 1, description: '' };
    this.showPromoForm = true;
  }

  savePromo() {
    if (!this.promoForm.code || !this.promoForm.name) { this.toast.error('Code and name are required'); return; }
    this.savingPromo = true;
    const pid = this.activeProperty.propertyId();
    const body: any = { ...this.promoForm, property_id: pid, code: this.promoForm.code.toUpperCase() };
    if (!body.usage_limit) delete body.usage_limit;
    if (!body.start_date) delete body.start_date;
    if (!body.end_date) delete body.end_date;
    this.api.post('/loyalty/promotions', body).subscribe({
      next: (r: any) => {
        this.savingPromo = false;
        if (r.success) {
          this.toast.success('Promotion created');
          this.showPromoForm = false; this.load();
        } else { this.toast.error(r.message || 'Failed to create promotion'); }
      },
      error: () => { this.savingPromo = false; this.toast.error('Failed to create promotion'); },
    });
  }
}
