import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, ToastService,
  ConfirmDialogService, ActivePropertyService
} from '@lodgik/shared';

interface StockItem { id: string; sku: string; name: string; uom_symbol?: string; average_cost: string; }
interface RecipeIngredient { id?: string; stock_item_id: string; item_sku: string; item_name: string; quantity_per_yield: string | number; uom_symbol: string; wac_kobo?: number; line_cost_kobo?: number; notes?: string; sort_order?: number; }
interface Recipe { id: string; product_id: string; product_name: string; yield_quantity: string; yield_uom: string; notes?: string; is_active: boolean; ingredients: RecipeIngredient[]; food_cost_pct?: number | null; ingredient_cost_kobo?: number; product_price_kobo?: number; }
interface PosProduct { id: string; name: string; price: string; category_id: string; }

const BLANK_FORM = () => ({
  product_id: '', yield_quantity: 1, yield_uom: 'serving', notes: '',
  ingredients: [] as Array<{ stock_item_id: string; quantity_per_yield: number; uom_symbol: string; notes: string; _search: string; _results: StockItem[]; }>
});

@Component({
  selector: 'app-recipe-builder',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PageHeaderComponent],
  template: `
    <ui-page-header title="Recipe Builder" subtitle="Link stock ingredients to POS menu items for automatic food-cost tracking" [breadcrumbs]="['Inventory & Food Cost', 'Recipe Builder']">
      <button (click)="openModal()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
        + Add Recipe
      </button>
    </ui-page-header>

    <!-- Search + filter -->
    <div class="px-6 mb-4 flex gap-3 items-center">
      <input [(ngModel)]="search" placeholder="Search products…"
        class="flex-1 max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input type="checkbox" [(ngModel)]="showInactive" class="accent-sage-600">
        Show inactive
      </label>
    </div>

    <!-- Recipe cards grid -->
    <div class="px-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
      @if (loading()) {
        <div class="col-span-3 text-center py-16 text-gray-400 text-sm">Loading recipes…</div>
      } @else if (filtered().length === 0) {
        <div class="col-span-3 text-center py-16 text-gray-400 text-sm">No recipes found. Add one to start tracking food costs.</div>
      } @else {
        @for (r of filtered(); track r.id) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <!-- Header -->
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold text-gray-800 text-sm truncate">{{ r.product_name }}</p>
                <p class="text-xs text-gray-400 mt-0.5">
                  Yield: {{ r.yield_quantity }} {{ r.yield_uom }} &nbsp;·&nbsp; {{ r.ingredients.length }} ingredient{{ r.ingredients.length !== 1 ? 's' : '' }}
                </p>
              </div>
              <span class="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
                [class.bg-green-50]="r.is_active" [class.text-green-700]="r.is_active"
                [class.bg-gray-100]="!r.is_active" [class.text-gray-400]="!r.is_active">
                {{ r.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <!-- Food cost chip -->
            @if (r.food_cost_pct !== null && r.food_cost_pct !== undefined) {
              <div class="flex items-center gap-3">
                <div class="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div class="h-full rounded-full transition-all"
                    [style.width]="(r.food_cost_pct ?? 0) + '%'"
                    [class.bg-green-500]="(r.food_cost_pct ?? 0) <= 30"
                    [class.bg-yellow-500]="(r.food_cost_pct ?? 0) > 30 && (r.food_cost_pct ?? 0) <= 45"
                    [class.bg-red-500]="(r.food_cost_pct ?? 0) > 45"></div>
                </div>
                <span class="text-xs font-semibold shrink-0"
                  [class.text-green-700]="(r.food_cost_pct ?? 0) <= 30"
                  [class.text-yellow-700]="(r.food_cost_pct ?? 0) > 30 && (r.food_cost_pct ?? 0) <= 45"
                  [class.text-red-600]="(r.food_cost_pct ?? 0) > 45">
                  {{ r.food_cost_pct }}% food cost
                </span>
              </div>
            }

            <!-- Ingredient list (collapsed preview) -->
            <div class="space-y-1">
              @for (ing of r.ingredients.slice(0,4); track ing.stock_item_id) {
                <div class="flex items-center justify-between text-xs text-gray-600">
                  <span class="truncate">{{ ing.item_sku }} — {{ ing.item_name }}</span>
                  <span class="shrink-0 font-mono text-gray-500 ml-2">{{ ing.quantity_per_yield }} {{ ing.uom_symbol }}</span>
                </div>
              }
              @if (r.ingredients.length > 4) {
                <p class="text-xs text-gray-400">+ {{ r.ingredients.length - 4 }} more…</p>
              }
            </div>

            <!-- Actions -->
            <div class="flex gap-2 pt-1 border-t border-gray-50">
              <button (click)="openModal(r)" class="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Edit</button>
              <button (click)="deleteRecipe(r)" class="px-3 text-xs py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50">Delete</button>
            </div>
          </div>
        }
      }
    </div>

    <!-- Modal -->
    @if (showModal()) {
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="closeModal()">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6" (click)="$event.stopPropagation()">
          <h3 class="text-base font-semibold text-gray-800 mb-4">
            {{ editingRecipe() ? 'Edit Recipe' : 'New Recipe' }}
          </h3>

          <div class="space-y-4">
            <!-- Product picker -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">POS Product *</label>
              <select [(ngModel)]="form.product_id" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
                <option value="">Select product…</option>
                @for (p of products(); track p.id) {
                  <option [value]="p.id">{{ p.name }} — ₦{{ (p.price | number:'1.0-0') }}</option>
                }
              </select>
            </div>

            <!-- Yield -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Yield Quantity</label>
                <input type="number" [(ngModel)]="form.yield_quantity" min="0.0001" step="0.5"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Yield Unit</label>
                <input type="text" [(ngModel)]="form.yield_uom" placeholder="serving"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea [(ngModel)]="form.notes" rows="2" placeholder="Preparation notes…"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400 resize-none"></textarea>
            </div>

            <!-- Ingredients -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-medium text-gray-600">Ingredients</label>
                <button type="button" (click)="addIngredientLine()"
                  class="text-xs text-sage-600 hover:text-sage-800 font-medium">+ Add ingredient</button>
              </div>
              <div class="space-y-3">
                @for (line of form.ingredients; track $index; let i = $index) {
                  <div class="p-3 bg-gray-50 rounded-xl space-y-2">
                    <div class="flex gap-2">
                      <input type="text" [(ngModel)]="line._search" (input)="searchStock(i, line._search)"
                        placeholder="Search stock item by name or SKU…"
                        class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
                      <button type="button" (click)="removeIngredient(i)"
                        class="px-2 text-red-400 hover:text-red-600 text-sm">✕</button>
                    </div>
                    @if (line._results.length > 0 && !line.stock_item_id) {
                      <div class="border border-gray-200 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                        @for (si of line._results; track si.id) {
                          <button type="button" (click)="selectStock(i, si)"
                            class="w-full text-left px-3 py-2 text-xs hover:bg-sage-50 flex items-center gap-2">
                            <span class="font-mono text-gray-400">{{ si.sku }}</span>
                            <span>{{ si.name }}</span>
                          </button>
                        }
                      </div>
                    }
                    @if (line.stock_item_id) {
                      <div class="flex items-center gap-3">
                        <span class="text-xs text-sage-700 font-medium bg-sage-50 px-2 py-1 rounded-lg">{{ line._search }}</span>
                        <button type="button" (click)="clearStock(i)" class="text-xs text-gray-400 hover:text-gray-600">change</button>
                        <div class="flex gap-2 ml-auto">
                          <input type="number" [(ngModel)]="line.quantity_per_yield" min="0" step="0.001" placeholder="Qty"
                            class="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sage-400">
                          <input type="text" [(ngModel)]="line.uom_symbol" placeholder="unit"
                            class="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sage-400">
                        </div>
                      </div>
                    }
                  </div>
                }
                @if (form.ingredients.length === 0) {
                  <p class="text-xs text-gray-400 text-center py-2">No ingredients yet — click "+ Add ingredient"</p>
                }
              </div>
            </div>

            <!-- Total cost preview -->
            @if (totalIngredientCost() > 0) {
              <div class="bg-sage-50 rounded-xl p-3 flex items-center justify-between">
                <span class="text-sm text-gray-600">Estimated ingredient cost</span>
                <span class="font-semibold text-sage-800 text-sm">₦{{ (totalIngredientCost() / 100).toFixed(2) }}</span>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="flex gap-3 mt-5">
            <button (click)="save()" [disabled]="saving()"
              class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-60">
              {{ saving() ? 'Saving…' : (editingRecipe() ? 'Update Recipe' : 'Save Recipe') }}
            </button>
            <button (click)="closeModal()" class="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class RecipeBuilderPage implements OnInit {
  private api       = inject(ApiService);
  private toast     = inject(ToastService);
  private confirm   = inject(ConfirmDialogService);
  private propSvc   = inject(ActivePropertyService);

  recipes   = signal<Recipe[]>([]);
  products  = signal<PosProduct[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  showModal = signal(false);
  search    = '';
  showInactive = false;

  editingRecipe = signal<Recipe | null>(null);
  form = BLANK_FORM();

  filtered = computed(() => {
    let list = this.recipes();
    if (!this.showInactive) list = list.filter(r => r.is_active);
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(r => r.product_name.toLowerCase().includes(q));
    }
    return list;
  });

  totalIngredientCost = computed(() => {
    // rough sum using any wac values we might have cached — placeholder
    return 0;
  });

  ngOnInit(): void {
    this.load();
    this.loadProducts();
  }

  load(): void {
    this.loading.set(true);
    const pid = this.propSvc.propertyId();
    this.api.get('/pos/recipes', pid ? { property_id: pid } : {}).subscribe({
      next: r => { this.recipes.set(r.data ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  loadProducts(): void {
    const pid = this.propSvc.propertyId();
    this.api.get('/pos/products', pid ? { property_id: pid } : {}).subscribe({
      next: r => this.products.set(r.data ?? []),
      error: () => {},
    });
  }

  openModal(recipe?: Recipe): void {
    if (recipe) {
      this.editingRecipe.set(recipe);
      this.form = {
        product_id: recipe.product_id,
        yield_quantity: parseFloat(recipe.yield_quantity),
        yield_uom: recipe.yield_uom,
        notes: recipe.notes ?? '',
        ingredients: (recipe.ingredients ?? []).map(i => ({
          stock_item_id: i.stock_item_id,
          quantity_per_yield: parseFloat(i.quantity_per_yield as string),
          uom_symbol: i.uom_symbol,
          notes: i.notes ?? '',
          _search: `${i.item_sku} — ${i.item_name}`,
          _results: [],
        })),
      };
    } else {
      this.editingRecipe.set(null);
      this.form = BLANK_FORM();
    }
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.editingRecipe.set(null); }

  addIngredientLine(): void {
    this.form.ingredients.push({ stock_item_id: '', quantity_per_yield: 1, uom_symbol: 'unit', notes: '', _search: '', _results: [] });
  }

  removeIngredient(i: number): void { this.form.ingredients.splice(i, 1); }

  searchStock(i: number, q: string): void {
    this.form.ingredients[i].stock_item_id = '';
    if (q.length < 2) { this.form.ingredients[i]._results = []; return; }
    const pid = this.propSvc.propertyId();
    this.api.get('/inventory/items', { search: q, ...(pid ? { property_id: pid } : {}) }).subscribe({
      next: r => { this.form.ingredients[i]._results = (r.data ?? []).slice(0, 6); },
      error: () => {},
    });
  }

  selectStock(i: number, si: StockItem): void {
    const line = this.form.ingredients[i];
    line.stock_item_id = si.id;
    line._search       = `${si.sku} — ${si.name}`;
    line.uom_symbol    = si.uom_symbol ?? 'unit';
    line._results      = [];
  }

  clearStock(i: number): void {
    this.form.ingredients[i].stock_item_id = '';
    this.form.ingredients[i]._search = '';
  }

  save(): void {
    if (!this.form.product_id) { this.toast.error('Select a product'); return; }
    if (this.form.ingredients.length === 0) { this.toast.error('Add at least one ingredient'); return; }
    if (this.form.ingredients.some(l => !l.stock_item_id)) { this.toast.error('All ingredient lines need a stock item'); return; }

    this.saving.set(true);
    const payload = {
      product_id:     this.form.product_id,
      property_id:    this.propSvc.propertyId() || undefined,
      yield_quantity: this.form.yield_quantity,
      yield_uom:      this.form.yield_uom,
      notes:          this.form.notes || undefined,
      ingredients:    this.form.ingredients.map(l => ({
        stock_item_id:      l.stock_item_id,
        quantity_per_yield: l.quantity_per_yield,
        uom_symbol:         l.uom_symbol,
        notes:              l.notes || undefined,
      })),
    };

    this.api.post('/pos/recipes', payload).subscribe({
      next: () => { this.toast.success('Recipe saved'); this.closeModal(); this.load(); this.saving.set(false); },
      error: () => { this.toast.error('Failed to save recipe'); this.saving.set(false); },
    });
  }

  deleteRecipe(r: Recipe): void {
    this.confirm.confirm({ title: 'Delete recipe?', message: `Remove the recipe for "${r.product_name}"? This will stop automatic ingredient deduction.`, confirmLabel: 'Delete', cancelLabel: 'Cancel', variant: 'danger' }).then((ok: boolean) => {
      if (!ok) return;
      this.api.delete(`/pos/recipes/${r.id}`).subscribe({
        next: () => { this.toast.success('Recipe deleted'); this.load(); },
        error: () => this.toast.error('Delete failed'),
      });
    });
  }
}
