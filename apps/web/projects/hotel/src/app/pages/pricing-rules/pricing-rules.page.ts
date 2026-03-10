import {
  Component, inject, OnInit, OnDestroy, signal, computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, BadgeComponent, EmptyStateComponent,
} from '@lodgik/shared';
import { ActivePropertyService } from '@lodgik/shared';
import { Subscription } from 'rxjs';

interface PricingRule {
  id: string;
  property_id: string;
  room_type_id: string | null;
  name: string;
  rule_type: string;
  adjustment_type: string;
  adjustment_value: string;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  min_occupancy: number | null;
  max_occupancy: number | null;
  min_nights: number | null;
  advance_days: number | null;
  priority: number;
  is_active: boolean;
  description: string | null;
}

interface RoomType { id: string; name: string; }

const RULE_TYPES = [
  { value: 'occupancy',   label: 'Occupancy-Based',  hint: 'Triggers when property occupancy is within a range' },
  { value: 'seasonal',    label: 'Seasonal / Date',   hint: 'Applies between specific dates' },
  { value: 'day_of_week', label: 'Day of Week',       hint: 'Applies on specific days (e.g. weekends)' },
  { value: 'last_minute', label: 'Last Minute',       hint: 'Applies N days before arrival' },
  { value: 'early_bird',  label: 'Early Bird',        hint: 'Applies when booked N+ days in advance' },
  { value: 'length_stay', label: 'Minimum Stay',      hint: 'Applies when minimum nights is met' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Component({
  selector: 'app-pricing-rules',
  standalone: true,
  imports: [
    FormsModule, DecimalPipe,
    PageHeaderComponent, LoadingSpinnerComponent,
    BadgeComponent, EmptyStateComponent,
  ],
  template: `
    <ui-page-header
      title="Dynamic Pricing Rules"
      icon="trending-up"
      subtitle="Automatically adjust rates based on occupancy, season, and demand"
      [breadcrumbs]="['Finance & Reports','Pricing Rules']">
      <button (click)="openCreateModal()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 transition-colors">
        + New Rule
      </button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {

      <!-- Active/inactive toggle filter -->
      <div class="flex gap-2 mb-5">
        @for (f of statusFilters; track f.value) {
          <button (click)="statusFilter.set(f.value)"
            class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
            [class.bg-sage-600]="statusFilter() === f.value"
            [class.text-white]="statusFilter() === f.value"
            [class.border-sage-600]="statusFilter() === f.value"
            [class.border-gray-200]="statusFilter() !== f.value"
            [class.text-gray-600]="statusFilter() !== f.value">
            {{ f.label }}
          </button>
        }
      </div>

      @if (filteredRules().length === 0) {
        <ui-empty-state
          icon="trending-up"
          title="No pricing rules yet"
          description="Create rules to automatically adjust rates based on occupancy, season, or time of booking">
        </ui-empty-state>
      } @else {
        <div class="space-y-3">
          @for (r of filteredRules(); track r.id) {
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <div class="flex items-start justify-between gap-4">

                <!-- Left: Rule info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <p class="text-sm font-semibold text-gray-900">{{ r.name }}</p>
                    <span class="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                      {{ ruleTypeLabel(r.rule_type) }}
                    </span>
                    @if (r.room_type_id) {
                      <span class="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                        {{ roomTypeName(r.room_type_id) }}
                      </span>
                    } @else {
                      <span class="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">All room types</span>
                    }
                  </div>

                  @if (r.description) {
                    <p class="text-xs text-gray-400 mb-2">{{ r.description }}</p>
                  }

                  <!-- Conditions summary -->
                  <div class="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span class="flex items-center gap-1">
                      <span class="font-semibold" [class.text-emerald-600]="+r.adjustment_value > 0" [class.text-red-600]="+r.adjustment_value < 0">
                        {{ +r.adjustment_value > 0 ? '+' : '' }}{{ r.adjustment_value }}{{ r.adjustment_type === 'percentage' ? '%' : ' ₦' }}
                      </span>
                      adjustment
                    </span>
                    <span>Priority: {{ r.priority }}</span>
                    @if (r.start_date) { <span>{{ r.start_date }} → {{ r.end_date || 'ongoing' }}</span> }
                    @if (r.min_occupancy != null) { <span>Occ: {{ r.min_occupancy }}%–{{ r.max_occupancy ?? 100 }}%</span> }
                    @if (r.advance_days != null) { <span>≥ {{ r.advance_days }} days advance</span> }
                    @if (r.min_nights != null) { <span>Min {{ r.min_nights }} nights</span> }
                    @if (r.days_of_week?.length) {
                      <span>{{ getDaysLabel(r.days_of_week!) }}</span>
                    }
                  </div>
                </div>

                <!-- Right: Status + actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <button (click)="toggleActive(r)"
                    class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                    [class.bg-sage-600]="r.is_active"
                    [class.bg-gray-200]="!r.is_active">
                    <span class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200"
                          [class.translate-x-5]="r.is_active"
                          [class.translate-x-0]="!r.is_active"></span>
                  </button>
                  <button (click)="openEditModal(r)"
                    class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button (click)="deleteRule(r)"
                    class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    }

    <!-- ── CREATE / EDIT MODAL ──────────────────────────────── -->
    @if (showModal()) {
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="closeModal()">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[95vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-900 mb-5">
            {{ editingId() ? 'Edit Pricing Rule' : 'New Pricing Rule' }}
          </h2>

          <div class="space-y-5">

            <!-- Name + Rule Type -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Rule Name *</label>
                <input [(ngModel)]="form.name" placeholder="e.g. Weekend Surcharge"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Rule Type *</label>
                <select [(ngModel)]="form.rule_type"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                  @for (rt of ruleTypes; track rt.value) {
                    <option [value]="rt.value">{{ rt.label }}</option>
                  }
                </select>
                <p class="text-xs text-gray-400 mt-1">{{ ruleTypeHint(form.rule_type) }}</p>
              </div>
            </div>

            <!-- Adjustment -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Adjustment Type *</label>
                <select [(ngModel)]="form.adjustment_type"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₦)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">
                  Value * {{ form.adjustment_type === 'percentage' ? '(Use negative to decrease)' : '(Use negative to discount)' }}
                </label>
                <input type="number" step="0.5" [(ngModel)]="form.adjustment_value"
                  placeholder="{{ form.adjustment_type === 'percentage' ? '15 or -10' : '5000 or -2000' }}"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Priority</label>
                <input type="number" min="0" [(ngModel)]="form.priority" placeholder="0"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                <p class="text-xs text-gray-400 mt-1">Higher number = applied first</p>
              </div>
            </div>

            <!-- Room type filter -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Apply to Room Type</label>
              <select [(ngModel)]="form.room_type_id"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                <option value="">All Room Types</option>
                @for (rt of roomTypes(); track rt.id) {
                  <option [value]="rt.id">{{ rt.name }}</option>
                }
              </select>
            </div>

            <!-- Occupancy conditions (occupancy rule) -->
            @if (form.rule_type === 'occupancy') {
              <div class="p-4 bg-blue-50 rounded-xl">
                <p class="text-xs font-semibold text-blue-700 mb-3">Occupancy Conditions</p>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Min Occupancy % *</label>
                    <input type="number" min="0" max="100" [(ngModel)]="form.min_occupancy" placeholder="70"
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Max Occupancy % (leave blank for 100%)</label>
                    <input type="number" min="0" max="100" [(ngModel)]="form.max_occupancy" placeholder="100"
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                  </div>
                </div>
              </div>
            }

            <!-- Date range (seasonal) -->
            @if (form.rule_type === 'seasonal') {
              <div class="p-4 bg-amber-50 rounded-xl">
                <p class="text-xs font-semibold text-amber-700 mb-3">Date Range</p>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
                    <input type="date" [(ngModel)]="form.start_date"
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                    <input type="date" [(ngModel)]="form.end_date"
                      class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                  </div>
                </div>
              </div>
            }

            <!-- Day of week -->
            @if (form.rule_type === 'day_of_week') {
              <div class="p-4 bg-purple-50 rounded-xl">
                <p class="text-xs font-semibold text-purple-700 mb-3">Days of Week *</p>
                <div class="flex flex-wrap gap-2">
                  @for (d of [0,1,2,3,4,5,6]; track d) {
                    <button type="button" (click)="toggleDay(d)"
                      class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                      [class.bg-purple-600]="isDaySelected(d)"
                      [class.text-white]="isDaySelected(d)"
                      [class.border-purple-600]="isDaySelected(d)"
                      [class.border-gray-200]="!isDaySelected(d)"
                      [class.text-gray-600]="!isDaySelected(d)">
                      {{ dayLabel(d) }}
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Advance days (last minute / early bird) -->
            @if (form.rule_type === 'last_minute' || form.rule_type === 'early_bird') {
              <div class="p-4 bg-emerald-50 rounded-xl">
                <p class="text-xs font-semibold text-emerald-700 mb-3">Advance Booking Days</p>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">
                    {{ form.rule_type === 'last_minute' ? 'Applies when booked within N days of arrival' : 'Applies when booked N+ days before arrival' }}
                  </label>
                  <input type="number" min="0" [(ngModel)]="form.advance_days"
                    [placeholder]="form.rule_type === 'last_minute' ? '3' : '14'"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
              </div>
            }

            <!-- Min nights (length of stay) -->
            @if (form.rule_type === 'length_stay') {
              <div class="p-4 bg-indigo-50 rounded-xl">
                <p class="text-xs font-semibold text-indigo-700 mb-3">Minimum Stay</p>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Minimum Nights *</label>
                  <input type="number" min="1" [(ngModel)]="form.min_nights" placeholder="3"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
              </div>
            }

            <!-- Description -->
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Notes / Description</label>
              <textarea [(ngModel)]="form.description" rows="2" placeholder="Optional internal note"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none resize-none"></textarea>
            </div>

            <!-- Active toggle -->
            <div class="flex items-center gap-3">
              <button type="button" (click)="form.is_active = !form.is_active"
                class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200"
                [class.bg-sage-600]="form.is_active"
                [class.bg-gray-200]="!form.is_active">
                <span class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200"
                      [class.translate-x-5]="form.is_active"
                      [class.translate-x-0]="!form.is_active"></span>
              </button>
              <span class="text-sm text-gray-700">Active</span>
            </div>
          </div>

          <div class="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button (click)="submit()" [disabled]="saving()"
              class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-50 transition-colors">
              @if (saving()) { Saving… } @else { {{ editingId() ? 'Update Rule' : 'Create Rule' }} }
            </button>
            <button (click)="closeModal()"
              class="px-5 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export default class PricingRulesPage implements OnInit, OnDestroy {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private propSvc = inject(ActivePropertyService);
  private sub!: Subscription;

  // ── state ────────────────────────────────────────────────────
  loading    = signal(true);
  saving     = signal(false);
  rules      = signal<PricingRule[]>([]);
  roomTypes  = signal<RoomType[]>([]);
  showModal  = signal(false);
  editingId  = signal<string | null>(null);
  statusFilter = signal<string>('all');

  // ── form ─────────────────────────────────────────────────────
  form: any = this.blankForm();

  // ── constants ────────────────────────────────────────────────
  readonly ruleTypes     = RULE_TYPES;
  readonly statusFilters = [
    { value: 'all',      label: 'All Rules' },
    { value: 'active',   label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // ── computed ─────────────────────────────────────────────────
  filteredRules = computed(() => {
    const f = this.statusFilter();
    const list = this.rules();
    if (f === 'active')   return list.filter(r => r.is_active);
    if (f === 'inactive') return list.filter(r => !r.is_active);
    return list;
  });

  ngOnInit(): void {
    this.load();
    this.loadRoomTypes();
    this.sub = this.propSvc.propertySwitched$.subscribe(() => this.load());
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private load(): void {
    this.loading.set(true);
    this.api.get('/pricing-rules', { property_id: this.propSvc.propertyId() }).subscribe({
      next: (r: any) => { this.rules.set(r?.data || []); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load pricing rules'); this.loading.set(false); },
    });
  }

  private loadRoomTypes(): void {
    this.api.get('/room-types', { property_id: this.propSvc.propertyId() }).subscribe({
      next: (r: any) => this.roomTypes.set(r?.data || []),
      error: () => {},
    });
  }

  private blankForm(): any {
    return {
      name: '', rule_type: 'occupancy', adjustment_type: 'percentage', adjustment_value: '',
      room_type_id: '', priority: 0, description: '', is_active: true,
      start_date: '', end_date: '', days_of_week: [] as number[],
      min_occupancy: null, max_occupancy: null, advance_days: null, min_nights: null,
    };
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.form = this.blankForm();
    this.showModal.set(true);
  }

  openEditModal(r: PricingRule): void {
    this.editingId.set(r.id);
    this.form = {
      name:             r.name,
      rule_type:        r.rule_type,
      adjustment_type:  r.adjustment_type,
      adjustment_value: r.adjustment_value,
      room_type_id:     r.room_type_id ?? '',
      priority:         r.priority,
      description:      r.description ?? '',
      is_active:        r.is_active,
      start_date:       r.start_date ?? '',
      end_date:         r.end_date ?? '',
      days_of_week:     r.days_of_week ? [...r.days_of_week] : [],
      min_occupancy:    r.min_occupancy,
      max_occupancy:    r.max_occupancy,
      advance_days:     r.advance_days,
      min_nights:       r.min_nights,
    };
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.editingId.set(null); }

  submit(): void {
    if (!this.form.name?.trim()) { this.toast.error('Rule name is required'); return; }
    if (!this.form.adjustment_value && this.form.adjustment_value !== 0) { this.toast.error('Adjustment value is required'); return; }
    if (this.form.rule_type === 'occupancy' && this.form.min_occupancy == null) { this.toast.error('Min occupancy % is required for occupancy rules'); return; }
    if (this.form.rule_type === 'day_of_week' && !this.form.days_of_week?.length) { this.toast.error('Select at least one day of week'); return; }
    if ((this.form.rule_type === 'last_minute' || this.form.rule_type === 'early_bird') && this.form.advance_days == null) { this.toast.error('Advance days is required for this rule type'); return; }
    if (this.form.rule_type === 'length_stay' && !this.form.min_nights) { this.toast.error('Minimum nights is required'); return; }

    this.saving.set(true);
    const payload: any = {
      property_id:      this.propSvc.propertyId(),
      name:             this.form.name.trim(),
      rule_type:        this.form.rule_type,
      adjustment_type:  this.form.adjustment_type,
      adjustment_value: String(this.form.adjustment_value),
      room_type_id:     this.form.room_type_id || null,
      priority:         Number(this.form.priority) || 0,
      description:      this.form.description || null,
      is_active:        this.form.is_active,
      start_date:       this.form.start_date || null,
      end_date:         this.form.end_date || null,
      days_of_week:     this.form.days_of_week?.length ? this.form.days_of_week : null,
      min_occupancy:    this.form.min_occupancy != null ? Number(this.form.min_occupancy) : null,
      max_occupancy:    this.form.max_occupancy != null ? Number(this.form.max_occupancy) : null,
      advance_days:     this.form.advance_days != null ? Number(this.form.advance_days) : null,
      min_nights:       this.form.min_nights != null ? Number(this.form.min_nights) : null,
    };

    const req = this.editingId()
      ? this.api.put(`/pricing-rules/${this.editingId()}`, payload)
      : this.api.post('/pricing-rules', payload);

    req.subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r?.success) {
          this.toast.success(this.editingId() ? 'Rule updated' : 'Rule created');
          this.closeModal();
          this.load();
        } else {
          this.toast.error(r?.message || 'Failed to save rule');
        }
      },
      error: (e: any) => { this.saving.set(false); this.toast.error(e?.error?.message || 'Failed to save rule'); },
    });
  }

  toggleActive(r: PricingRule): void {
    this.api.put(`/pricing-rules/${r.id}`, { is_active: !r.is_active }).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.rules.update(list => list.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
          this.toast.success(r.is_active ? 'Rule deactivated' : 'Rule activated');
        }
      },
      error: () => this.toast.error('Failed to toggle rule status'),
    });
  }

  deleteRule(r: PricingRule): void {
    if (!confirm(`Delete rule "${r.name}"? This cannot be undone.`)) return;
    this.api.delete(`/pricing-rules/${r.id}`).subscribe({
      next: (res: any) => {
        if (res?.success) { this.toast.success('Rule deleted'); this.rules.update(list => list.filter(x => x.id !== r.id)); }
        else this.toast.error(res?.message || 'Failed to delete');
      },
      error: () => this.toast.error('Failed to delete rule'),
    });
  }

  // ── helpers ──────────────────────────────────────────────────
  toggleDay(d: number): void {
    const days: number[] = this.form.days_of_week || [];
    this.form.days_of_week = days.includes(d) ? days.filter((x: number) => x !== d) : [...days, d];
  }

  isDaySelected(d: number): boolean { return (this.form.days_of_week || []).includes(d); }

  dayLabel(d: number): string { return DAY_LABELS[d] ?? `Day ${d}`; }
  getDaysLabel(days: number[]): string { return days.map(d => this.dayLabel(d)).join(', '); }

  ruleTypeLabel(v: string): string { return RULE_TYPES.find(r => r.value === v)?.label ?? v; }

  ruleTypeHint(v: string): string { return RULE_TYPES.find(r => r.value === v)?.hint ?? ''; }

  roomTypeName(id: string): string { return this.roomTypes().find(r => r.id === id)?.name ?? 'Unknown'; }
}
