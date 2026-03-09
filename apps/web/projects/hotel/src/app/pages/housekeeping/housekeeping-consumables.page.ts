import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, BadgeComponent, ActivePropertyService, AuthService,
  ConfirmDialogService, ConfirmDialogComponent,
} from '@lodgik/shared';

interface Consumable {
  id: string; name: string; unit: string;
  expected_per_room: string; reorder_threshold: string;
  notes?: string; is_active: boolean;
}
interface StoreRequest {
  id: string; requested_by_name: string; status: string;
  notes?: string; created_at: string;
  storekeeper_name?: string; admin_name?: string; items: any[];
}
interface Discrepancy {
  id: string; consumable_name: string; period_start: string; period_end: string;
  expected_usage: string; actual_usage: string; variance: string;
  variance_pct: string; rooms_serviced: number; resolved: boolean;
}

@Component({
  selector: 'app-housekeeping-consumables',
  standalone: true,
  imports: [
    FormsModule, DatePipe, DecimalPipe, TitleCasePipe,
    PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <ui-confirm-dialog/>
    <ui-page-header title="Consumables" icon="package"
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
            <h3 class="text-sm font-semibold text-gray-700 mb-4">{{ editingConsumable ? 'Edit Consumable' : 'New Consumable' }}</h3>
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
              <button (click)="saveConsumable()" [disabled]="savingConsumable()"
                class="px-5 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 disabled:opacity-50">
                {{ savingConsumable() ? 'Saving…' : (editingConsumable ? 'Save Changes' : 'Add') }}
              </button>
              <button (click)="cancelCatForm()" class="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
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
                    <div class="flex justify-end gap-3">
                      <button (click)="editConsumable(c)" class="text-xs text-sage-600 hover:underline">Edit</button>
                      <button (click)="deactivateConsumable(c.id)"
                        class="text-xs text-red-500 hover:underline">Deactivate</button>
                    </div>
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
              <button (click)="submitRequest()" [disabled]="submittingReq()"
                class="px-5 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 disabled:opacity-50">
                {{ submittingReq() ? 'Submitting…' : 'Submit Request' }}
              </button>
              <button (click)="showReqForm = false" class="px-5 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        }

        <!-- Reject reason inline modal -->
        @if (rejectingRequestId()) {
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
               (click)="rejectingRequestId.set(null)">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
              <h3 class="text-base font-semibold mb-3">Reject Request</h3>
              <label class="block text-xs font-medium text-gray-500 mb-1">Reason *</label>
              <textarea [(ngModel)]="rejectReason" rows="3" placeholder="Explain reason for rejection…"
                class="w-full px-3 py-2 border rounded-lg text-sm mb-4"></textarea>
              <div class="flex gap-2 justify-end">
                <button (click)="rejectingRequestId.set(null)"
                  class="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
                <button (click)="confirmReject()" [disabled]="!rejectReason.trim()"
                  class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">Reject</button>
              </div>
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
                  <button (click)="openReject(req.id)"
                    class="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    Reject
                  </button>
                }
                @if (req.status === 'storekeeper_approved') {
                  <button (click)="adminApprove(req.id)"
                    class="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    ✓ Admin Approve
                  </button>
                }
                @if (req.status === 'storekeeper_approved' || req.status === 'admin_approved') {
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
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-gray-500">Show:</label>
            <select [(ngModel)]="showResolved" (ngModelChange)="loadDiscrepancies()"
              class="px-2 py-1.5 border rounded-lg text-sm">
              <option [ngValue]="false">Unresolved only</option>
              <option [ngValue]="true">All (including resolved)</option>
            </select>
          </div>
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
        <p class="text-xs text-gray-400 mb-4">Flagged when actual vs expected consumption varies by &gt;20%</p>

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
                <ui-badge [variant]="d.resolved ? 'success' : 'danger'">
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
              No discrepancies found — run a check to detect anomalies
            </div>
          }
        </div>
      }
    }
  `,
})
export class HousekeepingConsumablesPage implements OnInit {
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);
  private auth           = inject(AuthService);
  private confirmSvc     = inject(ConfirmDialogService);

  loading       = signal(true);
  consumables   = signal<Consumable[]>([]);
  requests      = signal<StoreRequest[]>([]);
  discrepancies = signal<Discrepancy[]>([]);
  runningCheck  = signal(false);
  savingConsumable = signal(false);
  submittingReq    = signal(false);

  unresolvedCount = () => this.discrepancies().filter((d: Discrepancy) => !d.resolved).length;

  activeTab = 'catalogue';
  tabs = [
    { key: 'catalogue',     label: '📦 Catalogue' },
    { key: 'requests',      label: '📋 Store Requests' },
    { key: 'discrepancies', label: '⚠️ Discrepancies' },
  ];

  showCatForm       = false;
  editingConsumable: Consumable | null = null;
  catForm: any = { name: '', unit: 'piece', expected_per_room: 1, reorder_threshold: 10, notes: '' };

  showReqForm = false;
  reqForm: any = { items: [{ consumable_id: '', quantity: 1 }], notes: '' };

  // Reject modal
  rejectingRequestId = signal<string | null>(null);
  rejectReason = '';

  // Discrepancy filter
  showResolved = false;
  checkFrom = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  checkTo   = new Date().toISOString().split('T')[0];

  private get pid(): string { return this.activeProperty.propertyId(); }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.api.get('/housekeeping/consumables', { property_id: this.pid }).subscribe((r: any) => {
      this.consumables.set(r?.data || []);
      this.loading.set(false);
    });
    this.api.get('/housekeeping/store-requests', { property_id: this.pid }).subscribe((r: any) => {
      this.requests.set(r?.data || []);
    });
    this.loadDiscrepancies();
  }

  loadDiscrepancies(): void {
    const params: any = { property_id: this.pid };
    if (!this.showResolved) params.unresolved = 'true';
    this.api.get('/housekeeping/discrepancies', params).subscribe((r: any) => {
      this.discrepancies.set(r?.data || []);
    });
  }

  // ── Consumables CRUD ────────────────────────────────────────────────

  editConsumable(c: Consumable): void {
    this.editingConsumable = c;
    this.catForm = { name: c.name, unit: c.unit, expected_per_room: c.expected_per_room, reorder_threshold: c.reorder_threshold, notes: c.notes || '' };
    this.showCatForm = true;
  }

  cancelCatForm(): void {
    this.showCatForm = false;
    this.editingConsumable = null;
    this.catForm = { name: '', unit: 'piece', expected_per_room: 1, reorder_threshold: 10, notes: '' };
  }

  saveConsumable(): void {
    if (!this.catForm.name.trim()) { this.toast.error('Name is required'); return; }
    this.savingConsumable.set(true);

    const payload = { ...this.catForm, property_id: this.pid };

    if (this.editingConsumable) {
      this.api.put(`/housekeeping/consumables/${this.editingConsumable.id}`, payload).subscribe((r: any) => {
        this.savingConsumable.set(false);
        if (r?.success) {
          this.toast.success('Consumable updated');
          this.cancelCatForm();
          this.api.get('/housekeeping/consumables', { property_id: this.pid }).subscribe((r2: any) => this.consumables.set(r2?.data || []));
        } else this.toast.error(r?.message || 'Failed to update');
      });
    } else {
      this.api.post('/housekeeping/consumables', payload).subscribe((r: any) => {
        this.savingConsumable.set(false);
        if (r?.success) {
          this.toast.success('Consumable added');
          this.cancelCatForm();
          this.api.get('/housekeeping/consumables', { property_id: this.pid }).subscribe((r2: any) => this.consumables.set(r2?.data || []));
        } else this.toast.error(r?.message || 'Failed');
      });
    }
  }

  async deactivateConsumable(id: string): Promise<void> {
    const ok = await this.confirmSvc.confirm({
      title: 'Deactivate Consumable',
      message: 'This consumable will no longer appear in new store requests.',
      variant: 'warning',
    });
    if (!ok) return;
    this.api.delete(`/housekeeping/consumables/${id}`).subscribe((r: any) => {
      if (r?.success) {
        this.toast.success('Deactivated');
        this.consumables.update(cs => cs.filter((c: Consumable) => c.id !== id));
      } else this.toast.error(r?.message || 'Failed');
    });
  }

  // ── Store Requests ──────────────────────────────────────────────────

  addReqItem(): void { this.reqForm.items.push({ consumable_id: '', quantity: 1 }); }
  removeReqItem(i: number): void { this.reqForm.items.splice(i, 1); }

  submitRequest(): void {
    const validItems = this.reqForm.items.filter((i: any) => i.consumable_id && i.quantity > 0);
    if (!validItems.length) { this.toast.error('Add at least one item'); return; }

    this.submittingReq.set(true);
    const user = this.auth.currentUser;
    const requestedByName = user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email : 'Housekeeping';

    const payload = {
      property_id: this.pid,
      requested_by_name: requestedByName,
      items: validItems,
      notes: this.reqForm.notes || null,
    };

    this.api.post('/housekeeping/store-requests', payload).subscribe((r: any) => {
      this.submittingReq.set(false);
      if (r?.success) {
        this.toast.success('Request submitted');
        this.showReqForm = false;
        this.reqForm = { items: [{ consumable_id: '', quantity: 1 }], notes: '' };
        this.refreshRequests();
      } else this.toast.error(r?.message || 'Failed');
    });
  }

  storekeeperApprove(id: string): void {
    const user = this.auth.currentUser;
    const approverName = user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email : 'Storekeeper';
    this.api.post(`/housekeeping/store-requests/${id}/storekeeper-approve`, {
      approver_name: approverName,
    }).subscribe((r: any) => {
      if (r?.success) { this.toast.success('Approved by storekeeper'); this.refreshRequests(); }
      else this.toast.error(r?.message || 'Failed');
    });
  }

  adminApprove(id: string): void {
    const user = this.auth.currentUser;
    const approverName = user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email : 'Admin';
    this.api.post(`/housekeeping/store-requests/${id}/admin-approve`, {
      approver_name: approverName,
    }).subscribe((r: any) => {
      if (r?.success) { this.toast.success('Approved by admin'); this.refreshRequests(); }
      else this.toast.error(r?.message || 'Failed');
    });
  }

  openReject(id: string): void {
    this.rejectReason = '';
    this.rejectingRequestId.set(id);
  }

  confirmReject(): void {
    const id = this.rejectingRequestId();
    if (!id || !this.rejectReason.trim()) return;
    this.api.post(`/housekeeping/store-requests/${id}/reject`, { reason: this.rejectReason }).subscribe((r: any) => {
      this.rejectingRequestId.set(null);
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
    this.api.get('/housekeeping/store-requests', { property_id: this.pid }).subscribe((r: any) => this.requests.set(r?.data || []));
  }

  // ── Discrepancy Check ───────────────────────────────────────────────

  runCheck(): void {
    this.runningCheck.set(true);
    this.api.post('/housekeeping/discrepancies/run-check', {
      property_id: this.pid,
      from: this.checkFrom,
      to: this.checkTo,
    }).subscribe({
      next: (r: any) => {
        this.runningCheck.set(false);
        if (r?.success) {
          this.toast.success(`Check complete — ${r.data?.flagged_count ?? 0} discrepancy(ies) flagged`);
          this.loadDiscrepancies();
        } else this.toast.error(r?.message || 'Check failed');
      },
      error: () => { this.runningCheck.set(false); this.toast.error('Check failed'); },
    });
  }

  async resolveDiscrepancy(id: string): Promise<void> {
    const ok = await this.confirmSvc.confirm({
      title: 'Mark Resolved',
      message: 'Confirm this discrepancy has been investigated and resolved?',
      variant: 'info',
    });
    if (!ok) return;
    this.api.post(`/housekeeping/discrepancies/${id}/resolve`, { notes: null }).subscribe((r: any) => {
      if (r?.success) {
        this.toast.success('Marked as resolved');
        this.discrepancies.update(ds => ds.map((d: Discrepancy) => d.id === id ? { ...d, resolved: true } : d));
      } else this.toast.error(r?.message || 'Failed');
    });
  }

  reqStatusVariant(status: string): 'success'|'danger'|'warning'|'info'|'neutral'|'primary' {
    const map: Record<string, 'success'|'danger'|'warning'|'info'|'neutral'|'primary'> = {
      pending: 'warning', storekeeper_approved: 'info', admin_approved: 'primary',
      fulfilled: 'success', rejected: 'danger',
    };
    return map[status] ?? 'neutral';
  }
}
