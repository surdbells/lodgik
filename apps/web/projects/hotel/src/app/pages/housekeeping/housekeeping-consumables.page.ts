import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, DecimalPipe } from '@angular/forms';
import { DecimalPipe as NgDecimalPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, BadgeComponent } from '@lodgik/shared';

interface Consumable { id: string; name: string; unit: string; expected_per_room: string; reorder_threshold: string; notes?: string; is_active: boolean; }
interface StoreRequest { id: string; requested_by_name: string; status: string; notes?: string; created_at: string; storekeeper_name?: string; admin_name?: string; items: any[]; }
interface Discrepancy  { id: string; consumable_name: string; period_start: string; period_end: string; expected_usage: string; actual_usage: string; variance: string; variance_pct: string; rooms_serviced: number; resolved: boolean; }

@Component({
  selector: 'app-housekeeping-consumables',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, NgDecimalPipe],
  template: `
    <ui-page-header title="Consumables" icon="inventory_2"
      [breadcrumbs]="['Housekeeping','Consumables']"
      subtitle="Manage housekeeping consumable stock, store requests, and discrepancy tracking">
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Tab bar -->
      <div class="flex gap-1 mb-5 border-b border-gray-200">
        @for (tab of tabs; track tab.key) {
          <button (click)="activeTab = tab.key"
            class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            [class.border-sage-600]="activeTab === tab.key"
            [class.text-sage-700]="activeTab === tab.key"
            [class.border-transparent]="activeTab !== tab.key"
            [class.text-gray-500]="activeTab !== tab.key">
            {{ tab.label }}
            @if (tab.key === 'discrepancies' && unresolvedCount() > 0) {
              <span class="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{{ unresolvedCount() }}</span>
            }
          </button>
        }
      </div>

      <!-- ══ CATALOGUE ══════════════════════════════════════════════════ -->
      @if (activeTab === 'catalogue') {
        <div class="flex justify-end mb-3">
          <button (click)="showCatForm = !showCatForm"
            class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">
            + Add Consumable
          </button>
        </div>

        @if (showCatForm) {
          <div class="bg-white rounded-xl border p-5 mb-4 shadow-sm">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">New Consumable</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div><label class="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                <input [(ngModel)]="catForm.name" placeholder="e.g. Toilet Paper" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
              <div><label class="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                <select [(ngModel)]="catForm.unit" class="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="piece">Piece</option><option value="roll">Roll</option><option value="pack">Pack</option>
                  <option value="litre">Litre</option><option value="kg">Kg</option><option value="bottle">Bottle</option>
                  <option value="bar">Bar</option><option value="sachet">Sachet</option>
                </select></div>
              <div><label class="block text-xs font-medium text-gray-500 mb-1">Expected per Room</label>
                <input type="number" min="0" step="0.5" [(ngModel)]="catForm.expected_per_room" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
              <div><label class="block text-xs font-medium text-gray-500 mb-1">Reorder at (qty)</label>
                <input type="number" min="0" [(ngModel)]="catForm.reorder_threshold" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
              <div class="sm:col-span-2 lg:col-span-4">
                <label class="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <input [(ngModel)]="catForm.notes" placeholder="Optional notes" class="w-full px-3 py-2 border rounded-lg text-sm">
              </div>
            </div>
            <div class="flex gap-3">
              <button (click)="createConsumable()" class="px-5 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Add</button>
              <button (click)="showCatForm = false" class="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        }

        <div class="bg-white rounded-xl border overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Unit</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">Per Room</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">Reorder At</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Notes</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              @for (c of consumables(); track c.id) {
                <tr class="border-b border-gray-50 hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium">{{ c.name }}</td>
                  <td class="px-4 py-3 text-gray-500 capitalize">{{ c.unit }}</td>
                  <td class="px-4 py-3 text-right">{{ c.expected_per_room }}</td>
                  <td class="px-4 py-3 text-right">{{ c.reorder_threshold }}</td>
                  <td class="px-4 py-3 text-gray-400 text-xs">{{ c.notes || '—' }}</td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="deleteConsumable(c.id)"
                      class="text-xs text-red-500 hover:underline">Deactivate</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No consumables configured</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ══ STORE REQUESTS ═════════════════════════════════════════════ -->
      @if (activeTab === 'requests') {
        <div class="flex justify-end mb-3">
          <button (click)="showReqForm = !showReqForm"
            class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">
            + New Request
          </button>
        </div>

        @if (showReqForm) {
          <div class="bg-white rounded-xl border p-5 mb-4 shadow-sm">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">New Store Request</h3>
            <div class="mb-3">
              <label class="block text-xs font-medium text-gray-500 mb-1">Your Name</label>
              <input [(ngModel)]="reqForm.requested_by_name" placeholder="Housekeeping Staff" class="w-full px-3 py-2 border rounded-lg text-sm max-w-xs">
            </div>
            <div class="mb-4">
              <label class="block text-xs font-medium text-gray-500 mb-2">Items Requested</label>
              @for (item of reqForm.items; track $index) {
                <div class="flex items-center gap-3 mb-2">
                  <select [(ngModel)]="item.consumable_id" class="flex-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="">Select item…</option>
                    @for (c of consumables(); track c.id) {
                      <option [value]="c.id">{{ c.name }} ({{ c.unit }})</option>
                    }
                  </select>
                  <input type="number" min="1" [(ngModel)]="item.quantity" placeholder="Qty"
                    class="w-24 px-3 py-2 border rounded-lg text-sm">
                  <button (click)="removeReqItem($index)"
                    class="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
                </div>
              }
              <button (click)="addReqItem()" class="text-xs text-sage-600 hover:underline mt-1">+ Add Item</button>
            </div>
            <div class="mb-4">
              <label class="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
              <input [(ngModel)]="reqForm.notes" placeholder="e.g. urgently needed for VIP rooms" class="w-full px-3 py-2 border rounded-lg text-sm">
            </div>
            <div class="flex gap-3">
              <button (click)="submitRequest()" class="px-5 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Submit Request</button>
              <button (click)="showReqForm = false" class="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        }

        <div class="space-y-3">
          @for (req of requests(); track req.id) {
            <div class="bg-white rounded-xl border p-4 shadow-sm">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <p class="text-sm font-semibold text-gray-800">{{ req.requested_by_name }}</p>
                  <p class="text-xs text-gray-400">{{ req.created_at | date:'dd MMM yyyy HH:mm' }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <ui-badge [variant]="reqStatusVariant(req.status)">{{ req.status | titlecase }}</ui-badge>
                </div>
              </div>

              <!-- Line items -->
              <div class="flex flex-wrap gap-2 mb-3">
                @for (item of req.items; track item.id) {
                  <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {{ item.consumable_name }}: {{ item.quantity_issued || item.quantity_req }} {{ item.unit }}
                  </span>
                }
              </div>

              <!-- Actions -->
              <div class="flex gap-2 flex-wrap">
                @if (req.status === 'pending') {
                  <button (click)="storekeeperApprove(req.id)"
                    class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    ✓ Storekeeper Approve
                  </button>
                  <button (click)="rejectRequest(req.id)"
                    class="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    Reject
                  </button>
                }
                @if (req.status === 'storekeeper_approved') {
                  <button (click)="adminApprove(req.id)"
                    class="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    ✓ Admin Approve
                  </button>
                  <button (click)="fulfillRequest(req.id)"
                    class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">
                    Mark Fulfilled
                  </button>
                }
                @if (req.status === 'admin_approved') {
                  <button (click)="fulfillRequest(req.id)"
                    class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">
                    Mark Fulfilled
                  </button>
                }
              </div>
            </div>
          } @empty {
            <div class="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
              No store requests yet
            </div>
          }
        </div>
      }

      <!-- ══ DISCREPANCIES ══════════════════════════════════════════════ -->
      @if (activeTab === 'discrepancies') {
        <div class="flex justify-between items-center mb-3">
          <p class="text-sm text-gray-500">Flagged when actual vs expected consumption varies by >20%</p>
          <div class="flex gap-2 items-center">
            <input type="date" [(ngModel)]="checkFrom" class="px-2 py-1.5 border rounded-lg text-sm">
            <span class="text-gray-400">to</span>
            <input type="date" [(ngModel)]="checkTo" class="px-2 py-1.5 border rounded-lg text-sm">
            <button (click)="runCheck()" [disabled]="runningCheck()"
              class="px-4 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 disabled:opacity-50">
              @if (runningCheck()) { Running… } @else { Run Check }
            </button>
          </div>
        </div>

        <div class="space-y-3">
          @for (d of discrepancies(); track d.id) {
            <div class="bg-white rounded-xl border p-4 shadow-sm" [class.opacity-60]="d.resolved">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-semibold text-gray-800">{{ d.consumable_name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    {{ d.period_start }} – {{ d.period_end }} ·
                    {{ d.rooms_serviced }} rooms serviced
                  </p>
                </div>
                <ui-badge [variant]="d.resolved ? 'success' : 'error'">
                  {{ d.resolved ? 'Resolved' : 'Flagged' }}
                </ui-badge>
              </div>

              <div class="grid grid-cols-3 gap-3 mt-3 mb-3">
                <div class="bg-gray-50 rounded-lg p-2.5">
                  <p class="text-xs text-gray-400">Expected</p>
                  <p class="text-sm font-semibold">{{ d.expected_usage }}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-2.5">
                  <p class="text-xs text-gray-400">Actual Used</p>
                  <p class="text-sm font-semibold">{{ d.actual_usage }}</p>
                </div>
                <div class="rounded-lg p-2.5"
                  [class.bg-red-50]="+d.variance > 0" [class.bg-amber-50]="+d.variance < 0">
                  <p class="text-xs text-gray-400">Variance</p>
                  <p class="text-sm font-bold" [class.text-red-600]="+d.variance > 0" [class.text-amber-600]="+d.variance < 0">
                    {{ +d.variance > 0 ? '+' : '' }}{{ d.variance }} ({{ d.variance_pct }}%)
                  </p>
                </div>
              </div>

              @if (!d.resolved) {
                <button (click)="resolveDiscrepancy(d.id)"
                  class="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Mark Resolved
                </button>
              }
            </div>
          } @empty {
            <div class="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
              No flagged discrepancies — run a check to detect anomalies
            </div>
          }
        </div>
      }
    }
  `,
})
export class HousekeepingConsumablesPage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  loading      = signal(true);
  consumables  = signal<Consumable[]>([]);
  requests     = signal<StoreRequest[]>([]);
  discrepancies = signal<Discrepancy[]>([]);
  runningCheck  = signal(false);

  unresolvedCount = () => this.discrepancies().filter((d: Discrepancy) => !d.resolved).length;

  activeTab = 'catalogue';
  tabs = [
    { key: 'catalogue',     label: '📦 Catalogue' },
    { key: 'requests',      label: '📋 Store Requests' },
    { key: 'discrepancies', label: '⚠️ Discrepancies' },
  ];

  showCatForm = false;
  catForm: any = { name: '', unit: 'piece', expected_per_room: 1, reorder_threshold: 10, notes: '' };

  showReqForm = false;
  reqForm: any = { requested_by_name: '', items: [{ consumable_id: '', quantity: 1 }], notes: '' };

  checkFrom = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  checkTo   = new Date().toISOString().split('T')[0];

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.api.get('/housekeeping/consumables').subscribe((r: any) => {
      this.consumables.set(r?.data || []);
      this.loading.set(false);
    });
    this.api.get('/housekeeping/store-requests').subscribe((r: any) => {
      this.requests.set(r?.data || []);
    });
    this.api.get('/housekeeping/discrepancies').subscribe((r: any) => {
      this.discrepancies.set(r?.data || []);
    });
  }

  createConsumable(): void {
    if (!this.catForm.name) { this.toast.error('Name is required'); return; }
    this.api.post('/housekeeping/consumables', this.catForm).subscribe((r: any) => {
      if (r?.success) {
        this.toast.success('Consumable added');
        this.showCatForm = false;
        this.catForm = { name: '', unit: 'piece', expected_per_room: 1, reorder_threshold: 10, notes: '' };
        this.api.get('/housekeeping/consumables').subscribe((r2: any) => this.consumables.set(r2?.data || []));
      } else this.toast.error(r?.message || 'Failed');
    });
  }

  deleteConsumable(id: string): void {
    if (!confirm('Deactivate this consumable?')) return;
    this.api.delete(`/housekeeping/consumables/${id}`).subscribe((r: any) => {
      if (r?.success) {
        this.toast.success('Deactivated');
        this.consumables.update(cs => cs.filter((c: Consumable) => c.id !== id));
      }
    });
  }

  addReqItem(): void { this.reqForm.items.push({ consumable_id: '', quantity: 1 }); }
  removeReqItem(i: number): void { this.reqForm.items.splice(i, 1); }

  submitRequest(): void {
    const validItems = this.reqForm.items.filter((i: any) => i.consumable_id && i.quantity > 0);
    if (!validItems.length) { this.toast.error('Add at least one item'); return; }
    const payload = { ...this.reqForm, items: validItems };
    this.api.post('/housekeeping/store-requests', payload).subscribe((r: any) => {
      if (r?.success) {
        this.toast.success('Request submitted');
        this.showReqForm = false;
        this.reqForm = { requested_by_name: '', items: [{ consumable_id: '', quantity: 1 }], notes: '' };
        this.api.get('/housekeeping/store-requests').subscribe((r2: any) => this.requests.set(r2?.data || []));
      } else this.toast.error(r?.message || 'Failed');
    });
  }

  storekeeperApprove(id: string): void {
    this.api.post(`/housekeeping/store-requests/${id}/storekeeper-approve`, { approver_name: 'Storekeeper' }).subscribe((r: any) => {
      if (r?.success) { this.toast.success('Approved by storekeeper'); this.refreshRequests(); }
      else this.toast.error(r?.message || 'Failed');
    });
  }

  adminApprove(id: string): void {
    this.api.post(`/housekeeping/store-requests/${id}/admin-approve`, { approver_name: 'Admin' }).subscribe((r: any) => {
      if (r?.success) { this.toast.success('Approved by admin'); this.refreshRequests(); }
      else this.toast.error(r?.message || 'Failed');
    });
  }

  rejectRequest(id: string): void {
    const reason = prompt('Reason for rejection?');
    if (!reason) return;
    this.api.post(`/housekeeping/store-requests/${id}/reject`, { reason }).subscribe((r: any) => {
      if (r?.success) { this.toast.success('Request rejected'); this.refreshRequests(); }
      else this.toast.error(r?.message || 'Failed');
    });
  }

  fulfillRequest(id: string): void {
    this.api.post(`/housekeeping/store-requests/${id}/fulfill`, {}).subscribe((r: any) => {
      if (r?.success) { this.toast.success('Marked as fulfilled'); this.refreshRequests(); }
      else this.toast.error(r?.message || 'Failed');
    });
  }

  refreshRequests(): void {
    this.api.get('/housekeeping/store-requests').subscribe((r: any) => this.requests.set(r?.data || []));
  }

  runCheck(): void {
    this.runningCheck.set(true);
    this.api.post('/housekeeping/discrepancies/run-check', { from: this.checkFrom, to: this.checkTo }).subscribe({
      next: (r: any) => {
        this.runningCheck.set(false);
        if (r?.success) {
          this.toast.success(`Check complete — ${r.data.flagged_count} discrepancy(ies) flagged`);
          this.api.get('/housekeeping/discrepancies').subscribe((r2: any) => this.discrepancies.set(r2?.data || []));
        } else this.toast.error(r?.message || 'Check failed');
      },
      error: () => { this.runningCheck.set(false); this.toast.error('Check failed'); },
    });
  }

  resolveDiscrepancy(id: string): void {
    const notes = prompt('Resolution notes (optional):');
    this.api.post(`/housekeeping/discrepancies/${id}/resolve`, { notes }).subscribe((r: any) => {
      if (r?.success) {
        this.toast.success('Marked as resolved');
        this.discrepancies.update(ds => ds.map((d: Discrepancy) => d.id === id ? { ...d, resolved: true } : d));
      } else this.toast.error(r?.message || 'Failed');
    });
  }

  reqStatusVariant(status: string): string {
    return { pending: 'warning', storekeeper_approved: 'info', admin_approved: 'info', fulfilled: 'success', rejected: 'error' }[status] ?? 'neutral';
  }
}
