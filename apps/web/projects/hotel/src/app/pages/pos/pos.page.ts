import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, AuthService, ActivePropertyService, ConfirmDialogService, ConfirmDialogComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, ConfirmDialogComponent],
  template: `
    <ui-confirm-dialog/>
    <ui-page-header title="Bar & Restaurant" subtitle="POS, table management, and kitchen display">
      <div class="flex gap-2">
        <button (click)="showTableForm = !showTableForm; showOrderForm = false" class="px-4 py-2 border rounded-lg text-sm">{{ showTableForm ? 'Cancel' : '+ Add Table' }}</button>
        <button (click)="showOrderForm = !showOrderForm; showTableForm = false" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">{{ showOrderForm ? 'Cancel' : '+ New Order' }}</button>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- Add Table Form -->
    @if (showTableForm) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Add Table</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input [(ngModel)]="tableForm.number" placeholder="Table number (e.g. T1)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="tableForm.seats" type="number" placeholder="Seats" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="tableForm.section" placeholder="Section (optional)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        </div>
        <div class="flex gap-2 mt-3">
          <button (click)="createTable()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">Create</button>
          <button (click)="showTableForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl">Cancel</button>
        </div>
      </div>
    }

    <!-- New Order Form -->
    @if (showOrderForm) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">New Order</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select [(ngModel)]="orderForm.table_id" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Select Table</option>
            @for (t of tables(); track t.id) { <option [value]="t.id">{{ t.number }} ({{ t.seats }} seats)</option> }
          </select>
          <select [(ngModel)]="orderForm.order_type" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="dine_in">Dine In</option><option value="takeaway">Takeaway</option><option value="room_service">Room Service</option>
          </select>
          <input [(ngModel)]="orderForm.guest_name" placeholder="Guest name (optional)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        </div>
        <div class="flex gap-2 mt-3">
          <button (click)="createOrder()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">Create Order</button>
          <button (click)="showOrderForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl">Cancel</button>
        </div>
      </div>
    }

    @if (!loading()) {
      <!-- Table Map -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Tables</h3>
        <div class="flex flex-wrap gap-3">
          @for (t of tables(); track t.id) {
            <div class="w-28 h-24 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:opacity-80 text-white" [style.background]="tableColor(t.status)">
              <div class="text-lg font-bold">{{ t.number }}</div>
              <div class="text-xs">{{ t.seats }} seats</div>
              <div class="text-xs opacity-75">{{ t.status }}</div>
            </div>
          }
        </div>
      </div>

      <!-- Active Orders -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Active Orders</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (o of orders(); track o.id) {
            <div class="bg-white border rounded-lg p-4">
              <div class="flex justify-between items-center mb-2">
                <div class="font-bold">{{ o.order_number }}</div>
                <span class="text-xs px-2 py-1 rounded" [style.background]="o.status_color + '20'" [style.color]="o.status_color">{{ o.status_label }}</span>
              </div>
              <div class="text-sm text-gray-500">Table: {{ o.table_number || 'N/A' }} · {{ o.order_type }}</div>
              <div class="text-sm text-gray-500">{{ o.item_count }} items</div>
              <div class="text-lg font-bold mt-2">₦{{ formatAmount(o.total_amount) }}</div>
              @if (o.guest_name) { <div class="text-xs text-gray-400">Guest: {{ o.guest_name }}</div> }
              <!-- Order Actions -->
              <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                <button (click)="closeOrder(o.id)" class="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700">✓ Close</button>
                @if (o.booking_id) {
                  <button (click)="postToFolio(o.id)" class="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">→ Folio</button>
                }
                <button (click)="cancelOrder(o.id)" class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">✕ Cancel</button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Kitchen Queue -->
      <div>
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Kitchen Queue</h3>
        <div class="space-y-2">
          @for (entry of kitchenQueue(); track entry.order.id) {
            <div class="bg-white border rounded-lg p-3">
              <div class="flex justify-between items-center mb-2">
                <span class="font-bold">#{{ entry.order.order_number }}</span>
                <span class="text-xs text-gray-400">Table {{ entry.order.table_number || 'N/A' }}</span>
              </div>
              @for (item of entry.items; track item.id) {
                <div class="flex justify-between items-center text-sm py-1">
                  <span>{{ item.quantity }}x {{ item.product_name }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-0.5 rounded" [class]="item.status === 'ready' ? 'bg-green-100 text-green-700' : item.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'">{{ item.status }}</span>
                    @if (item.status === 'pending') {
                      <button (click)="updateItemStatus(entry.order.id, item.id, 'preparing')" class="px-1.5 py-0.5 text-[10px] bg-yellow-500 text-white rounded">Start</button>
                    }
                    @if (item.status === 'preparing') {
                      <button (click)="updateItemStatus(entry.order.id, item.id, 'ready')" class="px-1.5 py-0.5 text-[10px] bg-green-600 text-white rounded">Ready</button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class PosPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  loading = signal(true);
  tables = signal<any[]>([]);
  orders = signal<any[]>([]);
  kitchenQueue = signal<any[]>([]);
  showTableForm = false;
  showOrderForm = false;
  tableForm: any = { number: '', seats: 4, section: '' };
  orderForm: any = { table_id: '', order_type: 'dine_in', guest_name: '' };

  ngOnInit() { this.load(); }

  load() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/pos/tables?property_id=${pid}`).subscribe({ next: (r: any) => this.tables.set(r.data || []) });
    this.api.get(`/pos/orders?property_id=${pid}&limit=20`).subscribe({ next: (r: any) => this.orders.set((r.data || []).filter((o: any) => o.status !== 'paid' && o.status !== 'cancelled')) });
    this.api.get(`/pos/kitchen/queue?property_id=${pid}`).subscribe({
      next: (r: any) => { this.kitchenQueue.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createTable(): void {
    const pid = this.activeProperty.propertyId();
    this.api.post('/pos/tables', { ...this.tableForm, property_id: pid }).subscribe((r: any) => {
      if (r.success) { this.showTableForm = false; this.tableForm = { number: '', seats: 4, section: '' }; this.load(); }
    });
  }

  createOrder(): void {
    const pid = this.activeProperty.propertyId();
    this.api.post('/pos/orders', { ...this.orderForm, property_id: pid }).subscribe((r: any) => {
      if (r.success) { this.showOrderForm = false; this.orderForm = { table_id: '', order_type: 'dine_in', guest_name: '' }; this.load(); }
    });
  }

  tableColor(status: string): string {
    return status === 'available' ? '#22c55e' : status === 'occupied' ? '#3b82f6' : status === 'reserved' ? '#8b5cf6' : '#6b7280';
  }

  formatAmount(kobo: any): string { return (+kobo / 100).toLocaleString('en-NG'); }

  closeOrder(orderId: string): void {
    this.api.post(`/pos/orders/${orderId}/close`, {}).subscribe((r: any) => {
      if (r.success) this.load(); else this.toast.error(r.message || 'Failed to close order');
    });
  }

  async cancelOrder(orderId: string): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Cancel Order', message: 'Cancel this order? This cannot be undone.', variant: 'warning' });
    if (!ok) return;
    this.api.post(`/pos/orders/${orderId}/cancel`, {}).subscribe((r: any) => {
      if (r.success) this.load(); else this.toast.error(r.message || 'Failed to cancel order');
    });
  }

  postToFolio(orderId: string): void {
    this.api.post(`/pos/orders/${orderId}/post-to-folio`, {}).subscribe((r: any) => {
      if (r.success) this.load(); else this.toast.error(r.message || 'Failed to post to folio');
    });
  }

  updateItemStatus(orderId: string, itemId: string, status: string): void {
    this.api.post(`/pos/orders/${orderId}/items/${itemId}/status`, { status }).subscribe((r: any) => {
      if (r.success) this.load();
    });
  }
}
