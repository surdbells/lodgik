import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [FormsModule, SlicePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Attendance" icon="🕐" [breadcrumbs]="['Human Resources', 'Attendance']" subtitle="Daily attendance & clock in/out"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <ui-stats-card label="Present" [value]="summary().present" icon="✅"></ui-stats-card>
        <ui-stats-card label="Late" [value]="summary().late" icon="⏰"></ui-stats-card>
        <ui-stats-card label="Absent" [value]="summary().absent" icon="❌"></ui-stats-card>
        <ui-stats-card label="Half Day" [value]="summary().half_day" icon="🌗"></ui-stats-card>
        <ui-stats-card label="On Leave" [value]="summary().on_leave" icon="🏖️"></ui-stats-card>
      </div>

      <div class="flex flex-wrap gap-2 mb-4 items-center">
        <input [(ngModel)]="selectedDate" type="date" (change)="load()" class="border rounded-lg px-3 py-1.5 text-sm" />
        <button (click)="showClockIn = true" class="bg-green-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-green-700">🕐 Clock In</button>
        <button (click)="showClockOut = true" class="bg-orange-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-orange-700">🕕 Clock Out</button>
        <button (click)="showRecord = true" class="bg-gray-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-gray-700">📝 Record</button>
      </div>

      <!-- Attendance Table -->
      <div class="bg-white rounded-xl border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Employee</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Clock In</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Clock Out</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Hours</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Late</th>
          </tr></thead>
          <tbody>
            @for (r of records(); track r.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3">{{ r.employee_id | slice:0:8 }}...</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs text-white" [style.background]="r.status_color">{{ r.status_label }}</span></td>
                <td class="px-4 py-3">{{ r.clock_in ? (r.clock_in | slice:11:16) : '—' }}</td>
                <td class="px-4 py-3">{{ r.clock_out ? (r.clock_out | slice:11:16) : '—' }}</td>
                <td class="px-4 py-3">{{ r.hours_worked }}h</td>
                <td class="px-4 py-3">{{ r.is_late ? r.late_minutes + 'min' : '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No attendance records for this date</td></tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Clock In Dialog -->
    @if (showClockIn) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showClockIn = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">🕐 Clock In</h3>
          <select [(ngModel)]="clockEmpId" class="border rounded-lg px-3 py-2 text-sm w-full mb-3">
            <option value="">Select Employee</option>
            @for (e of employees(); track e.id) { <option [value]="e.id">{{ e.full_name }} ({{ e.staff_id }})</option> }
          </select>
          <div class="flex justify-end gap-2">
            <button (click)="showClockIn = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="clockIn()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Clock In</button>
          </div>
        </div>
      </div>
    }

    <!-- Clock Out Dialog -->
    @if (showClockOut) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showClockOut = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">🕕 Clock Out</h3>
          <select [(ngModel)]="clockEmpId" class="border rounded-lg px-3 py-2 text-sm w-full mb-3">
            <option value="">Select Employee</option>
            @for (e of employees(); track e.id) { <option [value]="e.id">{{ e.full_name }} ({{ e.staff_id }})</option> }
          </select>
          <div class="flex justify-end gap-2">
            <button (click)="showClockOut = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="clockOut()" class="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">Clock Out</button>
          </div>
        </div>
      </div>
    }

    <!-- Manual Record Dialog -->
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
            <button (click)="recordAttendance()" class="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800">Record</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AttendancePage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  loading = signal(true);
  records = signal<any[]>([]);
  employees = signal<any[]>([]);
  summary = signal({ present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 });
  selectedDate = new Date().toISOString().split('T')[0];
  showClockIn = false; showClockOut = false; showRecord = false;
  clockEmpId = '';
  recordStatus = 'absent';
  recordNotes = '';

  ngOnInit() { this.loadEmployees(); this.load(); }

  loadEmployees() {
    this.api.get('/employees/directory', { property_id: this.auth.currentUser?.property_id ?? '' }).subscribe({
      next: (r: any) => this.employees.set(r.data || []),
    });
  }

  load() {
    this.loading.set(true);
    this.api.get('/attendance', { date: this.selectedDate, property_id: this.auth.currentUser?.property_id ?? '' }).subscribe({
      next: (r: any) => {
        this.records.set(r.data?.records || []);
        this.summary.set(r.data?.summary || { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  clockIn() {
    if (!this.clockEmpId) return;
    this.api.post('/attendance/clock-in', { employee_id: this.clockEmpId, property_id: this.auth.currentUser?.property_id ?? '' }).subscribe({
      next: () => { this.showClockIn = false; this.clockEmpId = ''; this.load(); },
    });
  }

  clockOut() {
    if (!this.clockEmpId) return;
    this.api.post('/attendance/clock-out', { employee_id: this.clockEmpId }).subscribe({
      next: () => { this.showClockOut = false; this.clockEmpId = ''; this.load(); },
    });
  }

  recordAttendance() {
    if (!this.clockEmpId) return;
    this.api.post('/attendance/record', { employee_id: this.clockEmpId, property_id: this.auth.currentUser?.property_id ?? '', date: this.selectedDate, status: this.recordStatus, notes: this.recordNotes }).subscribe({
      next: () => { this.showRecord = false; this.clockEmpId = ''; this.load(); },
    });
  }
}
