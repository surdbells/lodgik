import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ActivePropertyService, ToastService } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [FormsModule, SlicePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Attendance & Shifts" icon="clock" [breadcrumbs]="['Human Resources', 'Attendance']" subtitle="Daily attendance, clock in/out, and shift scheduling"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <ui-stats-card label="Present" [value]="summary().present" icon="circle-check"></ui-stats-card>
        <ui-stats-card label="Late" [value]="summary().late" icon="clock"></ui-stats-card>
        <ui-stats-card label="Absent" [value]="summary().absent" icon="circle-x"></ui-stats-card>
        <ui-stats-card label="Half Day" [value]="summary().half_day" icon="moon"></ui-stats-card>
        <ui-stats-card label="On Leave" [value]="summary().on_leave" icon="tree-palm"></ui-stats-card>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        @for (tab of ['Attendance', 'Shifts', 'Schedule']; track tab) {
          <button (click)="activeTab = tab; onTabChange(tab)"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            [class.bg-white]="activeTab === tab" [class.shadow-sm]="activeTab === tab"
            [class.text-sage-700]="activeTab === tab" [class.font-semibold]="activeTab === tab"
            [class.text-gray-500]="activeTab !== tab">
            {{ tab }}
          </button>
        }
      </div>

      <!-- Attendance Tab -->
      @if (activeTab === 'Attendance') {
        <div class="flex flex-wrap gap-2 mb-4 items-center">
          <input [(ngModel)]="selectedDate" type="date" (change)="loadAttendance()" class="border rounded-lg px-3 py-1.5 text-sm" />
          <button (click)="showClockIn = true" class="bg-emerald-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-emerald-700">🕐 Clock In</button>
          <button (click)="showClockOut = true" class="bg-orange-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-orange-700">🕕 Clock Out</button>
          <button (click)="showRecord = true" class="bg-gray-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-gray-700">📝 Record</button>
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
                  <td class="px-4 py-3">{{ r.is_late ? r.late_minutes + 'min' : '—' }}</td>
                </tr>
              }
              @empty { <tr><td colspan="6" class="px-4 py-10 text-center text-gray-400">No records for this date</td></tr> }
            </tbody>
          </table>
        </div>
      }

      <!-- Shifts Tab -->
      @if (activeTab === 'Shifts') {
        <div class="flex justify-end mb-4">
          <button (click)="showShiftForm = true" class="bg-sage-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-sage-700">+ Create Shift</button>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <ui-loading [loading]="shiftsLoading()"></ui-loading>
          @if (!shiftsLoading()) {
            <table class="w-full text-sm">
              <thead class="bg-gray-50"><tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Shift Name</th>
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
                }
                @empty { <tr><td colspan="5" class="px-4 py-10 text-center text-gray-400">No shifts created yet</td></tr> }
              </tbody>
            </table>
          }
        </div>
      }

      <!-- Schedule Tab -->
      @if (activeTab === 'Schedule') {
        <div class="flex flex-wrap gap-2 mb-4 items-center justify-between">
          <input [(ngModel)]="scheduleDate" type="date" (change)="loadSchedule()" class="border rounded-lg px-3 py-1.5 text-sm" />
          <button (click)="showAssignForm = true" class="bg-sage-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-sage-700">+ Assign Shift</button>
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
                }
                @empty { <tr><td colspan="4" class="px-4 py-10 text-center text-gray-400">No assignments for this date</td></tr> }
              </tbody>
            </table>
          }
        </div>
      }
    }

    <!-- Clock In -->
    @if (showClockIn) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showClockIn = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">🕐 Clock In</h3>
          <select [(ngModel)]="clockEmpId" class="border rounded-lg px-3 py-2 text-sm w-full mb-3">
            <option value="">Select Employee</option>
            @for (e of employees(); track e.id) { <option [value]="e.id">{{ e.full_name }}</option> }
          </select>
          <div class="flex justify-end gap-2">
            <button (click)="showClockIn = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="clockIn()" class="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg">Clock In</button>
          </div>
        </div>
      </div>
    }

    <!-- Clock Out -->
    @if (showClockOut) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showClockOut = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">🕕 Clock Out</h3>
          <select [(ngModel)]="clockEmpId" class="border rounded-lg px-3 py-2 text-sm w-full mb-3">
            <option value="">Select Employee</option>
            @for (e of employees(); track e.id) { <option [value]="e.id">{{ e.full_name }}</option> }
          </select>
          <div class="flex justify-end gap-2">
            <button (click)="showClockOut = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="clockOut()" class="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg">Clock Out</button>
          </div>
        </div>
      </div>
    }

    <!-- Manual Record -->
    @if (showRecord) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showRecord = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">📝 Record Attendance</h3>
          <select [(ngModel)]="clockEmpId" class="border rounded-lg px-3 py-2 text-sm w-full mb-2">
            <option value="">Select Employee</option>
            @for (e of employees(); track e.id) { <option [value]="e.id">{{ e.full_name }}</option> }
          </select>
          <select [(ngModel)]="recordStatus" class="border rounded-lg px-3 py-2 text-sm w-full mb-2">
            <option value="absent">Absent</option>
            <option value="half_day">Half Day</option>
            <option value="on_leave">On Leave</option>
          </select>
          <textarea [(ngModel)]="recordNotes" placeholder="Notes" rows="2" class="border rounded-lg px-3 py-2 text-sm w-full mb-3"></textarea>
          <div class="flex justify-end gap-2">
            <button (click)="showRecord = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="recordAttendance()" class="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg">Record</button>
          </div>
        </div>
      </div>
    }

    <!-- Create Shift -->
    @if (showShiftForm) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showShiftForm = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">Create Shift</h3>
          <div class="space-y-3">
            <input [(ngModel)]="shiftForm.name" placeholder="Shift Name (e.g. Morning)" class="border rounded-lg px-3 py-2 text-sm w-full" />
            <div class="grid grid-cols-2 gap-2">
              <div><label class="text-xs text-gray-500">Start Time</label><input [(ngModel)]="shiftForm.start_time" type="time" class="border rounded-lg px-3 py-2 text-sm w-full mt-1" /></div>
              <div><label class="text-xs text-gray-500">End Time</label><input [(ngModel)]="shiftForm.end_time" type="time" class="border rounded-lg px-3 py-2 text-sm w-full mt-1" /></div>
            </div>
            <label class="flex items-center gap-2 text-sm"><input type="checkbox" [(ngModel)]="shiftForm.is_overnight" class="rounded"> Overnight shift</label>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showShiftForm = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="createShift()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-lg">Create</button>
          </div>
        </div>
      </div>
    }

    <!-- Assign Shift -->
    @if (showAssignForm) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAssignForm = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">{{ bulkMode ? 'Bulk Assign Shift' : 'Assign Shift' }}</h3>
          <div class="space-y-3">
            <select [(ngModel)]="assignForm.shift_id" class="border rounded-lg px-3 py-2 text-sm w-full">
              <option value="">Select Shift</option>
              @for (s of shifts(); track s.id) { <option [value]="s.id">{{ s.name }} ({{ s.start_time }}–{{ s.end_time }})</option> }
            </select>
            @if (!bulkMode) {
              <select [(ngModel)]="assignForm.employee_id" class="border rounded-lg px-3 py-2 text-sm w-full">
                <option value="">Select Employee</option>
                @for (e of employees(); track e.id) { <option [value]="e.id">{{ e.full_name }}</option> }
              </select>
              <input [(ngModel)]="assignForm.date" type="date" class="border rounded-lg px-3 py-2 text-sm w-full" />
            } @else {
              <div class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                Assign <strong>{{ bulkEmployeeIds.length }}</strong> employee(s) to this shift
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div><label class="text-xs text-gray-500">From Date</label><input [(ngModel)]="assignForm.start_date" type="date" class="border rounded-lg px-3 py-2 text-sm w-full mt-1" /></div>
                <div><label class="text-xs text-gray-500">To Date</label><input [(ngModel)]="assignForm.end_date" type="date" class="border rounded-lg px-3 py-2 text-sm w-full mt-1" /></div>
              </div>
            }
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showAssignForm = false; bulkMode = false; bulkEmployeeIds = []" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="bulkMode ? submitBulkAssign() : submitAssign()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-lg">
              {{ bulkMode ? 'Bulk Assign' : 'Assign' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AttendancePage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  shiftsLoading = signal(false);
  scheduleLoading = signal(false);
  records = signal<any[]>([]);
  employees = signal<any[]>([]);
  shifts = signal<any[]>([]);
  assignments = signal<any[]>([]);
  summary = signal({ present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 });

  activeTab = 'Attendance';
  selectedDate = new Date().toISOString().split('T')[0];
  scheduleDate = new Date().toISOString().split('T')[0];

  showClockIn = false;
  showClockOut = false;
  showRecord = false;
  showShiftForm = false;
  showAssignForm = false;
  bulkMode = false;
  bulkEmployeeIds: string[] = [];

  clockEmpId = '';
  recordStatus = 'absent';
  recordNotes = '';

  shiftForm: any = { name: '', start_time: '08:00', end_time: '16:00', is_overnight: false };
  assignForm: any = { shift_id: '', employee_id: '', date: new Date().toISOString().split('T')[0], start_date: '', end_date: '' };

  ngOnInit() {
    this.loadEmployees();
    this.loadAttendance();
  }

  loadEmployees() {
    this.api.get('/employees/directory', { property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => this.employees.set(r.data || []),
    });
  }

  loadAttendance() {
    this.loading.set(true);
    this.api.get('/attendance', { date: this.selectedDate, property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => {
        this.records.set(r.data?.records || []);
        this.summary.set(r.data?.summary || { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onTabChange(tab: string) {
    if (tab === 'Shifts' && this.shifts().length === 0) this.loadShifts();
    if (tab === 'Schedule') this.loadSchedule();
  }

  loadShifts() {
    this.shiftsLoading.set(true);
    this.api.get('/shifts', { property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => { this.shifts.set(r.data || []); this.shiftsLoading.set(false); },
      error: () => this.shiftsLoading.set(false),
    });
  }

  loadSchedule() {
    this.scheduleLoading.set(true);
    this.api.get('/shift-assignments', { date: this.scheduleDate, property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => { this.assignments.set(r.data || []); this.scheduleLoading.set(false); },
      error: () => this.scheduleLoading.set(false),
    });
  }

  // Actions
  load() { this.loadAttendance(); }

  clockIn() {
    if (!this.clockEmpId) return;
    this.api.post('/attendance/clock-in', { employee_id: this.clockEmpId, property_id: this.activeProperty.propertyId() }).subscribe({
      next: () => { this.showClockIn = false; this.clockEmpId = ''; this.toast.success('Clocked in'); this.loadAttendance(); },
    });
  }

  clockOut() {
    if (!this.clockEmpId) return;
    this.api.post('/attendance/clock-out', { employee_id: this.clockEmpId }).subscribe({
      next: () => { this.showClockOut = false; this.clockEmpId = ''; this.toast.success('Clocked out'); this.loadAttendance(); },
    });
  }

  recordAttendance() {
    if (!this.clockEmpId) return;
    this.api.post('/attendance/record', { employee_id: this.clockEmpId, property_id: this.activeProperty.propertyId(), date: this.selectedDate, status: this.recordStatus, notes: this.recordNotes }).subscribe({
      next: () => { this.showRecord = false; this.clockEmpId = ''; this.toast.success('Recorded'); this.loadAttendance(); },
    });
  }

  createShift() {
    if (!this.shiftForm.name) { this.toast.error('Shift name is required'); return; }
    this.api.post('/shifts', { ...this.shiftForm, property_id: this.activeProperty.propertyId() }).subscribe({
      next: r => {
        if (r?.success) { this.toast.success('Shift created'); this.showShiftForm = false; this.shiftForm = { name: '', start_time: '08:00', end_time: '16:00', is_overnight: false }; this.loadShifts(); }
        else this.toast.error(r?.message || 'Failed');
      },
    });
  }

  submitAssign() {
    if (!this.assignForm.shift_id || !this.assignForm.employee_id) { this.toast.error('Select shift and employee'); return; }
    this.api.post('/shift-assignments', { ...this.assignForm, property_id: this.activeProperty.propertyId() }).subscribe({
      next: r => {
        if (r?.success) { this.toast.success('Shift assigned'); this.showAssignForm = false; this.loadSchedule(); }
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
      employee_ids: this.bulkEmployeeIds,
      start_date: this.assignForm.start_date,
      end_date: this.assignForm.end_date,
      property_id: this.activeProperty.propertyId(),
    }).subscribe({
      next: r => {
        if (r?.success) { this.toast.success('Bulk assignment done'); this.showAssignForm = false; this.bulkMode = false; this.bulkEmployeeIds = []; this.loadSchedule(); }
        else this.toast.error(r?.message || 'Failed');
      },
    });
  }

  bulkAssignShift(shift: any) {
    this.bulkMode = true;
    this.bulkEmployeeIds = this.employees().map(e => e.id);
    this.assignForm = { shift_id: shift.id, start_date: this.scheduleDate, end_date: this.scheduleDate };
    this.showAssignForm = true;
  }

  removeAssignment(id: string) {
    this.api.delete(`/shift-assignments/${id}`).subscribe({
      next: () => { this.toast.success('Assignment removed'); this.loadSchedule(); },
    });
  }
}
