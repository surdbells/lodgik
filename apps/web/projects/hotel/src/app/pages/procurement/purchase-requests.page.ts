import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, ActivePropertyService
} from '@lodgik/shared';
import { Router } from '@angular/router';

interface PrLine {
  item_id: string;
  item_sku: string;
  item_name: string;
  quantity: number | null;
  unit_of_measure: string;
  estimated_unit_cost: number | null;  // ₦ (not kobo) for form display
  notes: string;
}

interface StockItem { id: string; sku: string; name: string; }

interface PurchaseRequest {
  id: string;
  reference_number: string;
  title: string;
  property_id: string;
  status: string;
  priority: string;
  priority_label: string;
  priority_color: string;
  required_by_date: string | null;
  notes: string | null;
  requested_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  total_estimated_value: string;
  line_count: number;
  po_id: string | null;
  created_at: string;
}

const blankLine = (): PrLine => ({
  item_id: '', item_sku: '', item_name: '', quantity: null,
  unit_of_measure: '', estimated_unit_cost: null, notes: '',
});

@Component({
  selector: 'app-purchase-requests',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
<ui-page-header
  title="Purchase Requests"
  icon="clipboard-list"
  [breadcrumbs]="['Procurement', 'Purchase Requests']"
  subtitle="Raise and approve purchase requisitions">
  <button (click)="openCreate()"
    class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors">
    + New Request
  </button>
</ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
<div class="px-6 max-w-6xl">

  <!-- Filter bar -->
  <div class="flex flex-wrap gap-3 mb-5">
    @for (s of statusTabs; track s.key) {
      <button (click)="filterStatus = s.key; load()"
        [class]="filterStatus === s.key
          ? 'px-3 py-1.5 text-sm rounded-lg bg-sage-600 text-white font-medium'
          : 'px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50'">
        {{ s.label }}
      </button>
    }
    <span class="ml-auto text-sm text-gray-500 self-center">{{ total() }} request(s)</span>
  </div>

  <!-- Table -->
  @if (requests().length === 0) {
    <div class="text-center py-16 text-gray-400">
      <p class="text-lg">No purchase requests found</p>
      <p class="text-sm mt-1">{{ filterStatus ? 'Try a different status filter' : 'Create your first request' }}</p>
    </div>
  } @else {
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Reference</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Title</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Priority</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Est. Value</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Requested By</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Date</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (pr of requests(); track pr.id) {
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ pr.reference_number }}</td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800">{{ pr.title }}</p>
                @if (pr.required_by_date) {
                  <p class="text-xs text-gray-400">Needed by {{ formatDate(pr.required_by_date) }}</p>
                }
              </td>
              <td class="px-4 py-3">
                <span [class]="priorityClass(pr.priority)">{{ pr.priority_label }}</span>
              </td>
              <td class="px-4 py-3">
                <span [class]="statusClass(pr.status)">{{ statusLabel(pr.status) }}</span>
              </td>
              <td class="px-4 py-3 text-right font-medium text-gray-800">
                {{ formatValue(pr.total_estimated_value) }}
              </td>
              <td class="px-4 py-3 text-gray-600">{{ pr.requested_by_name }}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{ formatDate(pr.created_at) }}</td>
              <td class="px-4 py-3 text-right">
                <button (click)="openDetail(pr)"
                  class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                  View
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <!-- Pagination -->
      @if (lastPage() > 1) {
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <button (click)="changePage(page() - 1)" [disabled]="page() === 1"
            class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
          <span class="text-sm text-gray-500">Page {{ page() }} of {{ lastPage() }}</span>
          <button (click)="changePage(page() + 1)" [disabled]="page() === lastPage()"
            class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
        </div>
      }
    </div>
  }
</div>
}

<!-- ── Detail Drawer ──────────────────────────────────────────────── -->
@if (detailPr()) {
<div class="fixed inset-0 z-40 flex">
  <div class="flex-1 bg-black/30" (click)="closeDetail()"></div>
  <div class="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto">

    <div class="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
      <div>
        <p class="font-mono text-xs text-gray-400">{{ detailPr()!.reference_number }}</p>
        <h2 class="font-semibold text-gray-800 mt-1">{{ detailPr()!.title }}</h2>
      </div>
      <button (click)="closeDetail()" class="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0">×</button>
    </div>

    <!-- Status badges + quick actions -->
    <div class="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
      <span [class]="statusClass(detailPr()!.status)">{{ statusLabel(detailPr()!.status) }}</span>
      <span [class]="priorityClass(detailPr()!.priority)">{{ detailPr()!.priority_label }}</span>

      @if (detailPr()!.status === 'draft' || detailPr()!.status === 'rejected') {
        <button (click)="submitPr(detailPr()!.id)" [disabled]="actioning()"
          class="ml-auto px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
          Submit for Approval
        </button>
      }
      @if (detailPr()!.status === 'submitted') {
        <button (click)="approvePr(detailPr()!.id)" [disabled]="actioning()"
          class="ml-auto px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">
          Approve
        </button>
        <button (click)="openReject(detailPr()!.id)" [disabled]="actioning()"
          class="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
          Reject
        </button>
      }
      @if (detailPr()!.status === 'approved') {
        <button (click)="router.navigate(['/procurement/orders/new'], {queryParams: {request_id: detailPr()!.id}})"
          class="ml-auto px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">
          Create PO →
        </button>
      }
      @if (['draft','submitted','approved'].includes(detailPr()!.status)) {
        <button (click)="cancelPr(detailPr()!.id)" [disabled]="actioning()"
          class="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-60">
          Cancel
        </button>
      }
    </div>

    <!-- Reject reason input (inline) -->
    @if (showRejectInput()) {
      <div class="px-6 py-3 bg-red-50 border-b border-red-200">
        <label class="block text-xs text-red-600 font-medium mb-1">Rejection Reason <span class="text-red-500">*</span></label>
        <textarea [(ngModel)]="rejectReason" rows="2" placeholder="Explain why this request is being rejected…"
          class="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"></textarea>
        <div class="flex gap-2 mt-2">
          <button (click)="confirmReject()" [disabled]="actioning() || !rejectReason.trim()"
            class="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
            Confirm Rejection
          </button>
          <button (click)="showRejectInput.set(false); rejectReason = ''"
            class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    }

    <!-- Meta grid -->
    <div class="px-6 py-4 grid grid-cols-2 gap-3 text-sm border-b border-gray-100">
      <div>
        <p class="text-xs text-gray-400">Requested By</p>
        <p class="font-medium">{{ detailPr()!.requested_by_name }}</p>
      </div>
      <div>
        <p class="text-xs text-gray-400">Date</p>
        <p class="font-medium">{{ formatDate(detailPr()!.created_at) }}</p>
      </div>
      @if (detailPr()!.required_by_date) {
        <div>
          <p class="text-xs text-gray-400">Required By</p>
          <p class="font-medium">{{ formatDate(detailPr()!.required_by_date!) }}</p>
        </div>
      }
      @if (detailPr()!.approved_by_name) {
        <div>
          <p class="text-xs text-gray-400">{{ detailPr()!.status === 'rejected' ? 'Rejected By' : 'Approved By' }}</p>
          <p class="font-medium">{{ detailPr()!.approved_by_name }}</p>
        </div>
      }
      <div>
        <p class="text-xs text-gray-400">Est. Total Value</p>
        <p class="font-semibold text-gray-800">{{ formatValue(detailPr()!.total_estimated_value) }}</p>
      </div>
      <div>
        <p class="text-xs text-gray-400">Lines</p>
        <p class="font-medium">{{ detailPr()!.line_count }}</p>
      </div>
      @if (detailPr()!.rejection_reason) {
        <div class="col-span-2 bg-red-50 rounded-lg p-3">
          <p class="text-xs text-red-500 font-medium mb-1">Rejection Reason</p>
          <p class="text-sm text-red-700">{{ detailPr()!.rejection_reason }}</p>
        </div>
      }
      @if (detailPr()!.notes) {
        <div class="col-span-2">
          <p class="text-xs text-gray-400">Notes</p>
          <p class="text-sm">{{ detailPr()!.notes }}</p>
        </div>
      }
    </div>

    <!-- Line items -->
    <div class="px-6 py-4">
      <p class="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wide">Requested Items</p>
      <ui-loading [loading]="loadingLines()"></ui-loading>
      @if (!loadingLines()) {
        @if (detailLines().length === 0) {
          <p class="text-sm text-gray-400 italic">No line items found</p>
        }
        @for (line of detailLines(); track line.id) {
          <div class="border border-gray-100 rounded-lg p-3 mb-2">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-medium text-sm">{{ line.item_name }}</p>
                <p class="font-mono text-xs text-gray-400">{{ line.item_sku }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium">{{ line.quantity }} {{ line.unit_of_measure }}</p>
                @if (+line.estimated_unit_cost > 0) {
                  <p class="text-xs text-gray-400">≈ {{ formatValue(line.estimated_line_value) }}</p>
                }
              </div>
            </div>
            @if (line.notes) { <p class="text-xs text-gray-400 mt-1">{{ line.notes }}</p> }
          </div>
        }
      }
    </div>
  </div>
</div>
}

<!-- ── Create Form Modal ──────────────────────────────────────────── -->
@if (showCreate()) {
<div class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 px-4">
  <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="font-semibold text-gray-800">New Purchase Request</h2>
      <button (click)="closeCreate()" class="text-gray-400 hover:text-gray-600 text-xl">×</button>
    </div>
    <div class="px-6 py-5 space-y-4">

      <!-- Title + priority -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-xs text-gray-500 font-medium mb-1">Title <span class="text-red-500">*</span></label>
          <input type="text" [(ngModel)]="createForm.title" placeholder="e.g. Bar restocking for December events"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
        </div>
        <div>
          <label class="block text-xs text-gray-500 font-medium mb-1">Priority</label>
          <select [(ngModel)]="createForm.priority"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <!-- Dates + names -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-gray-500 font-medium mb-1">Required By Date</label>
          <input type="date" [(ngModel)]="createForm.required_by_date"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
        </div>
        <div>
          <label class="block text-xs text-gray-500 font-medium mb-1">Your Name</label>
          <input type="text" [(ngModel)]="createForm.requested_by_name" placeholder="Your full name"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Notes</label>
        <textarea [(ngModel)]="createForm.notes" rows="2" placeholder="Context or justification…"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"></textarea>
      </div>

      <!-- Line items -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-gray-700">Items Requested</p>
          <button (click)="addLine()"
            class="px-3 py-1.5 text-xs bg-sage-50 text-sage-700 rounded-lg hover:bg-sage-100">+ Add Item</button>
        </div>

        @if (createLines().length === 0) {
          <p class="text-sm text-gray-400 italic text-center py-4">Add at least one item</p>
        }
        @for (line of createLines(); track $index; let i = $index) {
          <div class="border border-gray-200 rounded-lg p-3 mb-2">
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">

              <!-- Item search -->
              <div class="sm:col-span-2">
                <label class="block text-xs text-gray-400 mb-1">Item <span class="text-red-400">*</span></label>
                @if (!line.item_id) {
                  <input type="text" [(ngModel)]="lineSearch[i]" (ngModelChange)="onLineSearch(i)"
                    placeholder="Search by name or SKU…"
                    class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
                  @if ((lineResults[i] ?? []).length > 0) {
                    <div class="border border-gray-200 rounded-lg mt-1 max-h-32 overflow-y-auto bg-white shadow-sm">
                      @for (si of lineResults[i]; track si.id) {
                        <button type="button" (click)="selectItem(i, si)"
                          class="w-full text-left px-3 py-1.5 text-sm hover:bg-sage-50 flex gap-2">
                          <span class="font-mono text-xs text-gray-400">{{ si.sku }}</span>
                          <span>{{ si.name }}</span>
                        </button>
                      }
                    </div>
                  }
                } @else {
                  <div class="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-sage-50">
                    <span class="flex-1 text-gray-700">{{ line.item_name }}</span>
                    <button type="button" (click)="clearItem(i)" class="text-xs text-gray-400 hover:text-red-500">✕</button>
                  </div>
                }
              </div>

              <!-- Quantity -->
              <div>
                <label class="block text-xs text-gray-400 mb-1">Qty <span class="text-red-400">*</span></label>
                <input type="number" [(ngModel)]="line.quantity" min="0.001" step="0.001" placeholder="0"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
              </div>

              <!-- Est. unit cost -->
              <div>
                <label class="block text-xs text-gray-400 mb-1">Est. Cost (₦)</label>
                <input type="number" [(ngModel)]="line.estimated_unit_cost" min="0" step="0.01" placeholder="0.00"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
              </div>
            </div>

            <!-- Notes + remove -->
            <div class="flex gap-2 mt-2">
              <input type="text" [(ngModel)]="line.notes" placeholder="Notes (optional)"
                class="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sage-500">
              <button type="button" (click)="removeLine(i)"
                class="px-2 py-1.5 text-red-500 border border-red-200 rounded-lg text-xs hover:bg-red-50">Remove</button>
            </div>
          </div>
        }
      </div>

      <!-- Total estimate -->
      @if (createLines().length > 0) {
        <div class="flex justify-end">
          <p class="text-sm text-gray-500">Est. Total: <span class="font-bold text-gray-800 ml-1">{{ createTotal() }}</span></p>
        </div>
      }
    </div>

    <div class="px-6 pb-5 flex gap-3">
      <button (click)="submitCreate()" [disabled]="creating()"
        class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-60 transition-colors">
        {{ creating() ? 'Saving…' : 'Create Request' }}
      </button>
      <button (click)="closeCreate()"
        class="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
        Cancel
      </button>
    </div>
  </div>
</div>
}
  `,
})
export class PurchaseRequestsPage implements OnInit {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private propSvc = inject(ActivePropertyService);
  router          = inject(Router);

  loading      = signal(true);
  actioning    = signal(false);
  creating     = signal(false);
  loadingLines = signal(false);
  showCreate   = signal(false);
  showRejectInput = signal(false);

  requests   = signal<PurchaseRequest[]>([]);
  total      = signal(0);
  page       = signal(1);
  lastPage   = signal(1);
  detailPr   = signal<PurchaseRequest | null>(null);
  detailLines = signal<any[]>([]);
  stockItems = signal<StockItem[]>([]);

  filterStatus = '';
  rejectReason = '';
  rejectingId  = '';

  createForm = {
    title: '', priority: 'normal', required_by_date: '',
    requested_by_name: '', notes: '',
  };
  createLines  = signal<PrLine[]>([]);
  lineSearch: string[] = [];
  lineResults: StockItem[][] = [];

  createTotal = computed(() => {
    const kobo = this.createLines().reduce((sum, l) => {
      const qty  = l.quantity ?? 0;
      const cost = (l.estimated_unit_cost ?? 0) * 100; // ₦ → kobo
      return sum + qty * cost;
    }, 0);
    return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  });

  statusTabs = [
    { key: '',           label: 'All' },
    { key: 'draft',      label: 'Draft' },
    { key: 'submitted',  label: 'Pending Approval' },
    { key: 'approved',   label: 'Approved' },
    { key: 'rejected',   label: 'Rejected' },
    { key: 'converted',  label: 'Converted' },
    { key: 'cancelled',  label: 'Cancelled' },
  ];

  ngOnInit() {
    this.loadStockItems();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const pid = this.propSvc.propertyId();
    const params: any = { page: this.page(), per_page: 30 };
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (pid) params['property_id'] = pid;

    this.api.get('/procurement/requests', params).subscribe({
      next: r => {
        this.requests.set(r.data ?? []);
        this.total.set(r.meta?.total ?? 0);
        this.lastPage.set(r.meta?.pages ?? 1);
        this.loading.set(false);
      },
      error: () => { this.toast.error('Failed to load purchase requests'); this.loading.set(false); },
    });
  }

  loadStockItems(): void {
    this.api.get('/inventory/items', { per_page: 500, active_only: true }).subscribe({
      next: r => this.stockItems.set(r.data ?? []),
      error: () => {},
    });
  }

  changePage(p: number): void { this.page.set(p); this.load(); }

  openDetail(pr: PurchaseRequest): void {
    this.detailPr.set(pr);
    this.showRejectInput.set(false);
    this.rejectReason = '';
    this.loadLines(pr.id);
  }
  closeDetail(): void { this.detailPr.set(null); this.detailLines.set([]); }

  loadLines(prId: string): void {
    this.loadingLines.set(true);
    this.api.get(`/procurement/requests/${prId}`).subscribe({
      next: r => { this.detailLines.set(r.data?.lines ?? []); this.loadingLines.set(false); },
      error: () => { this.loadingLines.set(false); },
    });
  }

  // ── Actions ─────────────────────────────────────────────────────

  submitPr(id: string): void {
    this.actioning.set(true);
    this.api.post(`/procurement/requests/${id}/submit`, {}).subscribe({
      next: r => {
        this.toast.success('Request submitted for approval');
        this.detailPr.set(r.data);
        this.actioning.set(false);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed'); this.actioning.set(false); },
    });
  }

  approvePr(id: string): void {
    this.actioning.set(true);
    this.api.post(`/procurement/requests/${id}/approve`, { approver_name: 'Manager' }).subscribe({
      next: r => {
        this.toast.success('Request approved');
        this.detailPr.set(r.data);
        this.actioning.set(false);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed'); this.actioning.set(false); },
    });
  }

  openReject(id: string): void {
    this.rejectingId = id;
    this.rejectReason = '';
    this.showRejectInput.set(true);
  }

  confirmReject(): void {
    if (!this.rejectReason.trim()) { this.toast.error('Please provide a rejection reason'); return; }
    this.actioning.set(true);
    this.api.post(`/procurement/requests/${this.rejectingId}/reject`,
      { approver_name: 'Manager', reason: this.rejectReason }
    ).subscribe({
      next: r => {
        this.toast.success('Request rejected');
        this.detailPr.set(r.data);
        this.showRejectInput.set(false);
        this.actioning.set(false);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed'); this.actioning.set(false); },
    });
  }

  cancelPr(id: string): void {
    this.actioning.set(true);
    this.api.post(`/procurement/requests/${id}/cancel`, {}).subscribe({
      next: r => {
        this.toast.success('Request cancelled');
        this.detailPr.set(r.data);
        this.actioning.set(false);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed'); this.actioning.set(false); },
    });
  }

  // ── Create form ─────────────────────────────────────────────────

  openCreate(): void {
    this.createForm = { title: '', priority: 'normal', required_by_date: '', requested_by_name: '', notes: '' };
    this.createLines.set([]);
    this.lineSearch = [];
    this.lineResults = [];
    this.showCreate.set(true);
  }
  closeCreate(): void { this.showCreate.set(false); }

  addLine(): void {
    this.createLines.update(ls => [...ls, blankLine()]);
    this.lineSearch.push('');
    this.lineResults.push([]);
  }

  removeLine(i: number): void {
    this.createLines.update(ls => ls.filter((_, idx) => idx !== i));
    this.lineSearch.splice(i, 1);
    this.lineResults.splice(i, 1);
  }

  onLineSearch(i: number): void {
    const q = this.lineSearch[i]?.toLowerCase() ?? '';
    this.lineResults[i] = q.length < 1 ? [] :
      this.stockItems().filter(s =>
        s.name.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q)
      ).slice(0, 8);
  }

  selectItem(i: number, si: StockItem): void {
    this.createLines.update(ls => {
      const copy = [...ls];
      copy[i] = { ...copy[i], item_id: si.id, item_sku: si.sku, item_name: si.name };
      return copy;
    });
    this.lineSearch[i] = '';
    this.lineResults[i] = [];
  }

  clearItem(i: number): void {
    this.createLines.update(ls => {
      const copy = [...ls];
      copy[i] = { ...copy[i], item_id: '', item_sku: '', item_name: '' };
      return copy;
    });
  }

  submitCreate(): void {
    if (!this.createForm.title.trim()) { this.toast.error('Title is required'); return; }
    const lines = this.createLines();
    if (lines.length === 0) { this.toast.error('Add at least one item'); return; }
    for (const l of lines) {
      if (!l.item_id) { this.toast.error('All lines must have an item selected'); return; }
      if (!l.quantity || l.quantity <= 0) { this.toast.error('All quantities must be > 0'); return; }
    }

    const pid = this.propSvc.propertyId() ?? '';
    this.creating.set(true);

    const payload = {
      ...this.createForm,
      property_id: pid,
      lines: lines.map(l => ({
        item_id: l.item_id, item_sku: l.item_sku, item_name: l.item_name,
        quantity: l.quantity,
        estimated_unit_cost: Math.round((l.estimated_unit_cost ?? 0) * 100), // ₦ → kobo
        notes: l.notes,
      })),
    };

    this.api.post('/procurement/requests', payload).subscribe({
      next: () => {
        this.toast.success('Purchase request created');
        this.creating.set(false);
        this.closeCreate();
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed to create request'); this.creating.set(false); },
    });
  }

  // ── Display helpers ─────────────────────────────────────────────

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatValue(kobo: string): string {
    return '₦' + (parseInt(kobo ?? '0', 10) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      draft: 'Draft', submitted: 'Pending Approval', approved: 'Approved',
      rejected: 'Rejected', cancelled: 'Cancelled', converted: 'Converted to PO',
    };
    return map[s] ?? s;
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      draft:     'px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600',
      submitted: 'px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700',
      approved:  'px-2 py-0.5 rounded-lg text-xs font-medium bg-green-50 text-green-700',
      rejected:  'px-2 py-0.5 rounded-lg text-xs font-medium bg-red-50 text-red-700',
      cancelled: 'px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-400',
      converted: 'px-2 py-0.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700',
    };
    return map[s] ?? 'px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500';
  }

  priorityClass(p: string): string {
    const map: Record<string, string> = {
      urgent: 'px-2 py-0.5 rounded-lg text-xs font-medium bg-red-50 text-red-600',
      low:    'px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500',
      normal: 'px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600',
    };
    return map[p] ?? 'px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500';
  }
}
