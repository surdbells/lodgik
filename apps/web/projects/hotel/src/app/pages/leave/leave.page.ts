import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, SlicePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ActivePropertyService, ToastService } from '@lodgik/shared';
import { EmployeePickerComponent } from '../../components/employee-picker.component';
import type { EmployeeOption } from '../../components/employee-picker.component';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [FormsModule, DatePipe, SlicePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, EmployeePickerComponent],
  template: `
<ui-page-header title="Leave Management" icon="tree-palm" [breadcrumbs]="['Human Resources', 'Leave']"
  subtitle="Requests, approvals and balances">
  <button (click)="openRequest()" class="bg-sage-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-sage-700">+ Request Leave</button>
</ui-page-header>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
  <ui-stats-card label="Pending"      [value]="pending().length"       icon="clock"></ui-stats-card>
  <ui-stats-card label="Approved"     [value]="stats().approved"       icon="circle-check"></ui-stats-card>
  <ui-stats-card label="Rejected"     [value]="stats().rejected"       icon="circle-x"></ui-stats-card>
  <ui-stats-card label="Leave Types"  [value]="leaveTypes().length"    icon="clipboard-list"></ui-stats-card>
</div>

<!-- Tabs -->
<div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
  @for (tab of tabs; track tab) {
    <button (click)="setTab(tab)"
      class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
      [class.bg-white]="activeTab === tab" [class.shadow-sm]="activeTab === tab"
      [class.text-sage-700]="activeTab === tab" [class.font-semibold]="activeTab === tab"
      [class.text-gray-500]="activeTab !== tab">
      {{ tab }}{{ tab === 'Pending' ? ' (' + pending().length + ')' : '' }}
    </button>
  }
</div>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
  <!-- Requests tables -->
  @if (activeTab === 'Pending' || activeTab === 'All Requests') {
    <!-- Filter bar for All Requests -->
    @if (activeTab === 'All Requests') {
      <div class="flex gap-2 mb-3">
        <select [(ngModel)]="filterStatus" (change)="filterRequests()"
          class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select [(ngModel)]="filterType" (change)="filterRequests()"
          class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          <option value="">All Types</option>
          @for (lt of leaveTypes(); track lt.id) { <option [value]="lt.id">{{ lt.name }}</option> }
        </select>
        <button (click)="exportCSV()" class="ml-auto px-3 py-2 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Export CSV
        </button>
      </div>
    }
    <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Employee</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Dates</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Days</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (r of displayRequests(); track r.id) {
            <tr class="border-t border-gray-50 hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{{ r.employee_name || (r.employee_id | slice:0:8) }}</td>
              <td class="px-4 py-3">{{ getTypeName(r.leave_type_id) }}</td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ r.start_date | date:'dd MMM' }} → {{ r.end_date | date:'dd MMM' }}</td>
              <td class="px-4 py-3">{{ r.days_requested }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium text-white" [style.background]="r.status_color">{{ r.status_label }}</span>
              </td>
              <td class="px-4 py-3">
                @if (r.status === 'pending') {
                  <button (click)="approve(r.id)" class="text-emerald-600 hover:underline text-xs mr-2">Approve</button>
                  <button (click)="reject(r.id)"  class="text-red-600 hover:underline text-xs">Reject</button>
                }
                @if (r.status === 'approved') {
                  <button (click)="cancel(r.id)" class="text-gray-500 hover:underline text-xs">Cancel</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="px-4 py-10 text-center text-gray-400">No requests found</td></tr>
          }
        </tbody>
      </table>
    </div>
  }

  <!-- Balances Tab -->
  @if (activeTab === 'Balances') {
    <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      <div class="px-5 py-4 border-b flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700">Leave Balances</h3>
        <button (click)="showInitBalances = true"
          class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">+ Initialise Balances</button>
      </div>
      <ui-loading [loading]="balancesLoading()"></ui-loading>
      @if (!balancesLoading()) {
        @if (balances().length === 0) {
          <div class="px-4 py-10 text-center text-gray-400 text-sm">No balances recorded yet.</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Employee</th>
                  @for (lt of leaveTypes(); track lt.id) {
                    <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">{{ lt.name }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (b of balances(); track b.employee_id) {
                  <tr class="border-t border-gray-50 hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium">{{ b.employee_name || b.employee_id }}</td>
                    @for (lt of leaveTypes(); track lt.id) {
                      <td class="px-4 py-3 text-center">
                        @if (getBalance(b, lt.id); as bal) {
                          <span class="text-emerald-700 font-medium">{{ bal.remaining }}</span>
                          <span class="text-gray-400 text-xs"> / {{ bal.total }}</span>
                        } @else { <span class="text-gray-300">—</span> }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  }

  <!-- Leave Types Config Tab -->
  @if (activeTab === 'Leave Types') {
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      @for (lt of leaveTypes(); track lt.id) {
        <div class="bg-white rounded-xl border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm font-semibold text-gray-800">{{ lt.name }}</p>
              <p class="text-xs text-gray-400">{{ lt.type_key }}</p>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full" [class]="lt.is_paid ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'">
              {{ lt.is_paid ? 'Paid' : 'Unpaid' }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div><span class="text-gray-400 block">Annual Days</span><span class="font-medium text-gray-800">{{ lt.default_days }}</span></div>
            <div><span class="text-gray-400 block">Carry Forward</span><span class="font-medium text-gray-800">{{ lt.carry_forward_days ?? 0 }}d</span></div>
            <div><span class="text-gray-400 block">Notice Required</span><span class="font-medium text-gray-800">{{ lt.notice_days ?? 1 }}d</span></div>
            <div><span class="text-gray-400 block">Encashable</span><span class="font-medium text-gray-800">{{ lt.encashable ? 'Yes' : 'No' }}</span></div>
          </div>
        </div>
      }
    </div>
    <button (click)="showAddType = true" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">+ Add Leave Type</button>
  }
}

<!-- Initialise Balances Modal -->
@if (showInitBalances) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showInitBalances = false">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">Initialise Leave Balances</h3>
      <div class="space-y-3 mb-5">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Employee</label>
          <ui-employee-picker (employeeSelected)="onInitEmpPicked($event)" placeholder="Search staff member..."></ui-employee-picker>
          @if (initEmpName) { <p class="text-xs text-sage-600 mt-1">✓ {{ initEmpName }}</p> }
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Year</label>
          <input [(ngModel)]="initYear" type="number" [min]="2020" [max]="2030"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
        </div>
      </div>
      <div class="flex gap-2">
        <button (click)="showInitBalances = false" class="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
        <button (click)="initBalances()" [disabled]="!initEmpId"
          class="flex-1 px-4 py-2 bg-sage-600 text-white rounded-xl text-sm hover:bg-sage-700 disabled:opacity-50">Initialise</button>
      </div>
    </div>
  </div>
}

<!-- Add Leave Type Modal -->
@if (showAddType) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAddType = false">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">Add Leave Type</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="text-xs text-gray-500 mb-1 block">Name *</label>
          <input [(ngModel)]="typeForm.name" placeholder="e.g. Annual Leave" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Key *</label>
          <input [(ngModel)]="typeForm.type_key" placeholder="annual" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Annual Days *</label>
          <input [(ngModel)]="typeForm.default_days" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Carry Forward Days</label>
          <input [(ngModel)]="typeForm.carry_forward_days" type="number" placeholder="0" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Notice Days Required</label>
          <input [(ngModel)]="typeForm.notice_days" type="number" placeholder="1" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div class="flex items-center gap-2 col-span-2 mt-1">
          <input [(ngModel)]="typeForm.is_paid" type="checkbox" id="isPaid" class="rounded">
          <label for="isPaid" class="text-sm text-gray-700">Paid leave</label>
          <input [(ngModel)]="typeForm.encashable" type="checkbox" id="encashable" class="rounded ml-4">
          <label for="encashable" class="text-sm text-gray-700">Encashable</label>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showAddType = false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="addType()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Add</button>
      </div>
    </div>
  </div>
}

<!-- Request Leave Modal -->
@if (showRequest) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showRequest = false">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">Request Leave</h3>
      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-500 mb-1 block">Employee *</label>
          <ui-employee-picker (employeeSelected)="onReqEmpPicked($event)" placeholder="Search staff member..."></ui-employee-picker>
          @if (reqEmpName) { <p class="text-xs text-sage-600 mt-1">✓ {{ reqEmpName }}</p> }
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">Leave Type *</label>
          <select [(ngModel)]="reqForm.leave_type_id" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            <option value="">Select Leave Type</option>
            @for (lt of leaveTypes(); track lt.id) { <option [value]="lt.id">{{ lt.name }} ({{ lt.default_days }}d/yr)</option> }
          </select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="text-xs text-gray-500 mb-1 block">Start Date *</label>
            <input [(ngModel)]="reqForm.start_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
          <div><label class="text-xs text-gray-500 mb-1 block">End Date *</label>
            <input [(ngModel)]="reqForm.end_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        </div>
        <div><label class="text-xs text-gray-500 mb-1 block">Reason</label>
          <textarea [(ngModel)]="reqForm.reason" rows="2" placeholder="Optional reason"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showRequest = false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="submitRequest()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Submit</button>
      </div>
    </div>
  </div>
}
  `,
})
export class LeavePage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  loading         = signal(true);
  balancesLoading = signal(false);
  pending         = signal<any[]>([]);
  allRequests     = signal<any[]>([]);
  filteredRequests = signal<any[]>([]);
  leaveTypes      = signal<any[]>([]);
  balances        = signal<any[]>([]);
  stats           = signal({ approved: 0, rejected: 0 });

  tabs      = ['Pending', 'All Requests', 'Balances', 'Leave Types'];
  activeTab = 'Pending';

  showInitBalances = false;
  showAddType      = false;
  showRequest      = false;

  initEmpId   = '';
  initEmpName = '';
  initYear    = new Date().getFullYear();

  reqEmpName = '';
  reqForm: any = { employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' };

  filterStatus = '';
  filterType   = '';

  typeForm: any = { name: '', type_key: '', default_days: 20, carry_forward_days: 0, notice_days: 1, is_paid: true, encashable: false };

  ngOnInit() {
    this.api.get('/leave-types').subscribe({ next: (r: any) => this.leaveTypes.set(r.data ?? []) });
    this.load();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'Balances' && !this.balances().length) this.loadBalances();
  }

  load() {
    this.loading.set(true);
    let done = 0;
    const finish = () => { if (++done === 2) this.loading.set(false); };
    this.api.get('/leave-requests/pending').subscribe({ next: (r: any) => { this.pending.set(r.data ?? []); finish(); }, error: () => finish() });
    this.api.get('/leave-requests').subscribe({
      next: (r: any) => {
        const all = r.data ?? [];
        this.allRequests.set(all);
        this.filteredRequests.set(all);
        this.stats.set({ approved: all.filter((x: any) => x.status === 'approved').length, rejected: all.filter((x: any) => x.status === 'rejected').length });
        finish();
      }, error: () => finish(),
    });
  }

  loadBalances() {
    this.balancesLoading.set(true);
    this.api.get('/leave-balances').subscribe({ next: (r: any) => { this.balances.set(r.data ?? []); this.balancesLoading.set(false); }, error: () => this.balancesLoading.set(false) });
  }

  filterRequests() {
    let items = this.allRequests();
    if (this.filterStatus) items = items.filter(r => r.status === this.filterStatus);
    if (this.filterType)   items = items.filter(r => r.leave_type_id === this.filterType);
    this.filteredRequests.set(items);
  }

  exportCSV() {
    const rows = this.filteredRequests();
    const headers = ['Employee','Type','Start','End','Days','Status','Reason'];
    const lines = rows.map(r => [
      r.employee_name ?? r.employee_id, this.getTypeName(r.leave_type_id),
      r.start_date, r.end_date, r.days_requested, r.status_label, r.reason ?? ''
    ].map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `leave-requests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  displayRequests() { return this.activeTab === 'Pending' ? this.pending() : this.filteredRequests(); }
  getTypeName(id: string) { return this.leaveTypes().find(t => t.id === id)?.name ?? '—'; }
  getBalance(b: any, typeId: string) { return (b.balances ?? []).find((x: any) => x.leave_type_id === typeId); }

  onReqEmpPicked(opt: EmployeeOption | null) {
    this.reqForm.employee_id = opt?.employee_id ?? opt?.user_id ?? '';
    this.reqEmpName = opt?.full_name ?? '';
  }
  onInitEmpPicked(opt: EmployeeOption | null) {
    this.initEmpId   = opt?.employee_id ?? opt?.user_id ?? '';
    this.initEmpName = opt?.full_name ?? '';
  }

  openRequest() {
    this.reqForm   = { employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' };
    this.reqEmpName = '';
    this.showRequest = true;
  }

  submitRequest() {
    if (!this.reqForm.employee_id || !this.reqForm.leave_type_id || !this.reqForm.start_date || !this.reqForm.end_date) {
      this.toast.error('Employee, leave type and dates are required'); return;
    }
    this.api.post('/leave-requests', this.reqForm).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Leave request submitted'); this.showRequest = false; this.load(); }
        else this.toast.error(r.message ?? 'Failed');
      },
      error: (e: any) => this.toast.error(e?.error?.message ?? 'Failed'),
    });
  }

  initBalances() {
    if (!this.initEmpId) return;
    this.api.post(`/leave-balances/${this.initEmpId}/init`, { year: this.initYear }).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Leave balances initialised'); this.showInitBalances = false; this.initEmpId = ''; this.initEmpName = ''; }
        else this.toast.error(r.message ?? 'Failed');
      },
      error: (e: any) => this.toast.error(e?.error?.message ?? 'Failed'),
    });
  }

  addType() {
    if (!this.typeForm.name || !this.typeForm.type_key || !this.typeForm.default_days) { this.toast.error('Name, key and days required'); return; }
    this.api.post('/leave-types', this.typeForm).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Leave type added'); this.showAddType = false; this.api.get('/leave-types').subscribe({ next: (r2: any) => this.leaveTypes.set(r2.data ?? []) }); }
      },
    });
  }

  approve(id: string) { this.api.post(`/leave-requests/${id}/approve`, {}).subscribe({ next: () => this.load() }); }
  reject(id: string)  { this.api.post(`/leave-requests/${id}/reject`, { reason: 'Rejected' }).subscribe({ next: () => this.load() }); }
  cancel(id: string)  { this.api.post(`/leave-requests/${id}/cancel`, {}).subscribe({ next: () => this.load() }); }
}
