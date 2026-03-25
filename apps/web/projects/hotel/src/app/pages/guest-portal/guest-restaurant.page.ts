import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-restaurant',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto pb-32">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </a>
        <div class="flex-1">
          <h2 class="text-lg font-bold" [class]="th.text()">Restaurant & Room Service</h2>
          <p class="text-xs" [class]="th.muted()">Order from your room</p>
        </div>
        @if (cart().length > 0) {
          <button (click)="showCart.set(!showCart())"
            class="relative flex items-center gap-1.5 bg-amber-400 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all">
            🛒 Cart
            <span class="bg-slate-900 text-amber-400 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
              {{ cartCount() }}
            </span>
          </button>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-16">
          <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
        </div>
      }

      <!-- Menu categories -->
      @if (!loading()) {
        <!-- Category tabs -->
        @if (menu().length > 1) {
          <div class="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            <button (click)="activeCategory.set('')"
              class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              [class]="!activeCategory() ? 'bg-amber-400 text-slate-900' : th.badge()">
              All
            </button>
            @for (cat of menu(); track cat.id) {
              <button (click)="activeCategory.set(cat.id)"
                class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                [class]="activeCategory() === cat.id ? 'bg-amber-400 text-slate-900' : th.badge()">
                {{ cat.icon ? cat.icon + ' ' : '' }}{{ cat.name }}
              </button>
            }
          </div>
        }

        @if (filteredMenu().length === 0) {
          <div class="text-center py-16">
            <div class="text-5xl mb-3">🍽</div>
            <p class="text-sm" [class]="th.muted()">Menu not available right now</p>
          </div>
        }

        @for (cat of filteredMenu(); track cat.id) {
          <div class="mb-6">
            <h3 class="text-sm font-bold mb-3" [class]="th.text()">
              {{ cat.icon ? cat.icon + ' ' : '' }}{{ cat.name }}
            </h3>
            <div class="space-y-2">
              @for (product of cat.products; track product.id) {
                <div class="rounded-2xl p-4 flex items-center gap-3" [class]="th.card()">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold" [class]="th.text()">{{ product.name }}</p>
                    @if (product.description) {
                      <p class="text-xs mt-0.5 line-clamp-2" [class]="th.muted()">{{ product.description }}</p>
                    }
                    <p class="text-sm font-bold text-amber-400 mt-1">₦{{ ((+product.price || 0) / 100).toLocaleString() }}</p>
                  </div>
                  <div class="flex-shrink-0">
                    @if (getQty(product.id) === 0) {
                      <button (click)="addToCart(product)"
                        class="w-9 h-9 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-lg font-bold active:scale-90 transition-all">+</button>
                    } @else {
                      <div class="flex items-center gap-2">
                        <button (click)="removeFromCart(product.id)"
                          class="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold active:scale-90 transition-all" [class]="th.badge()">−</button>
                        <span class="text-sm font-bold w-5 text-center" [class]="th.text()">{{ getQty(product.id) }}</span>
                        <button (click)="addToCart(product)"
                          class="w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-lg font-bold active:scale-90 transition-all">+</button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Cart slide-up panel -->
      @if (showCart() && cart().length > 0) {
        <div class="fixed inset-0 z-50 flex flex-col justify-end" style="background:rgba(0,0,0,.5)" (click)="showCart.set(false)">
          <div class="rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto" [class]="th.card()" (click)="$event.stopPropagation()">
            <div class="w-10 h-1 rounded-full bg-gray-400/40 mx-auto mb-4"></div>
            <h3 class="text-base font-bold mb-4" [class]="th.text()">Your Order</h3>

            <div class="space-y-3 mb-4">
              @for (item of cart(); track item.product_id) {
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <p class="text-sm font-medium" [class]="th.text()">{{ item.name }}</p>
                    <p class="text-xs text-amber-400">₦{{ ((+item.price * item.quantity) / 100).toLocaleString() }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button (click)="removeFromCart(item.product_id)"
                      class="w-7 h-7 rounded-full flex items-center justify-center" [class]="th.badge()">−</button>
                    <span class="text-sm font-bold w-4 text-center" [class]="th.text()">{{ item.quantity }}</span>
                    <button (click)="addItem(item)"
                      class="w-7 h-7 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center">+</button>
                  </div>
                </div>
              }
            </div>

            <!-- Notes -->
            <div class="mb-4">
              <label class="block text-xs font-medium mb-1" [class]="th.muted()">Special instructions (optional)</label>
              <textarea (input)="notes.set($any($event.target).value)" [value]="notes()"
                rows="2" placeholder="e.g. No spice, extra sauce…"
                class="w-full rounded-xl px-3 py-2.5 text-sm resize-none" [class]="th.input()"></textarea>
            </div>

            <!-- Total + order -->
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm" [class]="th.muted()">Total</span>
              <span class="text-lg font-black text-amber-400">₦{{ cartTotal().toLocaleString() }}</span>
            </div>

            @if (orderError()) {
              <div class="mb-3 px-3 py-2.5 rounded-xl text-xs" [class]="th.danger()">{{ orderError() }}</div>
            }

            <button (click)="placeOrder()" [disabled]="placing()"
              class="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 bg-amber-400 text-slate-900 disabled:opacity-60">
              @if (placing()) {
                <span class="flex items-center justify-center gap-2">
                  <span class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                  Placing order…
                </span>
              } @else {
                🛎 Place Room Service Order
              }
            </button>
          </div>
        </div>
      }

      <!-- Order confirmation -->
      @if (orderPlaced()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-6" style="background:rgba(0,0,0,.6)">
          <div class="rounded-3xl p-8 text-center max-w-xs w-full" [class]="th.card()">
            <div class="text-6xl mb-4">🎉</div>
            <h3 class="text-lg font-bold mb-2" [class]="th.text()">Order Placed!</h3>
            <p class="text-sm mb-1" [class]="th.muted()">Your order has been sent to the kitchen.</p>
            <p class="text-xs text-amber-400 mb-6">It will be charged to your room bill.</p>
            <button (click)="orderPlaced.set(false); cart.set([]); showCart.set(false); notes.set('')"
              class="w-full py-3 rounded-xl bg-amber-400 text-slate-900 font-bold text-sm active:scale-95 transition-all">
              OK, got it!
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export default class GuestRestaurantPage implements OnInit {
  private guestApi = inject(GuestApiService);
  readonly th       = inject(GuestThemeService);

  menu           = signal<any[]>([]);
  loading        = signal(true);
  activeCategory = signal('');
  cart           = signal<any[]>([]);
  showCart       = signal(false);
  notes          = signal('');
  placing        = signal(false);
  orderPlaced    = signal(false);
  orderError     = signal('');

  filteredMenu = computed(() => {
    const all = this.menu();
    const cat = this.activeCategory();
    if (!cat) return all;
    return all.filter(c => c.id === cat);
  });

  cartCount  = computed(() => this.cart().reduce((s, i) => s + i.quantity, 0));
  cartTotal  = computed(() => this.cart().reduce((s, i) => s + (+i.price * i.quantity), 0) / 100);

  ngOnInit(): void {
    this.guestApi.get('/guest/menu').subscribe({
      next: (r: any) => { this.menu.set(r.data ?? r ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getQty(productId: string): number {
    return this.cart().find(i => i.product_id === productId)?.quantity ?? 0;
  }

  addToCart(product: any): void {
    this.cart.update(items => {
      const existing = items.find(i => i.product_id === product.id);
      if (existing) return items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...items, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  addItem(item: any): void {
    this.cart.update(items => items.map(i => i.product_id === item.product_id ? { ...i, quantity: i.quantity + 1 } : i));
  }

  removeFromCart(productId: string): void {
    this.cart.update(items => {
      const updated = items.map(i => i.product_id === productId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
      return updated;
    });
    if (this.cart().length === 0) this.showCart.set(false);
  }

  placeOrder(): void {
    if (this.placing()) return;
    this.placing.set(true);
    this.orderError.set('');
    this.guestApi.post('/guest/room-service/orders', {
      items: this.cart().map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      notes: this.notes(),
    }).subscribe({
      next: (r: any) => {
        this.placing.set(false);
        if (r.success || r.data) {
          this.orderPlaced.set(true);
        } else {
          this.orderError.set(r.message ?? r.error?.message ?? 'Failed to place order');
        }
      },
      error: (e: any) => {
        this.placing.set(false);
        this.orderError.set(e?.error?.message ?? 'Failed to place order');
      },
    });
  }
}
