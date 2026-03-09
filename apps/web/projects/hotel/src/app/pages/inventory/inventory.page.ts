import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, StatsCardComponent,
  LoadingSpinnerComponent, EmptyStateComponent, ToastService,
  ConfirmDialogService, ActivePropertyService
} from '@lodgik/shared';

interface StockCategory {
  id: string; name: string; department: string; is_active: boolean;
}

interface UnitOfMeasure {
  id: string; name: string; symbol: string; type: string;
}

interface StockItem {
  id: string; sku: string; name: string; description?: string;
  category_id: string; purchase_uom_id: string; issue_uom_id: string;
  purchase_to_issue_factor: string;
  last_purchase_cost: string; average_cost: string;
  reorder_point: string; par_level: string; max_level: string;
  is_perishable: boolean; expiry_alert_days: number;
  barcode?: string; preferred_vendor?: string; is_active: boolean;
  created_at: string;
}

interface InventorySummary {
  total_items: number; total_locations: number; total_value: string;
  low_stock_count: number; low_stock_items: any[];
}

const BLANK_FORM = () => ({
  sku: '', name: '', description: '', category_id: '', department: '',
  purchase_uom_id: '', issue_uom_id: '', purchase_to_issue_factor: '1',
  reorder_point: '0', par_level: '0', max_level: '0',
  is_perishable: false, expiry_alert_days: 0,
  barcode: '', preferred_vendor: '', is_active: true,
});

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, StatsCardComponent,
            LoadingSpinnerComponent, EmptyStateComponent],
  template: `
<ui-page-header
  title="Stock & Inventory"
  icon="package"
  [breadcrumbs]="['Inventory & Food Cost', 'Stock & Inventory']"
  subtitle="Item master, stock levels, and opening balances">
  <button (click)="openCreate()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
    + Add Item
  </button>
</ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {

<!-- Stats row -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 px-6">
  <ui-stats-card label="Total Items" [value]="summary()?.total_items ?? 0" icon="package" color="sage" />
  <ui-stats-card label="Locations" [value]="summary()?.total_locations ?? 0" icon="map-pin" color="blue" />
  <ui-stats-card label="Stock Value" [value]="stockValueDisplay()" icon="trending-up" color="green" />
  <ui-stats-card label="Low Stock Alerts" [value]="summary()?.low_stock_count ?? 0" icon="triangle-alert"
    />
</div>

<!-- Low stock banner -->
@if ((summary()?.low_stock_count ?? 0) > 0) {
  <div class="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-800">
    <span class="text-lg">⚠️</span>
    <span class="flex-1"><strong>{{ summary()!.low_stock_count }} item(s)</strong> are at or below reorder point and need restocking.</span>
    <button (click)="triggerLowStockNotify()" [disabled]="notifying()"
      class="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 disabled:opacity-60 shrink-0">
      {{ notifying() ? 'Notifying…' : '🔔 Notify Staff' }}
    </button>
    <a routerLink="/inventory/reports" queryParamsHandling="merge"
      class="px-3 py-1.5 border border-amber-300 text-amber-800 text-xs rounded-lg hover:bg-amber-100 shrink-0">
      View Report →
    </a>
  </div>
}

<!-- Filters -->
<div class="px-6 mb-4 flex flex-wrap gap-3">
  <input [(ngModel)]="search" (ngModelChange)="onSearch()"
    placeholder="Search items or SKU…"
    class="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />

  <select [(ngModel)]="filterCategory" (ngModelChange)="loadItems()"
    class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
    <option value="">All Categories</option>
    @for (c of categories(); track c.id) {
      <option [value]="c.id">{{ c.name }}</option>
    }
  </select>

  <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
    <input type="checkbox" [(ngModel)]="showInactive" (ngModelChange)="loadItems()" class="rounded" />
    Show inactive
  </label>
</div>

<!-- Items table -->
<div class="px-6">
  @if (items().length === 0) {
    <ui-empty-state
      icon="📦"
      title="No stock items yet"
      message="Add your first item to start tracking inventory. You'll need at least one category and unit of measure first." />
  } @else {
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-100 text-left">
            <th class="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">SKU</th>
            <th class="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Item</th>
            <th class="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Category</th>
            <th class="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">On Hand</th>
            <th class="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">Par Level</th>
            <th class="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">Avg Cost</th>
            <th class="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
            <th class="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.id) {
            <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                [class.bg-red-50]="isLowStock(item)">
              <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ item.sku }}</td>
              <td class="px-4 py-3">
                <div class="font-medium text-gray-800">{{ item.name }}</div>
                @if (item.preferred_vendor) {
                  <div class="text-xs text-gray-400">{{ item.preferred_vendor }}</div>
                }
                @if (item.is_perishable) {
                  <span class="text-xs text-orange-500">🧊 Perishable</span>
                }
              </td>
              <td class="px-4 py-3 text-gray-600">{{ categoryName(item.category_id) }}</td>
              <td class="px-4 py-3 text-right">
                <span [class]="isLowStock(item) ? 'font-semibold text-red-600' : 'text-gray-700'">
                  {{ onHandDisplay(item) }}
                </span>
                @if (isLowStock(item)) {
                  <span class="ml-1 text-xs text-red-400">⚠️</span>
                }
              </td>
              <td class="px-4 py-3 text-right text-gray-500">{{ item.par_level }}</td>
              <td class="px-4 py-3 text-right text-gray-700">{{ formatCost(item.average_cost) }}</td>
              <td class="px-4 py-3">
                @if (item.is_active) {
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                } @else {
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>
                }
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-1">
                  <button (click)="openEdit(item)"
                    class="px-2 py-1 text-xs text-sage-600 border border-sage-200 rounded-lg hover:bg-sage-50">
                    Edit
                  </button>
                  <button (click)="openBalance(item)"
                    class="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                    Balance
                  </button>
                  <button (click)="deleteItem(item)"
                    class="px-2 py-1 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>{{ total() }} items</span>
          <div class="flex gap-1">
            <button (click)="prevPage()" [disabled]="page() === 1"
              class="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              ←
            </button>
            <span class="px-3 py-1">{{ page() }} / {{ totalPages() }}</span>
            <button (click)="nextPage()" [disabled]="page() === totalPages()"
              class="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              →
            </button>
          </div>
        </div>
      }
    </div>
  }
</div>

} <!-- end !loading -->

<!-- ══ Create / Edit Item Modal ════════════════════════════════ -->
@if (showModal()) {
  <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
       (click)="closeModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
         (click)="$event.stopPropagation()">

      <div class="flex justify-between items-center px-6 pt-6 pb-4 sticky top-0 bg-white border-b border-gray-100">
        <h3 class="text-base font-semibold text-gray-800">
          {{ editingId() ? 'Edit Stock Item' : 'Add Stock Item' }}
        </h3>
        <button (click)="closeModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>

      <div class="px-6 py-4 grid grid-cols-2 gap-4">

        <!-- Setup warning if categories/UoMs not configured -->
        @if (activeCategories().length === 0 || activeUoms().length === 0) {
          <div class="col-span-2 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span class="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
            <div class="text-sm">
              <p class="font-medium text-amber-800">Setup required before adding items</p>
              <p class="text-amber-600 text-xs mt-0.5">
                @if (activeCategories().length === 0) { <span>No categories found. </span> }
                @if (activeUoms().length === 0) { <span>No units of measure found. </span> }
                Go to
                <a routerLink="/inventory/settings" class="underline font-semibold hover:text-amber-800">
                  Inventory Settings
                </a>
                to create categories, units of measure, and storage locations first.
              </p>
            </div>
          </div>
        }

        <!-- SKU -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">SKU *</label>
          <input [(ngModel)]="form.sku" placeholder="e.g. BEV-BEER-HEINEKEN"
            [disabled]="!!editingId()"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 disabled:opacity-60 uppercase" />
        </div>

        <!-- Name -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Item Name *</label>
          <input [(ngModel)]="form.name" placeholder="Heineken 600ml"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>

        <!-- Category -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Category *</label>
          <select [(ngModel)]="form.category_id"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Select category…</option>
            @for (c of activeCategories(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>
        </div>

        <!-- Preferred vendor -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Preferred Vendor</label>
          <input [(ngModel)]="form.preferred_vendor" placeholder="Supplier name"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>

        <!-- Purchase UOM -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Purchase Unit *</label>
          <select [(ngModel)]="form.purchase_uom_id"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Select unit…</option>
            @for (u of activeUoms(); track u.id) {
              <option [value]="u.id">{{ u.name }} ({{ u.symbol }})</option>
            }
          </select>
        </div>

        <!-- Issue UOM -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Issue Unit *</label>
          <select [(ngModel)]="form.issue_uom_id"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Select unit…</option>
            @for (u of activeUoms(); track u.id) {
              <option [value]="u.id">{{ u.name }} ({{ u.symbol }})</option>
            }
          </select>
        </div>

        <!-- Conversion factor -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Units per Purchase Pack</label>
          <input type="number" [(ngModel)]="form.purchase_to_issue_factor" min="0.000001" step="0.001"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
          <p class="text-xs text-gray-400 mt-1">e.g. 1 Case = 24 Bottles → enter 24</p>
        </div>

        <!-- Barcode -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Barcode</label>
          <input [(ngModel)]="form.barcode" placeholder="Optional scan code"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>

        <!-- Par level -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Par Level (issue units)</label>
          <input type="number" [(ngModel)]="form.par_level" min="0" step="0.01"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>

        <!-- Reorder point -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Reorder Point (issue units)</label>
          <input type="number" [(ngModel)]="form.reorder_point" min="0" step="0.01"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
          <p class="text-xs text-gray-400 mt-1">Alert fires when stock falls to this level</p>
        </div>

        <!-- Max level -->
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Max Level (0 = unlimited)</label>
          <input type="number" [(ngModel)]="form.max_level" min="0" step="0.01"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>

        <!-- Perishable -->
        <div class="col-span-2 flex items-center gap-6">
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" [(ngModel)]="form.is_perishable" class="rounded" />
            Perishable / requires expiry tracking
          </label>
          @if (form.is_perishable) {
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-500">Alert before expiry (days):</label>
              <input type="number" [(ngModel)]="form.expiry_alert_days" min="0" max="365"
                class="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm bg-gray-50" />
            </div>
          }
        </div>

        <!-- Description -->
        <div class="col-span-2">
          <label class="text-xs font-medium text-gray-500 mb-1 block">Description</label>
          <textarea [(ngModel)]="form.description" rows="2" placeholder="Optional notes…"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none"></textarea>
        </div>

        <!-- Active toggle (edit only) -->
        @if (editingId()) {
          <div class="col-span-2">
            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" [(ngModel)]="form.is_active" class="rounded" />
              Active (uncheck to deactivate without deleting)
            </label>
          </div>
        }
      </div>

      <div class="flex gap-3 px-6 pb-6">
        <button (click)="saveItem()" [disabled]="saving()"
          class="px-6 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
          {{ saving() ? 'Saving…' : (editingId() ? 'Update Item' : 'Add Item') }}
        </button>
        <button (click)="closeModal()"
          class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  </div>
}

<!-- ══ Opening Balance Modal ═══════════════════════════════════ -->
@if (showBalanceModal()) {
  <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
       (click)="closeBalanceModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
         (click)="$event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-semibold text-gray-800">Set Opening Balance</h3>
        <button (click)="closeBalanceModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
      <p class="text-sm text-gray-500 mb-4">
        Setting opening balance for: <strong>{{ balanceItem()?.name }}</strong>
      </p>
      @if (locations().length === 0) {
        <div class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <span class="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
          <div class="text-sm">
            <p class="font-medium text-amber-800">No storage locations configured</p>
            <p class="text-amber-600 text-xs mt-0.5">
              Go to <a routerLink="/inventory/settings" class="underline font-semibold hover:text-amber-800">Inventory Settings</a>
              to create storage locations (e.g. Main Store, Bar Store) before receiving stock.
            </p>
          </div>
        </div>
      }
      <div class="space-y-3">
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Location *</label>
          <select [(ngModel)]="balanceForm.location_id"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Select location…</option>
            @for (l of locations(); track l.id) {
              <option [value]="l.id">{{ l.name }}</option>
            }
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Quantity (issue units) *</label>
          <input type="number" [(ngModel)]="balanceForm.quantity" min="0" step="0.01"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Unit Cost (₦, kobo) *</label>
          <input type="number" [(ngModel)]="balanceForm.unit_cost" min="0"
            placeholder="e.g. 50000 = ₦500.00"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>
      </div>
      <div class="flex gap-3 mt-5">
        <button (click)="saveBalance()" [disabled]="savingBalance()"
          class="flex-1 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
          {{ savingBalance() ? 'Saving…' : 'Set Balance' }}
        </button>
        <button (click)="closeBalanceModal()"
          class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  </div>
}
  `,
})
export class InventoryPage implements OnInit {
  private api      = inject(ApiService);
  private toast    = inject(ToastService);
  private confirm  = inject(ConfirmDialogService);
  private propSvc  = inject(ActivePropertyService);

  // ── State ────────────────────────────────────────────────────
  loading       = signal(true);
  saving        = signal(false);
  savingBalance = signal(false);
  showModal     = signal(false);
  showBalanceModal = signal(false);
  editingId     = signal<string | null>(null);
  balanceItem   = signal<StockItem | null>(null);

  items       = signal<StockItem[]>([]);
  categories  = signal<StockCategory[]>([]);
  uoms        = signal<UnitOfMeasure[]>([]);
  locations   = signal<any[]>([]);
  summary     = signal<InventorySummary | null>(null);
  /** item_id → total on-hand qty (sum across all locations) */
  balances     = signal<Record<string, number>>({});

  total      = signal(0);
  page       = signal(1);
  perPage    = 30;
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.perPage)));

  search          = '';
  filterCategory  = '';
  showInactive    = false;
  private searchTimer: any;

  form        = BLANK_FORM();
  balanceForm = { location_id: '', quantity: 0, unit_cost: 0 };

  // ── Computed helpers ─────────────────────────────────────────
  activeCategories = computed(() => this.categories().filter(c => c.is_active));
  activeUoms       = computed(() => this.uoms().filter(u => (u as any).is_active !== false));

  stockValueDisplay = computed(() => {
    const v = parseInt(this.summary()?.total_value ?? '0', 10);
    return '₦' + (v / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  });

  // ── Lifecycle ────────────────────────────────────────────────
  notifying = signal(false);

  triggerLowStockNotify(): void {
    this.notifying.set(true);
    const pid = this.propSvc.propertyId();
    this.api.post('/inventory/reports/low-stock/notify', pid ? { property_id: pid } : {}).subscribe({
      next: (r: any) => {
        const n = r.data?.notified ?? 0;
        const s = r.data?.skipped  ?? 0;
        if (n > 0) {
            this.toast.success(`Notified staff: ${n} low-stock item(s) (${s} already sent today)`);
          } else {
            this.toast.warning('All alerts already sent today');
          }
        this.notifying.set(false);
      },
      error: () => { this.toast.error('Notification failed'); this.notifying.set(false); },
    });
  }

  ngOnInit(): void {
    Promise.all([
      this.loadCategories(),
      this.loadUoms(),
      this.loadLocations(),
      this.loadSummary(),
    ]).then(() => this.loadItems());
  }

  // ── Data loading ─────────────────────────────────────────────
  private async loadCategories(): Promise<void> {
    this.api.get('/inventory/categories').subscribe({
      next: r => this.categories.set(r.data ?? []),
      error: () => {}
    });
  }

  private async loadUoms(): Promise<void> {
    this.api.get('/inventory/uoms').subscribe({
      next: r => this.uoms.set(r.data ?? []),
      error: () => {}
    });
  }

  private async loadLocations(): Promise<void> {
    const pid = this.propSvc.propertyId();
    this.api.get('/inventory/locations', pid ? { property_id: pid } : {}).subscribe({
      next: r => this.locations.set(r.data ?? []),
      error: () => {}
    });
  }

  loadItems(): void {
    this.loading.set(true);
    const params: any = {
      page:     this.page(),
      per_page: this.perPage,
    };
    if (this.search)         params['search']       = this.search;
    if (this.filterCategory) params['category_id']  = this.filterCategory;
    if (this.showInactive)   params['include_inactive'] = '1';

    this.api.get('/inventory/items', params).subscribe({
      next: r => {
        const items = r.data ?? [];
        this.items.set(items);
        this.total.set(r.meta?.['total'] ?? 0);
        this.loading.set(false);
        this.loadBalancesForItems(items);
      },
      error: () => {
        this.toast.error('Failed to load inventory items');
        this.loading.set(false);
      }
    });
  }

  loadBalancesForItems(items: StockItem[]): void {
    if (!items.length) return;
    // Fetch balances for each item in parallel and accumulate into a map
    const map: Record<string, number> = {};
    let pending = items.length;
    items.forEach(item => {
      this.api.get(`/inventory/items/${item.id}/balances`).subscribe({
        next: (r: any) => {
          const rows: any[] = r.data ?? [];
          const total = rows.reduce((sum: number, b: any) => sum + parseFloat(b.quantity_on_hand ?? '0'), 0);
          map[item.id] = total;
        },
        error: () => { map[item.id] = 0; },
        complete: () => { if (--pending === 0) this.balances.set({ ...this.balances(), ...map }); },
      });
    });
  }

  loadSummary(): void {
    const pid = this.propSvc.propertyId();
    this.api.get('/inventory/summary', pid ? { property_id: pid } : {}).subscribe({
      next: r => this.summary.set(r.data),
      error: () => {}
    });
  }

  // ── Search with debounce ─────────────────────────────────────
  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.page.set(1);
    this.searchTimer = setTimeout(() => this.loadItems(), 350);
  }

  // ── Pagination ────────────────────────────────────────────────
  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.loadItems(); } }
  nextPage(): void { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.loadItems(); } }

  // ── Modal helpers ─────────────────────────────────────────────
  openCreate(): void {
    this.form = BLANK_FORM();
    this.editingId.set(null);
    this.showModal.set(true);
  }

  openEdit(item: StockItem): void {
    this.form = {
      sku:                     item.sku,
      name:                    item.name,
      description:             item.description ?? '',
      category_id:             item.category_id,
      department:              '',
      purchase_uom_id:         item.purchase_uom_id,
      issue_uom_id:            item.issue_uom_id,
      purchase_to_issue_factor: item.purchase_to_issue_factor,
      reorder_point:           item.reorder_point,
      par_level:               item.par_level,
      max_level:               item.max_level,
      is_perishable:           item.is_perishable,
      expiry_alert_days:       item.expiry_alert_days,
      barcode:                 item.barcode ?? '',
      preferred_vendor:        item.preferred_vendor ?? '',
      is_active:               item.is_active,
    };
    this.editingId.set(item.id);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingId.set(null);
  }

  openBalance(item: StockItem): void {
    this.balanceItem.set(item);
    this.balanceForm = { location_id: '', quantity: 0, unit_cost: 0 };
    this.showBalanceModal.set(true);
  }

  closeBalanceModal(): void {
    this.showBalanceModal.set(false);
    this.balanceItem.set(null);
  }

  // ── CRUD actions ──────────────────────────────────────────────
  saveItem(): void {
    if (!this.form.name || !this.form.sku || !this.form.category_id ||
        !this.form.purchase_uom_id || !this.form.issue_uom_id) {
      this.toast.error('Please fill in all required fields (SKU, Name, Category, Units)');
      return;
    }

    this.saving.set(true);
    const id  = this.editingId();
    const obs = id
      ? this.api.put(`/inventory/items/${id}`, this.form)
      : this.api.post('/inventory/items', this.form);

    obs.subscribe({
      next: () => {
        this.toast.success(id ? 'Item updated' : 'Item added');
        this.closeModal();
        this.loadItems();
        this.loadSummary();
        this.saving.set(false);
      },
      error: (e: any) => {
        this.toast.error(e.error?.message ?? 'Failed to save item');
        this.saving.set(false);
      }
    });
  }

  async deleteItem(item: StockItem): Promise<void> {
    const ok = await this.confirm.confirm({
      title:        'Delete Stock Item',
      message:      `Delete "${item.name}" (${item.sku})? This cannot be undone. Items with stock on hand cannot be deleted.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    this.api.delete(`/inventory/items/${item.id}`).subscribe({
      next: () => {
        this.toast.success('Item deleted');
        this.loadItems();
        this.loadSummary();
      },
      error: (e: any) => this.toast.error(e.error?.message ?? 'Cannot delete item'),
    });
  }

  saveBalance(): void {
    if (!this.balanceForm.location_id) {
      this.toast.error('Please select a location');
      return;
    }
    const item = this.balanceItem();
    if (!item) return;

    this.savingBalance.set(true);
    this.api.post('/inventory/movements/opening', {
      item_id:          item.id,
      location_id:      this.balanceForm.location_id,
      quantity:         this.balanceForm.quantity,
      unit_cost:        Math.round(this.balanceForm.unit_cost * 100), // ₦ → kobo
      property_id:      this.propSvc.propertyId() ?? null,
      created_by_name:  'Staff',
    }).subscribe({
      next: () => {
        this.toast.success('Opening balance set');
        this.closeBalanceModal();
        this.loadSummary();
        this.loadBalancesForItems([item]); // refresh on-hand for this item
        this.savingBalance.set(false);
      },
      error: (e: any) => {
        this.toast.error(e.error?.message ?? 'Failed to set balance');
        this.savingBalance.set(false);
      }
    });
  }

  // ── Display helpers ───────────────────────────────────────────
  categoryName(id: string): string {
    return this.categories().find(c => c.id === id)?.name ?? '—';
  }

  formatCost(kobo: string): string {
    const v = parseInt(kobo ?? '0', 10);
    if (v === 0) return '—';
    return '₦' + (v / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  }

  onHandDisplay(item: StockItem): string {
    const qty = this.balances()[item.id];
    const uom = this.uoms().find(u => u.id === item.issue_uom_id);
    const sym = uom?.symbol ?? '';
    if (qty === undefined) return `— ${sym}`;
    return `${qty % 1 === 0 ? qty : qty.toFixed(3)} ${sym}`;
  }

  isLowStock(item: StockItem): boolean {
    return this.summary()?.low_stock_items?.some((li: any) => li.id === item.id) ?? false;
  }
}
