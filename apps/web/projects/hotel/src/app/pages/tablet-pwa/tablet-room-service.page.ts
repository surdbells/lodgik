import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabletService } from './tablet.service';

@Component({ selector: 'app-tablet-room-service', standalone: true, imports: [FormsModule],
  template: `
    <div class="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-4 px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <button (click)="router.navigate(['/tablet/home'])"
          class="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-lg hover:bg-slate-700">←</button>
        <div class="flex-1">
          <h1 class="text-white font-bold text-xl">Room Service</h1>
          <p class="text-slate-400 text-sm">Order to Room {{ roomNum() }}</p>
        </div>
        @if (cart().length > 0) {
          <button (click)="showCart.set(true)"
            class="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm">
            🛒 Cart <span class="bg-white text-orange-500 w-5 h-5 rounded-full text-xs font-black flex items-center justify-center">{{ cartCount() }}</span>
          </button>
        }
      </div>

      <div class="flex flex-1 overflow-hidden">
        <!-- Category sidebar -->
        <div class="w-48 flex-shrink-0 border-r border-slate-800 overflow-y-auto py-3">
          <button (click)="activeCat.set('')"
            class="w-full px-4 py-3 text-left text-sm font-semibold transition-colors"
            [class]="!activeCat() ? 'text-orange-400 bg-slate-800/80' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'">
            All Items
          </button>
          @for (cat of menu(); track cat.id) {
            <button (click)="activeCat.set(cat.id)"
              class="w-full px-4 py-3 text-left text-sm font-semibold transition-colors"
              [class]="activeCat() === cat.id ? 'text-orange-400 bg-slate-800/80' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'">
              {{ cat.icon || '' }} {{ cat.name }}
            </button>
          }
        </div>

        <!-- Products -->
        <div class="flex-1 overflow-y-auto p-5">
          @if (loading()) {
            <div class="flex justify-center pt-16"><div class="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div></div>
          }
          @for (cat of filteredMenu(); track cat.id) {
            <div class="mb-6">
              <h3 class="text-slate-400 text-xs uppercase tracking-wider font-bold mb-3">{{ cat.name }}</h3>
              <div class="grid grid-cols-2 gap-3">
                @for (p of cat.products; track p.id) {
                  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3">
                    <div class="flex-1">
                      <p class="text-white font-semibold text-sm">{{ p.name }}</p>
                      @if (p.description) { <p class="text-slate-500 text-xs mt-0.5 line-clamp-2">{{ p.description }}</p> }
                      <p class="text-orange-400 font-bold mt-2">₦{{ (+p.price || 0).toLocaleString() }}</p>
                    </div>
                    <div class="flex-shrink-0 flex flex-col items-end justify-end">
                      @if (getQty(p.id) === 0) {
                        <button (click)="add(p)" class="w-9 h-9 rounded-full bg-orange-500 text-white text-xl font-bold flex items-center justify-center active:scale-90 transition-all">+</button>
                      } @else {
                        <div class="flex items-center gap-2">
                          <button (click)="remove(p.id)" class="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center active:scale-90">−</button>
                          <span class="text-white font-bold w-4 text-center text-sm">{{ getQty(p.id) }}</span>
                          <button (click)="add(p)" class="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center active:scale-90">+</button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
          @if (!loading() && menu().length === 0) {
            <div class="text-center py-16 text-slate-500">Menu not available</div>
          }
        </div>
      </div>

      <!-- Cart overlay -->
      @if (showCart()) {
        <div class="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-8" (click)="showCart.set(false)">
          <div class="bg-slate-900 rounded-3xl p-6 w-full max-w-lg border border-slate-700 max-h-[80vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <h3 class="text-white font-bold text-lg mb-4">Your Order</h3>
            <div class="space-y-3 mb-5">
              @for (item of cart(); track item.product_id) {
                <div class="flex items-center justify-between">
                  <div><p class="text-white text-sm font-medium">{{ item.name }}</p><p class="text-orange-400 text-xs">₦{{ (+item.price * item.quantity).toLocaleString() }}</p></div>
                  <div class="flex items-center gap-2">
                    <button (click)="remove(item.product_id)" class="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center">−</button>
                    <span class="text-white font-bold w-4 text-center text-sm">{{ item.quantity }}</span>
                    <button (click)="add(item)" class="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center">+</button>
                  </div>
                </div>
              }
            </div>
            <div class="flex justify-between items-center border-t border-slate-700 pt-4 mb-5">
              <span class="text-slate-400">Total</span>
              <span class="text-orange-400 font-black text-xl">₦{{ cartTotal().toLocaleString() }}</span>
            </div>
            <div class="mb-4">
              <textarea [(ngModel)]="notes" rows="2" placeholder="Special instructions…" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm resize-none"></textarea>
            </div>
            @if (orderError()) { <p class="text-red-400 text-sm mb-3">{{ orderError() }}</p> }
            <div class="flex gap-3">
              <button (click)="showCart.set(false)" class="flex-1 py-3 border border-slate-600 text-slate-300 rounded-xl text-sm">Cancel</button>
              <button (click)="place()" [disabled]="placing()"
                class="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                {{ placing() ? 'Placing…' : '🛎 Place Order' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Success overlay -->
      @if (ordered()) {
        <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div class="text-center">
            <div class="text-8xl mb-4">🎉</div>
            <p class="text-white text-2xl font-bold mb-2">Order Placed!</p>
            <p class="text-slate-400 mb-8">Your order is on its way</p>
            <button (click)="ordered.set(false); cart.set([]); showCart.set(false)"
              class="px-8 py-4 bg-orange-500 text-white font-bold text-lg rounded-2xl">Back to Menu</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class TabletRoomServicePage implements OnInit {
  readonly router = inject(Router);
  private svc     = inject(TabletService);

  menu      = signal<any[]>([]);
  loading   = signal(true);
  activeCat = signal('');
  cart      = signal<any[]>([]);
  showCart  = signal(false);
  notes     = '';
  placing   = signal(false);
  ordered   = signal(false);
  orderError = signal('');
  roomNum   = signal('');

  filteredMenu = computed(() => {
    const cat = this.activeCat();
    return cat ? this.menu().filter(c => c.id === cat) : this.menu();
  });
  cartCount = computed(() => this.cart().reduce((s, i) => s + i.quantity, 0));
  cartTotal = computed(() => this.cart().reduce((s, i) => s + (+i.price * i.quantity), 0));

  ngOnInit(): void {
    const d = this.svc.guestData();
    this.roomNum.set(d?.room?.room_number ?? '');
    this.svc.get('/guest/menu').subscribe({
      next: (r: any) => { this.menu.set(r.data ?? r ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getQty(id: string): number { return this.cart().find(i => i.product_id === id)?.quantity ?? 0; }
  add(p: any): void { this.cart.update(items => { const e = items.find(i => i.product_id === p.id); return e ? items.map(i => i.product_id === p.id ? {...i, quantity: i.quantity+1} : i) : [...items, {product_id: p.id, name: p.name, price: p.price, quantity: 1}]; }); }
  remove(id: string): void { this.cart.update(items => items.map(i => i.product_id === id ? {...i, quantity: i.quantity-1} : i).filter(i => i.quantity > 0)); }

  place(): void {
    this.placing.set(true); this.orderError.set('');
    this.svc.post('/guest/room-service/orders', {
      items: this.cart().map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      notes: this.notes,
    }).subscribe({
      next: (r: any) => { this.placing.set(false); if (r.success || r.data) { this.ordered.set(true); } else { this.orderError.set(r.message ?? 'Failed'); } },
      error: (e: any) => { this.placing.set(false); this.orderError.set(e?.error?.message ?? 'Failed'); },
    });
  }
}
