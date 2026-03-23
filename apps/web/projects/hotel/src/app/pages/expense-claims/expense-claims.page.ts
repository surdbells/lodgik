import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, StatsCardComponent, ActivePropertyService } from '@lodgik/shared';

const STATUS_COLORS: Record<string,string> = {
  draft:'bg-gray-100 text-gray-600', submitted:'bg-blue-50 text-blue-700',
  approved:'bg-sage-50 text-sage-700', rejected:'bg-red-50 text-red-700', paid:'bg-emerald-50 text-emerald-700',
};

@Component({
  selector: 'app-expense-claims',
  standalone: true,
  imports: [FormsModule, DatePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
<ui-page-header title="Expense Claims" icon="receipt" subtitle="Employee expense submissions and approvals" [breadcrumbs]="['HR', 'Expense Claims']">
  <button (click)="openNew()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700">+ New Claim</button>
</ui-page-header>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
  <ui-stats-card label="Pending Approval" [value]="pendingCount()" icon="clock"></ui-stats-card>
  <ui-stats-card label="Approved" [value]="approvedCount()" icon="circle-check"></ui-stats-card>
  <ui-stats-card label="Total Submitted (₦)" [value]="fmtTotalSubmitted()" icon="banknote"></ui-stats-card>
  <ui-stats-card label="Paid Out (₦)" [value]="fmtTotalPaid()" icon="hand-coins"></ui-stats-card>
</div>

<!-- Filters -->
<div class="flex gap-2 mb-4">
  <select [(ngModel)]="filterStatus" (change)="load()" class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
    <option value="">All Status</option>
    <option value="submitted">Pending</option><option value="approved">Approved</option>
    <option value="rejected">Rejected</option><option value="paid">Paid</option>
  </select>
</div>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
  <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
        <tr>
          <th class="px-4 py-3 text-left">Ref</th>
          <th class="px-4 py-3 text-left">Employee</th>
          <th class="px-4 py-3 text-left">Title</th>
          <th class="px-4 py-3 text-right">Amount</th>
          <th class="px-4 py-3 text-left">Status</th>
          <th class="px-4 py-3 text-left">Submitted</th>
          <th class="px-4 py-3 text-left">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50">
        @for (c of claims(); track c.id) {
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 font-mono text-xs">{{ c.claim_number }}</td>
            <td class="px-4 py-3">{{ c.employee_name }}</td>
            <td class="px-4 py-3">{{ c.title }}</td>
            <td class="px-4 py-3 text-right font-medium">₦{{ (c.total_amount/100).toLocaleString() }}</td>
            <td class="px-4 py-3">
              <span class="text-[11px] px-2 py-0.5 rounded-full font-medium" [class]="statusColor(c.status)">{{ c.status }}</span>
            </td>
            <td class="px-4 py-3 text-xs text-gray-400">{{ c.submitted_at | date:"dd MMM" }}</td>
            <td class="px-4 py-3">
              <div class="flex gap-1">
                @if (c.status === 'submitted') {
                  <button (click)="approve(c)" class="text-xs px-2 py-0.5 bg-sage-50 text-sage-700 rounded hover:bg-sage-100">Approve</button>
                  <button (click)="reject(c)" class="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded hover:bg-red-100">Reject</button>
                }
                @if (c.status === 'approved') {
                  <button (click)="markPaid(c)" class="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100">Mark Paid</button>
                }
              </div>
            </td>
          </tr>
        } @empty {
          <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400 text-sm">No expense claims found</td></tr>
        }
      </tbody>
    </table>
  </div>
}

@if (showNew) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showNew=false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">New Expense Claim</h3>
      <div class="space-y-3">
        <div><label class="text-xs text-gray-500 mb-1 block">Employee ID *</label>
          <input [(ngModel)]="form.employee_id" placeholder="Employee UUID" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Claim Title *</label>
          <input [(ngModel)]="form.title" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Notes</label>
          <textarea [(ngModel)]="form.notes" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
        <!-- Line items -->
        <div class="border-t pt-3">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-semibold text-gray-500">Expense Items</p>
            <button (click)="addItem()" class="text-xs text-sage-600 hover:underline">+ Add</button>
          </div>
          @for (item of form.items; track $index; let i = $index) {
            <div class="grid grid-cols-3 gap-2 mb-2">
              <input [(ngModel)]="item.description" placeholder="Description" class="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-gray-50">
              <input [(ngModel)]="item.amount" type="number" placeholder="₦ amount" class="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-gray-50">
              <input [(ngModel)]="item.expense_date" type="date" class="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-gray-50">
              <button (click)="removeItem(i)" class="text-xs text-red-500 hover:underline">Remove</button>
            </div>
          }
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showNew=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="submit()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Create & Submit</button>
      </div>
    </div>
  </div>
}
  `,
})
export class ExpenseClaimsPage implements OnInit {
  private api = inject(ApiService); private toast = inject(ToastService);
  loading    = signal(true);
  claims     = signal<any[]>([]);
  showNew    = false;
  filterStatus = '';
  readonly pendingCount      = computed(() => this.claims().filter((c: any) => c.status === 'submitted').length);
  readonly approvedCount     = computed(() => this.claims().filter((c: any) => c.status === 'approved').length);
  readonly fmtTotalSubmitted = computed(() => this.fmtK(this.totalSubmitted()));
  readonly fmtTotalPaid      = computed(() => this.fmtK(this.totalPaid()));
  form: any = { employee_id:'', title:'', notes:'', items:[] };
  ngOnInit() { this.load(); }
  load() {
    const params: any = {};
    if (this.filterStatus) params.status = this.filterStatus;
    this.api.get('/hr/expense-claims', params).subscribe({ next:(r:any)=>{ this.claims.set(r.data??[]); this.loading.set(false); }, error:()=>this.loading.set(false) });
  }
  totalSubmitted = () => this.claims().filter(c=>['submitted','approved','paid'].includes(c.status)).reduce((s,c)=>s+Number(c.total_amount),0);
  totalPaid = () => this.claims().filter(c=>c.status==='paid').reduce((s,c)=>s+Number(c.total_amount),0);
  statusColor = (s: string) => STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-500';
  fmtK = (n: number) => n >= 100000 ? '₦'+(n/100/1000).toFixed(1)+'k' : '₦'+(n/100).toLocaleString();
  openNew() { this.form = { employee_id:'', title:'', notes:'', items:[{ description:'', amount:'', expense_date:new Date().toISOString().slice(0,10) }] }; this.showNew=true; }
  addItem() { this.form.items.push({ description:'', amount:'', expense_date:new Date().toISOString().slice(0,10) }); }
  removeItem(i: number) { this.form.items.splice(i,1); }
  submit() {
    if (!this.form.employee_id||!this.form.title) { this.toast.error('Employee ID and title required'); return; }
    this.api.post('/hr/expense-claims', this.form).subscribe((r:any)=>{ if(r.success){this.toast.success('Claim created');this.showNew=false;this.load();}else this.toast.error(r.message||'Failed'); });
  }
  approve(c: any) { this.api.post(`/hr/expense-claims/${c.id}/approve`,{}).subscribe(()=>this.load()); }
  reject(c: any) { this.api.post(`/hr/expense-claims/${c.id}/reject`,{ reason:'Rejected by manager' }).subscribe(()=>this.load()); }
  markPaid(c: any) { this.api.post(`/hr/expense-claims/${c.id}/paid`,{}).subscribe(()=>this.load()); }
}
