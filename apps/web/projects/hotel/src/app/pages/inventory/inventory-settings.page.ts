import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  EmptyStateComponent, ToastService, ConfirmDialogService
} from '@lodgik/shared';

interface StockLocation {
  id: string; name: string; type: string; property_id?: string;
  department?: string; manager_name?: string; parent_id?: string;
  is_active: boolean;
}

interface StockCategory {
  id: string; name: string; department: string;
  description?: string; parent_id?: string; is_active: boolean;
}

interface UnitOfMeasure {
  id: string; name: string; symbol: string; type: string;
  base_unit_id?: string; conversion_factor: string; is_active: boolean;
}

type Tab = 'locations' | 'categories' | 'uoms';

@Component({
  selector: 'app-inventory-settings',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
<ui-page-header
  title="Inventory Settings"
  icon="settings-2"
  [breadcrumbs]="['F&B & Facilities', 'Inventory', 'Settings']"
  subtitle="Manage stock locations, categories, and units of measure">
</ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {

<!-- Tabs -->
<div class="px-6 mb-6">
  <div class="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
    @for (tab of tabs; track tab.key) {
      <button (click)="activeTab.set(tab.key)"
        [class]="activeTab() === tab.key
          ? 'px-5 py-2 bg-white rounded-lg text-sm font-medium text-gray-900 shadow-sm'
          : 'px-5 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg'">
        {{ tab.label }}
        <span class="ml-1.5 text-xs text-gray-400">({{ tabCount(tab.key) }})</span>
      </button>
    }
  </div>
</div>

<!-- ── Locations Tab ────────────────────────────────────────── -->
@if (activeTab() === 'locations') {
  <div class="px-6">
    <div class="flex justify-between items-center mb-4">
      <p class="text-sm text-gray-500">
        Define where stock is stored — central warehouse, property stores, and department sub-stores.
      </p>
      <button (click)="openCreateLocation()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
        + Add Location
      </button>
    </div>

    @if (locations().length === 0) {
      <ui-empty-state icon="🏭" title="No locations yet"
        message="Add a warehouse or store to start organising your stock." />
    } @else {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100 text-left">
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Department</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Manager</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (loc of locations(); track loc.id) {
              <tr class="border-b border-gray-50 hover:bg-gray-50">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-800">{{ loc.name }}</div>
                  @if (loc.parent_id) {
                    <div class="text-xs text-gray-400">↳ {{ parentLocationName(loc.parent_id) }}</div>
                  }
                </td>
                <td class="px-4 py-3">
                  <span [class]="locTypeBadge(loc.type)">{{ loc.type }}</span>
                </td>
                <td class="px-4 py-3 text-gray-500">{{ loc.department ?? '—' }}</td>
                <td class="px-4 py-3 text-gray-500">{{ loc.manager_name ?? '—' }}</td>
                <td class="px-4 py-3">
                  @if (loc.is_active) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Active</span>
                  } @else {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Inactive</span>
                  }
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-1">
                    <button (click)="openEditLocation(loc)"
                      class="px-2 py-1 text-xs text-sage-600 border border-sage-200 rounded-lg hover:bg-sage-50">Edit</button>
                    <button (click)="deleteLocation(loc)"
                      class="px-2 py-1 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50">Delete</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
}

<!-- ── Categories Tab ───────────────────────────────────────── -->
@if (activeTab() === 'categories') {
  <div class="px-6">
    <div class="flex justify-between items-center mb-4">
      <p class="text-sm text-gray-500">
        Organise stock by category (e.g. Beverages → Spirits → Whisky).
      </p>
      <button (click)="openCreateCategory()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
        + Add Category
      </button>
    </div>

    @if (categories().length === 0) {
      <ui-empty-state icon="🏷️" title="No categories yet"
        message="Create categories to organise your inventory items." />
    } @else {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100 text-left">
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Department</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Parent</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (cat of categories(); track cat.id) {
              <tr class="border-b border-gray-50 hover:bg-gray-50">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-800">{{ cat.name }}</div>
                  @if (cat.description) {
                    <div class="text-xs text-gray-400">{{ cat.description }}</div>
                  }
                </td>
                <td class="px-4 py-3 text-gray-500 capitalize">{{ cat.department }}</td>
                <td class="px-4 py-3 text-gray-500">{{ parentCategoryName(cat.parent_id) }}</td>
                <td class="px-4 py-3">
                  @if (cat.is_active) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Active</span>
                  } @else {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Inactive</span>
                  }
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-1">
                    <button (click)="openEditCategory(cat)"
                      class="px-2 py-1 text-xs text-sage-600 border border-sage-200 rounded-lg hover:bg-sage-50">Edit</button>
                    <button (click)="deleteCategory(cat)"
                      class="px-2 py-1 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50">Delete</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
}

<!-- ── UOM Tab ───────────────────────────────────────────────── -->
@if (activeTab() === 'uoms') {
  <div class="px-6">
    <div class="flex justify-between items-center mb-4">
      <p class="text-sm text-gray-500">
        Define purchase and issue units (e.g. Case, Bottle, Kilogram).
      </p>
      <button (click)="openCreateUom()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
        + Add Unit
      </button>
    </div>

    @if (uoms().length === 0) {
      <ui-empty-state icon="⚖️" title="No units of measure yet"
        message="Add units like Kilogram, Litre, Piece, or Case before creating stock items." />
    } @else {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100 text-left">
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Symbol</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Base Unit</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Factor</th>
              <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (uom of uoms(); track uom.id) {
              <tr class="border-b border-gray-50 hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-800">{{ uom.name }}</td>
                <td class="px-4 py-3 font-mono text-sm text-gray-600">{{ uom.symbol }}</td>
                <td class="px-4 py-3 text-gray-500 capitalize">{{ uom.type }}</td>
                <td class="px-4 py-3 text-gray-500">{{ baseUomName(uom.base_unit_id) }}</td>
                <td class="px-4 py-3 text-right text-gray-500">{{ uom.conversion_factor }}</td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-1">
                    <button (click)="openEditUom(uom)"
                      class="px-2 py-1 text-xs text-sage-600 border border-sage-200 rounded-lg hover:bg-sage-50">Edit</button>
                    <button (click)="deleteUom(uom)"
                      class="px-2 py-1 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50">Delete</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
}

} <!-- end !loading -->

<!-- ══ Location Modal ══════════════════════════════════════════ -->
@if (showLocModal()) {
  <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
       (click)="closeLocModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-semibold text-gray-800">{{ locEditId() ? 'Edit Location' : 'Add Location' }}</h3>
        <button (click)="closeLocModal()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
          <input [(ngModel)]="locForm.name" placeholder="e.g. Main Bar Store"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Type *</label>
            <select [(ngModel)]="locForm.type"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="warehouse">Warehouse (central)</option>
              <option value="store">Store (property)</option>
              <option value="department">Department sub-store</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Department</label>
            <select [(ngModel)]="locForm.department"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="">—</option>
              <option value="kitchen">Kitchen</option>
              <option value="bar">Bar</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="maintenance">Maintenance</option>
              <option value="front_office">Front Office</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Parent Location</label>
          <select [(ngModel)]="locForm.parent_id"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">None (top-level)</option>
            @for (l of locations(); track l.id) {
              @if (l.id !== locEditId()) {
                <option [value]="l.id">{{ l.name }}</option>
              }
            }
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Manager Name</label>
          <input [(ngModel)]="locForm.manager_name" placeholder="Responsible person"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>
        @if (locEditId()) {
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" [(ngModel)]="locForm.is_active" class="rounded" />
            Active
          </label>
        }
      </div>
      <div class="flex gap-3 mt-5">
        <button (click)="saveLocation()" [disabled]="savingLoc()"
          class="flex-1 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
          {{ savingLoc() ? 'Saving…' : (locEditId() ? 'Update' : 'Create') }}
        </button>
        <button (click)="closeLocModal()"
          class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  </div>
}

<!-- ══ Category Modal ══════════════════════════════════════════ -->
@if (showCatModal()) {
  <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
       (click)="closeCatModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-semibold text-gray-800">{{ catEditId() ? 'Edit Category' : 'Add Category' }}</h3>
        <button (click)="closeCatModal()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
          <input [(ngModel)]="catForm.name" placeholder="e.g. Spirits"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Department</label>
            <select [(ngModel)]="catForm.department"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="general">General</option>
              <option value="kitchen">Kitchen</option>
              <option value="bar">Bar</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="maintenance">Maintenance</option>
              <option value="front_office">Front Office</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Parent Category</label>
            <select [(ngModel)]="catForm.parent_id"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="">None (top-level)</option>
              @for (c of categories(); track c.id) {
                @if (c.id !== catEditId()) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              }
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Description</label>
          <textarea [(ngModel)]="catForm.description" rows="2" placeholder="Optional…"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none"></textarea>
        </div>
        @if (catEditId()) {
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" [(ngModel)]="catForm.is_active" class="rounded" />
            Active
          </label>
        }
      </div>
      <div class="flex gap-3 mt-5">
        <button (click)="saveCategory()" [disabled]="savingCat()"
          class="flex-1 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
          {{ savingCat() ? 'Saving…' : (catEditId() ? 'Update' : 'Create') }}
        </button>
        <button (click)="closeCatModal()"
          class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  </div>
}

<!-- ══ UOM Modal ════════════════════════════════════════════════ -->
@if (showUomModal()) {
  <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
       (click)="closeUomModal()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-semibold text-gray-800">{{ uomEditId() ? 'Edit Unit' : 'Add Unit of Measure' }}</h3>
        <button (click)="closeUomModal()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
      </div>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
            <input [(ngModel)]="uomForm.name" placeholder="e.g. Kilogram"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Symbol *</label>
            <input [(ngModel)]="uomForm.symbol" placeholder="e.g. kg"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Measurement Type</label>
          <select [(ngModel)]="uomForm.type"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="count">Count / Pieces</option>
            <option value="weight">Weight</option>
            <option value="volume">Volume</option>
            <option value="length">Length</option>
            <option value="area">Area</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Base Unit</label>
          <select [(ngModel)]="uomForm.base_unit_id"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">None (this IS the base unit)</option>
            @for (u of uoms(); track u.id) {
              @if (u.id !== uomEditId()) {
                <option [value]="u.id">{{ u.name }} ({{ u.symbol }})</option>
              }
            }
          </select>
        </div>
        @if (uomForm.base_unit_id) {
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">How many base units per 1 of this unit?</label>
            <input type="number" [(ngModel)]="uomForm.conversion_factor" min="0.000001" step="0.001"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
            <p class="text-xs text-gray-400 mt-1">e.g. 1 Case (24) = 24 Pieces → enter 24</p>
          </div>
        }
        @if (uomEditId()) {
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" [(ngModel)]="uomForm.is_active" class="rounded" />
            Active
          </label>
        }
      </div>
      <div class="flex gap-3 mt-5">
        <button (click)="saveUom()" [disabled]="savingUom()"
          class="flex-1 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
          {{ savingUom() ? 'Saving…' : (uomEditId() ? 'Update' : 'Create') }}
        </button>
        <button (click)="closeUomModal()"
          class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  </div>
}
  `,
})
export class InventorySettingsPage implements OnInit {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  loading = signal(true);

  activeTab = signal<Tab>('locations');
  tabs = [
    { key: 'locations' as Tab,  label: 'Locations' },
    { key: 'categories' as Tab, label: 'Categories' },
    { key: 'uoms' as Tab,       label: 'Units of Measure' },
  ];

  locations  = signal<StockLocation[]>([]);
  categories = signal<StockCategory[]>([]);
  uoms       = signal<UnitOfMeasure[]>([]);

  // Location modal
  showLocModal = signal(false);
  savingLoc    = signal(false);
  locEditId    = signal<string | null>(null);
  locForm      = this.blankLoc();

  // Category modal
  showCatModal = signal(false);
  savingCat    = signal(false);
  catEditId    = signal<string | null>(null);
  catForm      = this.blankCat();

  // UOM modal
  showUomModal = signal(false);
  savingUom    = signal(false);
  uomEditId    = signal<string | null>(null);
  uomForm      = this.blankUom();

  ngOnInit(): void {
    Promise.all([this.loadLocations(), this.loadCategories(), this.loadUoms()])
      .then(() => this.loading.set(false));
  }

  tabCount(tab: Tab): number {
    if (tab === 'locations')  return this.locations().length;
    if (tab === 'categories') return this.categories().length;
    return this.uoms().length;
  }

  // ── Data ──────────────────────────────────────────────────────
  private loadLocations(): Promise<void> {
    return new Promise(resolve => {
      this.api.get('/inventory/locations').subscribe({
        next: r => { this.locations.set(r.data ?? []); resolve(); },
        error: () => resolve()
      });
    });
  }

  private loadCategories(): Promise<void> {
    return new Promise(resolve => {
      this.api.get('/inventory/categories').subscribe({
        next: r => { this.categories.set(r.data ?? []); resolve(); },
        error: () => resolve()
      });
    });
  }

  private loadUoms(): Promise<void> {
    return new Promise(resolve => {
      this.api.get('/inventory/uoms').subscribe({
        next: r => { this.uoms.set(r.data ?? []); resolve(); },
        error: () => resolve()
      });
    });
  }

  // ── Display helpers ───────────────────────────────────────────
  locTypeBadge(type: string): string {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ';
    if (type === 'warehouse')  return base + 'bg-purple-100 text-purple-700';
    if (type === 'store')      return base + 'bg-blue-100 text-blue-700';
    return base + 'bg-gray-100 text-gray-600';
  }

  parentLocationName(id?: string): string {
    if (!id) return '—';
    return this.locations().find(l => l.id === id)?.name ?? '—';
  }

  parentCategoryName(id?: string): string {
    if (!id) return '—';
    return this.categories().find(c => c.id === id)?.name ?? '—';
  }

  baseUomName(id?: string): string {
    if (!id) return '(base)';
    return this.uoms().find(u => u.id === id)?.name ?? '—';
  }

  // ── Location CRUD ─────────────────────────────────────────────
  private blankLoc() {
    return { name: '', type: 'store', department: '', parent_id: '', manager_name: '', is_active: true };
  }

  openCreateLocation(): void { this.locForm = this.blankLoc(); this.locEditId.set(null); this.showLocModal.set(true); }

  openEditLocation(loc: StockLocation): void {
    this.locForm = {
      name: loc.name, type: loc.type,
      department: loc.department ?? '', parent_id: loc.parent_id ?? '',
      manager_name: loc.manager_name ?? '', is_active: loc.is_active,
    };
    this.locEditId.set(loc.id);
    this.showLocModal.set(true);
  }

  closeLocModal(): void { this.showLocModal.set(false); }

  saveLocation(): void {
    if (!this.locForm.name) { this.toast.error('Name is required'); return; }
    this.savingLoc.set(true);
    const id  = this.locEditId();
    const obs = id
      ? this.api.put(`/inventory/locations/${id}`, this.locForm)
      : this.api.post('/inventory/locations', this.locForm);

    obs.subscribe({
      next: () => {
        this.toast.success(id ? 'Location updated' : 'Location created');
        this.closeLocModal();
        this.loadLocations();
        this.savingLoc.set(false);
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed to save'); this.savingLoc.set(false); }
    });
  }

  async deleteLocation(loc: StockLocation): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete Location', confirmLabel: 'Delete',
      message: `Delete "${loc.name}"? This will fail if stock records exist at this location.`,
    });
    if (!ok) return;
    this.api.delete(`/inventory/locations/${loc.id}`).subscribe({
      next: () => { this.toast.success('Location deleted'); this.loadLocations(); },
      error: (e: any) => this.toast.error(e.error?.message ?? 'Cannot delete'),
    });
  }

  // ── Category CRUD ─────────────────────────────────────────────
  private blankCat() {
    return { name: '', department: 'general', parent_id: '', description: '', is_active: true };
  }

  openCreateCategory(): void { this.catForm = this.blankCat(); this.catEditId.set(null); this.showCatModal.set(true); }

  openEditCategory(cat: StockCategory): void {
    this.catForm = {
      name: cat.name, department: cat.department,
      parent_id: cat.parent_id ?? '', description: cat.description ?? '', is_active: cat.is_active,
    };
    this.catEditId.set(cat.id);
    this.showCatModal.set(true);
  }

  closeCatModal(): void { this.showCatModal.set(false); }

  saveCategory(): void {
    if (!this.catForm.name) { this.toast.error('Name is required'); return; }
    this.savingCat.set(true);
    const id  = this.catEditId();
    const obs = id
      ? this.api.put(`/inventory/categories/${id}`, this.catForm)
      : this.api.post('/inventory/categories', this.catForm);

    obs.subscribe({
      next: () => {
        this.toast.success(id ? 'Category updated' : 'Category created');
        this.closeCatModal();
        this.loadCategories();
        this.savingCat.set(false);
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed to save'); this.savingCat.set(false); }
    });
  }

  async deleteCategory(cat: StockCategory): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete Category', confirmLabel: 'Delete',
      message: `Delete "${cat.name}"? This will fail if any items reference this category.`,
    });
    if (!ok) return;
    this.api.delete(`/inventory/categories/${cat.id}`).subscribe({
      next: () => { this.toast.success('Category deleted'); this.loadCategories(); },
      error: (e: any) => this.toast.error(e.error?.message ?? 'Cannot delete'),
    });
  }

  // ── UOM CRUD ──────────────────────────────────────────────────
  private blankUom() {
    return { name: '', symbol: '', type: 'count', base_unit_id: '', conversion_factor: '1', is_active: true };
  }

  openCreateUom(): void { this.uomForm = this.blankUom(); this.uomEditId.set(null); this.showUomModal.set(true); }

  openEditUom(uom: UnitOfMeasure): void {
    this.uomForm = {
      name: uom.name, symbol: uom.symbol, type: uom.type,
      base_unit_id: uom.base_unit_id ?? '', conversion_factor: uom.conversion_factor, is_active: uom.is_active,
    };
    this.uomEditId.set(uom.id);
    this.showUomModal.set(true);
  }

  closeUomModal(): void { this.showUomModal.set(false); }

  saveUom(): void {
    if (!this.uomForm.name || !this.uomForm.symbol) {
      this.toast.error('Name and symbol are required'); return;
    }
    this.savingUom.set(true);
    const id  = this.uomEditId();
    const obs = id
      ? this.api.put(`/inventory/uoms/${id}`, this.uomForm)
      : this.api.post('/inventory/uoms', this.uomForm);

    obs.subscribe({
      next: () => {
        this.toast.success(id ? 'Unit updated' : 'Unit created');
        this.closeUomModal();
        this.loadUoms();
        this.savingUom.set(false);
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed to save'); this.savingUom.set(false); }
    });
  }

  async deleteUom(uom: UnitOfMeasure): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete Unit', confirmLabel: 'Delete',
      message: `Delete "${uom.name}"? This will fail if any items use this unit.`,
    });
    if (!ok) return;
    this.api.delete(`/inventory/uoms/${uom.id}`).subscribe({
      next: () => { this.toast.success('Unit deleted'); this.loadUoms(); },
      error: (e: any) => this.toast.error(e.error?.message ?? 'Cannot delete'),
    });
  }
}
