import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule, DecimalPipe, DatePipe } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, ToastService, ActivePropertyService
} from '@lodgik/shared';

type ReportTab = 'valuation' | 'slow-moving' | 'expiry' | 'shrinkage' | 'usage' | 'comparison';

interface Tab { key: ReportTab; label: string; icon: string; }

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, PageHeaderComponent],
  template: `
    <ui-page-header title="Inventory Reports" subtitle="Stock valuation, usage, alerts, and property comparison">
      <button (click)="exportCsv()" [disabled]="!reportData() || exporting()"
        class="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-40">
        {{ exporting() ? 'Exporting…' : '↓ Export CSV' }}
      </button>
    </ui-page-header>

    <!-- Tab bar -->
    <div class="px-6 mb-4">
      <div class="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        @for (tab of tabs; track tab.key) {
          <button (click)="activeTab.set(tab.key)"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            [class.bg-white]="activeTab() === tab.key"
            [class.shadow-sm]="activeTab() === tab.key"
            [class.text-sage-700]="activeTab() === tab.key"
            [class.text-gray-500]="activeTab() !== tab.key">
            {{ tab.label }}
          </button>
        }
      </div>
    </div>

    <!-- Filters -->
    <div class="px-6 mb-5 flex flex-wrap gap-3 items-end">
      @if (activeTab() !== 'valuation' && activeTab() !== 'expiry' && activeTab() !== 'comparison') {
        <div>
          <label class="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" [(ngModel)]="dateFrom" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" [(ngModel)]="dateTo" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
        </div>
      }
      @if (activeTab() === 'slow-moving') {
        <div>
          <label class="block text-xs text-gray-500 mb-1">Threshold (days)</label>
          <input type="number" [(ngModel)]="slowDays" min="1" max="365"
            class="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
        </div>
      }
      @if (activeTab() === 'expiry') {
        <div>
          <label class="block text-xs text-gray-500 mb-1">Days ahead</label>
          <input type="number" [(ngModel)]="expiryDays" min="1" max="365"
            class="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
        </div>
      }
      <button (click)="loadReport()" [disabled]="loading()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-60">
        {{ loading() ? 'Loading…' : 'Run Report' }}
      </button>
    </div>

    <!-- ────── VALUATION ────── -->
    @if (activeTab() === 'valuation' && reportData()) {
      <div class="px-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Total Stock Value</p><p class="text-xl font-bold text-gray-800">₦{{ ((reportData().totals?.total_value_kobo ?? 0) / 100) | number:'1.0-0' }}</p></div>
          <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Item-Location Lines</p><p class="text-xl font-bold text-gray-800">{{ reportData().totals?.item_count ?? 0 }}</p></div>
          <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">In-Stock Lines</p><p class="text-xl font-bold text-green-700">{{ reportData().totals?.stocked_count ?? 0 }}</p></div>
          <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Low Stock Alerts</p><p class="text-xl font-bold text-red-600">{{ reportData().totals?.low_stock_count ?? 0 }}</p></div>
        </div>
        <div class="bg-white rounded-xl border overflow-hidden">
          <table class="w-full text-sm"><thead class="bg-gray-50"><tr>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">SKU</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Category</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Location</th>
            <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">On Hand</th>
            <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">WAC</th>
            <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Value</th>
            <th class="px-4 py-3"></th>
          </tr></thead>
          <tbody class="divide-y divide-gray-50">
            @for (row of reportData().items; track row.item_id + row.location_id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2.5 font-mono text-xs text-gray-500">{{ row.sku }}</td>
                <td class="px-4 py-2.5 text-gray-800 font-medium">{{ row.item_name }}</td>
                <td class="px-4 py-2.5 text-gray-500 hidden md:table-cell">{{ row.category_name }}</td>
                <td class="px-4 py-2.5 text-gray-500 hidden lg:table-cell">{{ row.location_name }}</td>
                <td class="px-4 py-2.5 text-right">{{ row.quantity_on_hand | number:'1.0-2' }}</td>
                <td class="px-4 py-2.5 text-right text-gray-500">₦{{ (row.wac_kobo / 100) | number:'1.0-2' }}</td>
                <td class="px-4 py-2.5 text-right font-medium">₦{{ (row.total_value_kobo / 100) | number:'1.0-0' }}</td>
                <td class="px-4 py-2.5 text-center">
                  @if (row.is_low_stock) { <span class="text-xs text-red-500">⚠ Low</span> }
                </td>
              </tr>
            }
          </tbody></table>
          @if (!reportData().items?.length) { <div class="py-12 text-center text-gray-400 text-sm">No data found.</div> }
        </div>
      </div>
    }

    <!-- ────── SLOW-MOVING ────── -->
    @if (activeTab() === 'slow-moving' && reportData()) {
      <div class="px-6">
        <div class="mb-3 flex items-center gap-3 text-sm text-gray-600">
          <span>{{ reportData().items?.length ?? 0 }} items with no issue in {{ reportData().threshold_days }} days</span>
          <span class="text-gray-400">·</span>
          <span class="font-semibold text-red-600">₦{{ ((reportData().total_value_kobo ?? 0) / 100) | number:'1.0-0' }} tied up</span>
        </div>
        <div class="bg-white rounded-xl border overflow-hidden">
          <table class="w-full text-sm"><thead class="bg-gray-50"><tr>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">SKU</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Category</th>
            <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">On Hand</th>
            <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Value</th>
          </tr></thead>
          <tbody class="divide-y divide-gray-50">
            @for (row of reportData().items; track row.item_id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2.5 font-mono text-xs text-gray-500">{{ row.sku }}</td>
                <td class="px-4 py-2.5 text-gray-800 font-medium">{{ row.item_name }}</td>
                <td class="px-4 py-2.5 text-gray-500 hidden md:table-cell">{{ row.category_name }}</td>
                <td class="px-4 py-2.5 text-right">{{ row.quantity_on_hand | number:'1.0-2' }}</td>
                <td class="px-4 py-2.5 text-right font-medium text-red-600">₦{{ (row.stock_value_kobo / 100) | number:'1.0-0' }}</td>
              </tr>
            }
          </tbody></table>
          @if (!reportData().items?.length) { <div class="py-12 text-center text-gray-400 text-sm">No slow-moving items found.</div> }
        </div>
      </div>
    }

    <!-- ────── EXPIRY ALERTS ────── -->
    @if (activeTab() === 'expiry' && reportData()) {
      <div class="px-6">
        <div class="mb-3 flex gap-4 text-sm">
          <span class="text-red-600 font-semibold">{{ reportData().expired_count }} expired</span>
          <span class="text-orange-600 font-semibold">{{ reportData().critical_count }} critical (≤7 days)</span>
        </div>
        <div class="bg-white rounded-xl border overflow-hidden">
          <table class="w-full text-sm"><thead class="bg-gray-50"><tr>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Batch</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
            <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
            <th class="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr></thead>
          <tbody class="divide-y divide-gray-50">
            @for (row of reportData().items; track row.item_id + row.batch_number) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2.5 text-gray-800">{{ row.item_name }} <span class="font-mono text-xs text-gray-400">({{ row.sku }})</span></td>
                <td class="px-4 py-2.5 text-gray-500 hidden md:table-cell">{{ row.batch_number || '—' }}</td>
                <td class="px-4 py-2.5 text-gray-700">{{ row.expiry_date | date:'mediumDate' }}</td>
                <td class="px-4 py-2.5 text-right">{{ row.batch_qty | number:'1.0-2' }}</td>
                <td class="px-4 py-2.5 text-center">
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                    [class.bg-red-100]="row.urgency === 'expired'" [class.text-red-700]="row.urgency === 'expired'"
                    [class.bg-orange-100]="row.urgency === 'critical'" [class.text-orange-700]="row.urgency === 'critical'"
                    [class.bg-yellow-100]="row.urgency === 'warning'" [class.text-yellow-700]="row.urgency === 'warning'"
                    [class.bg-blue-50]="row.urgency === 'notice'" [class.text-blue-600]="row.urgency === 'notice'">
                    {{ row.urgency === 'expired' ? 'Expired' : row.days_until_expiry + 'd' }}
                  </span>
                </td>
              </tr>
            }
          </tbody></table>
          @if (!reportData().items?.length) { <div class="py-12 text-center text-gray-400 text-sm">No items expiring within {{ expiryDays }} days.</div> }
        </div>
      </div>
    }

    <!-- ────── SHRINKAGE ────── -->
    @if (activeTab() === 'shrinkage' && reportData()) {
      <div class="px-6">
        <div class="mb-3 text-sm text-gray-600">Total shrinkage:
          <span class="font-semibold text-red-600">₦{{ ((reportData().total_shrinkage_kobo ?? 0) / 100) | number:'1.0-0' }}</span>
        </div>
        <div class="bg-white rounded-xl border overflow-hidden">
          <table class="w-full text-sm"><thead class="bg-gray-50"><tr>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Reference</th>
            <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
            <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Value</th>
          </tr></thead>
          <tbody class="divide-y divide-gray-50">
            @for (row of reportData().items; track row.item_id + row.movement_date) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2.5 text-gray-800">{{ row.item_name }} <span class="font-mono text-xs text-gray-400">({{ row.sku }})</span></td>
                <td class="px-4 py-2.5 text-gray-500 font-mono text-xs hidden md:table-cell">{{ row.reference_number }}</td>
                <td class="px-4 py-2.5 text-gray-600">{{ row.movement_date | date:'mediumDate' }}</td>
                <td class="px-4 py-2.5 text-right text-red-600">-{{ row.shrinkage_qty | number:'1.0-2' }}</td>
                <td class="px-4 py-2.5 text-right font-medium text-red-600">₦{{ (row.shrinkage_value_kobo / 100) | number:'1.0-0' }}</td>
              </tr>
            }
          </tbody></table>
          @if (!reportData().items?.length) { <div class="py-12 text-center text-gray-400 text-sm">No shrinkage recorded in this period.</div> }
        </div>
      </div>
    }

    <!-- ────── USAGE ────── -->
    @if (activeTab() === 'usage' && reportData()) {
      <div class="px-6 space-y-4">
        @for (dept of reportData().departments; track dept.department) {
          <div class="bg-white rounded-xl border overflow-hidden">
            <div class="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <h3 class="font-semibold text-gray-700 text-sm">{{ dept.department }}</h3>
              <span class="text-sm font-semibold text-sage-700">₦{{ (dept.total_value_kobo / 100) | number:'1.0-0' }}</span>
            </div>
            <table class="w-full text-sm"><tbody class="divide-y divide-gray-50">
              @for (item of dept.items; track item.item_id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-2.5 font-mono text-xs text-gray-400 hidden md:table-cell">{{ item.sku }}</td>
                  <td class="px-4 py-2.5 text-gray-800">{{ item.item_name }}</td>
                  <td class="px-4 py-2.5 text-gray-500 text-right">{{ item.total_qty | number:'1.0-2' }} units</td>
                  <td class="px-4 py-2.5 text-right font-medium">₦{{ (item.total_value_kobo / 100) | number:'1.0-0' }}</td>
                </tr>
              }
            </tbody></table>
          </div>
        }
        @if (!reportData().departments?.length) { <div class="py-12 text-center text-gray-400 text-sm">No issue movements in this period.</div> }
      </div>
    }

    <!-- ────── PROPERTY COMPARISON ────── -->
    @if (activeTab() === 'comparison' && reportData()) {
      <div class="px-6">
        <div class="grid gap-4">
          @for (prop of reportData().properties; track prop.property_id) {
            <div class="bg-white rounded-xl border p-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div class="lg:col-span-1">
                <p class="text-xs text-gray-500 mb-1">Property</p>
                <p class="font-semibold text-gray-800 text-sm truncate">{{ prop.property_id }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Stock Value</p>
                <p class="font-bold text-gray-800">₦{{ (prop.stock_value_kobo / 100) | number:'1.0-0' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Items</p>
                <p class="font-bold text-gray-800">{{ prop.item_count }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Issued (period)</p>
                <p class="font-bold text-sage-700">₦{{ (prop.issued_value_kobo / 100) | number:'1.0-0' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Turnover Ratio</p>
                <p class="font-bold" [class.text-green-700]="(prop.turnover_ratio ?? 0) >= 0.5" [class.text-gray-800]="(prop.turnover_ratio ?? 0) < 0.5">
                  {{ prop.turnover_ratio !== null ? (prop.turnover_ratio | number:'1.2-2') : '—' }}
                </p>
              </div>
            </div>
          }
          @if (!reportData().properties?.length) { <div class="py-12 text-center text-gray-400 text-sm">No property data available.</div> }
        </div>
      </div>
    }

    <!-- Empty state before first run -->
    @if (!reportData() && !loading()) {
      <div class="px-6 py-16 text-center text-gray-400 text-sm">
        Select a report type and click Run Report.
      </div>
    }

    <div class="pb-12"></div>
  `,
})
export class InventoryReportsPage implements OnInit {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private propSvc = inject(ActivePropertyService);

  tabs: Tab[] = [
    { key: 'valuation',   label: 'Stock Valuation',   icon: 'trending-up' },
    { key: 'slow-moving', label: 'Slow Moving',        icon: 'clock' },
    { key: 'expiry',      label: 'Expiry Alerts',      icon: 'alert-triangle' },
    { key: 'shrinkage',   label: 'Shrinkage',          icon: 'trending-down' },
    { key: 'usage',       label: 'Dept Usage',         icon: 'bar-chart-2' },
    { key: 'comparison',  label: 'Property Compare',   icon: 'layers' },
  ];

  activeTab = signal<ReportTab>('valuation');
  reportData = signal<any>(null);
  loading    = signal(false);
  exporting  = signal(false);

  dateFrom  = this.firstOfMonth();
  dateTo    = new Date().toISOString().slice(0, 10);
  slowDays  = 30;
  expiryDays= 30;

  ngOnInit(): void { this.loadReport(); }

  loadReport(): void {
    this.reportData.set(null);
    this.loading.set(true);
    const pid  = this.propSvc.propertyId();
    const tab  = this.activeTab();
    const params: any = {};
    if (pid) params['property_id'] = pid;

    const path = this.apiPath(tab, params);
    this.api.get(path, params).subscribe({
      next: r => { this.reportData.set(r.data ?? r); this.loading.set(false); },
      error: () => { this.toast.show('Failed to load report', 'error'); this.loading.set(false); },
    });
  }

  exportCsv(): void {
    const tab = this.activeTab();
    const pid  = this.propSvc.propertyId();
    const params: any = { format: 'csv' };
    if (pid) params['property_id'] = pid;
    if (tab === 'slow-moving') params['days'] = this.slowDays;
    if (tab === 'expiry') params['days'] = this.expiryDays;
    if (!['valuation','expiry','comparison'].includes(tab)) { params['date_from'] = this.dateFrom; params['date_to'] = this.dateTo; }

    this.exporting.set(true);
    const query = new URLSearchParams(params).toString();
    const url   = `/api/inventory/reports/${tab}?${query}`;
    // Trigger browser download
    const a = document.createElement('a');
    a.href  = url; a.download = ''; a.click();
    setTimeout(() => this.exporting.set(false), 1500);
  }

  private apiPath(tab: ReportTab, params: any): string {
    if (tab === 'slow-moving') { params['days'] = this.slowDays; return '/inventory/reports/slow-moving'; }
    if (tab === 'expiry')      { params['days'] = this.expiryDays; return '/inventory/reports/expiry'; }
    if (tab === 'comparison')  { params['date_from'] = this.dateFrom; params['date_to'] = this.dateTo; return '/inventory/reports/property-comparison'; }
    if (tab === 'shrinkage')   { params['date_from'] = this.dateFrom; params['date_to'] = this.dateTo; return '/inventory/reports/shrinkage'; }
    if (tab === 'usage')       { params['date_from'] = this.dateFrom; params['date_to'] = this.dateTo; return '/inventory/reports/usage'; }
    return '/inventory/reports/valuation';
  }

  private firstOfMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
