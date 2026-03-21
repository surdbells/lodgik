import {
  Component, inject, OnInit, signal, computed
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent, ActivePropertyService,
  ConfirmDialogService, ConfirmDialogComponent
} from '@lodgik/shared';

type CategoryType = 'food' | 'drink' | 'dessert' | 'other';

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  sort_order: number;
  is_active: boolean;
}

interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string; // kobo
  is_available: boolean;
  prep_time_minutes: number;
  requires_kitchen: boolean;
  sort_order: number;
  stock_item_id: string | null;
}

interface StockItem { id: string; sku: string; name: string; }

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, ConfirmDialogComponent],
  template: `
    <ui-confirm-dialog/>
    <ui-page-header title="Menu & Pricing" subtitle="Manage F&B categories, items, and prices">
      <div class="flex gap-2">
        @if (activeTab() === 'categories') {
          <button (click)="openCategoryModal()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
            + Add Category
          </button>
        } @else {
          <button (click)="openProductModal()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
            + Add Item
          </button>
        }
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Tabs -->
      <div class="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        @for (tab of tabs; track tab.key) {
          <button (click)="activeTab.set(tab.key)"
            class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            [class.bg-white]="activeTab() === tab.key"
            [class.shadow-sm]="activeTab() === tab.key"
            [class.text-sage-700]="activeTab() === tab.key"
            [class.font-semibold]="activeTab() === tab.key"
            [class.text-gray-500]="activeTab() !== tab.key">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- ── CATEGORIES TAB ── -->
      @if (activeTab() === 'categories') {
        @if (categories().length === 0) {
          <div class="text-center py-16 text-gray-400">
            <div class="text-4xl mb-3">🍽️</div>
            <p class="font-medium text-gray-500">No categories yet</p>
            <p class="text-sm mt-1">Add your first category to start building your menu.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (cat of categories(); track cat.id) {
              <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 flex flex-col gap-3">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">{{ categoryEmoji(cat.type) }}</span>
                    <div>
                      <p class="font-semibold text-gray-800 text-sm">{{ cat.name }}</p>
                      <p class="text-xs text-gray-400 capitalize">{{ cat.type }}</p>
                    </div>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                    [class.bg-green-50]="cat.is_active" [class.text-green-700]="cat.is_active"
                    [class.bg-gray-100]="!cat.is_active" [class.text-gray-400]="!cat.is_active">
                    {{ cat.is_active ? 'Active' : 'Hidden' }}
                  </span>
                </div>
                <div class="text-xs text-gray-400">
                  {{ productCountForCategory(cat.id) }} item{{ productCountForCategory(cat.id) !== 1 ? 's' : '' }}
                </div>
                <div class="flex gap-2 pt-1 border-t border-gray-50">
                  <button (click)="openCategoryModal(cat)"
                    class="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    Edit
                  </button>
                  <button (click)="toggleCategoryActive(cat)"
                    class="flex-1 text-xs py-1.5 rounded-lg border transition-colors"
                    [class.border-green-200]="!cat.is_active" [class.text-green-700]="!cat.is_active" [class.hover:bg-green-50]="!cat.is_active"
                    [class.border-gray-200]="cat.is_active" [class.text-gray-600]="cat.is_active" [class.hover:bg-gray-50]="cat.is_active">
                    {{ cat.is_active ? 'Hide' : 'Show' }}
                  </button>
                  <button (click)="deleteCategory(cat)"
                    class="px-3 text-xs py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ── ITEMS TAB ── -->
      @if (activeTab() === 'items') {
        @if (categories().length === 0) {
          <div class="text-center py-16 text-gray-400">
            <p class="font-medium text-gray-500">Create a category first before adding items.</p>
          </div>
        } @else {
          <!-- Filter bar -->
          <div class="flex flex-wrap gap-2 mb-5">
            <button (click)="filterCategory.set(null)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              [class.bg-sage-600]="filterCategory() === null" [class.text-white]="filterCategory() === null"
              [class.bg-gray-100]="filterCategory() !== null" [class.text-gray-600]="filterCategory() !== null">
              All
            </button>
            @for (cat of categories(); track cat.id) {
              <button (click)="filterCategory.set(cat.id)"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                [class.bg-sage-600]="filterCategory() === cat.id" [class.text-white]="filterCategory() === cat.id"
                [class.bg-gray-100]="filterCategory() !== cat.id" [class.text-gray-600]="filterCategory() !== cat.id">
                {{ categoryEmoji(cat.type) }} {{ cat.name }}
              </button>
            }
          </div>

          @if (filteredProducts().length === 0) {
            <div class="text-center py-16 text-gray-400">
              <div class="text-4xl mb-3">🥗</div>
              <p class="font-medium text-gray-500">No items yet</p>
              <p class="text-sm mt-1">Add your first menu item.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (p of filteredProducts(); track p.id) {
                <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 flex flex-col gap-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-semibold text-gray-800 text-sm truncate">{{ p.name }}</p>
                      <p class="text-xs text-gray-400 mt-0.5 truncate">{{ categoryName(p.category_id) }}</p>
                      @if (p.description) {
                        <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ p.description }}</p>
                      }
                    </div>
                    <div class="text-right shrink-0">
                      <p class="font-bold text-gray-800 text-sm">₦{{ formatPrice(p.price) }}</p>
                      <p class="text-xs text-gray-400 mt-0.5">{{ p.prep_time_minutes }}min</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                      [class.bg-green-50]="p.is_available" [class.text-green-700]="p.is_available"
                      [class.bg-gray-100]="!p.is_available" [class.text-gray-400]="!p.is_available">
                      {{ p.is_available ? 'Available' : 'Unavailable' }}
                    </span>
                    @if (p.requires_kitchen) {
                      <span class="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">
                        🍳 Kitchen
                      </span>
                    }
                  </div>
                  <div class="flex gap-2 pt-1 border-t border-gray-50">
                    <button (click)="openSectionPriceModal(p)"
                      class="p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Section Prices">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.55 0 1.05.22 1.41.59l7 7c.36.36.59.86.59 1.41s-.22 1.05-.59 1.41l-5 5c-.36.36-.86.59-1.41.59s-1.05-.22-1.41-.59l-7-7C4.22 9.05 4 8.55 4 8V4a1 1 0 011-1z"/></svg>
                    </button>
                    <button (click)="openProductModal(p)"
                      class="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      Edit
                    </button>
                    <button (click)="toggleProductAvailability(p)"
                      class="flex-1 text-xs py-1.5 rounded-lg border transition-colors"
                      [class.border-green-200]="!p.is_available" [class.text-green-700]="!p.is_available"
                      [class.border-gray-200]="p.is_available" [class.text-gray-500]="p.is_available">
                      {{ p.is_available ? 'Mark Off' : 'Mark On' }}
                    </button>
                    <button (click)="deleteProduct(p)"
                      class="px-3 text-xs py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        }
      }
    }

    <!-- ── CATEGORY MODAL ── -->
    @if (showCategoryModal()) {
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h3 class="text-base font-semibold text-gray-800 mb-4">
            {{ editingCategory() ? 'Edit Category' : 'New Category' }}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
              <input [(ngModel)]="categoryForm.name" placeholder="e.g. Cocktails"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 mb-1 block">Type *</label>
              <select [(ngModel)]="categoryForm.type"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
                <option value="food">🍽️ Food</option>
                <option value="drink">🍹 Drink</option>
                <option value="dessert">🍰 Dessert</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 mb-1 block">Sort Order</label>
              <input [(ngModel)]="categoryForm.sort_order" type="number" min="0" placeholder="0"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
            </div>
          </div>
          <div class="flex gap-3 mt-5">
            <button (click)="saveCategory()" [disabled]="savingCategory()"
              class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-60 transition-colors">
              {{ savingCategory() ? 'Saving…' : (editingCategory() ? 'Update' : 'Create') }}
            </button>
            <button (click)="closeCategoryModal()"
              class="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── PRODUCT MODAL ── -->
    @if (showProductModal()) {
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <h3 class="text-base font-semibold text-gray-800 mb-4">
            {{ editingProduct() ? 'Edit Menu Item' : 'New Menu Item' }}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-600 mb-1 block">Category *</label>
              <select [(ngModel)]="productForm.category_id"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
                <option value="">Select category</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ categoryEmoji(cat.type) }} {{ cat.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 mb-1 block">Item Name *</label>
              <input [(ngModel)]="productForm.name" placeholder="e.g. Grilled Salmon"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600 mb-1 block">Description</label>
              <textarea [(ngModel)]="productForm.description" placeholder="Optional description…" rows="2"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400 resize-none"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-gray-600 mb-1 block">Price (₦) *</label>
                <input [(ngModel)]="productForm.price_naira" type="number" min="0" placeholder="0.00"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
              </div>
              <div>
                <label class="text-xs font-medium text-gray-600 mb-1 block">Prep Time (mins)</label>
                <input [(ngModel)]="productForm.prep_time_minutes" type="number" min="0" placeholder="15"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
              </div>
            </div>
            <div class="flex gap-4 pt-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="productForm.requires_kitchen" class="accent-sage-600 w-4 h-4">
                <span class="text-sm text-gray-700">Requires kitchen</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="productForm.is_available" class="accent-sage-600 w-4 h-4">
                <span class="text-sm text-gray-700">Available now</span>
              </label>
            </div>
            <!-- Stock item link for inventory deduction -->
            <div class="pt-2">
              <label class="block text-xs text-gray-500 font-medium mb-1">
                Linked Stock Item <span class="text-gray-400">(optional — for automatic inventory deduction)</span>
              </label>
              <div class="flex gap-2">
                <input type="text" [(ngModel)]="stockSearch"
                  placeholder="Search inventory item by name or SKU…"
                  class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
              </div>
              @if (filteredStockItems().length > 0 || productForm.stock_item_id) {
                <div class="mt-1.5 border border-gray-200 rounded-lg overflow-hidden">
                  @if (productForm.stock_item_id) {
                    <div class="flex items-center justify-between px-3 py-2 bg-sage-50 text-sm">
                      <span class="text-sage-700 font-medium">{{ linkedItemName() }}</span>
                      <button type="button" (click)="productForm.stock_item_id = null; stockSearch = ''"
                        class="text-xs text-red-500 hover:text-red-700">Unlink</button>
                    </div>
                  }
                  @if (!productForm.stock_item_id && filteredStockItems().length > 0) {
                    <div class="max-h-36 overflow-y-auto divide-y divide-gray-50">
                      @for (si of filteredStockItems(); track si.id) {
                        <button type="button" (click)="productForm.stock_item_id = si.id; stockSearch = ''"
                          class="w-full text-left px-3 py-2 text-sm hover:bg-sage-50 flex items-center gap-2">
                          <span class="font-mono text-xs text-gray-400">{{ si.sku }}</span>
                          <span>{{ si.name }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
          <div class="flex gap-3 mt-5">
            <button (click)="saveProduct()" [disabled]="savingProduct()"
              class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-60 transition-colors">
              {{ savingProduct() ? 'Saving…' : (editingProduct() ? 'Update' : 'Create') }}
            </button>
            <button (click)="closeProductModal()"
              class="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Section Price Modal -->
    @if (showSectionPriceModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

          <!-- Header -->
          <div class="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h3 class="font-bold text-gray-900 text-base">Section Pricing</h3>
              @if (pricingProduct()) {
                <p class="text-sm text-violet-700 font-semibold mt-0.5">{{ pricingProduct()!.name }}</p>
                <p class="text-xs text-gray-400 mt-0.5">Default price: ₦{{ formatPrice(pricingProduct()!.price) }}</p>
              }
              <p class="text-xs text-gray-400 mt-1">
                Set a different price per section. Leave blank to use the default price.
              </p>
            </div>
            <button (click)="closeSectionPriceModal()" class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 flex-shrink-0">✕</button>
          </div>

          <!-- Product selector (when opened from header button, no product pre-selected) -->
          @if (!pricingProduct()) {
            <div class="px-5 pt-4 flex-shrink-0">
              <label class="text-xs font-medium text-gray-700 block mb-1">Select Menu Item</label>
              <select (change)="selectPricingProduct($any($event.target).value)"
                class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Choose an item…</option>
                @for (p of products(); track p.id) {
                  <option [value]="p.id">{{ p.name }} — ₦{{ formatPrice(p.price) }}</option>
                }
              </select>
            </div>
          }

          <!-- Section price grid -->
          @if (pricingProduct()) {
            <div class="flex-1 overflow-y-auto px-5 py-4">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-100">
                    <th class="text-left pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Section / Area</th>
                    <th class="text-right pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price (₦)</th>
                    <th class="w-10 pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of SECTIONS; track s.key) {
                    <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td class="py-3 pr-4">
                        <div class="flex items-center gap-2">
                          <span class="w-2 h-2 rounded-full flex-shrink-0"
                            [class]="sectionPriceForRow(pricingProduct()!.id, s.key) ? 'bg-violet-500' : 'bg-gray-200'"></span>
                          <span class="font-medium text-gray-800">{{ s.label }}</span>
                          @if (!sectionPriceForRow(pricingProduct()!.id, s.key)) {
                            <span class="text-[10px] text-gray-400">default</span>
                          }
                        </div>
                      </td>
                      <td class="py-3 text-right">
                        @if (editingRow() === s.key) {
                          <input #rowInput
                            [value]="rowInputValue(pricingProduct()!.id, s.key)"
                            (keydown.enter)="saveRow(pricingProduct()!.id, s.key, rowInput.value)"
                            (keydown.escape)="editingRow.set(null)"
                            (blur)="saveRow(pricingProduct()!.id, s.key, rowInput.value)"
                            type="number" min="0" placeholder="{{ formatPrice(pricingProduct()!.price) }}"
                            class="w-36 text-right border border-violet-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-violet-50">
                        } @else {
                          <button (click)="editingRow.set(s.key)"
                            class="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors text-right w-36"
                            [class]="sectionPriceForRow(pricingProduct()!.id, s.key)
                              ? 'text-violet-700 bg-violet-50 hover:bg-violet-100'
                              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'">
                            {{ sectionPriceForRow(pricingProduct()!.id, s.key)
                                ? '₦' + formatPrice(sectionPriceForRow(pricingProduct()!.id, s.key)!.price)
                                : '+ Set price' }}
                          </button>
                        }
                      </td>
                      <td class="py-3 pl-2">
                        @if (sectionPriceForRow(pricingProduct()!.id, s.key)) {
                          <button (click)="deleteSectionPrice(sectionPriceForRow(pricingProduct()!.id, s.key)!.id)"
                            class="w-6 h-6 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 text-xs flex items-center justify-center transition-colors">✕</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <p class="text-xs text-gray-400 mt-3">
                💡 Click any price to edit inline. Press Enter or click away to save. ✕ to remove override.
              </p>
            </div>

            <!-- Summary footer -->
            <div class="flex-shrink-0 border-t border-gray-100 px-5 py-3 bg-gray-50 rounded-b-2xl">
              <div class="flex gap-6 text-xs text-gray-500">
                <span>Default: <strong class="text-gray-800">₦{{ formatPrice(pricingProduct()!.price) }}</strong></span>
                <span>Overrides set: <strong class="text-violet-700">{{ pricesForProduct(pricingProduct()!.id).length }} / {{ SECTIONS.length }}</strong></span>
              </div>
            </div>
          }
        </div>
      </div>
    }

  `,
})
export class MenuPage implements OnInit {
  private api = inject(ApiService);
  private activeProperty = inject(ActivePropertyService);
  private confirm = inject(ConfirmDialogService);

  loading = signal(true);
  categories = signal<Category[]>([]);
  products    = signal<Product[]>([]);
  stockItems  = signal<StockItem[]>([]);
  stockSearch = '';
  activeTab = signal<'categories' | 'items'>('categories');
  filterCategory = signal<string | null>(null);

  showCategoryModal = signal(false);
  editingCategory = signal<Category | null>(null);
  savingCategory = signal(false);
  categoryForm: { name: string; type: CategoryType; sort_order: number } = { name: '', type: 'food', sort_order: 0 };

  showProductModal = signal(false);
  editingProduct = signal<Product | null>(null);
  savingProduct = signal(false);
  productForm: {
    category_id: string; name: string; description: string;
    price_naira: number; prep_time_minutes: number;
    requires_kitchen: boolean; is_available: boolean;
    stock_item_id: string | null;
  } = { category_id: '', name: '', description: '', price_naira: 0, prep_time_minutes: 15, requires_kitchen: true, is_available: true, stock_item_id: null };

  tabs = [
    { key: 'categories' as const, label: 'Categories' },
    { key: 'items' as const, label: 'Menu Items' },
  ];

  // ── Section pricing ───────────────────────────────────────────────
  sectionPrices         = signal<any[]>([]);
  showSectionPriceModal = signal(false);
  savingSectionPrice    = signal(false);

  readonly SECTIONS = [
    { key: 'restaurant',       label: 'Restaurant'       },
    { key: 'bar',              label: 'Bar'               },
    { key: 'poolside',         label: 'Poolside'          },
    { key: 'terrace',          label: 'Terrace'           },
    { key: 'private',          label: 'Private Dining'   },
    { key: 'executive_lounge', label: 'Executive Lounge' },
    { key: 'vip',              label: 'VIP Section'      },
    { key: 'rooftop',          label: 'Rooftop'          },
    { key: 'takeaway',         label: 'Takeaway'         },
  ];

  filteredStockItems = computed(() => {
    const q = this.stockSearch.toLowerCase();
    const items = this.stockItems();
    if (!q) return items.slice(0, 10);
    return items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)).slice(0, 10);
  });

  linkedItemName(): string {
    const id = this.productForm.stock_item_id;
    if (!id) return '';
    const found = this.stockItems().find(i => i.id === id);
    return found ? `${found.sku} — ${found.name}` : id;
  }

  filteredProducts = computed(() => {
    const cat = this.filterCategory();
    const all = this.products();
    return cat ? all.filter(p => p.category_id === cat) : all;
  });

  ngOnInit() { this.load(); this.loadSectionPrices(); }

  load() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/pos/categories?property_id=${pid}`).subscribe({ next: (r: any) => this.categories.set(r.data || []) });
    this.api.get('/inventory/items', { active_only: true, per_page: 500 }).subscribe({
      next: (r: any) => this.stockItems.set(r.data ?? []),
      error: () => {},
    });
    this.api.get(`/pos/products?property_id=${pid}`).subscribe({
      next: (r: any) => { this.products.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Category helpers ──
  categoryEmoji(type: string): string {
    return type === 'food' ? '🍽️' : type === 'drink' ? '🍹' : type === 'dessert' ? '🍰' : '📦';
  }

  categoryName(id: string): string {
    return this.categories().find(c => c.id === id)?.name ?? '—';
  }

  productCountForCategory(catId: string): number {
    return this.products().filter(p => p.category_id === catId).length;
  }

  formatPrice(kobo: string): string {
    return (parseInt(kobo, 10) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── Category modal ──
  openCategoryModal(cat?: Category) {
    this.editingCategory.set(cat ?? null);
    this.categoryForm = cat
      ? { name: cat.name, type: cat.type, sort_order: cat.sort_order }
      : { name: '', type: 'food', sort_order: 0 };
    this.showCategoryModal.set(true);
  }

  closeCategoryModal() { this.showCategoryModal.set(false); this.editingCategory.set(null); }

  saveCategory() {
    if (!this.categoryForm.name.trim()) return;
    const pid = this.activeProperty.propertyId();
    this.savingCategory.set(true);
    const editing = this.editingCategory();

    const call = editing
      ? this.api.put(`/pos/categories/${editing.id}`, { ...this.categoryForm })
      : this.api.post('/pos/categories', { ...this.categoryForm, property_id: pid });

    call.subscribe({
      next: () => { this.savingCategory.set(false); this.closeCategoryModal(); this.load(); },
      error: () => this.savingCategory.set(false),
    });
  }

  toggleCategoryActive(cat: Category) {
    this.api.put(`/pos/categories/${cat.id}`, { is_active: !cat.is_active }).subscribe(() => this.load());
  }

  async deleteCategory(cat: Category) {
    const ok = await this.confirm.confirm({ title: 'Delete Category', message: `Delete category "${cat.name}"? This cannot be undone.`, confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    this.api.delete(`/pos/categories/${cat.id}`).subscribe({
      next: () => this.load(),
      error: (e: any) => this.confirm.confirm({ title: 'Cannot Delete', message: e?.error?.message ?? 'Cannot delete a category that has products. Remove all products first.', confirmLabel: 'OK', variant: 'warning' }),
    });
  }

  // ── Product modal ──
  openProductModal(p?: Product) {
    this.editingProduct.set(p ?? null);
    this.productForm = p
      ? {
          category_id: p.category_id, name: p.name, description: p.description ?? '',
          price_naira: parseInt(p.price, 10) / 100, prep_time_minutes: p.prep_time_minutes,
          requires_kitchen: p.requires_kitchen, is_available: p.is_available,
          stock_item_id: p.stock_item_id ?? null,
        }
      : { category_id: '', name: '', description: '', price_naira: 0, prep_time_minutes: 15, requires_kitchen: true, is_available: true, stock_item_id: null };
    this.stockSearch = '';
    this.showProductModal.set(true);
  }

  closeProductModal() { this.showProductModal.set(false); this.editingProduct.set(null); }

  pricingProduct = signal<any | null>(null);
  editingRow     = signal<string | null>(null);

  loadSectionPrices(): void {
    const pid = this.activeProperty.propertyId();
    this.api.get('/pos/section-prices', { property_id: pid }).subscribe({
      next: (r: any) => this.sectionPrices.set(r.data ?? []),
    });
  }

  openSectionPriceModal(product?: any): void {
    this.pricingProduct.set(product ?? null);
    this.editingRow.set(null);
    this.showSectionPriceModal.set(true);
    this.loadSectionPrices();
  }

  closeSectionPriceModal(): void {
    this.showSectionPriceModal.set(false);
    this.pricingProduct.set(null);
    this.editingRow.set(null);
  }

  selectPricingProduct(productId: string): void {
    const p = this.products().find(x => x.id === productId) ?? null;
    this.pricingProduct.set(p);
    this.editingRow.set(null);
  }

  sectionPriceForRow(productId: string, section: string): any | null {
    return this.sectionPrices().find(sp => sp.product_id === productId && sp.section === section) ?? null;
  }

  rowInputValue(productId: string, section: string): string {
    const sp = this.sectionPriceForRow(productId, section);
    return sp ? String(parseInt(sp.price, 10) / 100) : '';
  }

  saveRow(productId: string, section: string, rawValue: string): void {
    this.editingRow.set(null);
    const naira = parseFloat(rawValue);
    if (isNaN(naira) || naira <= 0) {
      // Empty or zero — remove override if one exists
      const existing = this.sectionPriceForRow(productId, section);
      if (existing) this.deleteSectionPrice(existing.id);
      return;
    }
    const product = this.products().find(p => p.id === productId);
    this.api.post('/pos/section-prices', {
      product_id: productId,
      product_name: product?.name ?? '',
      section,
      price: Math.round(naira * 100),
      property_id: this.activeProperty.propertyId(),
    }).subscribe({
      next: () => this.loadSectionPrices(),
      error: () => {},
    });
  }

  deleteSectionPrice(id: string): void {
    this.api.delete(`/pos/section-prices/${id}`).subscribe({
      next: () => this.loadSectionPrices(),
    });
  }

  sectionLabel(key: string): string {
    return this.SECTIONS.find(s => s.key === key)?.label ?? key;
  }

  pricesForProduct(productId: string): any[] {
    return this.sectionPrices().filter(sp => sp.product_id === productId);
  }

  // Legacy – kept for compatibility with old saveSectionPriceEntry calls if any remain
  saveSectionPriceEntry(): void {}

  saveProduct() {
    if (!this.productForm.category_id || !this.productForm.name.trim() || this.productForm.price_naira < 0) return;
    const pid = this.activeProperty.propertyId();
    this.savingProduct.set(true);
    const editing = this.editingProduct();
    const priceKobo = Math.round(this.productForm.price_naira * 100);

    const payload = {
      category_id: this.productForm.category_id,
      name: this.productForm.name,
      description: this.productForm.description || null,
      price: priceKobo,
      prep_time_minutes: this.productForm.prep_time_minutes,
      requires_kitchen: this.productForm.requires_kitchen,
      is_available: this.productForm.is_available,
      property_id: pid,
      stock_item_id: this.productForm.stock_item_id || null,
    };

    const call = editing
      ? this.api.put(`/pos/products/${editing.id}`, payload)
      : this.api.post('/pos/products', payload);

    call.subscribe({
      next: () => { this.savingProduct.set(false); this.closeProductModal(); this.load(); },
      error: () => this.savingProduct.set(false),
    });
  }

  toggleProductAvailability(p: Product) {
    this.api.put(`/pos/products/${p.id}`, { is_available: !p.is_available }).subscribe(() => this.load());
  }

  async deleteProduct(p: Product) {
    const ok = await this.confirm.confirm({ title: 'Delete Product', message: `Delete "${p.name}"? This cannot be undone.`, confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    this.api.delete(`/pos/products/${p.id}`).subscribe(() => this.load());
  }
}
