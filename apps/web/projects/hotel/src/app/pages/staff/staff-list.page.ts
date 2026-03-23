import { PAGE_TOURS } from '../../services/page-tours';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction,
  LoadingSpinnerComponent, ToastService, ConfirmDialogService, ConfirmDialogComponent, TourService,
  ActivePropertyService, StatsCardComponent,
} from '@lodgik/shared';

const ROLES = [
  { value: 'manager',      label: 'Manager' },
  { value: 'front_desk',   label: 'Front Desk' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'maintenance',  label: 'Maintenance' },
  { value: 'restaurant',   label: 'Restaurant' },
  { value: 'bar',          label: 'Bar' },
  { value: 'kitchen',      label: 'Kitchen' },
  { value: 'accountant',   label: 'Accountant' },
  { value: 'security',     label: 'Security' },
  { value: 'concierge',    label: 'Concierge' },
];

const EMP_TYPES = [
  { value: 'permanent', label: 'Permanent',  color: '#4A7A4A', bg: '#E8F0E8' },
  { value: 'contract',  label: 'Contract',   color: '#2563EB', bg: '#EFF6FF' },
  { value: 'ad_hoc',   label: 'Ad Hoc',     color: '#D97706', bg: '#FEF3C7' },
  { value: 'intern',   label: 'Intern',     color: '#7C3AED', bg: '#F5F3FF' },
  { value: 'volunteer',label: 'Volunteer',  color: '#059669', bg: '#ECFDF5' },
];

const SCHEDULES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'shift',     label: 'Shift' },
  { value: 'remote',    label: 'Remote' },
  { value: 'hybrid',    label: 'Hybrid' },
];

function empTypeMeta(val: string) {
  return EMP_TYPES.find(e => e.value === val) ?? EMP_TYPES[0];
}
function fmtRole(val: string): string {
  return val?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? val;
}

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [
    FormsModule, DatePipe, PageHeaderComponent, DataTableComponent,
    LoadingSpinnerComponent, ConfirmDialogComponent, StatsCardComponent,
  ],
  template: `
<ui-confirm-dialog/>

<ui-page-header title="People" icon="users" subtitle="Staff accounts and employee HR records"
  [breadcrumbs]="['Human Resources', 'People']"
  tourKey="staff" (tourClick)="startTour()">
  <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors"
    (click)="openAdd()">+ Add Person</button>
</ui-page-header>

<!-- Stats -->
<div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5" data-tour="staff-stats">
  <ui-stats-card label="Total People"        [value]="stats().total"       icon="users"></ui-stats-card>
  <ui-stats-card label="Active"              [value]="stats().active"      icon="circle-check"></ui-stats-card>
  <ui-stats-card label="Permanent"           [value]="stats().permanent"   icon="briefcase"></ui-stats-card>
  <ui-stats-card label="Contract / Ad Hoc"   [value]="stats().nonPermanent" icon="clock"></ui-stats-card>
  <ui-stats-card label="Expiring (30 days)"  [value]="stats().expiring"    icon="triangle-alert"></ui-stats-card>
</div>

<!-- Filters -->
<div class="flex flex-wrap gap-2 mb-4">
  <input [(ngModel)]="search" (input)="load()" placeholder="Search name, email, staff ID..."
    class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 flex-1 min-w-[200px]">
  <select [(ngModel)]="filterRole" (change)="load()"
    class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
    <option value="">All Roles</option>
    @for (r of roles; track r.value) { <option [value]="r.value">{{ r.label }}</option> }
  </select>
  <select [(ngModel)]="filterType" (change)="load()"
    class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
    <option value="">All Types</option>
    @for (t of empTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
  </select>
  <select [(ngModel)]="filterDept" (change)="load()"
    class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
    <option value="">All Departments</option>
    @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
  </select>
  <select [(ngModel)]="filterActive" (change)="load()"
    class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
    <option value="">All Status</option>
    <option value="1">Active only</option>
    <option value="0">Inactive only</option>
  </select>
</div>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
  <ui-data-table
    [columns]="columns" [data]="staff()" [actions]="actions"
    [totalItems]="total()" (pageChange)="onPage($event)">
  </ui-data-table>
}

<!-- ══ ADD PERSON MODAL ══════════════════════════════════════════════════════ -->
@if (showAdd) {
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    (click)="showAdd = false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
      (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold text-gray-800 mb-4">Add Person</h3>

      <!-- Tabs -->
      <div class="flex border-b mb-5">
        @for (tab of addTabs; track tab.id) {
          <button (click)="addTab = tab.id"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
            [class]="addTab === tab.id
              ? 'border-sage-600 text-sage-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Tab: Account -->
      @if (addTab === 'account') {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 mb-1 block">First Name *</label>
            <input [(ngModel)]="addForm.first_name" placeholder="First name"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Last Name *</label>
            <input [(ngModel)]="addForm.last_name" placeholder="Last name"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Email *</label>
            <input [(ngModel)]="addForm.email" type="email" placeholder="email@example.com"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Password *</label>
            <input [(ngModel)]="addForm.password" type="password" placeholder="••••••••"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">System Role *</label>
            <select [(ngModel)]="addForm.role"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              @for (r of roles; track r.value) { <option [value]="r.value">{{ r.label }}</option> }
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Phone</label>
            <input [(ngModel)]="addForm.phone" placeholder="+234..."
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-3">Continue to the HR Record tab to set employment details (optional but recommended).</p>
      }

      <!-- Tab: HR Record -->
      @if (addTab === 'hr') {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Job Title</label>
            <input [(ngModel)]="addForm.job_title" placeholder="e.g. Senior Receptionist"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Department</label>
            <select [(ngModel)]="addForm.department_id"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              <option value="">No Department</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Employment Type</label>
            <select [(ngModel)]="addForm.employment_type"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              @for (t of empTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Work Schedule</label>
            <select [(ngModel)]="addForm.work_schedule"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              @for (s of schedules; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Hire Date</label>
            <input [(ngModel)]="addForm.hire_date" type="date"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Monthly Gross Salary (₦)</label>
            <input [(ngModel)]="addForm.gross_salary" type="number" placeholder="0"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
          @if (addForm.employment_type === 'contract' || addForm.employment_type === 'ad_hoc' || addForm.employment_type === 'intern') {
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Contract Start</label>
              <input [(ngModel)]="addForm.contract_start" type="date"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Contract End</label>
              <input [(ngModel)]="addForm.contract_end" type="date"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            </div>
          }
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Work Location</label>
            <input [(ngModel)]="addForm.work_location" placeholder="e.g. Main Building, Floor 2"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Notice Period (days)</label>
            <input [(ngModel)]="addForm.notice_period_days" type="number" placeholder="30"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
          </div>
        </div>
      }

      <div class="flex justify-end gap-2 mt-5 pt-4 border-t">
        <button (click)="showAdd = false"
          class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          Cancel
        </button>
        <button (click)="submitAdd()" [disabled]="addSaving"
          class="px-5 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-50 flex items-center gap-2">
          @if (addSaving) {
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          }
          Add Person
        </button>
      </div>
    </div>
  </div>
}

<!-- ══ PERSON DETAIL PANEL ════════════════════════════════════════════════════ -->
@if (selected()) {
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
    (click)="selected.set(null)">
    <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
      (click)="$event.stopPropagation()">

      <!-- Header -->
      <div class="flex items-center gap-4 p-5 border-b sticky top-0 bg-white z-10">
        <div class="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-lg font-bold flex-shrink-0 overflow-hidden">
          @if (selected()!.avatar_url) {
            <img [src]="selected()!.avatar_url" class="w-full h-full object-cover" alt="">
          } @else {
            {{ selected()!.first_name?.charAt(0) }}{{ selected()!.last_name?.charAt(0) }}
          }
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-base font-semibold text-gray-900">{{ selected()!.first_name }} {{ selected()!.last_name }}</h2>
            @if (empRecord()) {
              @let et = empTypeMeta(empRecord()!.employment_type);
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                [style.color]="et.color" [style.background]="et.bg">
                {{ et.label }}
              </span>
            }
            <span class="text-[11px] px-2 py-0.5 rounded-full"
              [class]="selected()!.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'">
              {{ selected()!.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <p class="text-sm text-gray-500">{{ fmtRole(selected()!.role) }}
            @if (empRecord()?.job_title && empRecord()!.job_title !== fmtRole(selected()!.role)) {
              · {{ empRecord()!.job_title }}
            }
          </p>
        </div>
        <button (click)="selected.set(null)" class="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Detail Tabs -->
      <div class="flex border-b px-5">
        @for (tab of detailTabs; track tab.id) {
          <button (click)="detailTab = tab.id"
            class="px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            [class]="detailTab === tab.id
              ? 'border-sage-600 text-sage-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'">
            {{ tab.label }}
          </button>
        }
      </div>

      <div class="p-5">

        <!-- ── Account Tab ─────────────────────────────────────────────── -->
        @if (detailTab === 'account') {
          <div class="space-y-4">
            <!-- Read / Edit account fields -->
            @if (!editingAccount) {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span class="text-gray-400 text-xs block mb-0.5">Email</span><span class="text-gray-800">{{ selected()!.email }}</span></div>
                <div><span class="text-gray-400 text-xs block mb-0.5">Phone</span><span class="text-gray-800">{{ selected()!.phone || '—' }}</span></div>
                <div><span class="text-gray-400 text-xs block mb-0.5">System Role</span>
                  <span class="px-2 py-0.5 bg-gray-100 rounded text-xs">{{ fmtRole(selected()!.role) }}</span>
                </div>
                <div><span class="text-gray-400 text-xs block mb-0.5">Joined</span>
                  <span class="text-gray-800">{{ selected()!.created_at | date:'dd MMM yyyy' }}</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-2 pt-2 border-t">
                <button (click)="editingAccount = true"
                  class="px-3 py-1.5 text-xs bg-sage-50 text-sage-700 border border-sage-200 rounded-lg hover:bg-sage-100">
                  Edit Account
                </button>
                <button (click)="openPropertyAccess(selected()!)"
                  class="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100">
                  Property Access
                </button>
                <button (click)="openResetPw(selected()!)"
                  class="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                  Reset Password
                </button>
                @if (selected()!.is_active) {
                  <button (click)="deactivate(selected()!)"
                    class="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">
                    Deactivate
                  </button>
                } @else {
                  <button (click)="reactivate(selected()!)"
                    class="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100">
                    Reactivate
                  </button>
                }
              </div>
            } @else {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">First Name</label>
                  <input [(ngModel)]="acctForm.first_name" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">Last Name</label>
                  <input [(ngModel)]="acctForm.last_name" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">Email</label>
                  <input [(ngModel)]="acctForm.email" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">Phone</label>
                  <input [(ngModel)]="acctForm.phone" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">Role</label>
                  <select [(ngModel)]="acctForm.role" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                    @for (r of roles; track r.value) { <option [value]="r.value">{{ r.label }}</option> }
                  </select>
                </div>
                <!-- Avatar upload -->
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">Avatar</label>
                  <label class="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 cursor-pointer hover:bg-gray-100">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span class="text-gray-500">{{ acctForm._avatarBase64 ? 'New image selected' : 'Upload photo' }}</span>
                    <input type="file" accept="image/*" class="hidden" (change)="onAvatarSelect($event)">
                  </label>
                </div>
              </div>
              <div class="flex justify-end gap-2 pt-3 border-t mt-3">
                <button (click)="editingAccount = false" class="px-3 py-1.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
                <button (click)="saveAccount()" class="px-4 py-1.5 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Save</button>
              </div>
            }
          </div>
        }

        <!-- ── HR Record Tab ───────────────────────────────────────────── -->
        @if (detailTab === 'hr') {
          @if (loadingHr()) {
            <div class="flex items-center justify-center py-8">
              <svg class="animate-spin w-6 h-6 text-sage-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          } @else if (!empRecord() && !editingHr) {
            <!-- No HR record yet -->
            <div class="text-center py-8">
              <div class="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p class="text-sm font-medium text-gray-700 mb-1">No HR record yet</p>
              <p class="text-xs text-gray-400 mb-4">Add employment details, salary, bank, and tax information for this person.</p>
              <button (click)="startHrEdit()"
                class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">
                Create HR Record
              </button>
            </div>
          } @else if (empRecord() && !editingHr) {
            <!-- View HR record -->
            @if (empRecord()!.contract_expiring_soon) {
              <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                <svg class="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                <span class="text-sm text-amber-800 font-medium">Contract expires soon</span>
                <span class="text-xs text-amber-600">— {{ empRecord()!.contract_end | date:'dd MMM yyyy' }}</span>
              </div>
            }
            <div class="space-y-4">
              <!-- Employment -->
              <div>
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Employment</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div><span class="text-gray-400 text-xs block mb-0.5">Staff ID</span><span class="font-mono text-gray-700">{{ empRecord()!.staff_id }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Job Title</span><span class="text-gray-800">{{ empRecord()!.job_title }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Department</span><span class="text-gray-800">{{ deptName(empRecord()!.department_id) }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Type</span>
                    @let et = empTypeMeta(empRecord()!.employment_type);
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full" [style.color]="et.color" [style.background]="et.bg">{{ et.label }}</span>
                  </div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Schedule</span><span class="text-gray-800">{{ fmtSched(empRecord()!.work_schedule) }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Location</span><span class="text-gray-800">{{ empRecord()!.work_location || '—' }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Hire Date</span><span class="text-gray-800">{{ empRecord()!.hire_date | date:'dd MMM yyyy' }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Notice Period</span><span class="text-gray-800">{{ empRecord()!.notice_period_days }} days</span></div>
                  @if (empRecord()!.contract_start) {
                    <div><span class="text-gray-400 text-xs block mb-0.5">Contract Start</span><span class="text-gray-800">{{ empRecord()!.contract_start | date:'dd MMM yyyy' }}</span></div>
                    <div><span class="text-gray-400 text-xs block mb-0.5">Contract End</span><span class="text-gray-800">{{ empRecord()!.contract_end | date:'dd MMM yyyy' }}</span></div>
                  }
                </div>
              </div>
              <!-- Compensation -->
              <div>
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Compensation</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div><span class="text-gray-400 text-xs block mb-0.5">Monthly Gross</span>
                    <span class="text-gray-800 font-medium">₦{{ (empRecord()!.gross_salary / 100).toLocaleString('en-NG', {minimumFractionDigits:2}) }}</span>
                  </div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Bank</span><span class="text-gray-800">{{ empRecord()!.bank_name || '—' }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Account #</span><span class="font-mono text-gray-700">{{ empRecord()!.bank_account_number || '—' }}</span></div>
                  <div class="sm:col-span-2"><span class="text-gray-400 text-xs block mb-0.5">Account Name</span><span class="text-gray-800">{{ empRecord()!.bank_account_name || '—' }}</span></div>
                </div>
              </div>
              <!-- Tax & Compliance -->
              <div>
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tax & Compliance</h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><span class="text-gray-400 text-xs block mb-0.5">NIN</span><span class="font-mono text-gray-700">{{ empRecord()!.nin || '—' }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Tax ID (TIN)</span><span class="font-mono text-gray-700">{{ empRecord()!.tax_id || '—' }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Pension PIN</span><span class="font-mono text-gray-700">{{ empRecord()!.pension_pin || '—' }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">NHF ID</span><span class="font-mono text-gray-700">{{ empRecord()!.nhf_id || '—' }}</span></div>
                </div>
              </div>
              <!-- Personal -->
              <div>
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Personal</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div><span class="text-gray-400 text-xs block mb-0.5">Date of Birth</span><span class="text-gray-800">{{ (empRecord()!.date_of_birth | date:'dd MMM yyyy') || '—' }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Gender</span><span class="text-gray-800 capitalize">{{ empRecord()!.gender || '—' }}</span></div>
                  <div class="sm:col-span-2"><span class="text-gray-400 text-xs block mb-0.5">Address</span><span class="text-gray-800">{{ empRecord()!.address || '—' }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Emergency Contact</span><span class="text-gray-800">{{ empRecord()!.emergency_contact_name || '—' }}</span></div>
                  <div><span class="text-gray-400 text-xs block mb-0.5">Emergency Phone</span><span class="text-gray-800">{{ empRecord()!.emergency_contact_phone || '—' }}</span></div>
                </div>
              </div>
            </div>
            <div class="flex gap-2 pt-4 border-t mt-4">
              <button (click)="startHrEdit()"
                class="px-3 py-1.5 text-xs bg-sage-50 text-sage-700 border border-sage-200 rounded-lg hover:bg-sage-100">
                Edit HR Record
              </button>
              @if (empRecord()?.employment_status !== 'terminated') {
                <button (click)="openTerminate()"
                  class="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">
                  Terminate Employment
                </button>
              }
            </div>
          } @else if (editingHr) {
            <!-- Edit HR record form -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Job Title</label>
                <input [(ngModel)]="hrForm.job_title" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Department</label>
                <select [(ngModel)]="hrForm.department_id" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                  <option value="">No Department</option>
                  @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Employment Type</label>
                <select [(ngModel)]="hrForm.employment_type" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                  @for (t of empTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Work Schedule</label>
                <select [(ngModel)]="hrForm.work_schedule" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                  @for (s of schedules; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Hire Date</label>
                <input [(ngModel)]="hrForm.hire_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Work Location</label>
                <input [(ngModel)]="hrForm.work_location" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              @if (hrForm.employment_type === 'contract' || hrForm.employment_type === 'ad_hoc' || hrForm.employment_type === 'intern') {
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">Contract Start</label>
                  <input [(ngModel)]="hrForm.contract_start" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">Contract End</label>
                  <input [(ngModel)]="hrForm.contract_end" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">Notice Period (days)</label>
                  <input [(ngModel)]="hrForm.notice_period_days" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                </div>
              }
              <!-- Compensation -->
              <div class="sm:col-span-2 border-t pt-3 mt-1">
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Compensation</h4>
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Monthly Gross Salary (₦)</label>
                <input [(ngModel)]="hrForm.gross_salary_display" type="number"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Bank Name</label>
                <input [(ngModel)]="hrForm.bank_name" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Account Number</label>
                <input [(ngModel)]="hrForm.bank_account_number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Account Name</label>
                <input [(ngModel)]="hrForm.bank_account_name" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <!-- Tax IDs -->
              <div class="sm:col-span-2 border-t pt-3 mt-1">
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tax & Compliance</h4>
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">NIN</label>
                <input [(ngModel)]="hrForm.nin" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Tax ID (TIN)</label>
                <input [(ngModel)]="hrForm.tax_id" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Pension PIN</label>
                <input [(ngModel)]="hrForm.pension_pin" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">NHF ID</label>
                <input [(ngModel)]="hrForm.nhf_id" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <!-- Personal -->
              <div class="sm:col-span-2 border-t pt-3 mt-1">
                <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Details</h4>
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Date of Birth</label>
                <input [(ngModel)]="hrForm.date_of_birth" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Gender</label>
                <select [(ngModel)]="hrForm.gender" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="text-xs text-gray-500 mb-1 block">Home Address</label>
                <textarea [(ngModel)]="hrForm.address" rows="2"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea>
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Emergency Contact Name</label>
                <input [(ngModel)]="hrForm.emergency_contact_name" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Emergency Contact Phone</label>
                <input [(ngModel)]="hrForm.emergency_contact_phone" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-4 border-t mt-4">
              <button (click)="editingHr = false" class="px-3 py-1.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
              <button (click)="saveHr()" class="px-4 py-1.5 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Save HR Record</button>
            </div>
          }
        }

        <!-- ── Leave / Attendance quick links ────────────────────────── -->
        @if (detailTab === 'links') {
          <div class="grid grid-cols-2 gap-3">
            @for (link of quickLinks(); track link.label) {
              <a [href]="link.href"
                class="bg-gray-50 rounded-xl border border-gray-100 p-4 hover:border-sage-200 hover:bg-sage-50 transition-all group">
                <div class="text-2xl mb-2">{{ link.icon }}</div>
                <p class="text-sm font-medium text-gray-700 group-hover:text-sage-700">{{ link.label }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ link.desc }}</p>
              </a>
            }
          </div>
        }
      </div>
    </div>
  </div>
}

<!-- ══ PROPERTY ACCESS MODAL ════════════════════════════════════════════════ -->
@if (showAccess && accessStaff) {
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    (click)="showAccess = false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto"
      (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">Property Access — {{ accessStaff.first_name }}</h3>
      <div class="space-y-2 mb-4">
        @for (a of accessList(); track a.property_id) {
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <span class="text-sm font-medium">{{ a.property_name }}</span>
              @if (a.is_default) { <span class="text-[10px] bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full ml-1">Primary</span> }
            </div>
            @if (!a.is_default) {
              <button (click)="revokeAccess(a.property_id)" class="text-xs text-red-500 hover:underline">Revoke</button>
            }
          </div>
        } @empty {
          <p class="text-sm text-gray-400 text-center py-4">No property access records</p>
        }
      </div>
      @if (availableProperties().length) {
        <div class="border-t pt-3">
          <label class="text-xs text-gray-500 mb-1 block">Grant access to another property</label>
          <div class="flex gap-2">
            <select [(ngModel)]="grantPropertyId" class="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="">Select property...</option>
              @for (p of availableProperties(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
            </select>
            <button (click)="grantAccess()" [disabled]="!grantPropertyId"
              class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 disabled:opacity-50">Grant</button>
          </div>
        </div>
      }
      <button (click)="showAccess = false" class="mt-4 w-full px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Close</button>
    </div>
  </div>
}

<!-- ══ RESET PASSWORD MODAL ═══════════════════════════════════════════════ -->
@if (resetPwStaff) {
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" (click)="closeResetPw()"></div>
    <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
      <h3 class="text-base font-semibold mb-1">Reset Password</h3>
      <p class="text-sm text-gray-500 mb-4">Set a new password for {{ resetPwStaff.first_name }}.</p>
      <input type="password" [(ngModel)]="resetPwValue" placeholder="New password (min 6 characters)"
        class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4" (keyup.enter)="confirmResetPw()">
      <div class="flex justify-end gap-2">
        <button (click)="closeResetPw()" class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
        <button (click)="confirmResetPw()" class="px-4 py-2 text-sm text-white bg-sage-600 rounded-lg hover:bg-sage-700">Reset</button>
      </div>
    </div>
  </div>
}

<!-- ══ TERMINATE MODAL ═══════════════════════════════════════════════════ -->
@if (showTerminate) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showTerminate = false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold text-red-600 mb-3">⚠️ Terminate Employment</h3>
      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-500 mb-1 block">Termination Date</label>
          <input [(ngModel)]="terminateDate" type="date"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">Reason *</label>
          <textarea [(ngModel)]="terminateReason" rows="3" placeholder="Reason for termination"
            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showTerminate = false" class="px-4 py-2 text-sm border rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="terminate()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700">Terminate</button>
      </div>
    </div>
  </div>
}
  `,
})
export class StaffListPage implements OnInit {
  private tour    = inject(TourService);
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private activeProperty = inject(ActivePropertyService);

  // ── Lists ────────────────────────────────────────────────────────────────
  loading     = signal(true);
  staff       = signal<any[]>([]);
  departments = signal<any[]>([]);
  total       = signal(0);
  page        = 1;

  // ── Filters ──────────────────────────────────────────────────────────────
  search      = '';
  filterRole  = '';
  filterType  = '';
  filterDept  = '';
  filterActive = '';

  // ── Stats ────────────────────────────────────────────────────────────────
  stats = computed(() => {
    const all = this.staff();
    return {
      total:        this.total(),
      active:       all.filter(s => s.is_active).length,
      permanent:    all.filter(s => s.employment_type === 'permanent').length,
      nonPermanent: all.filter(s => s.employment_type && s.employment_type !== 'permanent').length,
      expiring:     all.filter(s => s.contract_expiring_soon).length,
    };
  });

  // ── Table ────────────────────────────────────────────────────────────────
  readonly roles     = ROLES;
  readonly empTypes  = EMP_TYPES;
  readonly schedules = SCHEDULES;

  columns: TableColumn[] = [
    { key: 'avatar_url', label: '', render: (_v: string, row: any) => {
      const init = (row.first_name?.charAt(0) || '') + (row.last_name?.charAt(0) || '');
      return row.avatar_url
        ? `<img src="${row.avatar_url}" class="w-8 h-8 rounded-full object-cover" alt="">`
        : `<div class="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-xs font-bold">${init}</div>`;
    }},
    { key: 'first_name', label: 'First Name', sortable: true },
    { key: 'last_name',  label: 'Last Name',  sortable: true },
    { key: 'role', label: 'Role', render: (v: string) =>
      `<span class="px-2 py-0.5 bg-gray-100 rounded-full text-xs">${v?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>` },
    { key: 'employment_type', label: 'Type', render: (v: string) => {
      const m = empTypeMeta(v || 'permanent');
      return `<span class="text-[11px] font-medium px-2 py-0.5 rounded-full"
        style="color:${m.color};background:${m.bg}">${m.label}</span>`;
    }},
    { key: 'is_active', label: 'Status', render: (v: boolean) =>
      v ? '<span class="text-emerald-600 text-xs">Active</span>' : '<span class="text-gray-400 text-xs">Inactive</span>' },
  ];
  actions: TableAction[] = [
    { label: 'Open', handler: (r: any) => this.openDetail(r) },
    { label: 'Deactivate', color: 'danger', handler: (r: any) => this.deactivate(r), hidden: (r: any) => !r.is_active },
    { label: 'Reactivate', handler: (r: any) => this.reactivate(r), hidden: (r: any) => r.is_active },
  ];

  // ── Add form ─────────────────────────────────────────────────────────────
  showAdd  = false;
  addSaving = false;
  addTab   = 'account';
  addTabs  = [{ id: 'account', label: 'Account' }, { id: 'hr', label: 'HR Record' }];
  addForm: any = {
    first_name: '', last_name: '', email: '', password: '', phone: '',
    role: 'front_desk', job_title: '', department_id: '',
    employment_type: 'permanent', work_schedule: 'full_time',
    hire_date: new Date().toISOString().slice(0,10),
    gross_salary: '', contract_start: '', contract_end: '',
    notice_period_days: 30, work_location: '',
  };

  // ── Detail panel ─────────────────────────────────────────────────────────
  selected    = signal<any>(null);
  empRecord   = signal<any>(null);
  loadingHr   = signal(false);
  detailTab   = 'account';
  detailTabs  = [
    { id: 'account', label: 'Account' },
    { id: 'hr',      label: 'HR Record' },
    { id: 'links',   label: 'Quick Links' },
  ];

  editingAccount = false;
  acctForm: any  = {};

  editingHr  = false;
  hrForm: any = {};

  showTerminate    = false;
  terminateReason  = '';
  terminateDate    = new Date().toISOString().slice(0,10);

  // ── Property access ───────────────────────────────────────────────────────
  showAccess     = false;
  accessStaff: any = null;
  accessList     = signal<any[]>([]);
  allProperties  = signal<any[]>([]);
  grantPropertyId = '';

  // ── Reset pw ──────────────────────────────────────────────────────────────
  resetPwStaff: any = null;
  resetPwValue = '';

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadDepts();
    this.load();
  }

  loadDepts(): void {
    this.api.get('/departments').subscribe({ next: (r: any) => this.departments.set(r.data || []) });
  }

  load(): void {
    this.loading.set(true);
    const params: any = { page: this.page, limit: 20 };
    if (this.filterRole)   params.role   = this.filterRole;
    if (this.filterActive !== '') params.is_active = this.filterActive;
    this.api.get('/staff', params).subscribe({
      next: (r: any) => {
        if (r.success) { this.staff.set(r.data ?? []); this.total.set(r.meta?.total ?? 0); }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: any): void { this.page = e.page; this.load(); }

  // ── Add person ────────────────────────────────────────────────────────────
  openAdd(): void {
    this.showAdd = true;
    this.addTab  = 'account';
    this.addForm = {
      first_name: '', last_name: '', email: '', password: '', phone: '',
      role: 'front_desk', job_title: '', department_id: '',
      employment_type: 'permanent', work_schedule: 'full_time',
      hire_date: new Date().toISOString().slice(0,10),
      gross_salary: '', contract_start: '', contract_end: '',
      notice_period_days: 30, work_location: '',
    };
  }

  submitAdd(): void {
    if (!this.addForm.first_name || !this.addForm.last_name || !this.addForm.email || !this.addForm.password) {
      this.toast.error('First name, last name, email and password are required');
      this.addTab = 'account';
      return;
    }
    this.addSaving = true;
    const body: any = {
      first_name: this.addForm.first_name,
      last_name:  this.addForm.last_name,
      email:      this.addForm.email,
      password:   this.addForm.password,
      role:       this.addForm.role,
      employment_type: this.addForm.employment_type,
      work_schedule:   this.addForm.work_schedule,
    };
    if (this.addForm.gross_salary) body.gross_salary = this.addForm.gross_salary;
    if (this.addForm.job_title)    body.job_title    = this.addForm.job_title;

    this.api.post('/staff', body).subscribe({
      next: (r: any) => {
        if (!r.success) { this.toast.error(r.message || 'Failed'); this.addSaving = false; return; }
        // If HR record fields were filled, upsert them now
        const hr: any = {};
        ['job_title','department_id','hire_date','contract_start','contract_end',
         'notice_period_days','work_location'].forEach(k => { if (this.addForm[k]) hr[k] = this.addForm[k]; });
        if (Object.keys(hr).length) {
          hr.employment_type = this.addForm.employment_type;
          hr.work_schedule   = this.addForm.work_schedule;
          this.api.post(`/staff/${r.data.id}/employee`, hr).subscribe();
        }
        this.toast.success('Person added');
        this.showAdd = false;
        this.addSaving = false;
        this.load();
      },
      error: (e: any) => { this.toast.error(e?.error?.message || 'Failed'); this.addSaving = false; },
    });
  }

  // ── Detail panel ─────────────────────────────────────────────────────────
  openDetail(row: any): void {
    this.selected.set(row);
    this.detailTab     = 'account';
    this.editingAccount = false;
    this.editingHr      = false;
    this.acctForm = { ...row, new_password: '', _avatarBase64: '' };
    this.empRecord.set(null);
    this.loadHrRecord(row.id);
  }

  loadHrRecord(userId: string): void {
    this.loadingHr.set(true);
    this.api.get(`/staff/${userId}/employee`).subscribe({
      next: (r: any) => {
        this.empRecord.set(r.data ?? null);
        this.loadingHr.set(false);
      },
      error: () => this.loadingHr.set(false),
    });
  }

  // ── Account edit ──────────────────────────────────────────────────────────
  onAvatarSelect(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { this.toast.error('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { this.acctForm._avatarBase64 = reader.result as string; };
    reader.readAsDataURL(file);
  }

  saveAccount(): void {
    const id = this.selected()!.id;
    const { _avatarBase64, new_password, avatar_url, ...body } = this.acctForm;
    if (new_password) body.password = new_password;

    this.api.patch(`/staff/${id}`, body).subscribe({
      next: (r: any) => {
        if (!r.success) { this.toast.error(r.message || 'Failed'); return; }
        if (_avatarBase64) {
          this.api.post(`/staff/${id}/avatar`, { image: _avatarBase64 }).subscribe({
            next: (av: any) => { if (av.success) this.toast.success('Avatar updated'); },
          });
        }
        this.selected.set(r.data);
        this.editingAccount = false;
        this.toast.success('Account updated');
        this.load();
      },
      error: () => this.toast.error('Failed to save'),
    });
  }

  // ── HR record edit ────────────────────────────────────────────────────────
  startHrEdit(): void {
    const emp = this.empRecord();
    this.hrForm = emp
      ? { ...emp, gross_salary_display: emp.gross_salary ? (emp.gross_salary / 100) : 0 }
      : {
          job_title: this.acctForm.job_title || '',
          department_id: '', employment_type: 'permanent', work_schedule: 'full_time',
          hire_date: new Date().toISOString().slice(0,10), work_location: '',
          contract_start: '', contract_end: '', notice_period_days: 30,
          gross_salary_display: 0, bank_name: '', bank_account_number: '',
          bank_account_name: '', nin: '', tax_id: '', pension_pin: '', nhf_id: '',
          date_of_birth: '', gender: '', address: '',
          emergency_contact_name: '', emergency_contact_phone: '',
        };
    this.editingHr = true;
    this.detailTab = 'hr';
  }

  saveHr(): void {
    const id = this.selected()!.id;
    const data: any = { ...this.hrForm };
    if (data.gross_salary_display !== undefined) {
      data.gross_salary = String(Math.round(Number(data.gross_salary_display) * 100));
      delete data.gross_salary_display;
    }
    this.api.post(`/staff/${id}/employee`, data).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.empRecord.set(r.data);
          this.editingHr = false;
          this.toast.success('HR record saved');
          this.load(); // refresh list for employment_type badge
        } else this.toast.error(r.message || 'Failed');
      },
      error: () => this.toast.error('Failed to save HR record'),
    });
  }

  // ── Terminate ─────────────────────────────────────────────────────────────
  openTerminate(): void {
    this.showTerminate   = true;
    this.terminateReason = '';
    this.terminateDate   = new Date().toISOString().slice(0,10);
  }

  terminate(): void {
    const emp = this.empRecord();
    if (!emp) return;
    this.api.post(`/employees/${emp.id}/terminate`, {
      reason:           this.terminateReason,
      termination_date: this.terminateDate,
    }).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.empRecord.set(r.data);
          this.showTerminate = false;
          this.toast.success('Employment terminated');
          this.load();
        } else this.toast.error(r.message || 'Failed');
      },
      error: () => this.toast.error('Failed to terminate'),
    });
  }

  // ── Property access ───────────────────────────────────────────────────────
  openPropertyAccess(row: any): void {
    this.accessStaff = row;
    this.showAccess  = true;
    this.grantPropertyId = '';
    this.api.get(`/staff/${row.id}/property-access`).subscribe((r: any) => {
      if (r?.success) this.accessList.set(r.data || []);
    });
    if (!this.allProperties().length) {
      this.api.get('/properties').subscribe((r: any) => {
        if (r?.success) this.allProperties.set(r.data || []);
      });
    }
  }
  grantAccess(): void {
    if (!this.grantPropertyId || !this.accessStaff) return;
    this.api.post(`/staff/${this.accessStaff.id}/property-access`, { property_id: this.grantPropertyId })
      .subscribe((r: any) => {
        if (r?.success) { this.toast.success('Access granted'); this.openPropertyAccess(this.accessStaff); }
        else this.toast.error(r?.message || 'Failed');
      });
  }
  revokeAccess(propertyId: string): void {
    if (!this.accessStaff) return;
    this.api.delete(`/staff/${this.accessStaff.id}/property-access/${propertyId}`).subscribe({
      next: (r: any) => {
        if (r?.success) { this.toast.success('Access revoked'); this.openPropertyAccess(this.accessStaff); }
        else this.toast.error(r?.message || 'Failed');
      },
      error: (err: any) => this.toast.error(err?.error?.message || 'Cannot revoke primary property'),
    });
  }
  availableProperties(): any[] {
    const granted = new Set(this.accessList().map((a: any) => a.property_id));
    return this.allProperties().filter((p: any) => !granted.has(p.id));
  }

  // ── Activate / deactivate ─────────────────────────────────────────────────
  async deactivate(row: any): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Deactivate',
      message: `Remove app access for ${row.first_name} ${row.last_name}?`,
      variant: 'warning',
    });
    if (ok) this.api.patch(`/staff/${row.id}`, { is_active: false }).subscribe(r => {
      if ((r as any).success) { this.toast.success('Deactivated'); this.load(); }
    });
  }
  reactivate(row: any): void {
    this.api.patch(`/staff/${row.id}`, { is_active: true }).subscribe((r: any) => {
      if (r.success) { this.toast.success('Reactivated'); this.load(); }
    });
  }

  // ── Reset password ────────────────────────────────────────────────────────
  openResetPw(row: any): void { this.resetPwStaff = row; this.resetPwValue = ''; }
  closeResetPw(): void { this.resetPwStaff = null; }
  confirmResetPw(): void {
    if (!this.resetPwStaff) return;
    if (this.resetPwValue.length < 6) { this.toast.error('Password must be at least 6 characters'); return; }
    this.api.patch(`/staff/${this.resetPwStaff.id}`, { password: this.resetPwValue }).subscribe((r: any) => {
      if (r.success) { this.toast.success('Password reset'); this.closeResetPw(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  // ── Quick links ────────────────────────────────────────────────────────────
  quickLinks = computed(() => {
    const emp = this.empRecord();
    if (!emp) return [];
    return [
      { icon: '📅', label: 'Attendance', desc: 'View attendance records', href: `/attendance?employee_id=${emp.id}` },
      { icon: '🌴', label: 'Leave',      desc: 'Leave requests & balance', href: `/leave?employee_id=${emp.id}` },
      { icon: '💰', label: 'Payroll',    desc: 'Payslips & salary runs',  href: `/payroll?employee_id=${emp.id}` },
      { icon: '⭐', label: 'Performance', desc: 'Reviews & goals',        href: `/performance-reviews?employee_id=${emp.id}` },
    ];
  });

  // ── Formatters ─────────────────────────────────────────────────────────────
  readonly empTypeMeta = empTypeMeta;
  readonly fmtRole     = fmtRole;
  fmtSched(v: string): string {
    return v?.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—';
  }
  deptName(id: string | null): string {
    if (!id) return '—';
    return this.departments().find(d => d.id === id)?.name ?? '—';
  }

  startTour(): void { this.tour.start(PAGE_TOURS['staff'] ?? [], 'staff'); }
}
