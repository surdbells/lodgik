import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule, DecimalPipe } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, ToastService, ActivePropertyService
} from '@lodgik/shared';

interface FoodCostProduct {
  product_id: string; product_name: string; price_kobo: number;
  total_qty_sold: number; theoretical_cost_kobo: number; revenue_kobo: number;
  food_cost_pct: number | null;
  ingredients: Array<{ item_sku: string; item_name: string; qty_used: number; uom_symbol: string; wac_kobo: number; line_cost_kobo: number; }>;
}
interface FoodCostReport {
  date_from: string; date_to: string; property_id: string | null;
  total_theoretical_kobo: number; total_actual_deducted_kobo: number;
  variance_kobo: number; total_revenue_kobo: number;
  overall_food_cost_pct: number | null; products: FoodCostProduct[];
}

@Component({
  selector: 'app-food-cost',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PageHeaderComponent],
  template: `
    <ui-page-header title="Food Cost Dashboard" subtitle="Theoretical vs actual ingredient usage and food cost percentage by product">
    </ui-page-header>

    <!-- Filters -->
    <div class="px-6 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label class="block text-xs text-gray-500 mb-1">From</label>
        <input type="date" [(ngModel)]="dateFrom" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
      </div>
      <div>
        <label class="block text-xs text-gray-500 mb-1">To</label>
        <input type="date" [(ngModel)]="dateTo" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
      </div>
      <button (click)="loadReport()" [disabled]="loading()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-60">
        {{ loading() ? 'Loading…' : 'Run Report' }}
      </button>
    </div>

    @if (report()) {
      <!-- Summary KPIs -->
      <div class="px-6 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs text-gray-500 mb-1">Total Revenue</p>
          <p class="text-xl font-bold text-gray-800">₦{{ (report()!.total_revenue_kobo / 100) | number:'1.0-0' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs text-gray-500 mb-1">Theoretical Cost</p>
          <p class="text-xl font-bold text-sage-700">₦{{ (report()!.total_theoretical_kobo / 100) | number:'1.0-0' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs text-gray-500 mb-1">Actual Deducted</p>
          <p class="text-xl font-bold text-blue-700">₦{{ (report()!.total_actual_deducted_kobo / 100) | number:'1.0-0' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs text-gray-500 mb-1">Overall Food Cost %</p>
          <p class="text-xl font-bold"
            [class.text-green-700]="(report()!.overall_food_cost_pct ?? 0) <= 30"
            [class.text-yellow-700]="(report()!.overall_food_cost_pct ?? 0) > 30 && (report()!.overall_food_cost_pct ?? 0) <= 45"
            [class.text-red-600]="(report()!.overall_food_cost_pct ?? 0) > 45">
            {{ report()!.overall_food_cost_pct ?? '—' }}%
          </p>
        </div>
      </div>

      <!-- Variance banner -->
      @if (report()!.variance_kobo !== 0) {
        <div class="px-6 mb-4">
          <div class="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
            [class.bg-red-50]="report()!.variance_kobo > 0"
            [class.border-red-200]="report()!.variance_kobo > 0"
            [class.text-red-700]="report()!.variance_kobo > 0"
            [class.bg-green-50]="report()!.variance_kobo < 0"
            [class.border-green-200]="report()!.variance_kobo < 0"
            [class.text-green-700]="report()!.variance_kobo < 0">
            <span class="text-lg">{{ report()!.variance_kobo > 0 ? '⚠️' : '✅' }}</span>
            <span>
              @if (report()!.variance_kobo > 0) {
                Actual deductions exceed theoretical by <strong>₦{{ (report()!.variance_kobo / 100) | number:'1.0-2' }}</strong> — possible shrinkage or unrecorded usage.
              } @else {
                Actual deductions are below theoretical by <strong>₦{{ (report()!.variance_kobo / -100) | number:'1.0-2' }}</strong> — some recipe deductions may not have fired.
              }
            </span>
          </div>
        </div>
      }

      <!-- Per-product table -->
      <div class="px-6 pb-8">
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                  <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th class="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ingredient Cost</th>
                  <th class="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Food Cost %</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                @for (p of report()!.products; track p.product_id) {
                  <tr class="hover:bg-gray-50 cursor-pointer" (click)="toggleExpand(p.product_id)">
                    <td class="px-4 py-3 font-medium text-gray-800">{{ p.product_name }}</td>
                    <td class="px-4 py-3 text-right text-gray-600">{{ p.total_qty_sold }}</td>
                    <td class="px-4 py-3 text-right text-gray-600">₦{{ (p.revenue_kobo / 100) | number:'1.0-0' }}</td>
                    <td class="px-4 py-3 text-right text-gray-600">₦{{ (p.theoretical_cost_kobo / 100) | number:'1.0-2' }}</td>
                    <td class="px-4 py-3 text-center">
                      @if (p.food_cost_pct !== null) {
                        <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                          [class.bg-green-50]="p.food_cost_pct <= 30" [class.text-green-700]="p.food_cost_pct <= 30"
                          [class.bg-yellow-50]="p.food_cost_pct > 30 && p.food_cost_pct <= 45" [class.text-yellow-700]="p.food_cost_pct > 30 && p.food_cost_pct <= 45"
                          [class.bg-red-50]="p.food_cost_pct > 45" [class.text-red-600]="p.food_cost_pct > 45">
                          {{ p.food_cost_pct }}%
                        </span>
                      }
                    </td>
                    <td class="px-4 py-3 text-gray-400 text-xs">{{ expanded().has(p.product_id) ? '▲' : '▼' }}</td>
                  </tr>
                  @if (expanded().has(p.product_id)) {
                    <tr>
                      <td colspan="6" class="px-4 pb-3 bg-gray-50">
                        <div class="pt-2 pl-4 space-y-1">
                          @for (ing of p.ingredients; track ing.item_sku) {
                            <div class="flex items-center gap-3 text-xs text-gray-600">
                              <span class="font-mono text-gray-400 w-20 shrink-0">{{ ing.item_sku }}</span>
                              <span class="flex-1">{{ ing.item_name }}</span>
                              <span class="text-gray-500">{{ ing.qty_used | number:'1.0-3' }} {{ ing.uom_symbol }}</span>
                              <span class="font-medium text-gray-700 w-24 text-right">₦{{ (ing.line_cost_kobo / 100) | number:'1.0-2' }}</span>
                            </div>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
          @if (report()!.products.length === 0) {
            <div class="text-center py-16 text-gray-400 text-sm">No sales data for this period, or no products have recipes.</div>
          }
        </div>
      </div>
    } @else if (!loading()) {
      <div class="px-6 py-16 text-center text-gray-400 text-sm">Select a date range and click Run Report.</div>
    }
  `,
})
export class FoodCostPage implements OnInit {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private propSvc = inject(ActivePropertyService);

  report  = signal<FoodCostReport | null>(null);
  loading = signal(false);
  expanded = signal<Set<string>>(new Set());

  dateFrom = this.firstOfMonth();
  dateTo   = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {}

  loadReport(): void {
    this.loading.set(true);
    const pid = this.propSvc.propertyId();
    const params: any = { date_from: this.dateFrom, date_to: this.dateTo };
    if (pid) params['property_id'] = pid;
    this.api.get('/pos/food-cost-report', params).subscribe({
      next: r => { this.report.set(r.data); this.loading.set(false); },
      error: () => { this.toast.show('Failed to load report', 'error'); this.loading.set(false); },
    });
  }

  toggleExpand(id: string): void {
    const s = new Set(this.expanded());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expanded.set(s);
  }

  private firstOfMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
