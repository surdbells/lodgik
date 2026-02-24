import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [FormsModule, SlicePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Leave Management" icon="tree-palm" [breadcrumbs]="['Human Resources', 'Leave']" subtitle="Leave requests and approval queue">
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
      <div class="flex gap-2 mb-4">
        @for (tab of ['pending', 'all']; track tab) {
          <button (click)="activeTab = tab" class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
            [class]="activeTab === tab ? 'bg-sage-600 text-white border-sage-600' : 'border-gray-300 text-gray-500'">
            {{ tab === 'pending' ? 'Pending Approval (' + pending().length + ')' : 'All Requests' }}
          </button>
        }
      </div>

      <!-- Requests Table -->
      <div class="bg-white rounded-xl border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Employee</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Type</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Dates</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Days</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
          </tr></thead>
          <tbody>
            @for (r of displayRequests(); track r.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3">{{ r.employee_id | slice:0:8 }}...</td>
                <td class="px-4 py-3">{{ getTypeName(r.leave_type_id) }}</td>
                <td class="px-4 py-3">{{ r.start_date }} → {{ r.end_date }}</td>
                <td class="px-4 py-3">{{ r.days_requested }}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs text-white" [style.background]="r.status_color">{{ r.status_label }}</span></td>
                <td class="px-4 py-3">
                  @if (r.status === 'pending') {
                    <button (click)="approve(r.id)" class="text-green-600 hover:underline text-xs mr-2">Approve</button>
                    <button (click)="reject(r.id)" class="text-red-600 hover:underline text-xs">Reject</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No requests</td></tr>
            }
          </tbody>
        </table>
      </div>
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

  loading = signal(true);
  pending = signal<any[]>([]);
  allRequests = signal<any[]>([]);
  leaveTypes = signal<any[]>([]);
  employees = signal<any[]>([]);
  stats = signal({ approved: 0, rejected: 0 });
  activeTab = 'pending';
  showRequest = false;
  reqForm: any = { employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' };

  ngOnInit() {
    this.api.get('/leave-types').subscribe({ next: (r: any) => this.leaveTypes.set(r.data || []) });
    this.api.get('/employees/directory', { property_id: this.auth.currentUser?.property_id ?? '' }).subscribe({ next: (r: any) => this.employees.set(r.data || []) });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.get('/leave-requests/pending').subscribe({
      next: (r: any) => { this.pending.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  displayRequests() { return this.activeTab === 'pending' ? this.pending() : this.allRequests(); }
  getTypeName(id: string) { return this.leaveTypes().find(t => t.id === id)?.name || id.slice(0, 8); }

  approve(id: string) {
    this.api.post(`/leave-requests/${id}/approve`, {}).subscribe({ next: () => this.load() });
  }
  reject(id: string) {
    this.api.post(`/leave-requests/${id}/reject`, {}).subscribe({ next: () => this.load() });
  }
  submitRequest() {
    this.api.post('/leave-requests', this.reqForm).subscribe({
      next: () => { this.showRequest = false; this.reqForm = { employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' }; this.load(); },
    });
  }
}
