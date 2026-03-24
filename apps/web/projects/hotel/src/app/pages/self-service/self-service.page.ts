import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ActivePropertyService, ToastService, AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-self-service',
  standalone: true,
  imports: [FormsModule, DatePipe, TitleCasePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
<ui-page-header title="My Self-Service" icon="user-round" subtitle="View your records, submit requests and update personal information" [breadcrumbs]="['HR', 'Self-Service']">
</ui-page-header>

<!-- Tabs -->
<div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
  @for (tab of tabs; track tab.id) {
    <button (click)="activeTab = tab.id"
      class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
      [class.bg-white]="activeTab===tab.id" [class.shadow-sm]="activeTab===tab.id"
      [class.text-sage-700]="activeTab===tab.id" [class.font-semibold]="activeTab===tab.id"
      [class.text-gray-500]="activeTab!==tab.id">{{ tab.label }}</button>
  }
</div>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {

  <!-- ── My Profile ─────────────────────────────────────────────────────── -->
  @if (activeTab === 'profile') {
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <div class="flex items-center gap-4 mb-5 pb-4 border-b">
          <div class="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-xl font-bold">
            {{ me()?.first_name?.charAt(0) }}{{ me()?.last_name?.charAt(0) }}
          </div>
          <div>
            <p class="text-base font-semibold text-gray-900">{{ me()?.first_name }} {{ me()?.last_name }}</p>
            <p class="text-sm text-gray-500">{{ me()?.role | titlecase }}</p>
          </div>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex gap-2"><span class="text-gray-400 w-28">Email</span><span>{{ me()?.email }}</span></div>
          @if (empRecord()) {
            <div class="flex gap-2"><span class="text-gray-400 w-28">Staff ID</span><span class="font-mono">{{ empRecord()!.staff_id }}</span></div>
            <div class="flex gap-2"><span class="text-gray-400 w-28">Job Title</span><span>{{ empRecord()!.job_title }}</span></div>
            <div class="flex gap-2"><span class="text-gray-400 w-28">Employment</span>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                [style.color]="empRecord()!.employment_type_color"
                [style.background]="empRecord()!.employment_type_bg">
                {{ empRecord()!.employment_type_label }}
              </span></div>
            <div class="flex gap-2"><span class="text-gray-400 w-28">Hire Date</span><span>{{ empRecord()!.hire_date | date:'dd MMM yyyy' }}</span></div>
          }
        </div>
      </div>

      <!-- Update personal details -->
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Update Personal Details</h3>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Phone</label>
            <input [(ngModel)]="profileForm.phone" placeholder="Phone number"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Home Address</label>
            <textarea [(ngModel)]="profileForm.address" rows="2"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Emergency Contact</label>
              <input [(ngModel)]="profileForm.emergency_contact_name"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Emergency Phone</label>
              <input [(ngModel)]="profileForm.emergency_contact_phone"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            </div>
          </div>
        </div>
        <button (click)="saveProfile()" class="mt-4 px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Save Changes</button>
      </div>
    </div>
  }

  <!-- ── My Payslips ──────────────────────────────────────────────────────── -->
  @if (activeTab === 'payslips') {
    @if (payslips().length === 0) {
      <div class="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
        <p class="text-sm text-gray-400">No payslips available yet</p>
      </div>
    } @else {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Period</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">Gross</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">Tax</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">Net</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
          </tr></thead>
          <tbody>
            @for (p of payslips(); track p.id) {
              <tr class="border-t border-gray-50 hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{ monthName(p.month) }} {{ p.year }}</td>
                <td class="px-4 py-3 text-right">₦{{ (p.gross_salary/100).toLocaleString() }}</td>
                <td class="px-4 py-3 text-right text-red-600">₦{{ (p.total_paye/100).toLocaleString() }}</td>
                <td class="px-4 py-3 text-right text-emerald-600 font-medium">₦{{ (p.net_salary/100).toLocaleString() }}</td>
                <td class="px-4 py-3">
                  <button (click)="emailPayslip(p.id)" class="text-xs text-blue-600 hover:underline">Email to me</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  }

  <!-- ── My Leave ────────────────────────────────────────────────────────── -->
  @if (activeTab === 'leave') {
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
      @for (b of leaveBalances(); track b.leave_type_id) {
        <div class="bg-white rounded-xl border border-gray-100 p-4">
          <p class="text-xs text-gray-400 mb-1">{{ b.leave_type_name }}</p>
          <div class="flex items-end gap-1">
            <span class="text-2xl font-bold text-gray-900">{{ b.remaining }}</span>
            <span class="text-sm text-gray-400 mb-0.5">/ {{ b.total }} days</span>
          </div>
          <div class="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div class="h-full bg-sage-500 rounded-full" [style.width]="(b.total > 0 ? b.remaining/b.total*100 : 0) + '%'"></div>
          </div>
        </div>
      }
    </div>

    <div class="flex justify-between items-center mb-3">
      <h3 class="text-sm font-semibold text-gray-700">My Leave Requests</h3>
      <button (click)="showLeaveForm = true" class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">+ Request Leave</button>
    </div>

    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Dates</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Days</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
        </tr></thead>
        <tbody>
          @for (r of myLeaveRequests(); track r.id) {
            <tr class="border-t border-gray-50 hover:bg-gray-50">
              <td class="px-4 py-3">{{ r.leave_type_name ?? r.leave_type_id }}</td>
              <td class="px-4 py-3 text-xs text-gray-500">{{ r.start_date | date:'dd MMM' }} → {{ r.end_date | date:'dd MMM' }}</td>
              <td class="px-4 py-3">{{ r.days_requested }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium text-white" [style.background]="r.status_color">{{ r.status_label }}</span>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="px-4 py-8 text-center text-gray-400 text-sm">No leave requests yet</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showLeaveForm) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showLeaveForm = false">
        <div class="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md" (click)="$event.stopPropagation()">
          <h3 class="text-base font-semibold mb-4">Request Leave</h3>
          <div class="space-y-3">
            <div><label class="text-xs text-gray-500 mb-1 block">Leave Type</label>
              <select [(ngModel)]="leaveForm.leave_type_id" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                <option value="">Select type</option>
                @for (b of leaveBalances(); track b.leave_type_id) { <option [value]="b.leave_type_id">{{ b.leave_type_name }} ({{ b.remaining }}d remaining)</option> }
              </select></div>
            <div class="grid grid-cols-2 gap-2">
              <div><label class="text-xs text-gray-500 mb-1 block">Start</label>
                <input [(ngModel)]="leaveForm.start_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
              <div><label class="text-xs text-gray-500 mb-1 block">End</label>
                <input [(ngModel)]="leaveForm.end_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
            </div>
            <div><label class="text-xs text-gray-500 mb-1 block">Reason</label>
              <textarea [(ngModel)]="leaveForm.reason" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showLeaveForm = false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
            <button (click)="submitLeave()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Submit</button>
          </div>
        </div>
      </div>
    }
  }

  <!-- ── My Attendance ────────────────────────────────────────────────────── -->
  @if (activeTab === 'attendance') {
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <ui-stats-card label="Present (30d)"  [value]="attStats().present"  icon="circle-check"></ui-stats-card>
      <ui-stats-card label="Absent"         [value]="attStats().absent"   icon="circle-x"></ui-stats-card>
      <ui-stats-card label="Late"           [value]="attStats().late"     icon="clock"></ui-stats-card>
      <ui-stats-card label="Avg Hours"      [value]="attStats().avgHours" icon="timer"></ui-stats-card>
    </div>
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Clock In</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Clock Out</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Hours</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
        </tr></thead>
        <tbody>
          @for (a of myAttendance(); track a.id) {
            <tr class="border-t border-gray-50 hover:bg-gray-50">
              <td class="px-4 py-3">{{ a.attendance_date | date:'dd MMM yyyy' }}</td>
              <td class="px-4 py-3 text-xs">{{ a.clock_in ? (a.clock_in | date:'HH:mm') : '—' }}</td>
              <td class="px-4 py-3 text-xs">{{ a.clock_out ? (a.clock_out | date:'HH:mm') : '—' }}</td>
              <td class="px-4 py-3">{{ a.hours_worked }}h</td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                  [class]="a.status==='present'?'bg-emerald-50 text-emerald-700':a.status==='absent'?'bg-red-50 text-red-600':'bg-amber-50 text-amber-700'">
                  {{ a.status }}</span>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400 text-sm">No attendance records in the last 30 days</td></tr>
          }
        </tbody>
      </table>
    </div>
  }

  <!-- ── My Expense Claims ──────────────────────────────────────────────── -->
  @if (activeTab === 'expenses') {
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-sm font-semibold text-gray-700">My Expense Claims</h3>
      <button (click)="showExpenseForm = true" class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700">+ New Claim</button>
    </div>
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ref</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Title</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
        </tr></thead>
        <tbody>
          @for (c of myClaims(); track c.id) {
            <tr class="border-t border-gray-50 hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-xs">{{ c.claim_number }}</td>
              <td class="px-4 py-3">{{ c.title }}</td>
              <td class="px-4 py-3 text-right">₦{{ (c.total_amount/100).toLocaleString() }}</td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                  [class]="c.status==='paid'?'bg-emerald-50 text-emerald-700':c.status==='approved'?'bg-sage-50 text-sage-700':c.status==='rejected'?'bg-red-50 text-red-600':'bg-blue-50 text-blue-700'">
                  {{ c.status }}</span></td>
              <td class="px-4 py-3 text-xs text-gray-400">{{ c.created_at | date:'dd MMM' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400 text-sm">No expense claims yet</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (showExpenseForm) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showExpenseForm = false">
        <div class="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md" (click)="$event.stopPropagation()">
          <h3 class="text-base font-semibold mb-4">New Expense Claim</h3>
          <div class="space-y-3">
            <div><label class="text-xs text-gray-500 mb-1 block">Title *</label>
              <input [(ngModel)]="expForm.title" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
            <div><label class="text-xs text-gray-500 mb-1 block">Amount (₦)</label>
              <input [(ngModel)]="expForm.amount" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
            <div><label class="text-xs text-gray-500 mb-1 block">Date</label>
              <input [(ngModel)]="expForm.date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
            <div><label class="text-xs text-gray-500 mb-1 block">Notes</label>
              <textarea [(ngModel)]="expForm.notes" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showExpenseForm = false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
            <button (click)="submitExpense()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Submit</button>
          </div>
        </div>
      </div>
    }
  }
}
  `,
})
export class SelfServicePage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);

  loading      = signal(true);
  me           = signal<any>(null);
  empRecord    = signal<any>(null);
  payslips     = signal<any[]>([]);
  leaveBalances   = signal<any[]>([]);
  myLeaveRequests = signal<any[]>([]);
  myAttendance    = signal<any[]>([]);
  myClaims        = signal<any[]>([]);
  attStats = signal({ present: 0, absent: 0, late: 0, avgHours: '0' });

  activeTab = 'profile';
  tabs = [
    { id: 'profile',    label: 'My Profile' },
    { id: 'payslips',   label: 'Payslips' },
    { id: 'leave',      label: 'Leave' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'expenses',   label: 'Expense Claims' },
  ];

  profileForm: any = { phone: '', address: '', emergency_contact_name: '', emergency_contact_phone: '' };
  showLeaveForm    = false;
  leaveForm: any   = { leave_type_id: '', start_date: '', end_date: '', reason: '' };
  showExpenseForm  = false;
  expForm: any     = { title: '', amount: '', date: new Date().toISOString().slice(0,10), notes: '' };

  ngOnInit() {
    // Get current user
    const user = this.auth.currentUser;
    if (user) {
      this.me.set(user);
      this.profileForm = { phone: '', address: '', emergency_contact_name: '', emergency_contact_phone: '' };
      this.loadEmpRecord(user.id);
      this.loadAllData(user.id);
    }
    this.loading.set(false);
  }

  loadEmpRecord(userId: string) {
    this.api.get('/staff/' + userId + '/employee').subscribe({
      next: (r: any) => { if (r.data) { this.empRecord.set(r.data); this.profileForm.address = r.data.address ?? ''; this.profileForm.emergency_contact_name = r.data.emergency_contact_name ?? ''; this.profileForm.emergency_contact_phone = r.data.emergency_contact_phone ?? ''; } },
    });
  }

  loadAllData(userId: string) {
    const pid = this.activeProperty.propertyId();

    // Payslips — find employee then get payslips
    this.api.get('/payroll', { property_id: pid }).subscribe({
      next: (r: any) => {
        const periods: any[] = r.data ?? [];
        // collect payslips across all paid periods for this employee
        const emp = this.empRecord();
        const slips: any[] = [];
        periods.filter(p => p.status === 'paid').forEach(p => {
          this.api.get(`/payroll/${p.id}/payslips`).subscribe({
            next: (pr: any) => {
              const mine = (pr.data ?? []).filter((s: any) => s.employee_id === (emp?.id ?? ''));
              mine.forEach((s: any) => slips.push({ ...s, month: p.month, year: p.year }));
              this.payslips.set([...slips]);
            },
          });
        });
      },
    });

    // Leave balances
    const emp = this.empRecord();
    if (emp?.id) {
      this.api.get(`/leave-balances/${emp.id}`).subscribe({ next: (r: any) => this.leaveBalances.set(r.data ?? []) });
      this.api.get('/leave-requests', { employee_id: emp.id }).subscribe({ next: (r: any) => this.myLeaveRequests.set(r.data ?? []) });
      // Attendance
      const from = new Date(); from.setDate(from.getDate() - 30);
      this.api.get('/attendance', { employee_id: emp.id, property_id: pid }).subscribe({
        next: (r: any) => {
          const recs: any[] = r.data ?? [];
          this.myAttendance.set(recs);
          const present = recs.filter(a => a.status === 'present').length;
          const absent  = recs.filter(a => a.status === 'absent').length;
          const late    = recs.filter(a => a.is_late).length;
          const totalHrs = recs.reduce((s, a) => s + parseFloat(a.hours_worked ?? 0), 0);
          this.attStats.set({ present, absent, late, avgHours: recs.length ? (totalHrs / recs.length).toFixed(1) : '0' });
        },
      });
      // Expense claims
      this.api.get('/hr/expense-claims', { employee_id: emp.id }).subscribe({ next: (r: any) => this.myClaims.set(r.data ?? []) });
    }
  }

  saveProfile() {
    const emp = this.empRecord();
    const user = this.me();
    if (!emp || !user) return;
    const data: any = {};
    if (this.profileForm.phone) data.phone = this.profileForm.phone;
    data.address = this.profileForm.address;
    data.emergency_contact_name  = this.profileForm.emergency_contact_name;
    data.emergency_contact_phone = this.profileForm.emergency_contact_phone;
    this.api.post(`/staff/${user.id}/employee`, data).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Profile updated'); this.empRecord.set(r.data); } else this.toast.error(r.message ?? 'Failed'); },
    });
  }

  submitLeave() {
    const emp = this.empRecord();
    if (!emp || !this.leaveForm.leave_type_id || !this.leaveForm.start_date || !this.leaveForm.end_date) {
      this.toast.error('All fields required'); return;
    }
    this.api.post('/leave-requests', { ...this.leaveForm, employee_id: emp.id }).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.toast.success('Leave request submitted');
          this.showLeaveForm = false;
          this.api.get('/leave-requests', { employee_id: emp.id }).subscribe({ next: (r2: any) => this.myLeaveRequests.set(r2.data ?? []) });
        } else this.toast.error(r.message ?? 'Failed');
      },
    });
  }

  submitExpense() {
    const emp = this.empRecord();
    if (!emp || !this.expForm.title) { this.toast.error('Title required'); return; }
    const pid = this.activeProperty.propertyId();
    const body = {
      employee_id: emp.id,
      title: this.expForm.title,
      notes: this.expForm.notes,
      items: this.expForm.amount ? [{ description: this.expForm.title, amount: this.expForm.amount, expense_date: this.expForm.date }] : [],
    };
    this.api.post('/hr/expense-claims', body).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.toast.success('Expense claim created');
          this.showExpenseForm = false;
          this.api.get('/hr/expense-claims', { employee_id: emp.id }).subscribe({ next: (r2: any) => this.myClaims.set(r2.data ?? []) });
        } else this.toast.error(r.message ?? 'Failed');
      },
    });
  }

  emailPayslip(id: string) {
    this.api.post(`/payslips/${id}/email`, { hotel_name: 'Hotel' }).subscribe({
      next: () => this.toast.success('Payslip sent to your email'),
    });
  }

  monthName(m: number) {
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] ?? m;
  }
}
