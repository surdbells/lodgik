import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, StatsCardComponent } from '@lodgik/shared';
import { EmployeePickerComponent, EmployeeOption } from '../../components/employee-picker.component';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [FormsModule, DatePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, EmployeePickerComponent],
  template: `
<ui-page-header title="Training & Development" icon="book-open" subtitle="Programs, enrollments and skill development"
  [breadcrumbs]="['HR', 'Training']">
  <button (click)="openAdd()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700">+ New Program</button>
</ui-page-header>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
  <ui-stats-card label="Total"     [value]="programs().length"                                     icon="book-open"></ui-stats-card>
  <ui-stats-card label="Ongoing"   [value]="ongoingCount()"                                        icon="activity"></ui-stats-card>
  <ui-stats-card label="Planned"   [value]="plannedCount()"                                        icon="calendar"></ui-stats-card>
  <ui-stats-card label="Completed" [value]="completedCount()"                                      icon="circle-check"></ui-stats-card>
</div>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    @for (p of programs(); track p.id) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 flex flex-col">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-gray-800 truncate">{{ p.title }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">{{ p.provider || fmtMode(p.mode) }}</p>
          </div>
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0" [class]="statusColor(p.status)">{{ p.status }}</span>
        </div>
        <div class="space-y-1 text-xs text-gray-500 flex-1">
          @if (p.start_date) { <p>📅 {{ p.start_date | date:'dd MMM yyyy' }} – {{ p.end_date | date:'dd MMM yyyy' }}</p> }
          @if (p.duration_hours) { <p>⏱ {{ p.duration_hours }} hours</p> }
          <p>🏷 {{ fmtCategory(p.category) }} · {{ fmtMode(p.mode) }}</p>
          @if (p.cost_per_head > 0) { <p>💰 ₦{{ (p.cost_per_head/100).toLocaleString() }} per head</p> }
        </div>
        <div class="flex gap-2 mt-3 pt-3 border-t">
          @if (p.status==='planned') {
            <button (click)="updateStatus(p,'ongoing')"
              class="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100">Start</button>
          }
          @if (p.status==='ongoing') {
            <button (click)="updateStatus(p,'completed')"
              class="text-xs px-2.5 py-1 bg-sage-50 text-sage-700 rounded-lg hover:bg-sage-100">Complete</button>
          }
          <button (click)="openEnroll(p)"
            class="text-xs px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 ml-auto">
            Enroll ({{ p.enrollment_count ?? 0 }})
          </button>
        </div>
      </div>
    } @empty {
      <div class="col-span-3 text-center py-12 text-gray-400">
        <p class="text-sm">No training programs yet. Add your first program.</p>
      </div>
    }
  </div>
}

<!-- Add Program Modal -->
@if (showAdd) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAdd=false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">New Training Program</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="text-xs text-gray-500 mb-1 block">Title *</label>
          <input [(ngModel)]="form.title" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Category</label>
          <select [(ngModel)]="form.category" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            <option value="skills">Skills</option><option value="compliance">Compliance</option>
            <option value="leadership">Leadership</option><option value="customer_service">Customer Service</option>
            <option value="safety">Safety</option><option value="technical">Technical</option>
          </select></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Mode</label>
          <select [(ngModel)]="form.mode" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            <option value="in_house">In-house</option><option value="external">External</option>
            <option value="online">Online</option><option value="blended">Blended</option>
          </select></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Provider</label>
          <input [(ngModel)]="form.provider" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Duration (hrs)</label>
          <input [(ngModel)]="form.duration_hours" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Cost/Head (₦)</label>
          <input [(ngModel)]="form.cost_per_head" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Start Date</label>
          <input [(ngModel)]="form.start_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">End Date</label>
          <input [(ngModel)]="form.end_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div class="col-span-2"><label class="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea [(ngModel)]="form.description" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showAdd=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="submit()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Create</button>
      </div>
    </div>
  </div>
}

<!-- Enrollment Modal -->
@if (enrollProgram) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="enrollProgram=null">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col" (click)="$event.stopPropagation()">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-semibold text-gray-800">Enrollments</h3>
          <p class="text-xs text-gray-400">{{ enrollProgram.title }}</p>
        </div>
        <button (click)="enrollProgram=null" class="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Enroll new -->
      <div class="pb-4 border-b border-gray-100 mb-4">
        <label class="text-xs text-gray-500 mb-1 block">Enroll an employee</label>
        <div class="flex gap-2">
          <div class="flex-1">
            <ui-employee-picker (employeeSelected)="enrollEmp=$event" placeholder="Search employee..."></ui-employee-picker>
          </div>
          <button (click)="addEnrollment()" [disabled]="!enrollEmp"
            class="px-3 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 disabled:opacity-50 flex-shrink-0">
            Enroll
          </button>
        </div>
      </div>

      <!-- Enrolled list -->
      <div class="flex-1 overflow-y-auto">
        <ui-loading [loading]="enrollLoading()"></ui-loading>
        @if (!enrollLoading()) {
          <div class="space-y-2">
            @for (e of enrollments(); track e.id) {
              <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800">{{ e.employee_name }}</p>
                  <p class="text-xs text-gray-400">Enrolled {{ e.enrolled_at | date:'dd MMM yyyy' }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-sage-500 rounded-full" [style.width]="e.completion_pct+'%'"></div>
                  </div>
                  <span class="text-xs text-gray-500">{{ e.completion_pct }}%</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full"
                  [class]="e.status==='completed'?'bg-emerald-50 text-emerald-700':e.status==='dropped'?'bg-red-50 text-red-600':'bg-blue-50 text-blue-700'">
                  {{ e.status }}
                </span>
                @if (e.status !== 'completed') {
                  <button (click)="completeEnrollment(e)"
                    class="text-xs text-sage-600 hover:underline">Mark done</button>
                }
              </div>
            } @empty {
              <p class="text-sm text-gray-400 text-center py-6">No enrollments yet</p>
            }
          </div>
        }
      </div>
    </div>
  </div>
}

    `,
})
export class TrainingPage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  loading     = signal(true);
  programs    = signal<any[]>([]);
  enrollLoading = signal(false);
  enrollments   = signal<any[]>([]);

  readonly ongoingCount   = computed(() => this.programs().filter(p => p.status === 'ongoing').length);
  readonly plannedCount   = computed(() => this.programs().filter(p => p.status === 'planned').length);
  readonly completedCount = computed(() => this.programs().filter(p => p.status === 'completed').length);

  showAdd       = false;
  enrollProgram: any = null;
  enrollEmp:    EmployeeOption | null = null;

  form: any = { title:'', category:'skills', mode:'in_house', provider:'', duration_hours:'', cost_per_head:'', start_date:'', end_date:'', description:'' };

  ngOnInit() { this.load(); }

  load() {
    this.api.get('/hr/training').subscribe({
      next: (r: any) => { this.programs.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusColor(s: string) {
    return { planned:'bg-blue-50 text-blue-700', ongoing:'bg-amber-50 text-amber-700', completed:'bg-emerald-50 text-emerald-700', cancelled:'bg-red-50 text-red-700' }[s] ?? 'bg-gray-100 text-gray-500';
  }
  fmtCategory = (s: string) => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  fmtMode     = (s: string) => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());

  openAdd() {
    this.form = { title:'', category:'skills', mode:'in_house', provider:'', duration_hours:'', cost_per_head:'', start_date:'', end_date:'', description:'' };
    this.showAdd = true;
  }

  submit() {
    if (!this.form.title) { this.toast.error('Title required'); return; }
    this.api.post('/hr/training', this.form).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Program created'); this.showAdd = false; this.load(); }
        else this.toast.error(r.message || 'Failed');
      },
    });
  }

  updateStatus(prog: any, status: string) {
    this.api.put('/hr/training/' + prog.id, { status }).subscribe({ next: () => this.load() });
  }

  openEnroll(prog: any) {
    this.enrollProgram = prog;
    this.enrollEmp     = null;
    this.loadEnrollments(prog.id);
  }

  loadEnrollments(programId: string) {
    this.enrollLoading.set(true);
    this.api.get('/hr/training/' + programId + '/enrollments').subscribe({
      next: (r: any) => { this.enrollments.set(r.data ?? []); this.enrollLoading.set(false); },
      error: () => this.enrollLoading.set(false),
    });
  }

  addEnrollment() {
    if (!this.enrollEmp || !this.enrollProgram) return;
    const empId = this.enrollEmp.employee_id ?? this.enrollEmp.user_id;
    this.api.post('/hr/training/' + this.enrollProgram.id + '/enrollments', {
      employee_id: empId, employee_name: this.enrollEmp.full_name,
    }).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Enrolled'); this.enrollEmp = null; this.loadEnrollments(this.enrollProgram!.id); this.load(); }
        else this.toast.error(r.message || 'Already enrolled or failed');
      },
    });
  }

  completeEnrollment(e: any) {
    this.api.patch('/hr/training/' + this.enrollProgram!.id + '/enrollments/' + e.id, { status:'completed' }).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Marked complete'); this.loadEnrollments(this.enrollProgram!.id); } },
    });
  }
}
