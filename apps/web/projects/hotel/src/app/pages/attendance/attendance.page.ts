import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ActivePropertyService, ToastService, AuthService } from '@lodgik/shared';
import { EmployeePickerComponent, EmployeeOption } from '../../components/employee-picker.component';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [FormsModule, SlicePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, EmployeePickerComponent],
  template: `
<ui-page-header title="Attendance & Shifts" icon="clock" [breadcrumbs]="['Human Resources', 'Attendance']"
  subtitle="Daily attendance, clock in/out, shifts and scheduling"></ui-page-header>
<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
  <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
    <ui-stats-card label="Present"  [value]="summary().present"  icon="circle-check"></ui-stats-card>
    <ui-stats-card label="Late"     [value]="summary().late"     icon="clock"></ui-stats-card>
    <ui-stats-card label="Absent"   [value]="summary().absent"   icon="circle-x"></ui-stats-card>
    <ui-stats-card label="Half Day" [value]="summary().half_day" icon="moon"></ui-stats-card>
    <ui-stats-card label="On Leave" [value]="summary().on_leave" icon="tree-palm"></ui-stats-card>
  </div>

  <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
    @for (tab of ['Attendance','Shifts','Schedule']; track tab) {
      <button (click)="activeTab=tab; onTabChange(tab)"
        class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
        [class.bg-white]="activeTab===tab" [class.shadow-sm]="activeTab===tab"
        [class.text-sage-700]="activeTab===tab" [class.font-semibold]="activeTab===tab"
        [class.text-gray-500]="activeTab!==tab">{{ tab }}</button>
    }
  </div>

  <!-- Attendance Tab -->
  @if (activeTab==='Attendance') {
    <div class="flex flex-wrap gap-2 mb-4 items-center">
      <input [(ngModel)]="selectedDate" type="date" (change)="loadAttendance()" class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"/>
      <button (click)="showClockIn=true"  class="bg-emerald-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-emerald-700">🕐 Clock In</button>
      <button (click)="showClockOut=true" class="bg-orange-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-orange-700">🕕 Clock Out</button>
      <button (click)="showRecord=true"   class="bg-gray-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-gray-700">📝 Record</button>
      <button (click)="showBulkMark=true" class="border border-gray-300 text-gray-700 px-4 py-2 text-sm rounded-xl hover:bg-gray-50">📋 Bulk Mark</button>
      <button (click)="exportCsv()"       class="border border-gray-300 text-gray-700 px-4 py-2 text-sm rounded-xl hover:bg-gray-50">⬇ Export CSV</button>
    </div>
    <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Employee</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Clock In</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Clock Out</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Hours</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Late</th>
        </tr></thead>
        <tbody>
          @for (r of records(); track r.id) {
            <tr class="border-t border-gray-50 hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{{ r.employee_name || (r.employee_id | slice:0:8) }}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-medium text-white" [style.background]="r.status_color">{{ r.status_label }}</span></td>
              <td class="px-4 py-3">{{ r.clock_in ? (r.clock_in | slice:11:16) : '—' }}</td>
              <td class="px-4 py-3">{{ r.clock_out ? (r.clock_out | slice:11:16) : '—' }}</td>
              <td class="px-4 py-3">{{ r.hours_worked ?? '—' }}h</td>
              <td class="px-4 py-3">{{ r.is_late ? r.late_minutes+'min' : '—' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="px-4 py-10 text-center text-gray-400">No records for this date</td></tr>
          }
        </tbody>
      </table>
    </div>
  }

  <!-- Shifts Tab -->
  @if (activeTab==='Shifts') {
    <div class="flex justify-end mb-4">
      <button (click)="showShiftForm=true" class="bg-sage-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-sage-700">+ Create Shift</button>
    </div>
    <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      <ui-loading [loading]="shiftsLoading()"></ui-loading>
      @if (!shiftsLoading()) {
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Shift</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Start</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">End</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Overnight</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
          </tr></thead>
          <tbody>
            @for (s of shifts(); track s.id) {
              <tr class="border-t border-gray-50 hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{ s.name }}</td>
                <td class="px-4 py-3">{{ s.start_time }}</td>
                <td class="px-4 py-3">{{ s.end_time }}</td>
                <td class="px-4 py-3">{{ s.is_overnight ? '🌙 Yes' : 'No' }}</td>
                <td class="px-4 py-3">
                  <button (click)="bulkAssignShift(s)" class="text-sage-600 hover:underline text-xs">Bulk Assign</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="px-4 py-10 text-center text-gray-400">No shifts yet</td></tr>
            }
          </tbody>
        </table>
      }
    </div>
  }

  <!-- Schedule Tab -->
  @if (activeTab==='Schedule') {
    <div class="flex flex-wrap gap-2 mb-4 items-center justify-between">
      <input [(ngModel)]="scheduleDate" type="date" (change)="loadSchedule()" class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"/>
      <button (click)="showAssignForm=true" class="bg-sage-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-sage-700">+ Assign Shift</button>
    </div>
    <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      <ui-loading [loading]="scheduleLoading()"></ui-loading>
      @if (!scheduleLoading()) {
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Employee</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Shift</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
          </tr></thead>
          <tbody>
            @for (a of assignments(); track a.id) {
              <tr class="border-t border-gray-50 hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{ a.employee_name || a.employee_id }}</td>
                <td class="px-4 py-3">{{ a.shift_name || a.shift_id }}</td>
                <td class="px-4 py-3 text-gray-500">{{ a.date }}</td>
                <td class="px-4 py-3">
                  <button (click)="removeAssignment(a.id)" class="text-red-500 hover:underline text-xs">Remove</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="px-4 py-10 text-center text-gray-400">No assignments for this date</td></tr>
            }
          </tbody>
        </table>
      }
    </div>
  }
}

<!-- Clock In -->
@if (showClockIn) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showClockIn=false">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
      <h3 class="text-lg font-semibold mb-4">🕐 Clock In</h3>
      <ui-employee-picker (employeeSelected)="clockEmp=$event" placeholder="Select employee..."></ui-employee-picker>
      @if (clockEmp) { <p class="text-xs text-sage-600 mt-2">✓ {{ clockEmp.full_name }}</p> }
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showClockIn=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
        <button (click)="clockIn()" class="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl">Clock In</button>
      </div>
    </div>
  </div>
}

<!-- Clock Out -->
@if (showClockOut) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showClockOut=false">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
      <h3 class="text-lg font-semibold mb-4">🕕 Clock Out</h3>
      <ui-employee-picker (employeeSelected)="clockEmp=$event" placeholder="Select employee..."></ui-employee-picker>
      @if (clockEmp) { <p class="text-xs text-sage-600 mt-2">✓ {{ clockEmp.full_name }}</p> }
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showClockOut=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
        <button (click)="clockOut()" class="px-4 py-2 text-sm bg-orange-600 text-white rounded-xl">Clock Out</button>
      </div>
    </div>
  </div>
}

<!-- Manual Record -->
@if (showRecord) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showRecord=false">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
      <h3 class="text-lg font-semibold mb-4">📝 Record Attendance</h3>
      <div class="space-y-3">
        <ui-employee-picker (employeeSelected)="clockEmp=$event" placeholder="Select employee..."></ui-employee-picker>
        @if (clockEmp) { <p class="text-xs text-sage-600">✓ {{ clockEmp.full_name }}</p> }
        <select [(ngModel)]="recordStatus" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          <option value="absent">Absent</option>
          <option value="half_day">Half Day</option>
          <option value="on_leave">On Leave</option>
        </select>
        <textarea [(ngModel)]="recordNotes" placeholder="Notes" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showRecord=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
        <button (click)="recordAttendance()" class="px-4 py-2 text-sm bg-gray-700 text-white rounded-xl">Record</button>
      </div>
    </div>
  </div>
}

<!-- Bulk Mark -->
@if (showBulkMark) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showBulkMark=false">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">📋 Bulk Mark Attendance</h3>
      <p class="text-xs text-gray-400 mb-3">Mark all staff for <strong>{{ selectedDate }}</strong> as:</p>
      <div class="space-y-3">
        <select [(ngModel)]="bulkStatus" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="on_leave">On Leave</option>
          <option value="half_day">Half Day</option>
        </select>
        <p class="text-xs text-gray-500">This will mark <strong>{{ employees().length }}</strong> staff members.</p>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showBulkMark=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="bulkMarkAttendance()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Apply to All</button>
      </div>
    </div>
  </div>
}

<!-- Create Shift -->
@if (showShiftForm) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showShiftForm=false">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
      <h3 class="text-lg font-semibold mb-4">Create Shift</h3>
      <div class="space-y-3">
        <input [(ngModel)]="shiftForm.name" placeholder="Shift Name (e.g. Morning)" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"/>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="text-xs text-gray-500">Start Time</label><input [(ngModel)]="shiftForm.start_time" type="time" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 mt-1"/></div>
          <div><label class="text-xs text-gray-500">End Time</label><input [(ngModel)]="shiftForm.end_time" type="time" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 mt-1"/></div>
        </div>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" [(ngModel)]="shiftForm.is_overnight" class="rounded"> Overnight shift</label>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showShiftForm=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
        <button (click)="createShift()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl">Create</button>
      </div>
    </div>
  </div>
}

<!-- Assign Shift -->
@if (showAssignForm) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAssignForm=false">
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
      <h3 class="text-lg font-semibold mb-4">{{ bulkMode ? 'Bulk Assign Shift' : 'Assign Shift' }}</h3>
      <div class="space-y-3">
        <div><label class="text-xs text-gray-500 mb-1 block">Shift</label>
          <select [(ngModel)]="assignForm.shift_id" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            <option value="">Select Shift</option>
            @for (s of shifts(); track s.id) { <option [value]="s.id">{{ s.name }} ({{ s.start_time }}–{{ s.end_time }})</option> }
          </select></div>
        @if (!bulkMode) {
          <div><label class="text-xs text-gray-500 mb-1 block">Employee</label>
            <ui-employee-picker (employeeSelected)="assignEmp=$event" placeholder="Search employee..."></ui-employee-picker>
            @if (assignEmp) { <p class="text-xs text-sage-600 mt-1">✓ {{ assignEmp.full_name }}</p> }
          </div>
          <div><label class="text-xs text-gray-500 mb-1 block">Date</label>
            <input [(ngModel)]="assignForm.date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"/></div>
        } @else {
          <div class="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            Assign all <strong>{{ employees().length }}</strong> staff to this shift
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div><label class="text-xs text-gray-500">From</label><input [(ngModel)]="assignForm.start_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 mt-1"/></div>
            <div><label class="text-xs text-gray-500">To</label><input [(ngModel)]="assignForm.end_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 mt-1"/></div>
          </div>
        }
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showAssignForm=false; bulkMode=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
        <button (click)="bulkMode ? submitBulkAssign() : submitAssign()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl">
          {{ bulkMode ? 'Bulk Assign' : 'Assign' }}
        </button>
      </div>
    </div>
  </div>
}
  `,
})
export class AttendancePage implements OnInit {
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  loading         = signal(true);
  shiftsLoading   = signal(false);
  scheduleLoading = signal(false);
  records     = signal<any[]>([]);
  employees   = signal<any[]>([]);
  shifts      = signal<any[]>([]);
  assignments = signal<any[]>([]);
  summary     = signal({ present:0, absent:0, late:0, half_day:0, on_leave:0 });

  activeTab    = 'Attendance';
  selectedDate = new Date().toISOString().split('T')[0];
  scheduleDate = new Date().toISOString().split('T')[0];

  showClockIn = false; showClockOut = false; showRecord = false;
  showShiftForm = false; showAssignForm = false; showBulkMark = false;
  bulkMode = false;

  clockEmp:  EmployeeOption | null = null;
  assignEmp: EmployeeOption | null = null;
  recordStatus = 'absent';
  recordNotes  = '';
  bulkStatus   = 'present';

  shiftForm:  any = { name:'', start_time:'08:00', end_time:'16:00', is_overnight:false };
  assignForm: any = { shift_id:'', date: new Date().toISOString().split('T')[0], start_date:'', end_date:'' };

  ngOnInit() { this.loadEmployees(); this.loadAttendance(); }

  loadEmployees() {
    this.api.get('/employees/directory', { property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => this.employees.set(r.data ?? []),
    });
  }

  loadAttendance() {
    this.loading.set(true);
    this.api.get('/attendance', { date: this.selectedDate, property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => {
        this.records.set(r.data?.records ?? []);
        this.summary.set(r.data?.summary ?? { present:0, absent:0, late:0, half_day:0, on_leave:0 });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onTabChange(tab: string) {
    if (tab === 'Shifts'   && !this.shifts().length)  this.loadShifts();
    if (tab === 'Schedule') this.loadSchedule();
  }

  loadShifts() {
    this.shiftsLoading.set(true);
    this.api.get('/shifts', { property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => { this.shifts.set(r.data ?? []); this.shiftsLoading.set(false); },
      error: () => this.shiftsLoading.set(false),
    });
  }

  loadSchedule() {
    this.scheduleLoading.set(true);
    this.api.get('/shift-assignments', { date: this.scheduleDate, property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => { this.assignments.set(r.data ?? []); this.scheduleLoading.set(false); },
      error: () => this.scheduleLoading.set(false),
    });
  }

  exportCSV() {
    const rows = this.records();
    const headers = ['Date','Employee','Status','Clock In','Clock Out','Hours','Late'];
    const lines = rows.map((r: any) => [
      r.attendance_date, r.employee_name ?? r.employee_id, r.status,
      r.clock_in ?? '', r.clock_out ?? '', r.hours_worked ?? '', r.is_late ? 'Yes' : 'No'
    ].map((v: any) => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `attendance-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  clockIn() {    const id = this.clockEmp?.employee_id ?? this.clockEmp?.user_id;
    if (!id) { this.toast.error('Select an employee'); return; }
    this.api.post('/attendance/clock-in', { employee_id: id, property_id: this.activeProperty.propertyId() }).subscribe({
      next: () => { this.showClockIn = false; this.clockEmp = null; this.toast.success('Clocked in'); this.loadAttendance(); },
    });
  }

  clockOut() {
    const id = this.clockEmp?.employee_id ?? this.clockEmp?.user_id;
    if (!id) { this.toast.error('Select an employee'); return; }
    this.api.post('/attendance/clock-out', { employee_id: id }).subscribe({
      next: () => { this.showClockOut = false; this.clockEmp = null; this.toast.success('Clocked out'); this.loadAttendance(); },
    });
  }

  recordAttendance() {
    const id = this.clockEmp?.employee_id ?? this.clockEmp?.user_id;
    if (!id) { this.toast.error('Select an employee'); return; }
    this.api.post('/attendance/record', {
      employee_id: id, property_id: this.activeProperty.propertyId(),
      date: this.selectedDate, status: this.recordStatus, notes: this.recordNotes,
    }).subscribe({
      next: () => { this.showRecord = false; this.clockEmp = null; this.toast.success('Recorded'); this.loadAttendance(); },
    });
  }

  bulkMarkAttendance() {
    const empIds = this.employees().map(e => e.employee_id ?? e.user_id).filter(Boolean);
    let remaining = empIds.length;
    if (!remaining) { this.toast.error('No employees found'); return; }
    empIds.forEach(id => {
      this.api.post('/attendance/record', {
        employee_id: id, property_id: this.activeProperty.propertyId(),
        date: this.selectedDate, status: this.bulkStatus,
      }).subscribe({ complete: () => { if (--remaining === 0) { this.toast.success('Bulk mark done'); this.showBulkMark = false; this.loadAttendance(); } } });
    });
  }

  exportCsv() {
    const headers = ['Employee','Status','Clock In','Clock Out','Hours','Late'];
    const rows = this.records().map(r => [
      r.employee_name ?? r.employee_id, r.status_label,
      r.clock_in ? r.clock_in.slice(11,16) : '',
      r.clock_out ? r.clock_out.slice(11,16) : '',
      r.hours_worked ?? '',
      r.is_late ? r.late_minutes+'min' : '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `attendance-${this.selectedDate}.csv`;
    a.click();
  }

  createShift() {
    if (!this.shiftForm.name) { this.toast.error('Shift name required'); return; }
    this.api.post('/shifts', { ...this.shiftForm, property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => {
        if (r?.success) { this.toast.success('Shift created'); this.showShiftForm = false; this.shiftForm = { name:'', start_time:'08:00', end_time:'16:00', is_overnight:false }; this.loadShifts(); }
        else this.toast.error(r?.message || 'Failed');
      },
    });
  }

  submitAssign() {
    const empId = this.assignEmp?.employee_id ?? this.assignEmp?.user_id;
    if (!this.assignForm.shift_id || !empId) { this.toast.error('Select shift and employee'); return; }
    this.api.post('/shift-assignments', { ...this.assignForm, employee_id: empId, property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => {
        if (r?.success) { this.toast.success('Assigned'); this.showAssignForm = false; this.assignEmp = null; this.loadSchedule(); }
        else this.toast.error(r?.message || 'Failed');
      },
    });
  }

  submitBulkAssign() {
    if (!this.assignForm.shift_id || !this.assignForm.start_date || !this.assignForm.end_date) {
      this.toast.error('Select shift and date range'); return;
    }
    this.api.post('/shift-assignments/bulk', {
      shift_id: this.assignForm.shift_id,
      employee_ids: this.employees().map(e => e.employee_id ?? e.user_id).filter(Boolean),
      start_date: this.assignForm.start_date, end_date: this.assignForm.end_date,
      property_id: this.activeProperty.propertyId(),
    }).subscribe({
      next: (r: any) => {
        if (r?.success) { this.toast.success('Bulk assigned'); this.showAssignForm = false; this.bulkMode = false; this.loadSchedule(); }
        else this.toast.error(r?.message || 'Failed');
      },
    });
  }

  bulkAssignShift(shift: any) {
    this.bulkMode = true;
    this.assignForm = { shift_id: shift.id, start_date: this.scheduleDate, end_date: this.scheduleDate };
    this.showAssignForm = true;
  }

  removeAssignment(id: string) {
    this.api.delete(`/shift-assignments/${id}`).subscribe({
      next: () => { this.toast.success('Removed'); this.loadSchedule(); },
    });
  }
}
