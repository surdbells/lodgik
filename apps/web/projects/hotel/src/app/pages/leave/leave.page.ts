import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ActivePropertyService } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [FormsModule, SlicePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Leave Management" icon="tree-palm" [breadcrumbs]="['Human Resources', 'Leave']" subtitle="Leave requests, approvals, and balances">
      <button (click)="showRequest = true" class="bg-sage-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-sage-700 transition-colors">+ Request Leave</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <ui-stats-card label="Pending" [value]="pending().length" icon="clock"></ui-stats-card>
        <ui-stats-card label="Approved" [value]="stats().approved" icon="circle-check"></ui-stats-card>
        <ui-stats-card label="Rejected" [value]="stats().rejected" icon="circle-x"></ui-stats-card>
        <ui-stats-card label="Leave Types" [value]="leaveTypes().length" icon="clipboard-list"></ui-stats-card>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        @for (tab of ['Pending', 'All Requests', 'Balances']; track tab) {
          <button (click)="activeTab = tab; onTabChange(tab)"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            [class.bg-white]="activeTab === tab" [class.shadow-sm]="activeTab === tab"
            [class.text-sage-700]="activeTab === tab" [class.font-semibold]="activeTab === tab"
            [class.text-gray-500]="activeTab !== tab">
            {{ tab }}{{ tab === 'Pending' ? ' (' + pending().length + ')' : '' }}
          </button>
        }
      </div>

      <!-- Requests Table -->
      @if (activeTab === 'Pending' || activeTab === 'All Requests') {
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
                <tr class="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 font-medium">{{ r.employee_name || (r.employee_id | slice:0:8) }}</td>
                  <td class="px-4 py-3">{{ getTypeName(r.leave_type_id) }}</td>
                  <td class="px-4 py-3 text-gray-500 text-xs">{{ r.start_date }} → {{ r.end_date }}</td>
                  <td class="px-4 py-3">{{ r.days_requested }}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium text-white" [style.background]="r.status_color">{{ r.status_label }}</span>
                  </td>
                  <td class="px-4 py-3">
                    @if (r.status === 'pending') {
                      <button (click)="approve(r.id)" class="text-emerald-600 hover:underline text-xs mr-2">Approve</button>
                      <button (click)="reject(r.id)" class="text-red-600 hover:underline text-xs">Reject</button>
                    }
                    @if (r.status === 'approved') {
                      <button (click)="cancel(r.id)" class="text-gray-500 hover:underline text-xs">Cancel</button>
                    }
                  </td>
                </tr>
              }
              @empty {
                <tr><td colspan="6" class="px-4 py-10 text-center text-gray-400">No requests found</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Balances Tab -->
      @if (activeTab === 'Balances') {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="text-sm font-semibold text-gray-700">Leave Balances by Employee</h3>
          </div>
          <ui-loading [loading]="balancesLoading()"></ui-loading>
          @if (!balancesLoading()) {
            @if (balances().length === 0) {
              <div class="px-4 py-10 text-center text-gray-400">No balances recorded yet.</div>
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
                            } @else {
                              <span class="text-gray-300">—</span>
                            }
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
    }

    <!-- Submit Leave Request Dialog -->
    @if (showRequest) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showRequest = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">Request Leave</h3>
          <div class="space-y-3">
            <select [(ngModel)]="reqForm.employee_id" class="border rounded-lg px-3 py-2 text-sm w-full">
              <option value="">Select Employee</option>
              @for (e of employees(); track e.id) { <option [value]="e.id">{{ e.full_name }}</option> }
            </select>
            <select [(ngModel)]="reqForm.leave_type_id" class="border rounded-lg px-3 py-2 text-sm w-full">
              <option value="">Select Leave Type</option>
              @for (lt of leaveTypes(); track lt.id) { <option [value]="lt.id">{{ lt.name }} ({{ lt.default_days }}d)</option> }
            </select>
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="reqForm.start_date" type="date" class="border rounded-lg px-3 py-2 text-sm" />
              <input [(ngModel)]="reqForm.end_date" type="date" class="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <textarea [(ngModel)]="reqForm.reason" placeholder="Reason" rows="2" class="border rounded-lg px-3 py-2 text-sm w-full"></textarea>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showRequest = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="submitRequest()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-lg hover:bg-sage-700">Submit</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class LeavePage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  balancesLoading = signal(false);
  pending = signal<any[]>([]);
  allRequests = signal<any[]>([]);
  leaveTypes = signal<any[]>([]);
  employees = signal<any[]>([]);
  balances = signal<any[]>([]);
  stats = signal({ approved: 0, rejected: 0 });
  activeTab = 'Pending';
  showRequest = false;
  reqForm: any = { employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' };

  ngOnInit() {
    this.api.get('/leave-types').subscribe({ next: (r: any) => this.leaveTypes.set(r.data || []) });
    this.api.get('/employees/directory', { property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => this.employees.set(r.data || []),
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    let done = 0;
    const finish = () => { if (++done === 2) this.loading.set(false); };

    this.api.get('/leave-requests/pending').subscribe({
      next: (r: any) => { this.pending.set(r.data || []); finish(); },
      error: () => finish(),
    });
    this.api.get('/leave-requests').subscribe({
      next: (r: any) => {
        const all = r.data || [];
        this.allRequests.set(all);
        const approved = all.filter((x: any) => x.status === 'approved').length;
        const rejected = all.filter((x: any) => x.status === 'rejected').length;
        this.stats.set({ approved, rejected });
        finish();
      },
      error: () => finish(),
    });
  }

  loadBalances() {
    this.balancesLoading.set(true);
    this.api.get('/leave-balances').subscribe({
      next: (r: any) => { this.balances.set(r.data || []); this.balancesLoading.set(false); },
      error: () => this.balancesLoading.set(false),
    });
  }

  onTabChange(tab: string) {
    if (tab === 'Balances' && this.balances().length === 0) this.loadBalances();
  }

  displayRequests() { return this.activeTab === 'Pending' ? this.pending() : this.allRequests(); }
  getTypeName(id: string) { return this.leaveTypes().find(t => t.id === id)?.name || '—'; }
  getBalance(b: any, typeId: string) { return (b.balances || []).find((x: any) => x.leave_type_id === typeId); }

  approve(id: string) { this.api.post(`/leave-requests/${id}/approve`, {}).subscribe({ next: () => this.load() }); }
  reject(id: string) { this.api.post(`/leave-requests/${id}/reject`, { reason: 'Rejected by manager' }).subscribe({ next: () => this.load() }); }
  cancel(id: string) { this.api.post(`/leave-requests/${id}/cancel`, {}).subscribe({ next: () => this.load() }); }

  submitRequest() {
    this.api.post('/leave-requests', this.reqForm).subscribe({
      next: () => {
        this.showRequest = false;
        this.reqForm = { employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' };
        this.load();
      },
    });
  }
}
