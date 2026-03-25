import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe, DatePipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent,
  ActivePropertyService, ConfirmDialogService, ConfirmDialogComponent, ToastService,
} from '@lodgik/shared';

type Tab = 'orders' | 'kitchen' | 'tables' | 'menu' | 'history';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, TitleCasePipe, DatePipe, PageHeaderComponent, StatsCardComponent,
            LoadingSpinnerComponent, ConfirmDialogComponent],
  template: `
<ui-confirm-dialog/>

<!-- ══ ORDER BUILDER (full-screen overlay) ══════════════════════════════ -->
@if (showOrderBuilder()) {
  <div class="fixed inset-0 z-50 flex" style="background:rgba(0,0,0,.45)">
    <!-- Left: Menu 60% -->
    <div class="flex flex-col bg-white" style="width:60%">
      <!-- Toolbar -->
      <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0 flex-wrap">
        <button (click)="closeOrderBuilder()" class="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 flex items-center justify-center">✕</button>
        <span class="font-bold text-gray-900">New Order</span>
        <select [(ngModel)]="orderForm.order_type" (ngModelChange)="onOrderTypeChange()"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white ml-1">
          <option value="dine_in">🍽 Dine In</option>
          <option value="takeaway">🥡 Takeaway</option>
          <option value="room_service">🛎 Room Service</option>
          <option value="bar">🍺 Bar</option>
        </select>
        @if (orderForm.order_type === 'dine_in' || orderForm.order_type === 'bar') {
          <select [(ngModel)]="orderForm.table_id" (ngModelChange)="loadSectionPrices()"
            class="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">No Table</option>
            @for (t of tables(); track t.id) {
              <option [value]="t.id">Table {{ t.number }}{{ t.section ? ' · '+t.section : '' }}</option>
            }
          </select>
        }
        @if (orderForm.order_type === 'room_service') {
          <div class="relative">
            <input [(ngModel)]="roomServiceSearch" (ngModelChange)="searchCheckedIn()"
              [placeholder]="orderForm.booking_id ? '✓ '+orderForm.guest_name : 'Search room / guest…'"
              class="border rounded-lg px-3 py-2 text-sm w-48"
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
      <div class="flex gap-1.5 overflow-x-auto px-4 py-2 border-b border-gray-100 flex-shrink-0">
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
      <!-- Products grid -->
      <div class="flex-1 overflow-y-auto p-4">
        @if (menuLoading()) {
          <div class="flex justify-center pt-10"><div class="w-6 h-6 border-2 border-sage-300 border-t-transparent rounded-full animate-spin"></div></div>
        }
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          @for (p of filteredProducts(); track p.id) {
            <button (click)="addToCart(p)"
              class="relative text-left border rounded-2xl p-4 transition-all active:scale-95 hover:border-sage-300 hover:shadow-sm"
              [class]="getQty(p.id) > 0 ? 'border-sage-400 bg-sage-50 shadow-sm' : 'border-gray-100 bg-white'">
              @if (getQty(p.id) > 0) {
                <span class="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-sage-600 text-white text-xs font-black flex items-center justify-center">{{ getQty(p.id) }}</span>
              }
              <p class="text-sm font-semibold text-gray-800 leading-snug pr-8">{{ p.name }}</p>
              @if (p.description) { <p class="text-xs text-gray-400 mt-1 line-clamp-2">{{ p.description }}</p> }
              @if (effectivePrice(p.id, p.price) !== +p.price) {
                <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs text-gray-400 line-through">₦{{ fmtKobo(+p.price) }}</span>
                  <span class="text-sm font-bold text-violet-600">₦{{ fmtKobo(effectivePrice(p.id, p.price)) }}</span>
                </div>
              } @else {
                <p class="text-sm font-bold text-sage-700 mt-2">₦{{ fmtKobo(+p.price) }}</p>
              }
              @if (!p.is_available) {
                <span class="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center text-xs text-gray-400 font-medium">Unavailable</span>
              }
            </button>
          }
          @if (!menuLoading() && filteredProducts().length === 0) {
            <div class="col-span-3 py-10 text-center text-gray-400 text-sm">No items in this category</div>
          }
        </div>
      </div>
    </div>

    <!-- Right: Cart 40% -->
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
                  class="w-7 h-7 rounded-full border border-gray-200 text-gray-600 text-sm flex items-center justify-center hover:bg-gray-50">−</button>
                <span class="text-sm font-bold w-4 text-center">{{ item.quantity }}</span>
                <button (click)="incQty(item.product_id)"
                  class="w-7 h-7 rounded-full bg-sage-100 text-sage-700 text-sm flex items-center justify-center hover:bg-sage-200">+</button>
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
          class="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
          [class]="cart().length > 0 ? 'bg-sage-600 text-white hover:bg-sage-700' : 'bg-gray-200 text-gray-400'">
          @if (placingOrder()) {
            <span class="flex items-center justify-center gap-2">
              <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Placing…
            </span>
          } @else { 🛎 Place Order · ₦{{ cartSubtotal().toLocaleString() }} }
        </button>
      </div>
    </div>
  </div>
}

<!-- ══ ORDER DETAIL / PAYMENT MODAL ═════════════════════════════════════ -->
@if (activeOrder()) {
  <div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,.5)" (click)="activeOrder.set(null)">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col" (click)="$event.stopPropagation()">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-gray-900">Order #{{ activeOrder()!.order_number }}</h3>
          <p class="text-xs text-gray-400">{{ activeOrder()!.order_type | titlecase }}{{ activeOrder()!.table_number ? ' · Table ' + activeOrder()!.table_number : '' }}{{ activeOrder()!.guest_name ? ' · ' + activeOrder()!.guest_name : '' }}</p>
        </div>
        <button (click)="activeOrder.set(null)" class="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100">✕</button>
      </div>

      <!-- Items list -->
      <div class="flex-1 overflow-y-auto px-5 py-3">
        <ui-loading [loading]="orderDetailLoading()"></ui-loading>
        @if (!orderDetailLoading()) {
          <div class="space-y-2 mb-4">
            @for (item of orderItems(); track item.id) {
              <div class="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800">{{ item.quantity }}× {{ item.product_name }}</p>
                  @if (item.notes) { <p class="text-xs text-gray-400">{{ item.notes }}</p> }
                </div>
                <p class="text-sm font-semibold flex-shrink-0">₦{{ fmtKobo(+item.line_total) }}</p>
                <span class="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                  [class]="item.status==='ready' ? 'bg-emerald-100 text-emerald-700' : item.status==='preparing' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'">
                  {{ item.status }}
                </span>
                @if (activeOrder()!.status === 'open' || activeOrder()!.status === 'draft') {
                  <button (click)="removeOrderItem(item.id)"
                    class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 text-gray-300 text-sm flex-shrink-0">✕</button>
                }
              </div>
            } @empty {
              <p class="text-sm text-gray-400 text-center py-4">No items yet</p>
            }
          </div>
          <div class="flex justify-between items-center py-3 border-t border-gray-100">
            <span class="text-sm font-semibold text-gray-600">Total</span>
            <span class="text-xl font-black text-gray-900">₦{{ fmtKobo(+activeOrder()!.total_amount) }}</span>
          </div>
        }
      </div>

      <!-- Payment section -->
      @if (activeOrder()!.status !== 'paid' && activeOrder()!.status !== 'cancelled') {
        <div class="px-5 py-4 border-t border-gray-100">
          @if (!showPayment) {
            <div class="flex gap-2 flex-wrap">
              <button (click)="sendToKitchen(activeOrder()!.id)"
                class="px-3 py-2 text-sm font-medium bg-amber-500 text-white rounded-xl hover:bg-amber-600">
                📤 Send to Kitchen
              </button>
              <button (click)="showPayment = true"
                class="flex-1 py-2.5 text-sm font-bold bg-sage-600 text-white rounded-xl hover:bg-sage-700">
                💳 Process Payment
              </button>
              @if (activeOrder()!.booking_id) {
                <button (click)="postToFolio(activeOrder()!.id)"
                  class="px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-xl hover:bg-purple-700">
                  → Room Bill
                </button>
              }
              <button (click)="cancelOrderModal(activeOrder()!.id)"
                class="px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-xl hover:bg-red-600">
                ✕ Cancel
              </button>
            </div>
          } @else {
            <p class="text-sm font-semibold text-gray-700 mb-3">Payment Method</p>
            <div class="grid grid-cols-3 gap-2 mb-3">
              @for (m of paymentMethods; track m.value) {
                <button (click)="paymentMethod = m.value"
                  class="py-3 rounded-xl text-sm font-semibold border-2 transition-all"
                  [class]="paymentMethod === m.value ? 'border-sage-500 bg-sage-50 text-sage-700' : 'border-gray-200 text-gray-600 hover:border-sage-300'">
                  {{ m.icon }}<br><span class="text-xs">{{ m.label }}</span>
                </button>
              }
            </div>
            @if (paymentMethod === 'room_charge') {
              <p class="text-xs text-gray-400 mb-3">⚠️ Ensure order is linked to a booking above.</p>
            }
            <div class="flex gap-2">
              <button (click)="showPayment = false" class="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Back</button>
              <button (click)="processPayment()" [disabled]="processingPayment()"
                class="flex-1 py-2.5 text-sm font-bold bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-50">
                {{ processingPayment() ? 'Processing…' : 'Confirm Payment' }}
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="px-5 py-4 border-t border-gray-100">
          <div class="flex items-center gap-2 text-emerald-600 font-medium text-sm">
            <span class="text-xl">✅</span> Order {{ activeOrder()!.status | titlecase }} · ₦{{ fmtKobo(+activeOrder()!.total_amount) }}
          </div>
        </div>
      }
    </div>
  </div>
}

<!-- ══ MAIN LAYOUT ════════════════════════════════════════════════════════ -->
<ui-page-header title="Bar & Restaurant" subtitle="Orders, kitchen display, tables and menu management">
  <div class="flex gap-2">
    <button (click)="openOrderBuilder()"
      class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700">
      + New Order
    </button>
  </div>
</ui-page-header>

<!-- Stats -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
  <div class="bg-white rounded-xl border border-gray-100 p-4">
    <p class="text-xs text-gray-500 mb-1">Active Orders</p>
    <p class="text-2xl font-bold text-sage-700">{{ orders().length }}</p>
    <p class="text-xs text-gray-400">in progress</p>
  </div>
  <div class="bg-white rounded-xl border border-gray-100 p-4">
    <p class="text-xs text-gray-500 mb-1">Kitchen Queue</p>
    <p class="text-2xl font-bold text-amber-600">{{ kitchenItemCount() }}</p>
    <p class="text-xs text-gray-400">pending items</p>
  </div>
  <div class="bg-white rounded-xl border border-gray-100 p-4">
    <p class="text-xs text-gray-500 mb-1">Tables</p>
    <p class="text-2xl font-bold text-gray-800">{{ availableTables() }}<span class="text-sm text-gray-400">/{{ tables().length }}</span></p>
    <p class="text-xs text-gray-400">available</p>
  </div>
  <div class="bg-white rounded-xl border border-gray-100 p-4">
    <p class="text-xs text-gray-500 mb-1">Revenue Today</p>
    <p class="text-xl font-bold text-emerald-600">₦{{ fmtKobo(todayRevenue()) }}</p>
    <p class="text-xs text-gray-400">from {{ closedToday() }} orders</p>
  </div>
</div>

<!-- Tabs -->
<div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
  @for (tab of tabs; track tab.id) {
    <button (click)="activeTab = tab.id; onTabChange(tab.id)"
      class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
      [class.bg-white]="activeTab === tab.id" [class.shadow-sm]="activeTab === tab.id"
      [class.text-sage-700]="activeTab === tab.id" [class.font-semibold]="activeTab === tab.id"
      [class.text-gray-500]="activeTab !== tab.id">
      {{ tab.label }}{{ tab.id === 'kitchen' && kitchenItemCount() > 0 ? ' ('+kitchenItemCount()+')' : '' }}
    </button>
  }
</div>

<ui-loading [loading]="loading()"></ui-loading>

<!-- ── ORDERS TAB ────────────────────────────────────────────────────── -->
@if (activeTab === 'orders' && !loading()) {
  @if (orders().length === 0) {
    <div class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <p class="text-4xl mb-3">🍴</p>
      <p class="font-medium text-gray-700">No active orders</p>
      <p class="text-sm text-gray-400 mt-1">Click «New Order» to start</p>
    </div>
  } @else {
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      @for (o of orders(); track o.id) {
        <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          (click)="openOrderDetail(o)">
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="font-bold text-gray-900">#{{ o.order_number }}</div>
              <div class="text-xs text-gray-400 mt-0.5">
                {{ o.order_type | titlecase }}
                @if (o.table_number) { · Table {{ o.table_number }} }
                @if (o.guest_name) { · {{ o.guest_name }} }
              </div>
            </div>
            <span class="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
              [style.background]="o.status_color + '20'" [style.color]="o.status_color">
              {{ o.status_label || o.status }}
            </span>
          </div>
          <div class="flex items-end justify-between">
            <div class="text-xs text-gray-400">{{ o.item_count || 0 }} item{{ o.item_count !== 1 ? 's' : '' }}</div>
            <div class="text-lg font-black text-gray-900">₦{{ fmtKobo(+o.total_amount) }}</div>
          </div>
          <!-- Quick actions -->
          <div class="flex gap-1.5 mt-3 pt-3 border-t border-gray-100" (click)="$event.stopPropagation()">
            <button (click)="sendToKitchen(o.id)"
              class="px-2.5 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 font-medium">
              📤 Kitchen
            </button>
            <button (click)="openOrderDetail(o)"
              class="px-2.5 py-1 bg-sage-600 text-white text-xs rounded-lg hover:bg-sage-700 font-medium">
              💳 Pay
            </button>
            @if (o.booking_id) {
              <button (click)="postToFolio(o.id)"
                class="px-2.5 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 font-medium">
                → Bill
              </button>
            }
            <button (click)="cancelOrderModal(o.id)"
              class="px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 font-medium ml-auto">
              ✕
            </button>
          </div>
        </div>
      }
    </div>
  }
}

<!-- ── KITCHEN TAB ────────────────────────────────────────────────────── -->
@if (activeTab === 'kitchen' && !loading()) {
  <div class="flex items-center justify-between mb-3">
    <p class="text-sm text-gray-500">Auto-refreshes every 30s</p>
    <button (click)="loadKitchen()" class="text-sm text-sage-600 hover:text-sage-700 font-medium">↻ Refresh now</button>
  </div>
  @if (kitchenQueue().length === 0) {
    <div class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <p class="text-4xl mb-3">👨‍🍳</p>
      <p class="font-medium text-gray-700">Kitchen queue is empty</p>
    </div>
  } @else {
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      @for (entry of kitchenQueue(); track entry.order.id) {
        <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <span class="font-bold text-gray-900">#{{ entry.order.order_number }}</span>
            <div class="text-xs text-gray-400">
              @if (entry.order.table_number) { Table {{ entry.order.table_number }} }
              @else if (entry.order.order_type === 'room_service') { 🛎 Room Service }
              @else { 🥡 Takeaway }
            </div>
          </div>
          <div class="space-y-2">
            @for (item of entry.items; track item.id) {
              <div class="flex items-center gap-2 py-2 border-t border-gray-50">
                <span class="text-sm font-medium text-gray-700 flex-1">{{ item.quantity }}× {{ item.product_name }}</span>
                @if (item.notes) { <span class="text-xs text-gray-400 italic">{{ item.notes }}</span> }
                @if (item.status === 'pending') {
                  <button (click)="updateItemStatus(entry.order.id, item.id, 'preparing')"
                    class="px-2.5 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium flex-shrink-0">Start</button>
                }
                @if (item.status === 'preparing') {
                  <button (click)="updateItemStatus(entry.order.id, item.id, 'ready')"
                    class="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex-shrink-0">Ready ✓</button>
                }
                @if (item.status === 'ready') {
                  <span class="px-2.5 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg font-medium flex-shrink-0">Ready ✓</span>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  }
}

<!-- ── TABLES TAB ─────────────────────────────────────────────────────── -->
@if (activeTab === 'tables' && !loading()) {
  <div class="flex justify-end mb-4">
    <button (click)="openTableModal()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700">+ Add Table</button>
  </div>
  <div class="bg-white rounded-xl border border-gray-100 p-5">
    <div class="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
      @for (s of ['available','occupied','reserved','inactive']; track s) {
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full inline-block" [style.background]="tableColor(s)"></span>{{ s | titlecase }}
        </span>
      }
    </div>
    @if (tables().length === 0) {
      <div class="py-10 text-center text-gray-400">
        <p class="text-4xl mb-3">🍽️</p>
        <p>No tables configured. Click «Add Table» to get started.</p>
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
          <div class="absolute inset-0 rounded-xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button (click)="openTableModal(t)" class="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-xs" title="Edit">✏️</button>
            <button (click)="deleteTable(t)" class="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-xs" title="Delete">🗑️</button>
          </div>
        </div>
      }
    </div>
  </div>
}

<!-- ── MENU MANAGEMENT TAB ────────────────────────────────────────────── -->
@if (activeTab === 'menu' && !loading()) {
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <!-- Categories -->
    <div class="bg-white rounded-xl border border-gray-100 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-700">Categories</h3>
        <button (click)="openCatForm()" class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">+ Add</button>
      </div>
      <div class="space-y-1.5">
        @for (cat of menuCats(); track cat.id) {
          <div class="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer"
            [class.bg-sage-50]="selectedMenuCat() === cat.id"
            (click)="selectedMenuCat.set(cat.id); loadProductsForCat(cat.id)">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ cat.name }}</p>
              <p class="text-xs text-gray-400">{{ cat.sort_order !== undefined ? 'Order '+cat.sort_order : '' }}</p>
            </div>
            <button (click)="$event.stopPropagation(); openCatForm(cat)"
              class="p-1 text-gray-400 hover:text-gray-700 rounded flex-shrink-0 text-xs">✏️</button>
            <button (click)="$event.stopPropagation(); deleteCat(cat)"
              class="p-1 text-gray-400 hover:text-red-600 rounded flex-shrink-0 text-xs">🗑️</button>
          </div>
        } @empty {
          <p class="text-xs text-gray-400 text-center py-4">No categories yet</p>
        }
      </div>
    </div>

    <!-- Products -->
    <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-700">
          Products{{ selectedMenuCat() ? ' — '+catName(selectedMenuCat()!) : ' (all)' }}
        </h3>
        <button (click)="openProductForm()" class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">+ Add Product</button>
      </div>
      <ui-loading [loading]="menuLoading()"></ui-loading>
      @if (!menuLoading()) {
        <div class="space-y-2">
          @for (p of catProducts(); track p.id) {
            <div class="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-medium text-gray-800">{{ p.name }}</p>
                  @if (!p.is_available) {
                    <span class="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">Unavailable</span>
                  }
                  @if (p.requires_kitchen) {
                    <span class="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">Kitchen</span>
                  }
                </div>
                @if (p.description) { <p class="text-xs text-gray-400 truncate mt-0.5">{{ p.description }}</p> }
              </div>
              <p class="text-sm font-bold text-sage-700 flex-shrink-0">₦{{ fmtKobo(+p.price) }}</p>
              <button (click)="openProductForm(p)" class="p-1.5 text-gray-400 hover:text-gray-700 flex-shrink-0 text-xs">✏️</button>
              <button (click)="deleteProduct(p)" class="p-1.5 text-gray-400 hover:text-red-600 flex-shrink-0 text-xs">🗑️</button>
            </div>
          } @empty {
            <div class="text-center py-6 text-gray-400 text-sm">
              {{ selectedMenuCat() ? 'No products in this category.' : 'Select a category to view products.' }}
            </div>
          }
        </div>
      }
    </div>
  </div>
}

<!-- ── ORDER HISTORY TAB ───────────────────────────────────────────────── -->
@if (activeTab === 'history' && !loading()) {
  <div class="flex flex-wrap gap-3 mb-4 items-center">
    <input [(ngModel)]="historyDateFrom" type="date" (change)="loadHistory()"
      class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
    <span class="text-gray-400 text-sm">to</span>
    <input [(ngModel)]="historyDateTo" type="date" (change)="loadHistory()"
      class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
    <select [(ngModel)]="historyStatus" (change)="loadHistory()"
      class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
      <option value="paid">Paid</option>
      <option value="cancelled">Cancelled</option>
      <option value="">All</option>
    </select>
    <div class="ml-auto bg-sage-50 border border-sage-200 px-4 py-2 rounded-xl text-sm">
      <span class="text-gray-500">Total: </span>
      <span class="font-bold text-sage-700">₦{{ fmtKobo(historyTotal()) }}</span>
    </div>
  </div>
  <ui-loading [loading]="historyLoading()"></ui-loading>
  @if (!historyLoading()) {
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">#</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Table / Guest</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Items</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Payment</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Time</th>
          </tr>
        </thead>
        <tbody>
          @for (o of historyOrders(); track o.id) {
            <tr class="border-t border-gray-50 hover:bg-gray-50">
              <td class="px-4 py-3 font-mono font-medium text-gray-700">#{{ o.order_number }}</td>
              <td class="px-4 py-3 capitalize text-gray-600">{{ o.order_type | titlecase }}</td>
              <td class="px-4 py-3 text-gray-500">{{ o.table_number ? 'Table '+o.table_number : (o.guest_name || '—') }}</td>
              <td class="px-4 py-3 text-gray-500">{{ o.item_count }}</td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">₦{{ fmtKobo(+o.total_amount) }}</td>
              <td class="px-4 py-3 capitalize text-gray-500">{{ o.payment_type || '—' }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  [class]="o.status==='paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'">
                  {{ o.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-400">{{ o.updated_at | date:'dd MMM HH:mm' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="px-4 py-10 text-center text-gray-400">No orders in this period</td></tr>
          }
        </tbody>
      </table>
    </div>
  }
}

<!-- ── TABLE MODAL ────────────────────────────────────────────────────── -->
@if (showTableForm) {
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" (click)="closeTableModal()"></div>
    <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
      <h3 class="text-base font-semibold text-gray-900 mb-4">{{ editingTable ? 'Edit Table' : 'Add Table' }}</h3>
      <div class="space-y-3">
        <div><label class="text-xs text-gray-500 mb-1 block">Table Number *</label>
          <input [(ngModel)]="tableForm.number" placeholder="e.g. T1, A3, Bar-1"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-gray-500 mb-1 block">Seats</label>
            <input [(ngModel)]="tableForm.seats" type="number" min="1" max="50"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></div>
          <div><label class="text-xs text-gray-500 mb-1 block">Section</label>
            <select [(ngModel)]="tableForm.section"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
              <option value="restaurant">Restaurant</option>
              <option value="bar">Bar</option>
              <option value="poolside">Poolside</option>
              <option value="terrace">Terrace</option>
              <option value="private">Private Dining</option>
              <option value="vip">VIP</option>
              <option value="rooftop">Rooftop</option>
            </select></div>
        </div>
        @if (editingTable) {
          <div><label class="text-xs text-gray-500 mb-1 block">Status</label>
            <select [(ngModel)]="tableForm.status"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="inactive">Inactive</option>
            </select></div>
        }
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button (click)="closeTableModal()" class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
        <button (click)="saveTable()" [disabled]="savingTable()"
          class="px-4 py-2 text-sm text-white bg-sage-600 rounded-xl hover:bg-sage-700 disabled:opacity-50">
          {{ savingTable() ? 'Saving…' : (editingTable ? 'Update' : 'Create') }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ── CATEGORY MODAL ─────────────────────────────────────────────────── -->
@if (showCatForm) {
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" (click)="showCatForm=false"></div>
    <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
      <h3 class="text-base font-semibold text-gray-900 mb-4">{{ editingCat ? 'Edit Category' : 'New Category' }}</h3>
      <div class="space-y-3">
        <div><label class="text-xs text-gray-500 mb-1 block">Name *</label>
          <input [(ngModel)]="catForm.name" placeholder="e.g. Main Course"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Icon (emoji)</label>
          <input [(ngModel)]="catForm.icon" placeholder="🍔"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Sort Order</label>
          <input [(ngModel)]="catForm.sort_order" type="number"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button (click)="showCatForm=false" class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
        <button (click)="saveCat()" class="px-4 py-2 text-sm text-white bg-sage-600 rounded-xl hover:bg-sage-700">{{ editingCat ? 'Update' : 'Create' }}</button>
      </div>
    </div>
  </div>
}

<!-- ── PRODUCT MODAL ───────────────────────────────────────────────────── -->
@if (showProductForm) {
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" (click)="showProductForm=false"></div>
    <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
      <h3 class="text-base font-semibold text-gray-900 mb-4">{{ editingProduct ? 'Edit Product' : 'New Product' }}</h3>
      <div class="space-y-3">
        <div><label class="text-xs text-gray-500 mb-1 block">Name *</label>
          <input [(ngModel)]="productForm.name" placeholder="e.g. Grilled Chicken"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea [(ngModel)]="productForm.description" rows="2"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></textarea></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-gray-500 mb-1 block">Price (₦) *</label>
            <input [(ngModel)]="productForm.price_naira" type="number" min="0" step="50" placeholder="0"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></div>
          <div><label class="text-xs text-gray-500 mb-1 block">Category</label>
            <select [(ngModel)]="productForm.category_id"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400">
              <option value="">None</option>
              @for (cat of menuCats(); track cat.id) { <option [value]="cat.id">{{ cat.name }}</option> }
            </select></div>
          <div><label class="text-xs text-gray-500 mb-1 block">Prep Time (mins)</label>
            <input [(ngModel)]="productForm.prep_time_minutes" type="number" min="0"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></div>
          <div><label class="text-xs text-gray-500 mb-1 block">Sort Order</label>
            <input [(ngModel)]="productForm.sort_order" type="number"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"></div>
        </div>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" [(ngModel)]="productForm.is_available" class="rounded"> Available
          </label>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" [(ngModel)]="productForm.requires_kitchen" class="rounded"> Needs Kitchen
          </label>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button (click)="showProductForm=false" class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
        <button (click)="saveProduct()" class="px-4 py-2 text-sm text-white bg-sage-600 rounded-xl hover:bg-sage-700">{{ editingProduct ? 'Update' : 'Create' }}</button>
      </div>
    </div>
  </div>
}
  `,
})
export class PosPage implements OnInit, OnDestroy {
  private api            = inject(ApiService);
  private activeProperty = inject(ActivePropertyService);
  private confirm        = inject(ConfirmDialogService);
  private toast          = inject(ToastService);

  // State
  loading         = signal(true);
  savingTable     = signal(false);
  placingOrder    = signal(false);
  processingPayment = signal(false);
  orderDetailLoading = signal(false);
  menuLoading     = signal(false);
  historyLoading  = signal(false);

  tables       = signal<any[]>([]);
  orders       = signal<any[]>([]);
  kitchenQueue = signal<any[]>([]);
  menuCats     = signal<any[]>([]);
  menuProducts = signal<any[]>([]);
  historyOrders = signal<any[]>([]);
  sectionPrices = signal<any[]>([]);
  orderItems   = signal<any[]>([]);

  activeOrder  = signal<any>(null);
  showOrderBuilder = signal(false);

  // Tabs
  readonly tabs = [
    { id: 'orders',  label: 'Active Orders' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'tables',  label: 'Tables' },
    { id: 'menu',    label: 'Menu' },
    { id: 'history', label: 'History' },
  ];
  activeTab = 'orders';

  // Order builder
  activeCat    = signal('');
  cart         = signal<any[]>([]);
  orderForm: any = { table_id: '', order_type: 'dine_in', guest_name: '', booking_id: '' };
  orderNote    = '';
  roomServiceSearch = '';
  checkedInResults  = signal<any[]>([]);
  private rsTimer: any;

  // Order detail / payment
  showPayment  = false;
  paymentMethod = 'cash';
  readonly paymentMethods = [
    { value: 'cash',        label: 'Cash',       icon: '💵' },
    { value: 'pos_card',    label: 'POS Card',   icon: '💳' },
    { value: 'bank_transfer',label: 'Transfer',  icon: '🏦' },
    { value: 'room_charge', label: 'Room Bill',  icon: '🏨' },
  ];

  // Table form
  showTableForm   = false;
  editingTable: any = null;
  tableForm: any  = { number: '', seats: 4, section: 'restaurant', status: 'available' };

  // Category form
  showCatForm    = false;
  editingCat: any = null;
  catForm: any   = { name: '', icon: '', sort_order: 0 };

  // Product form
  showProductForm    = false;
  editingProduct: any = null;
  productForm: any   = { name: '', description: '', price_naira: '', category_id: '', prep_time_minutes: 0, sort_order: 0, is_available: true, requires_kitchen: false };

  // Menu management
  selectedMenuCat = signal('');

  // History
  historyDateFrom = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  historyDateTo   = new Date().toISOString().slice(0, 10);
  historyStatus   = 'paid';

  // Auto-refresh
  private kitchenTimer: any;

  // Computed
  filteredProducts = computed(() => {
    const cat = this.activeCat();
    return cat ? this.menuProducts().filter(p => p.category_id === cat) : this.menuProducts();
  });
  catProducts = computed(() => {
    const cat = this.selectedMenuCat();
    return cat ? this.menuProducts().filter(p => p.category_id === cat) : [];
  });
  cartCount    = computed(() => this.cart().reduce((s, i) => s + i.quantity, 0));
  cartSubtotal = computed(() => this.cart().reduce((s, i) => s + (this.effectivePrice(i.product_id, i.price) * i.quantity), 0) / 100);
  availableTables = computed(() => this.tables().filter(t => t.status === 'available').length);
  kitchenItemCount = computed(() => this.kitchenQueue().reduce((s, e) => s + e.items.filter((i: any) => i.status !== 'ready').length, 0));
  historyTotal = computed(() => this.historyOrders().reduce((s, o) => s + (+o.total_amount || 0), 0));
  todayRevenue = computed(() => this.historyOrders().filter(o => o.status === 'paid').reduce((s, o) => s + (+o.total_amount || 0), 0));
  closedToday  = computed(() => this.historyOrders().filter(o => o.status === 'paid').length);

  get pid() { return this.activeProperty.propertyId(); }

  ngOnInit() { this.load(); this.startKitchenAutoRefresh(); }
  ngOnDestroy() { clearInterval(this.kitchenTimer); clearTimeout(this.rsTimer); }

  // ── Data loading ─────────────────────────────────────────────────────
  load() {
    this.loading.set(true);
    const pid = this.pid;
    this.api.get('/pos/tables',  { property_id: pid }).subscribe({ next: (r: any) => this.tables.set(r.data ?? []) });
    this.api.get('/pos/orders',  { property_id: pid, status: 'open' }).subscribe({ next: (r: any) => this.orders.set(r.data ?? []) });
    this.api.get('/pos/categories', { property_id: pid }).subscribe({ next: (r: any) => this.menuCats.set(r.data ?? []) });
    this.api.get('/pos/products',   { property_id: pid }).subscribe({ next: (r: any) => this.menuProducts.set(r.data ?? []) });
    this.loadKitchen();
    // Also load today's history for revenue stat
    const today = new Date().toISOString().slice(0, 10);
    this.api.get('/pos/orders', { property_id: pid, date_from: today, date_to: today }).subscribe({
      next: (r: any) => { this.historyOrders.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadKitchen() {
    this.api.get('/pos/kitchen/queue', { property_id: this.pid }).subscribe({
      next: (r: any) => this.kitchenQueue.set(r.data ?? []),
    });
  }

  loadHistory() {
    this.historyLoading.set(true);
    const params: any = { property_id: this.pid, date_from: this.historyDateFrom, date_to: this.historyDateTo };
    if (this.historyStatus) params.status = this.historyStatus;
    this.api.get('/pos/orders', params).subscribe({
      next: (r: any) => { this.historyOrders.set(r.data ?? []); this.historyLoading.set(false); },
      error: () => this.historyLoading.set(false),
    });
  }

  loadProductsForCat(catId: string) {
    this.menuLoading.set(true);
    this.api.get('/pos/products', { property_id: this.pid, category_id: catId }).subscribe({
      next: (r: any) => { this.menuProducts.update(all => { const others = all.filter(p => p.category_id !== catId); return [...others, ...(r.data ?? [])]; }); this.menuLoading.set(false); },
      error: () => this.menuLoading.set(false),
    });
  }

  setTab(id: string) { this.activeTab = id as Tab; }
  onTabChange(tab: string) {
    if (tab === 'history') this.loadHistory();
    if (tab === 'kitchen') this.loadKitchen();
  }

  startKitchenAutoRefresh() {
    this.kitchenTimer = setInterval(() => { if (this.activeTab === 'kitchen') this.loadKitchen(); }, 30000);
  }

  // ── Order builder ─────────────────────────────────────────────────────
  openOrderBuilder() {
    this.cart.set([]); this.orderNote = '';
    this.orderForm = { table_id: '', order_type: 'dine_in', guest_name: '', booking_id: '' };
    this.activeCat.set('');
    this.showOrderBuilder.set(true);
    this.loadSectionPrices();
  }

  closeOrderBuilder() { this.showOrderBuilder.set(false); this.cart.set([]); }

  onOrderTypeChange() { this.orderForm.booking_id = ''; this.orderForm.guest_name = ''; this.roomServiceSearch = ''; this.checkedInResults.set([]); }

  loadMenu() {
    this.menuLoading.set(true);
    this.api.get('/pos/categories', { property_id: this.pid }).subscribe({ next: (r: any) => this.menuCats.set(r.data ?? []) });
    this.api.get('/pos/products',   { property_id: this.pid }).subscribe({ next: (r: any) => { this.menuProducts.set(r.data ?? []); this.menuLoading.set(false); }, error: () => this.menuLoading.set(false) });
  }

  loadSectionPrices() {
    this.api.get('/pos/section-prices', { property_id: this.pid }).subscribe({ next: (r: any) => this.sectionPrices.set(r.data ?? []) });
  }

  searchCheckedIn() {
    clearTimeout(this.rsTimer);
    if (!this.roomServiceSearch.trim()) { this.checkedInResults.set([]); return; }
    this.rsTimer = setTimeout(() => {
      this.api.get('/bookings/checkout-tracker', { property_id: this.pid }).subscribe((r: any) => {
        const q = this.roomServiceSearch.toLowerCase();
        this.checkedInResults.set((r.data ?? []).filter((b: any) =>
          b.room_number?.toLowerCase().includes(q) || b.guest_name?.toLowerCase().includes(q)
        ).slice(0, 8));
      });
    }, 250);
  }

  selectRoomServiceGuest(b: any) { this.orderForm.booking_id = b.id; this.orderForm.guest_name = b.guest_name; this.roomServiceSearch = ''; this.checkedInResults.set([]); }

  effectivePrice(productId: string, defaultPrice: string): number {
    const tableId = this.orderForm.table_id;
    if (!tableId) return +defaultPrice;
    const table = this.tables().find(t => t.id === tableId);
    if (!table) return +defaultPrice;
    const sp = this.sectionPrices().find(s => s.product_id === productId && s.section === table.section);
    return sp ? +sp.price : +defaultPrice;
  }

  fmtKobo(kobo: number): string { return (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 }); }
  formatAmount(kobo: any): string { return this.fmtKobo(+kobo || 0); }

  getQty(pid: string) { return this.cart().find(i => i.product_id === pid)?.quantity ?? 0; }
  addToCart(p: any) { if (!p.is_available) { this.toast.error(p.name + ' is not available'); return; } this.cart.update(items => { const ex = items.find(i => i.product_id === p.id); if (ex) return items.map(i => i.product_id === p.id ? {...i, quantity: i.quantity+1} : i); return [...items, {product_id:p.id, name:p.name, price:p.price, quantity:1, note:''}]; }); }
  incQty(pid: string) { this.cart.update(items => items.map(i => i.product_id===pid ? {...i,quantity:i.quantity+1} : i)); }
  decQty(pid: string) { this.cart.update(items => items.map(i => i.product_id===pid ? {...i,quantity:i.quantity-1} : i).filter(i => i.quantity>0)); }
  removeFromCart(pid: string) { this.cart.update(items => items.filter(i => i.product_id!==pid)); }

  placeOrder() {
    if (!this.cart().length || this.placingOrder()) return;
    this.placingOrder.set(true);
    this.api.post('/pos/orders', { ...this.orderForm, notes: this.orderNote, property_id: this.pid }).subscribe({
      next: (r: any) => {
        if (!r.success && !r.data) { this.placingOrder.set(false); this.toast.error(r.message || 'Failed to create order'); return; }
        const orderId = r.data?.id;
        const addCalls = this.cart().map(item => this.api.post(`/pos/orders/${orderId}/items`, { product_id: item.product_id, quantity: item.quantity, notes: item.note || null }).toPromise());
        Promise.all(addCalls).then(() => {
          // Auto-send to kitchen for dine-in
          if (this.orderForm.order_type !== 'takeaway') {
            this.api.post(`/pos/orders/${orderId}/send-to-kitchen`, {}).subscribe({ error: () => {} });
          }
          // Auto-post to folio for room service
          if (this.orderForm.order_type === 'room_service' && this.orderForm.booking_id) {
            this.api.post(`/pos/orders/${orderId}/post-to-folio`, { booking_id: this.orderForm.booking_id }).subscribe({ error: () => {} });
          }
          this.placingOrder.set(false);
          this.toast.success(`Order #${r.data?.order_number} placed — ${this.cartCount()} items`);
          this.closeOrderBuilder();
          this.load();
        }).catch(() => {
          this.placingOrder.set(false);
          this.toast.error('Order created but some items failed to add');
          this.closeOrderBuilder(); this.load();
        });
      },
      error: (e: any) => { this.placingOrder.set(false); this.toast.error(e?.error?.message || 'Failed'); },
    });
  }

  // ── Order management ─────────────────────────────────────────────────
  openOrderDetail(order: any) {
    this.activeOrder.set(order);
    this.showPayment = false;
    this.paymentMethod = 'cash';
    this.orderDetailLoading.set(true);
    this.api.get(`/pos/orders/${order.id}/items`).subscribe({
      next: (r: any) => { this.orderItems.set(r.data?.items ?? r.data ?? []); this.orderDetailLoading.set(false); },
      error: () => this.orderDetailLoading.set(false),
    });
  }

  removeOrderItem(itemId: string) {
    const order = this.activeOrder();
    if (!order) return;
    this.api.post(`/pos/orders/${order.id}/items/${itemId}/remove`, {}).subscribe({
      next: () => { this.toast.success('Item removed'); this.openOrderDetail(order); this.load(); },
      error: () => this.toast.error('Failed to remove item'),
    });
  }

  sendToKitchen(orderId: string) {
    this.api.post(`/pos/orders/${orderId}/send-to-kitchen`, {}).subscribe({
      next: (r: any) => { if (r.success || r.data) { this.toast.success('Sent to kitchen'); this.load(); } else this.toast.error(r.message || 'Failed'); },
      error: () => this.toast.error('Failed to send to kitchen'),
    });
  }

  processPayment() {
    const order = this.activeOrder();
    if (!order || this.processingPayment()) return;
    this.processingPayment.set(true);
    this.api.post(`/pos/orders/${order.id}/pay`, { payment_type: this.paymentMethod, payment_method: this.paymentMethod }).subscribe({
      next: (r: any) => {
        this.processingPayment.set(false);
        if (r.success || r.data) {
          this.toast.success(`Payment recorded — ${this.paymentMethod.replace('_',' ')}`);
          this.activeOrder.set(null);
          this.load();
        } else this.toast.error(r.message || 'Payment failed');
      },
      error: (e: any) => { this.processingPayment.set(false); this.toast.error(e?.error?.message || 'Payment failed'); },
    });
  }

  postToFolio(orderId: string) {
    this.api.post(`/pos/orders/${orderId}/post-to-folio`, {}).subscribe({
      next: (r: any) => { if (r.success || r.data) { this.toast.success('Posted to guest folio'); this.load(); } else this.toast.error(r.message || 'Failed'); },
      error: () => this.toast.error('Failed to post to folio'),
    });
  }

  async cancelOrderModal(orderId: string) {
    const ok = await this.confirm.confirm({ title: 'Cancel Order', message: 'Cancel this order? This cannot be undone.', variant: 'warning' });
    if (!ok) return;
    this.api.post(`/pos/orders/${orderId}/cancel`, {}).subscribe({
      next: (r: any) => { if (r.success || r.data) { this.toast.success('Order cancelled'); this.activeOrder.set(null); this.load(); } else this.toast.error(r.message || 'Failed'); },
      error: () => this.toast.error('Failed to cancel'),
    });
  }

  updateItemStatus(orderId: string, itemId: string, status: string) {
    this.api.post(`/pos/orders/${orderId}/items/${itemId}/status`, { status }).subscribe({ next: () => this.loadKitchen() });
  }

  // ── Table CRUD ───────────────────────────────────────────────────────
  openTableModal(table?: any) { this.editingTable = table ?? null; this.tableForm = table ? { number:table.number, seats:table.seats, section:table.section, status:table.status } : { number:'', seats:4, section:'restaurant', status:'available' }; this.showTableForm = true; }
  closeTableModal() { this.showTableForm = false; this.editingTable = null; }
  tableColor(s: string) { const map: Record<string,string> = { available:'#22c55e', occupied:'#3b82f6', reserved:'#8b5cf6', inactive:'#9ca3af' }; return map[s] ?? '#6b7280'; }

  saveTable() {
    if (!this.tableForm.number?.trim()) { this.toast.error('Table number is required'); return; }
    if (this.savingTable()) return;
    this.savingTable.set(true);
    const req$ = this.editingTable ? this.api.put(`/pos/tables/${this.editingTable.id}`, this.tableForm) : this.api.post('/pos/tables', { ...this.tableForm, property_id: this.pid });
    req$.subscribe({
      next: (r: any) => { this.savingTable.set(false); if (r.success || r.data) { this.toast.success(this.editingTable ? 'Updated' : 'Table created'); this.closeTableModal(); this.load(); } else this.toast.error(r.message || 'Failed'); },
      error: (e: any) => { this.savingTable.set(false); this.toast.error(e?.error?.message || 'Failed'); },
    });
  }

  async deleteTable(table: any) {
    const ok = await this.confirm.confirm({ title: 'Delete Table', message: `Delete table "${table.number}"?`, variant: 'danger' });
    if (!ok) return;
    this.api.delete(`/pos/tables/${table.id}`).subscribe({ next: () => { this.toast.success('Deleted'); this.load(); } });
  }

  // ── Category CRUD ────────────────────────────────────────────────────
  catName(id: string) { return this.menuCats().find(c => c.id === id)?.name ?? ''; }
  openCatForm(cat?: any) { this.editingCat = cat ?? null; this.catForm = cat ? { name:cat.name, icon:cat.icon||'', sort_order:cat.sort_order||0 } : { name:'', icon:'', sort_order:0 }; this.showCatForm = true; }

  saveCat() {
    if (!this.catForm.name) { this.toast.error('Name required'); return; }
    const req$ = this.editingCat ? this.api.put(`/pos/categories/${this.editingCat.id}`, this.catForm) : this.api.post('/pos/categories', { ...this.catForm, property_id: this.pid });
    req$.subscribe({
      next: (r: any) => { if (r.success || r.data) { this.toast.success(this.editingCat ? 'Updated' : 'Category created'); this.showCatForm = false; this.load(); } else this.toast.error(r.message || 'Failed'); },
      error: (e: any) => this.toast.error(e?.error?.message || 'Failed'),
    });
  }

  async deleteCat(cat: any) {
    const ok = await this.confirm.confirm({ title: 'Delete Category', message: `Delete "${cat.name}"? Products will be uncategorised.`, variant: 'danger' });
    if (!ok) return;
    this.api.delete(`/pos/categories/${cat.id}`).subscribe({ next: () => { this.toast.success('Deleted'); this.load(); } });
  }

  // ── Product CRUD ─────────────────────────────────────────────────────
  openProductForm(prod?: any) {
    this.editingProduct = prod ?? null;
    this.productForm = prod
      ? { name:prod.name, description:prod.description||'', price_naira:(+prod.price/100).toString(), category_id:prod.category_id||'', prep_time_minutes:prod.prep_time_minutes||0, sort_order:prod.sort_order||0, is_available:prod.is_available!==false, requires_kitchen:!!prod.requires_kitchen }
      : { name:'', description:'', price_naira:'', category_id: this.selectedMenuCat() || '', prep_time_minutes:0, sort_order:0, is_available:true, requires_kitchen:false };
    this.showProductForm = true;
  }

  saveProduct() {
    if (!this.productForm.name || this.productForm.price_naira === '') { this.toast.error('Name and price required'); return; }
    const body = { ...this.productForm, price: String(Math.round(+this.productForm.price_naira * 100)), property_id: this.pid };
    delete body.price_naira;
    const req$ = this.editingProduct ? this.api.put(`/pos/products/${this.editingProduct.id}`, body) : this.api.post('/pos/products', body);
    req$.subscribe({
      next: (r: any) => { if (r.success || r.data) { this.toast.success(this.editingProduct ? 'Updated' : 'Product created'); this.showProductForm = false; this.load(); } else this.toast.error(r.message || 'Failed'); },
      error: (e: any) => this.toast.error(e?.error?.message || 'Failed'),
    });
  }

  async deleteProduct(prod: any) {
    const ok = await this.confirm.confirm({ title: 'Delete Product', message: `Delete "${prod.name}"?`, variant: 'danger' });
    if (!ok) return;
    this.api.delete(`/pos/products/${prod.id}`).subscribe({ next: () => { this.toast.success('Deleted'); this.load(); } });
  }

  selectedTableSection(): string | null { const t = this.tables().find(t => t.id === this.orderForm.table_id); return t?.section ?? null; }
}
