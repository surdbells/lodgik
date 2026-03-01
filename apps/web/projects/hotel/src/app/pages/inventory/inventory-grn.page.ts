import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, ActivePropertyService
} from '@lodgik/shared';
import { Router, ActivatedRoute } from '@angular/router';

interface StockItem {
  id: string; sku: string; name: string;
  purchase_uom_id: string; issue_uom_id: string;
  purchase_to_issue_factor: string;
  preferred_vendor?: string;
}
interface UnitOfMeasure { id: string; name: string; symbol: string; }
interface StockLocation { id: string; name: string; type: string; department?: string; }

interface PurchaseOrder { id: string; reference_number: string; vendor_name: string; }

interface GrnLine {
  item_id: string;
  item_sku: string;
  item_name: string;
  purchase_uom_symbol: string;
  issue_uom_symbol: string;
  purchase_to_issue_factor: number;
  purchase_quantity: number | null;
  unit_cost: number | null;          // kobo per PURCHASE unit
  batch_number: string;
  expiry_date: string;
  notes: string;
  // computed display
  issue_quantity: number;
  line_value: number;                // kobo
}

const blankLine = (): GrnLine => ({
  item_id: '', item_sku: '', item_name: '',
  purchase_uom_symbol: 'Unit', issue_uom_symbol: 'Unit',
  purchase_to_issue_factor: 1,
  purchase_quantity: null, unit_cost: null,
  batch_number: '', expiry_date: '', notes: '',
  issue_quantity: 0, line_value: 0,
});

@Component({
  selector: 'app-inventory-grn',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
<ui-page-header
  title="Goods Received Note"
  icon="truck"
  [breadcrumbs]="['F&B & Facilities', 'Stock Movements', 'GRN']"
  subtitle="Record inbound stock from a supplier">
  <button (click)="router.navigate(['/inventory/movements'])"
    class="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
    ← Back to Movements
  </button>
</ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
<div class="px-6 max-w-5xl">

  <!-- Header card -->
  <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
    <h2 class="text-sm font-semibold text-gray-700 mb-4">Delivery Details</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 font-medium">Receive Into Location <span class="text-red-500">*</span></label>
        <select [(ngModel)]="form.destination_location_id"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
          <option value="">Select location…</option>
          @for (loc of locations(); track loc.id) {
            <option [value]="loc.id">{{ loc.name }}</option>
          }
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 font-medium">Delivery Date <span class="text-red-500">*</span></label>
        <input type="date" [(ngModel)]="form.movement_date"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 font-medium">Supplier Name</label>
        <input type="text" [(ngModel)]="form.supplier_name" placeholder="e.g. Dangote Foods"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 font-medium">Supplier Invoice No.</label>
        <input type="text" [(ngModel)]="form.supplier_invoice" placeholder="e.g. INV-2026-0042"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500 font-medium">Your Name</label>
        <input type="text" [(ngModel)]="form.created_by_name" placeholder="Receiving officer name"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <div class="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
        <label class="text-xs text-gray-500 font-medium">Notes</label>
        <input type="text" [(ngModel)]="form.notes" placeholder="Optional notes"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>

      <!-- PO Link (optional) -->
      <div class="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
        <label class="text-xs text-gray-500 font-medium">Link to Purchase Order
          <span class="text-gray-400 font-normal">(optional — updates PO delivery progress)</span>
        </label>
        @if (purchaseOrders().length > 0) {
          <select [(ngModel)]="form.purchase_order_id"
            class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
            <option value="">None (standalone GRN)</option>
            @for (po of purchaseOrders(); track po.id) {
              <option [value]="po.id">{{ po.reference_number }} — {{ po.vendor_name }}</option>
            }
          </select>
        } @else {
          <p class="text-xs text-gray-400 italic">No open purchase orders found</p>
        }
      </div>

    </div>
  </div>

  <!-- Lines card -->
  <div class="bg-white rounded-xl border border-gray-200 mb-6">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h2 class="text-sm font-semibold text-gray-700">Line Items</h2>
      <button (click)="addLine()"
        class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700 font-medium">
        + Add Item
      </button>
    </div>

    @if (lines().length === 0) {
      <div class="px-6 py-10 text-center text-gray-400 text-sm">
        No items yet. Click <strong>+ Add Item</strong> to add the first line.
      </div>
    } @else {

      <!-- Column headers -->
      <div class="grid gap-2 px-6 pt-4 pb-2 text-xs text-gray-500 font-semibold uppercase tracking-wide
        grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        <span>Item</span>
        <span>Qty (Purchase)</span>
        <span>Unit Cost (₦)</span>
        <span>Issue Qty</span>
        <span>Line Value</span>
        <span></span>
      </div>

      <div class="divide-y divide-gray-50 px-6 pb-4">
        @for (line of lines(); track $index; let i = $index) {
          <div class="py-3 grid gap-3 grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-start">

            <!-- Item picker -->
            <div class="flex flex-col gap-1">
              <div class="relative">
                <input type="text"
                  [(ngModel)]="itemSearch[i]"
                  (ngModelChange)="onItemSearch(i)"
                  (focus)="showDropdown[i] = true"
                  (blur)="hideDropdown(i)"
                  [placeholder]="line.item_id ? line.item_name : 'Search item…'"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
                @if (showDropdown[i] && filteredItems(i).length > 0) {
                  <div class="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    @for (item of filteredItems(i); track item.id) {
                      <button type="button"
                        (mousedown)="selectItem(i, item)"
                        class="w-full text-left px-3 py-2 text-sm hover:bg-sage-50 flex items-center gap-2">
                        <span class="font-mono text-xs text-gray-400">{{ item.sku }}</span>
                        <span class="text-gray-900">{{ item.name }}</span>
                      </button>
                    }
                  </div>
                }
              </div>
              @if (line.item_id) {
                <div class="flex gap-2 text-xs text-gray-400">
                  <span>Purch: {{ line.purchase_uom_symbol }}</span>
                  <span>→ Issue: {{ line.issue_uom_symbol }}</span>
                  @if (line.purchase_to_issue_factor !== 1) {
                    <span class="text-sage-600">×{{ line.purchase_to_issue_factor }}</span>
                  }
                </div>
                <!-- Batch + expiry for perishables -->
                <div class="flex gap-2 mt-1">
                  <input type="text" [(ngModel)]="line.batch_number" placeholder="Batch #"
                    class="flex-1 border border-gray-100 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sage-400">
                  <input type="date" [(ngModel)]="line.expiry_date"
                    class="flex-1 border border-gray-100 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sage-400">
                </div>
              }
            </div>

            <!-- Purchase qty -->
            <div class="flex flex-col gap-1">
              <input type="number" [(ngModel)]="line.purchase_quantity" min="0" step="0.001"
                (ngModelChange)="recalcLine(i)"
                [placeholder]="'Qty (' + line.purchase_uom_symbol + ')'"
                class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 w-full">
            </div>

            <!-- Unit cost (₦ per purchase unit) -->
            <div class="flex flex-col gap-1">
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₦</span>
                <input type="number" [(ngModel)]="line.unit_cost" min="0" step="0.01"
                  (ngModelChange)="recalcLine(i)"
                  placeholder="0.00"
                  class="border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 w-full">
              </div>
            </div>

            <!-- Issue qty (read-only computed) -->
            <div class="flex flex-col justify-center">
              <span class="text-sm text-gray-700 font-medium px-3 py-2">
                {{ line.issue_quantity > 0 ? line.issue_quantity.toFixed(3) : '—' }}
                <span class="text-xs text-gray-400 ml-1">{{ line.issue_uom_symbol }}</span>
              </span>
            </div>

            <!-- Line value -->
            <div class="flex flex-col justify-center">
              <span class="text-sm font-semibold text-gray-900 px-3 py-2">
                {{ line.line_value > 0 ? formatCurrency(line.line_value) : '—' }}
              </span>
            </div>

            <!-- Remove -->
            <div class="flex items-start pt-2">
              <button (click)="removeLine(i)"
                class="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
            </div>

          </div>
        }
      </div>

      <!-- Totals footer -->
      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex items-center justify-between">
        <span class="text-sm text-gray-600">{{ lines().length }} item{{ lines().length !== 1 ? 's' : '' }}</span>
        <div class="text-right">
          <div class="text-xs text-gray-500">Total GRN Value</div>
          <div class="text-lg font-bold text-gray-900">{{ formatCurrency(grandTotal()) }}</div>
        </div>
      </div>

    }
  </div>

  <!-- Actions -->
  <div class="flex gap-3 justify-end pb-10">
    <button (click)="router.navigate(['/inventory/movements'])"
      class="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
      Cancel
    </button>
    <button (click)="submit()" [disabled]="saving()"
      class="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
      @if (saving()) { <span class="animate-spin">⟳</span> }
      Post GRN
    </button>
  </div>

</div>
} <!-- /if !loading -->
`,
})
export class InventoryGrnPage implements OnInit {
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);
  router                 = inject(Router);
  private route          = inject(ActivatedRoute);

  purchaseOrders = signal<PurchaseOrder[]>([]);

  loading = signal(true);
  saving  = signal(false);

  allItems   = signal<StockItem[]>([]);
  uoms       = signal<UnitOfMeasure[]>([]);
  locations  = signal<StockLocation[]>([]);

  lines = signal<GrnLine[]>([]);

  // Per-line item search state
  itemSearch:   string[] = [];
  showDropdown: boolean[] = [];

  grandTotal = computed(() =>
    this.lines().reduce((sum, l) => sum + (l.line_value ?? 0), 0)
  );

  form = {
    destination_location_id: '',
    movement_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    supplier_invoice: '',
    created_by_name: '',
    notes: '',
    purchase_order_id: '',
  };

  ngOnInit(): void {
    this.loadMasterData();
    this.loadOpenPurchaseOrders();
    // Pre-select a PO if navigated from the PO detail drawer
    this.route.queryParams.subscribe(q => {
      if (q['purchase_order_id']) {
        this.form.purchase_order_id = q['purchase_order_id'];
      }
    });
  }

  private loadMasterData(): void {
    const pid = this.activeProperty.getPropertyId();
    let done = 0;
    const check = () => { if (++done === 3) this.loading.set(false); };

    this.api.get('/inventory/items', { active_only: true, per_page: 500 }).subscribe({
      next: (r: any) => { this.allItems.set(r.data ?? []); check(); },
      error: () => check(),
    });
    this.api.get('/inventory/uoms', { active_only: true }).subscribe({
      next: (r: any) => { this.uoms.set(r.data ?? []); check(); },
      error: () => check(),
    });
    this.api.get('/inventory/locations', pid ? { property_id: pid, active_only: true } : { active_only: true }).subscribe({
      next: (r: any) => { this.locations.set(r.data ?? []); check(); },
      error: () => check(),
    });
  }

  private loadOpenPurchaseOrders(): void {
    this.api.get('/procurement/orders', { status: 'sent', per_page: 100 }).subscribe({
      next: (r: any) => {
        // Also load partially_delivered POs
        const sent = r.data ?? [];
        this.api.get('/procurement/orders', { status: 'partially_delivered', per_page: 100 }).subscribe({
          next: (r2: any) => this.purchaseOrders.set([...sent, ...(r2.data ?? [])]),
          error: () => this.purchaseOrders.set(sent),
        });
      },
      error: () => {},
    });
  }

  addLine(): void {
    this.lines.update(ls => [...ls, blankLine()]);
    this.itemSearch.push('');
    this.showDropdown.push(false);
  }

  removeLine(i: number): void {
    this.lines.update(ls => ls.filter((_, idx) => idx !== i));
    this.itemSearch.splice(i, 1);
    this.showDropdown.splice(i, 1);
  }

  filteredItems(i: number): StockItem[] {
    const q = (this.itemSearch[i] ?? '').toLowerCase();
    if (!q) return this.allItems().slice(0, 20);
    return this.allItems()
      .filter(it => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q))
      .slice(0, 20);
  }

  onItemSearch(i: number): void {
    this.showDropdown[i] = true;
  }

  hideDropdown(i: number): void {
    // small delay so mousedown on option fires first
    setTimeout(() => { this.showDropdown[i] = false; }, 150);
  }

  selectItem(i: number, item: StockItem): void {
    const uoms = this.uoms();
    const pUom = uoms.find(u => u.id === item.purchase_uom_id);
    const iUom = uoms.find(u => u.id === item.issue_uom_id);

    this.lines.update(ls => {
      const updated = [...ls];
      updated[i] = {
        ...updated[i],
        item_id:                  item.id,
        item_sku:                 item.sku,
        item_name:                item.name,
        purchase_uom_symbol:      pUom?.symbol ?? 'Unit',
        issue_uom_symbol:         iUom?.symbol ?? 'Unit',
        purchase_to_issue_factor: parseFloat(item.purchase_to_issue_factor) || 1,
      };
      return updated;
    });

    this.itemSearch[i] = '';
    this.showDropdown[i] = false;
  }

  recalcLine(i: number): void {
    this.lines.update(ls => {
      const updated = [...ls];
      const line = { ...updated[i] };
      const qty    = line.purchase_quantity ?? 0;
      const cost   = line.unit_cost ?? 0;          // ₦ (naira, not kobo)
      const factor = line.purchase_to_issue_factor;

      line.issue_quantity = qty * factor;
      line.line_value     = Math.round(qty * cost * 100); // store in kobo
      updated[i] = line;
      return updated;
    });
  }

  submit(): void {
    if (!this.form.destination_location_id) {
      this.toast.error('Please select a receive-into location');
      return;
    }
    if (!this.form.movement_date) {
      this.toast.error('Please enter the delivery date');
      return;
    }
    if (this.lines().length === 0) {
      this.toast.error('Please add at least one line item');
      return;
    }

    const errors: string[] = [];
    this.lines().forEach((line, i) => {
      if (!line.item_id) errors.push(`Line ${i + 1}: no item selected`);
      if (!line.purchase_quantity || line.purchase_quantity <= 0) errors.push(`Line ${i + 1}: quantity must be > 0`);
      if (line.unit_cost === null || line.unit_cost < 0) errors.push(`Line ${i + 1}: unit cost must be ≥ 0`);
    });
    if (errors.length) {
      this.toast.error(errors[0]);
      return;
    }

    this.saving.set(true);

    const payload = {
      ...this.form,
      purchase_order_id: this.form.purchase_order_id || undefined,
      lines: this.lines().map(line => ({
        item_id:          line.item_id,
        purchase_quantity: line.purchase_quantity,
        unit_cost:         Math.round((line.unit_cost ?? 0) * 100), // convert ₦ to kobo
        batch_number:      line.batch_number || null,
        expiry_date:       line.expiry_date  || null,
        notes:             line.notes        || null,
      })),
    };

    this.api.post('/inventory/movements/grn', payload).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        this.toast.success(`GRN ${r.data?.reference_number ?? ''} posted successfully`);
        this.router.navigate(['/inventory/movements']);
      },
      error: (e: any) => {
        this.saving.set(false);
        this.toast.error(e.error?.message ?? 'Failed to post GRN');
      },
    });
  }

  formatCurrency(kobo: number): string {
    return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
