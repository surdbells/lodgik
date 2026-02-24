import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Bar & Restaurant" subtitle="POS, table management, and kitchen display">
      <div class="flex gap-2">
        <button (click)="showTableForm = true" class="px-4 py-2 border rounded-lg text-sm">+ Add Table</button>
        <button (click)="showProductForm = true" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ New Order</button>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

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
                  <span class="text-xs px-2 py-0.5 rounded" [class]="item.status === 'ready' ? 'bg-green-100 text-green-700' : item.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'">{{ item.status }}</span>
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
  loading = signal(true);
  tables = signal<any[]>([]);
  orders = signal<any[]>([]);
  kitchenQueue = signal<any[]>([]);
  showTableForm = false;
  showProductForm = false;

  ngOnInit() { this.load(); }

  load() {
    const pid = this.auth.currentUser?.property_id || '';
    this.api.get(`/pos/tables?property_id=${pid}`).subscribe({ next: (r: any) => this.tables.set(r.data || []) });
    this.api.get(`/pos/orders?property_id=${pid}&limit=20`).subscribe({ next: (r: any) => this.orders.set((r.data || []).filter((o: any) => o.status !== 'paid' && o.status !== 'cancelled')) });
    this.api.get(`/pos/kitchen/queue?property_id=${pid}`).subscribe({
      next: (r: any) => { this.kitchenQueue.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  tableColor(status: string): string {
    return status === 'available' ? '#22c55e' : status === 'occupied' ? '#3b82f6' : status === 'reserved' ? '#8b5cf6' : '#6b7280';
  }

  formatAmount(kobo: any): string { return (+kobo / 100).toLocaleString('en-NG'); }
}
