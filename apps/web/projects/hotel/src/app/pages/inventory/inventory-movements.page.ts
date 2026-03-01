import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, StatsCardComponent,
  LoadingSpinnerComponent, EmptyStateComponent, ToastService,
  ActivePropertyService
} from '@lodgik/shared';
import { Router } from '@angular/router';

interface StockMovement {
  id: string;
  type: string; type_label: string; type_color: string;
  status: string;
  reference_number: string;
  reference_id?: string;
  source_location_name?: string;
  destination_location_name?: string;
  movement_date: string;
  supplier_name?: string;
  supplier_invoice?: string;
  notes?: string;
  created_by_name: string;
  total_value: string;
  line_count: number;
  created_at: string;
}

interface StockLocation { id: string; name: string; type: string; }
interface StockItem { id: string; sku: string; name: string; }

@Component({
  selector: 'app-inventory-movements',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
<ui-page-header
  title="Stock Movements"
  icon="arrow-left-right"
  [breadcrumbs]="['F&B & Facilities', 'Stock Movements']"
  subtitle="Full audit ledger of all stock-in, stock-out and transfer activity">
  <div class="flex gap-2">
    <button (click)="router.navigate(['/inventory/grn'])"
      class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-1">
      <span>+</span> GRN
    </button>
    <button (click)="router.navigate(['/inventory'])"
      class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
      Items
    </button>
  </div>
</ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {

<!-- Filters -->
<div class="px-6 mb-4 flex flex-wrap gap-3 items-end">

  <!-- Type filter -->
  <div class="flex flex-col gap-1">
    <label class="text-xs text-gray-500 font-medium">Type</label>
    <select [(ngModel)]="filterType" (ngModelChange)="applyFilters()"
      class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[140px]">
      <option value="">All Types</option>
      <option value="opening">Opening Balance</option>
      <option value="grn">Goods Received</option>
      <option value="issue">Issue</option>
      <option value="transfer">Transfer</option>
      <option value="adjustment">Adjustment</option>
      <option value="pos_deduction">POS Deduction</option>
    </select>
  </div>

  <!-- Location filter -->
  <div class="flex flex-col gap-1">
    <label class="text-xs text-gray-500 font-medium">Location</label>
    <select [(ngModel)]="filterLocation" (ngModelChange)="applyFilters()"
      class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px]">
      <option value="">All Locations</option>
      @for (loc of locations(); track loc.id) {
        <option [value]="loc.id">{{ loc.name }}</option>
      }
    </select>
  </div>

  <!-- Date from -->
  <div class="flex flex-col gap-1">
    <label class="text-xs text-gray-500 font-medium">From</label>
    <input type="date" [(ngModel)]="filterDateFrom" (ngModelChange)="applyFilters()"
      class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
  </div>

  <!-- Date to -->
  <div class="flex flex-col gap-1">
    <label class="text-xs text-gray-500 font-medium">To</label>
    <input type="date" [(ngModel)]="filterDateTo" (ngModelChange)="applyFilters()"
      class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
  </div>

  <!-- Clear -->
  @if (filterType || filterLocation || filterDateFrom || filterDateTo) {
    <button (click)="clearFilters()"
      class="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 self-end">
      Clear
    </button>
  }

  <div class="ml-auto self-end text-sm text-gray-500">
    {{ total() }} movement{{ total() !== 1 ? 's' : '' }}
  </div>
</div>

<!-- Table -->
<div class="px-6">
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
    @if (movements().length === 0) {
      <ui-empty-state
        icon="arrow-left-right"
        title="No movements yet"
        subtitle="Stock movements will appear here once goods are received, issued or transferred.">
      </ui-empty-state>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Reference</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Route</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Lines</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Value</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">By</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (mvt of movements(); track mvt.id) {
              <tr class="hover:bg-gray-50 transition-colors">

                <!-- Reference -->
                <td class="px-4 py-3">
                  <span class="font-mono text-xs font-medium text-gray-900">{{ mvt.reference_number }}</span>
                  @if (mvt.supplier_invoice) {
                    <div class="text-xs text-gray-400 mt-0.5">Inv: {{ mvt.supplier_invoice }}</div>
                  }
                </td>

                <!-- Type badge -->
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    [class]="typeBadgeClass(mvt.type)">
                    {{ mvt.type_label }}
                  </span>
                </td>

                <!-- Date -->
                <td class="px-4 py-3 text-gray-700">{{ formatDate(mvt.movement_date) }}</td>

                <!-- Route (source → dest) -->
                <td class="px-4 py-3 text-gray-700 max-w-[200px]">
                  <span class="truncate block text-xs">{{ routeDisplay(mvt) }}</span>
                </td>

                <!-- Lines -->
                <td class="px-4 py-3 text-right text-gray-700">{{ mvt.line_count }}</td>

                <!-- Value -->
                <td class="px-4 py-3 text-right font-medium text-gray-900">
                  {{ formatValue(mvt.total_value) }}
                </td>

                <!-- By -->
                <td class="px-4 py-3 text-gray-500 text-xs max-w-[100px]">
                  <span class="truncate block">{{ mvt.created_by_name }}</span>
                </td>

                <!-- View -->
                <td class="px-4 py-3 text-right">
                  <button (click)="viewDetail(mvt)"
                    class="text-xs text-sage-600 hover:text-sage-700 font-medium px-2 py-1 rounded hover:bg-sage-50">
                    View
                  </button>
                </td>

              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (lastPage() > 1) {
        <div class="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
          <button (click)="prevPage()" [disabled]="page() === 1"
            class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
          <span>Page {{ page() }} of {{ lastPage() }}</span>
          <button (click)="nextPage()" [disabled]="page() === lastPage()"
            class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
        </div>
      }
    }
  </div>
</div>

} <!-- /if !loading -->

<!-- Detail drawer -->
@if (detailMovement()) {
  <div class="fixed inset-0 bg-black/40 z-50 flex justify-end" (click)="closeDetail()">
    <div class="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl" (click)="$event.stopPropagation()">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div>
          <h2 class="text-base font-semibold text-gray-900">{{ detailMovement()!.reference_number }}</h2>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1"
            [class]="typeBadgeClass(detailMovement()!.type)">
            {{ detailMovement()!.type_label }}
          </span>
        </div>
        <button (click)="closeDetail()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      @if (detailLoading()) {
        <div class="p-6 text-center text-gray-500 text-sm">Loading…</div>
      } @else if (detailData()) {

        <!-- Meta -->
        <div class="px-6 py-4 grid grid-cols-2 gap-3 text-sm border-b border-gray-100">
          <div>
            <div class="text-xs text-gray-500 mb-0.5">Date</div>
            <div class="font-medium">{{ formatDate(detailMovement()!.movement_date) }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500 mb-0.5">Posted by</div>
            <div class="font-medium">{{ detailMovement()!.created_by_name }}</div>
          </div>
          @if (detailMovement()!.source_location_name) {
            <div>
              <div class="text-xs text-gray-500 mb-0.5">Source</div>
              <div class="font-medium">{{ detailMovement()!.source_location_name }}</div>
            </div>
          }
          @if (detailMovement()!.destination_location_name) {
            <div>
              <div class="text-xs text-gray-500 mb-0.5">Destination</div>
              <div class="font-medium">{{ detailMovement()!.destination_location_name }}</div>
            </div>
          }
          @if (detailMovement()!.supplier_name) {
            <div>
              <div class="text-xs text-gray-500 mb-0.5">Supplier</div>
              <div class="font-medium">{{ detailMovement()!.supplier_name }}</div>
            </div>
          }
          @if (detailMovement()!.supplier_invoice) {
            <div>
              <div class="text-xs text-gray-500 mb-0.5">Invoice</div>
              <div class="font-medium font-mono text-xs">{{ detailMovement()!.supplier_invoice }}</div>
            </div>
          }
          <div class="col-span-2">
            <div class="text-xs text-gray-500 mb-0.5">Total Value</div>
            <div class="font-semibold text-gray-900">{{ formatValue(detailMovement()!.total_value) }}</div>
          </div>
          @if (detailMovement()!.notes) {
            <div class="col-span-2">
              <div class="text-xs text-gray-500 mb-0.5">Notes</div>
              <div class="text-gray-700">{{ detailMovement()!.notes }}</div>
            </div>
          }
        </div>

        <!-- Lines -->
        <div class="px-6 py-4">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Line Items</h3>
          <div class="space-y-2">
            @for (line of detailData()!.lines; track line.id) {
              <div class="bg-gray-50 rounded-lg p-3 text-sm">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 truncate">{{ line.item_name }}</div>
                    <div class="text-xs text-gray-500 font-mono">{{ line.item_sku }}</div>
                    <div class="text-xs text-gray-500 mt-1">@ {{ line.location_name }}</div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="font-semibold" [class]="parseFloat(line.quantity) >= 0 ? 'text-green-700' : 'text-red-600'">
                      {{ parseFloat(line.quantity) >= 0 ? '+' : '' }}{{ parseFloat(line.quantity).toFixed(4) }}
                    </div>
                    <div class="text-xs text-gray-500">{{ formatValue(line.line_value) }}</div>
                  </div>
                </div>
                <!-- Before / after -->
                <div class="flex gap-4 mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                  <span>Before: <strong>{{ parseFloat(line.before_quantity).toFixed(4) }}</strong></span>
                  <span>After: <strong>{{ parseFloat(line.after_quantity).toFixed(4) }}</strong></span>
                  @if (line.batch_number) {
                    <span>Batch: <strong>{{ line.batch_number }}</strong></span>
                  }
                  @if (line.expiry_date) {
                    <span>Exp: <strong>{{ formatDate(line.expiry_date) }}</strong></span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

      }
    </div>
  </div>
}
`,
})
export class InventoryMovementsPage implements OnInit {
  private api             = inject(ApiService);
  private toast           = inject(ToastService);
  private activeProperty  = inject(ActivePropertyService);
  router                  = inject(Router);

  loading       = signal(true);
  detailLoading = signal(false);

  movements  = signal<StockMovement[]>([]);
  locations  = signal<StockLocation[]>([]);
  total      = signal(0);
  page       = signal(1);
  perPage    = 30;
  lastPage   = computed(() => Math.max(1, Math.ceil(this.total() / this.perPage)));

  filterType     = '';
  filterLocation = '';
  filterDateFrom = '';
  filterDateTo   = '';

  detailMovement = signal<StockMovement | null>(null);
  detailData     = signal<{ movement: StockMovement; lines: any[] } | null>(null);

  parseFloat = parseFloat;

  ngOnInit(): void {
    this.loadLocations();
    this.loadMovements();
  }

  private loadLocations(): void {
    const pid = this.activeProperty.getPropertyId();
    this.api.get('/inventory/locations', pid ? { property_id: pid } : {}).subscribe({
      next: (r: any) => this.locations.set(r.data ?? []),
    });
  }

  loadMovements(): void {
    this.loading.set(true);
    const pid = this.activeProperty.getPropertyId();
    const params: any = { page: this.page(), per_page: this.perPage };
    if (pid)                  params['property_id']  = pid;
    if (this.filterType)      params['type']         = this.filterType;
    if (this.filterLocation)  params['location_id']  = this.filterLocation;
    if (this.filterDateFrom)  params['date_from']    = this.filterDateFrom;
    if (this.filterDateTo)    params['date_to']      = this.filterDateTo;

    this.api.get('/inventory/movements', params).subscribe({
      next: (r: any) => {
        this.movements.set(r.data ?? []);
        this.total.set(r.meta?.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load movements');
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadMovements();
  }

  clearFilters(): void {
    this.filterType = '';
    this.filterLocation = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.applyFilters();
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.loadMovements(); } }
  nextPage(): void { if (this.page() < this.lastPage()) { this.page.update(p => p + 1); this.loadMovements(); } }

  viewDetail(mvt: StockMovement): void {
    this.detailMovement.set(mvt);
    this.detailData.set(null);
    this.detailLoading.set(true);

    this.api.get(`/inventory/movements/${mvt.id}`).subscribe({
      next: (r: any) => {
        this.detailData.set(r.data);
        this.detailLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load movement detail');
        this.detailLoading.set(false);
      },
    });
  }

  closeDetail(): void {
    this.detailMovement.set(null);
    this.detailData.set(null);
  }

  // ── Display helpers ────────────────────────────────────────────

  typeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      grn:           'bg-green-100 text-green-800',
      opening:       'bg-blue-100 text-blue-800',
      issue:         'bg-orange-100 text-orange-800',
      transfer:      'bg-purple-100 text-purple-800',
      adjustment:    'bg-yellow-100 text-yellow-800',
      pos_deduction: 'bg-red-100 text-red-800',
    };
    return map[type] ?? 'bg-gray-100 text-gray-800';
  }

  routeDisplay(mvt: StockMovement): string {
    if (mvt.source_location_name && mvt.destination_location_name) {
      return `${mvt.source_location_name} → ${mvt.destination_location_name}`;
    }
    return mvt.destination_location_name ?? mvt.source_location_name ?? '—';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatValue(kobo: string | number): string {
    const n = typeof kobo === 'string' ? parseInt(kobo, 10) : kobo;
    if (isNaN(n)) return '₦0.00';
    return '₦' + (n / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
