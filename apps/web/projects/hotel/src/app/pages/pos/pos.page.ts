import { PAGE_TOURS } from '../../services/page-tours';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent,
  AuthService, ActivePropertyService, ConfirmDialogService, ConfirmDialogComponent, ToastService, TourService } from '@lodgik/shared';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, TitleCasePipe, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, ConfirmDialogComponent],
  template: `
    <ui-confirm-dialog/>
    <ui-page-header title="Bar & Restaurant" subtitle="POS, table management, and kitchen display"
      tourKey="pos" (tourClick)="startTour()">
      <div class="flex gap-2">
        <button (click)="openTableModal()" class="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">+ Add Table</button>
        <button (click)="openOrderBuilder()"
          class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
          + New Order
        </button>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- ── Full-Screen Order Builder ───────────────────────────────── -->
    @if (showOrderBuilder()) {
      <div class="fixed inset-0 z-50 flex" style="background:rgba(0,0,0,.45)">
        <!-- Left: Menu (62%) -->
        <div class="flex flex-col bg-white" style="width:62%">
          <div class="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
            <button (click)="closeOrderBuilder()" class="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 flex items-center justify-center text-lg">✕</button>
            <span class="font-bold text-gray-900 flex-1">New Order</span>
            <select [(ngModel)]="orderForm.order_type" (ngModelChange)="onOrderTypeChange()"
              class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="dine_in">🍽 Dine In</option>
              <option value="takeaway">🥡 Takeaway</option>
              <option value="room_service">🛎 Room Service</option>
            </select>
            @if (orderForm.order_type === 'dine_in') {
              <select [(ngModel)]="orderForm.table_id" (ngModelChange)="loadSectionPrices()" class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">No Table</option>
                @for (t of tables(); track t.id) {
                  <option [value]="t.id">Table {{ t.number }}{{ t.section ? ' · ' + t.section : '' }}</option>
                }
              </select>
              @if (selectedTableSection() && sectionPrices().length > 0) {
                <span class="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-lg font-medium flex-shrink-0">
                  🏷 {{ selectedTableSection() }} pricing
                </span>
              }
            }
            @if (orderForm.order_type === 'room_service') {
              <div class="relative">
                <input [(ngModel)]="roomServiceSearch" (ngModelChange)="searchCheckedIn()"
                  [placeholder]="orderForm.booking_id ? '✓ ' + orderForm.guest_name : 'Search room / guest…'"
                  class="border rounded-lg px-3 py-2 text-sm w-44"
                  [class]="orderForm.booking_id ? 'border-sage-400 bg-sage-50' : 'border-gray-200'">
                @if (checkedInResults().length) {
                  <div class="absolute top-full left-0 z-20 w-64 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    @for (b of checkedInResults(); track b.id) {
                      <button (click)="selectRoomServiceGuest(b)"
                        class="w-full text-left px-3 py-2.5 text-sm hover:bg-sage-50 border-b border-gray-50 last:border-0">
                        <span class="font-semibold">Room {{ b.room_number }}</span>
                        <span class="text-gray-400 ml-1.5 text-xs">{{ b.guest_name }}</span>
                      </button>
                    }
                  </div>
                }
              </div>
            }
            @if (orderForm.order_type === 'takeaway') {
              <input [(ngModel)]="orderForm.guest_name" placeholder="Customer name"
                class="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36">
            }
          </div>
          <!-- Category tabs -->
          <div class="flex gap-1.5 overflow-x-auto px-5 py-2.5 border-b border-gray-100 flex-shrink-0">
            <button (click)="activeCat.set('')"
              class="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
              [class]="!activeCat() ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">All</button>
            @for (cat of menuCats(); track cat.id) {
              <button (click)="activeCat.set(cat.id)"
                class="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
                [class]="activeCat() === cat.id ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                {{ cat.name }}
              </button>
            }
          </div>
          <!-- Products -->
          <div class="flex-1 overflow-y-auto p-4">
            @if (menuLoading()) {
              <div class="flex justify-center pt-10"><div class="w-6 h-6 border-2 border-sage-300 border-t-transparent rounded-full animate-spin"></div></div>
            }
            <div data-tour="pos-tables" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              @for (p of filteredProducts(); track p.id) {
                <button (click)="addToCart(p)"
                  class="relative text-left border rounded-2xl p-4 transition-all active:scale-95 hover:border-sage-300 hover:shadow-sm"
                  [class]="getQty(p.id) > 0 ? 'border-sage-400 bg-sage-50 shadow-sm' : 'border-gray-100 bg-white'">
                  @if (getQty(p.id) > 0) {
                    <span class="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-sage-600 text-white text-xs font-black flex items-center justify-center">{{ getQty(p.id) }}</span>
                  }
                  <p class="text-sm font-semibold text-gray-800 leading-snug pr-7">{{ p.name }}</p>
                  @if (p.description) { <p class="text-xs text-gray-400 mt-1 line-clamp-2">{{ p.description }}</p> }
                  @if (effectivePrice(p.id, p.price) !== +p.price) {
                    <div class="mt-1.5 flex items-center gap-1.5">
                      <span class="text-xs text-gray-400 line-through">₦{{ fmtKobo(+p.price) }}</span>
                      <span class="text-sm font-bold text-violet-600">₦{{ fmtKobo(effectivePrice(p.id, p.price)) }}</span>
                      <span class="text-[10px] bg-violet-100 text-violet-600 px-1.5 rounded font-medium">{{ selectedTableSection() }}</span>
                    </div>
                  } @else {
                    <p class="text-sm font-bold text-sage-700 mt-2">₦{{ fmtKobo(+p.price) }}</p>
                  }
                </button>
              }
              @if (!menuLoading() && filteredProducts().length === 0) {
                <div class="col-span-3 text-center py-10 text-gray-400 text-sm">No items in this category</div>
              }
            </div>
          </div>
        </div>

        <!-- Right: Cart (38%) -->
        <div class="flex flex-col bg-gray-50 border-l border-gray-200" style="flex:1">
          <div class="px-5 py-3.5 border-b border-gray-200 flex-shrink-0">
            <p class="font-bold text-gray-900">Order Summary</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ cartCount() }} item{{ cartCount() !== 1 ? 's' : '' }}</p>
          </div>
          <div class="flex-1 overflow-y-auto px-4 py-3">
            @if (cart().length === 0) {
              <div class="text-center py-10 text-gray-400"><div class="text-4xl mb-2">🛒</div><p class="text-sm">Tap items to add</p></div>
            }
            @for (item of cart(); track item.product_id) {
              <div class="bg-white rounded-xl border border-gray-100 p-3 mb-2">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <p class="text-sm font-medium text-gray-800 flex-1 leading-snug">{{ item.name }}</p>
                  <button (click)="removeFromCart(item.product_id)"
                    class="w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center hover:bg-red-100 hover:text-red-500 flex-shrink-0">✕</button>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <button (click)="decQty(item.product_id)"
                      class="w-7 h-7 rounded-full border border-gray-200 text-gray-600 text-sm flex items-center justify-center hover:bg-gray-50 active:scale-90">−</button>
                    <span class="text-sm font-bold w-4 text-center">{{ item.quantity }}</span>
                    <button (click)="incQty(item.product_id)"
                      class="w-7 h-7 rounded-full bg-sage-100 text-sage-700 text-sm flex items-center justify-center hover:bg-sage-200 active:scale-90">+</button>
                  </div>
                  <p class="text-sm font-bold text-gray-900">₦{{ fmtKobo(effectivePrice(item.product_id, item.price) * item.quantity) }}</p>
                </div>
                <input [(ngModel)]="item.note" placeholder="Kitchen note…"
                  class="mt-2 w-full text-xs px-2 py-1.5 border border-gray-100 rounded-lg bg-gray-50 text-gray-500 focus:outline-none focus:border-sage-300">
              </div>
            }
          </div>
          <div class="px-5 py-4 border-t border-gray-200 bg-white flex-shrink-0">
            <input [(ngModel)]="orderNote" placeholder="Order note…"
              class="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl mb-3 text-gray-600 focus:outline-none focus:border-sage-300">
            <div class="flex justify-between items-center mb-4">
              <span class="text-sm text-gray-500">Subtotal</span>
              <span class="text-2xl font-black text-gray-900">₦{{ cartSubtotal().toLocaleString() }}</span>
            </div>
            <button (click)="placeOrder()" [disabled]="cart().length === 0 || placingOrder()"
              class="w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
              [class]="cart().length > 0 ? 'bg-sage-600 text-white hover:bg-sage-700' : 'bg-gray-200 text-gray-400'">
              @if (placingOrder()) {
                <span class="flex items-center justify-center gap-2">
                  <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Placing…
                </span>
              } @else {
                🛎 Place Order · ₦{{ cartSubtotal().toLocaleString() }}
              }
            </button>
          </div>
        </div>
      </div>
    }

    @if (!loading()) {
      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-gray-100 p-4">
          <p class="text-xs text-gray-500 mb-1">Tables</p>
          <p class="text-2xl font-bold text-gray-800">{{ tables().length }}</p>
          <p class="text-xs text-gray-400">{{ availableTables() }} available</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 p-4">
          <p class="text-xs text-gray-500 mb-1">Active Orders</p>
          <p class="text-2xl font-bold text-sage-700">{{ orders().length }}</p>
          <p class="text-xs text-gray-400">in progress</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 p-4">
          <p class="text-xs text-gray-500 mb-1">Kitchen Queue</p>
          <p class="text-2xl font-bold text-amber-600">{{ kitchenQueue().length }}</p>
          <p class="text-xs text-gray-400">pending items</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 p-4">
          <p class="text-xs text-gray-500 mb-1">Revenue Today</p>
          <p class="text-xl font-bold text-green-700">₦{{ formatAmount(todayRevenue()) }}</p>
          <p class="text-xs text-gray-400">from orders</p>
        </div>
      </div>

      <!-- Table Map -->
      <div class="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-700">Table Map</h3>
          <div class="flex items-center gap-3 text-xs text-gray-500">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Available</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Occupied</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-purple-500 inline-block"></span> Reserved</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-gray-400 inline-block"></span> Inactive</span>
          </div>
        </div>
        @if (tables().length === 0) {
          <div class="py-10 text-center text-gray-400">
            <p class="text-4xl mb-3">🍽️</p>
            <p class="font-medium">No tables configured</p>
            <p class="text-sm mt-1">Click "Add Table" to get started</p>
          </div>
        }
        <div class="flex flex-wrap gap-3">
          @for (t of tables(); track t.id) {
            <div class="relative group w-28 h-28 rounded-xl flex flex-col items-center justify-center text-white shadow-sm cursor-pointer transition-transform hover:scale-105"
              [style.background]="tableColor(t.status)">
              <div class="text-lg font-bold">{{ t.number }}</div>
              <div class="text-xs opacity-90">{{ t.seats }} seats</div>
              <div class="text-xs opacity-75 capitalize">{{ t.status }}</div>
              @if (t.section) { <div class="text-[10px] opacity-60">{{ t.section }}</div> }
              <!-- Hover actions -->
              <div class="absolute inset-0 rounded-xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button (click)="openTableModal(t)" class="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-xs" title="Edit">✏️</button>
                <button (click)="deleteTable(t)" class="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-xs" title="Delete">🗑️</button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Active Orders -->
      @if (orders().length > 0) {
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Active Orders</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (o of orders(); track o.id) {
              <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                  <div class="font-bold text-gray-800">#{{ o.order_number }}</div>
                  <span class="text-xs px-2 py-1 rounded-full font-medium"
                    [style.background]="o.status_color + '20'" [style.color]="o.status_color">
                    {{ o.status_label }}
                  </span>
                </div>
                <div class="text-sm text-gray-500">{{ o.table_number ? 'Table ' + o.table_number : 'No table' }} · {{ o.order_type | titlecase }}</div>
                <div class="text-sm text-gray-500">{{ o.item_count || 0 }} items</div>
                @if (o.guest_name) { <div class="text-xs text-gray-400 mt-1">👤 {{ o.guest_name }}</div> }
                <div class="text-lg font-bold mt-2 text-gray-800">₦{{ formatAmount(o.total_amount) }}</div>
                <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <button (click)="closeOrder(o.id)" class="px-2.5 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 font-medium">✓ Close</button>
                  @if (o.booking_id) {
                    <button (click)="postToFolio(o.id)" class="px-2.5 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 font-medium">→ Folio</button>
                  }
                  <button (click)="cancelOrder(o.id)" class="px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 font-medium">✕ Cancel</button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Kitchen Queue -->
      @if (kitchenQueue().length > 0) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-gray-700">Kitchen Queue</h3>
            <span class="text-xs text-gray-400">{{ kitchenQueue().length }} active orders</span>
          </div>
          <div class="space-y-3">
            @for (entry of kitchenQueue(); track entry.order.id) {
              <div class="border border-gray-100 rounded-lg p-3">
                <div class="flex justify-between items-center mb-2">
                  <span class="font-bold text-sm">#{{ entry.order.order_number }}</span>
                  <span class="text-xs text-gray-400">Table {{ entry.order.table_number || 'N/A' }}</span>
                </div>
                @for (item of entry.items; track item.id) {
                  <div class="flex justify-between items-center text-sm py-1.5 border-t border-gray-50">
                    <span class="text-gray-700">{{ item.quantity }}× {{ item.product_name }}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs px-2 py-0.5 rounded-full"
                        [class]="item.status === 'ready' ? 'bg-green-100 text-green-700' : item.status === 'preparing' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'">
                        {{ item.status }}
                      </span>
                      @if (item.status === 'pending') {
                        <button (click)="updateItemStatus(entry.order.id, item.id, 'preparing')"
                          class="px-2 py-0.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600">Start</button>
                      }
                      @if (item.status === 'preparing') {
                        <button (click)="updateItemStatus(entry.order.id, item.id, 'ready')"
                          class="px-2 py-0.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Ready</button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Empty state -->
      @if (orders().length === 0 && kitchenQueue().length === 0) {
        <div class="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p class="text-4xl mb-3">🍴</p>
          <p class="font-medium text-gray-700">No active orders</p>
          <p class="text-sm text-gray-400 mt-1">Click "New Order" to start taking orders</p>
        </div>
      }
    }

    <!-- Table Modal (Create / Edit) -->
    @if (showTableForm) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40" (click)="closeTableModal()"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editingTable ? 'Edit Table' : 'Add Table' }}</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Table Number <span class="text-red-500">*</span></label>
              <input [(ngModel)]="tableForm.number" placeholder="e.g. T1, A3, Bar-1"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Seats</label>
                <input [(ngModel)]="tableForm.seats" type="number" min="1" max="50"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select [(ngModel)]="tableForm.section"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
                  <option value="restaurant">Restaurant</option>
                  <option value="bar">Bar</option>
                  <option value="poolside">Poolside</option>
                  <option value="terrace">Terrace</option>
                  <option value="private">Private Dining</option>
                  <option value="executive_lounge">Executive Lounge</option>
                  <option value="vip">VIP Section</option>
                  <option value="rooftop">Rooftop</option>
                  <option value="takeaway">Takeaway</option>
                </select>
              </div>
            </div>
            @if (editingTable) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select [(ngModel)]="tableForm.status"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            }
          </div>
          <div class="flex justify-end gap-2 mt-5">
            <button (click)="closeTableModal()" class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button (click)="saveTable()" [disabled]="savingTable()"
              class="px-4 py-2 text-sm text-white bg-sage-600 rounded-lg hover:bg-sage-700 disabled:opacity-50">
              {{ savingTable() ? 'Saving...' : (editingTable ? 'Update Table' : 'Create Table') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PosPage implements OnInit {
  private tour = inject(TourService);
  private api = inject(ApiService);
  private activeProperty = inject(ActivePropertyService);
  private confirm = inject(ConfirmDialogService);
  private toast = inject(ToastService);

  loading = signal(true);
  savingTable = signal(false);
  creatingOrder = signal(false);

  tables = signal<any[]>([]);
  orders = signal<any[]>([]);
  kitchenQueue = signal<any[]>([]);

  showTableForm   = false;
  showOrderBuilder = signal(false);
  editingTable: any = null;

  tableForm: any = { number: '', seats: 4, section: 'restaurant', status: 'available' };
  orderForm: any = { table_id: '', order_type: 'dine_in', guest_name: '', booking_id: '' };
  orderNote       = '';
  roomServiceSearch = '';
  checkedInResults  = signal<any[]>([]);
  private rsTimer: any;

  // Menu / cart for order builder
  menuCats     = signal<any[]>([]);
  menuProducts = signal<any[]>([]);
  menuLoading  = signal(false);
  activeCat    = signal('');
  cart         = signal<any[]>([]);
  placingOrder = signal(false);

  sectionPrices = signal<any[]>([]);

  /** Load section prices whenever menu or table changes */
  loadSectionPrices(): void {
    this.api.get('/pos/section-prices', { property_id: this.pid }).subscribe({
      next: (r: any) => this.sectionPrices.set(r.data ?? []),
      error: () => {},
    });
  }

  /** Returns the effective price (kobo) for a product given current table selection */
  effectivePrice(productId: string, defaultPrice: string): number {
    const tableId = this.orderForm.table_id;
    if (!tableId) return +defaultPrice;
    const table = this.tables().find((t: any) => t.id === tableId);
    if (!table) return +defaultPrice;
    const sp = this.sectionPrices().find(
      (s: any) => s.product_id === productId && s.section === table.section
    );
    return sp ? +sp.price : +defaultPrice;
  }

  /** Returns naira string for display */
  fmtKobo(kobo: number): string {
    return (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  /** Section label for the selected table */
  selectedTableSection(): string | null {
    const t = this.tables().find((t: any) => t.id === this.orderForm.table_id);
    return t?.section ?? null;
  }

  filteredProducts = computed(() => {
    const cat = this.activeCat();
    const products = this.menuProducts();
    return cat ? products.filter(p => p.category_id === cat) : products;
  });
  cartCount    = computed(() => this.cart().reduce((s, i) => s + i.quantity, 0));
  cartSubtotal = computed(() => this.cart().reduce((s, i) => s + (this.effectivePrice(i.product_id, i.price) * i.quantity), 0) / 100);

  availableTables = computed(() => this.tables().filter(t => t.status === 'available').length);
  todayRevenue    = computed(() => this.orders().reduce((s: number, o: any) => s + (+o.total_amount || 0), 0));

  get pid() { return this.activeProperty.propertyId(); }

  ngOnInit() { this.load(); }

  load() {
    const pid = this.pid;
    this.api.get(`/pos/tables`, { property_id: pid }).subscribe({ next: (r: any) => this.tables.set(r.data || []) });
    this.api.get(`/pos/orders`, { property_id: pid, status: 'open' }).subscribe({ next: (r: any) => this.orders.set(r.data || []) });
    this.api.get(`/pos/kitchen/queue`, { property_id: pid }).subscribe({
      next: (r: any) => { this.kitchenQueue.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Table CRUD ─────────────────────────────────────────────────
  openTableModal(table?: any) {
    this.editingTable = table || null;
    this.tableForm = table
      ? { number: table.number, seats: table.seats, section: table.section, status: table.status }
      : { number: '', seats: 4, section: 'restaurant', status: 'available' };
    this.showTableForm = true;
  }

  closeTableModal() { this.showTableForm = false; this.editingTable = null; }

  saveTable() {
    if (!this.tableForm.number?.trim()) { this.toast.error('Table number is required'); return; }
    if (this.savingTable()) return; // prevent double-submit
    this.savingTable.set(true);

    const req$ = this.editingTable
      ? this.api.put(`/pos/tables/${this.editingTable.id}`, this.tableForm)
      : this.api.post('/pos/tables', { ...this.tableForm, property_id: this.pid });

    req$.subscribe({
      next: (r: any) => {
        this.savingTable.set(false);
        if (r.success || r.data) {
          this.toast.success(this.editingTable ? 'Table updated' : 'Table created');
          this.closeTableModal();
          this.load();
        } else {
          this.toast.error(r.message || 'Failed to save table');
        }
      },
      error: (e: any) => {
        this.savingTable.set(false);
        this.toast.error(e?.error?.message || 'Failed to save table');
      },
    });
  }

  async deleteTable(table: any) {
    const ok = await this.confirm.confirm({
      title: 'Delete Table',
      message: `Delete table "${table.number}"? Active orders on this table will not be affected.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    this.api.delete(`/pos/tables/${table.id}`).subscribe({
      next: () => { this.toast.success('Table deleted'); this.load(); },
      error: () => this.toast.error('Failed to delete table'),
    });
  }

  // ── Orders ─────────────────────────────────────────────────────
  onOrderTypeChange(): void {
    this.orderForm.booking_id = '';
    this.orderForm.guest_name = '';
    this.roomServiceSearch = '';
    this.checkedInResults.set([]);
  }

  searchCheckedIn(): void {
    clearTimeout(this.rsTimer);
    if (this.roomServiceSearch.length < 1) { this.checkedInResults.set([]); return; }
    this.rsTimer = setTimeout(() => {
      this.api.get('/bookings/checkout-tracker', { property_id: this.pid }).subscribe((r: any) => {
        const q = this.roomServiceSearch.toLowerCase();
        const results = (r.data ?? []).filter((b: any) =>
          b.room_number?.toLowerCase().includes(q) || b.guest_name?.toLowerCase().includes(q)
        );
        this.checkedInResults.set(results.slice(0, 8));
      });
    }, 250);
  }

  selectRoomServiceGuest(b: any): void {
    this.orderForm.booking_id = b.id;
    this.orderForm.guest_name = b.guest_name;
    this.roomServiceSearch = '';
    this.checkedInResults.set([]);
  }

  openOrderBuilder(): void {
    this.cart.set([]);
    this.orderNote = '';
    this.orderForm = { table_id: '', order_type: 'dine_in', guest_name: '', booking_id: '' };
    this.activeCat.set('');
    this.showOrderBuilder.set(true);
    if (this.menuProducts().length === 0) this.loadMenu();
    this.loadSectionPrices();
  }

  closeOrderBuilder(): void {
    this.showOrderBuilder.set(false);
    this.cart.set([]);
  }

  loadMenu(): void {
    this.menuLoading.set(true);
    this.api.get('/pos/categories', { property_id: this.pid }).subscribe({
      next: (r: any) => this.menuCats.set(r.data ?? []),
    });
    this.api.get('/pos/products', { property_id: this.pid }).subscribe({
      next: (r: any) => { this.menuProducts.set(r.data ?? []); this.menuLoading.set(false); },
      error: () => this.menuLoading.set(false),
    });
  }

  getQty(productId: string): number {
    return this.cart().find(i => i.product_id === productId)?.quantity ?? 0;
  }

  addToCart(p: any): void {
    this.cart.update(items => {
      const existing = items.find(i => i.product_id === p.id);
      if (existing) return items.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...items, { product_id: p.id, name: p.name, price: p.price, quantity: 1, note: '' }];
    });
  }

  incQty(productId: string): void {
    this.cart.update(items => items.map(i => i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i));
  }

  decQty(productId: string): void {
    this.cart.update(items =>
      items.map(i => i.product_id === productId ? { ...i, quantity: i.quantity - 1 } : i)
           .filter(i => i.quantity > 0)
    );
  }

  removeFromCart(productId: string): void {
    this.cart.update(items => items.filter(i => i.product_id !== productId));
  }

  placeOrder(): void {
    if (this.cart().length === 0 || this.placingOrder()) return;
    this.placingOrder.set(true);

    // Step 1: create order header
    this.api.post('/pos/orders', { ...this.orderForm, notes: this.orderNote, property_id: this.pid }).subscribe({
      next: (r: any) => {
        if (!r.success && !r.data) {
          this.placingOrder.set(false);
          this.toast.error(r.message || 'Failed to create order');
          return;
        }
        const orderId = r.data?.id ?? r.data;
        // Step 2: add all items
        const addCalls = this.cart().map(item =>
          this.api.post(`/pos/orders/${orderId}/items`, {
            product_id: item.product_id,
            quantity: item.quantity,
            notes: item.note || null,
          }).toPromise()
        );
        Promise.all(addCalls).then(() => {
          // Step 3: if room service, auto-post to folio
          if (this.orderForm.order_type === 'room_service' && this.orderForm.booking_id) {
            this.api.post(`/pos/orders/${orderId}/post-to-folio`, {}).subscribe({ error: () => {} });
          }
          this.placingOrder.set(false);
          this.toast.success(`Order #${r.data?.order_number ?? ''} placed — ${this.cartCount()} items`);
          this.closeOrderBuilder();
          this.load();
        }).catch(() => {
          this.placingOrder.set(false);
          this.toast.error('Order created but some items failed to add');
          this.closeOrderBuilder();
          this.load();
        });
      },
      error: (e: any) => {
        this.placingOrder.set(false);
        this.toast.error(e?.error?.message || 'Failed to create order');
      },
    });
  }

  closeOrder(orderId: string) {
    this.api.post(`/pos/orders/${orderId}/close`, {}).subscribe({
      next: (r: any) => { if (r.success || r.data) { this.toast.success('Order closed'); this.load(); } else this.toast.error(r.message || 'Failed'); },
      error: () => this.toast.error('Failed to close order'),
    });
  }

  postToFolio(orderId: string) {
    this.api.post(`/pos/orders/${orderId}/post-to-folio`, {}).subscribe({
      next: (r: any) => { if (r.success || r.data) this.toast.success('Posted to folio'); else this.toast.error(r.message || 'Failed'); },
      error: () => this.toast.error('Failed to post to folio'),
    });
  }

  async cancelOrder(orderId: string) {
    const ok = await this.confirm.confirm({ title: 'Cancel Order', message: 'Cancel this order? This cannot be undone.', variant: 'warning' });
    if (!ok) return;
    this.api.post(`/pos/orders/${orderId}/cancel`, {}).subscribe({
      next: (r: any) => { if (r.success || r.data) { this.toast.success('Order cancelled'); this.load(); } else this.toast.error(r.message || 'Failed'); },
      error: () => this.toast.error('Failed to cancel order'),
    });
  }

  updateItemStatus(orderId: string, itemId: string, status: string) {
    this.api.post(`/pos/orders/${orderId}/items/${itemId}/status`, { status }).subscribe({
      next: () => this.load(),
      error: () => this.toast.error('Failed to update item status'),
    });
  }

  tableColor(status: string): string {
    return { available: '#22c55e', occupied: '#3b82f6', reserved: '#8b5cf6', inactive: '#9ca3af' }[status] || '#6b7280';
  }

  formatAmount(kobo: any): string { return ((+kobo || 0) / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 }); }

  startTour(): void {
    this.tour.start(PAGE_TOURS['pos'] ?? [], 'pos');
  }
}
