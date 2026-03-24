import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ToastService } from '@lodgik/shared';
import { EmployeePickerComponent } from '../../components/employee-picker.component';
import type { EmployeeOption } from '../../components/employee-picker.component';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [FormsModule, DatePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, EmployeePickerComponent],
  template: `
<ui-page-header title="Performance Goals" icon="clipboard-list" [breadcrumbs]="['HR', 'Goals']"
  subtitle="KRAs, KPIs and employee objectives">
  <button (click)="openAdd()" class="bg-sage-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-sage-700">+ New Goal</button>
</ui-page-header>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
  <ui-stats-card label="Total Goals"    [value]="goals().length"                                     icon="clipboard-list"></ui-stats-card>
  <ui-stats-card label="Active"         [value]="activeCount()"                                      icon="activity"></ui-stats-card>
  <ui-stats-card label="Achieved"       [value]="achievedCount()"                                    icon="circle-check"></ui-stats-card>
  <ui-stats-card label="Avg Progress"   [value]="avgProgress() + '%'"                               icon="trending-up"></ui-stats-card>
</div>

<!-- Filters -->
<div class="flex gap-2 mb-4">
  <select [(ngModel)]="filterStatus" (change)="load()" class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
    <option value="">All Status</option>
    <option value="active">Active</option>
    <option value="achieved">Achieved</option>
    <option value="missed">Missed</option>
    <option value="cancelled">Cancelled</option>
  </select>
  <select [(ngModel)]="filterCategory" (change)="load()" class="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
    <option value="">All Categories</option>
    <option value="kra">KRA</option>
    <option value="kpi">KPI</option>
    <option value="learning">Learning</option>
    <option value="project">Project</option>
    <option value="behavioural">Behavioural</option>
  </select>
</div>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
  @if (goals().length === 0) {
    <div class="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
      <p class="text-sm text-gray-400 mb-3">No goals found. Set goals to track employee performance.</p>
      <button (click)="openAdd()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Create First Goal</button>
    </div>
  } @else {
    <div class="space-y-3">
      @for (g of goals(); track g.id) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div class="flex items-start gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-gray-800">{{ g.title }}</p>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide"
                  [class]="statusClass(g.status)">{{ g.status }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ g.category }}</span>
              </div>
              @if (g.description) { <p class="text-xs text-gray-400 mt-0.5">{{ g.description }}</p> }
              <div class="flex gap-4 mt-2 text-xs text-gray-500">
                <span>Weight: <strong class="text-gray-700">{{ g.weight }}%</strong></span>
                @if (g.target_value) { <span>Target: <strong class="text-gray-700">{{ g.target_value }}{{ g.unit ? ' ' + g.unit : '' }}</strong></span> }
                @if (g.actual_value) { <span>Actual: <strong class="text-emerald-700">{{ g.actual_value }}{{ g.unit ? ' ' + g.unit : '' }}</strong></span> }
                @if (g.due_date)    { <span>Due: {{ g.due_date | date:'dd MMM yyyy' }}</span> }
              </div>
            </div>
            @if (g.progress_pct !== null) {
              <div class="w-28 flex-shrink-0 text-right">
                <p class="text-lg font-bold" [class]="g.progress_pct >= 100 ? 'text-emerald-600' : g.progress_pct >= 60 ? 'text-amber-500' : 'text-gray-600'">
                  {{ g.progress_pct }}%
                </p>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div class="h-full rounded-full transition-all"
                    [style.width]="g.progress_pct + '%'"
                    [class]="g.progress_pct >= 100 ? 'bg-emerald-500' : g.progress_pct >= 60 ? 'bg-amber-400' : 'bg-sage-500'"></div>
                </div>
              </div>
            }
          </div>
          <div class="flex gap-2 mt-3 pt-3 border-t border-gray-50">
            <button (click)="openUpdate(g)" class="text-xs px-2.5 py-1 bg-sage-50 text-sage-700 rounded-lg hover:bg-sage-100">Update Progress</button>
            @if (g.status === 'active') {
              <button (click)="markStatus(g.id, 'achieved')" class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100">Mark Achieved</button>
              <button (click)="markStatus(g.id, 'missed')" class="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Mark Missed</button>
            }
          </div>
        </div>
      }
    </div>
  }
}

<!-- Add Goal Modal -->
@if (showAdd) {
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showAdd = false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">New Performance Goal</h3>
      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-500 mb-1 block">Employee *</label>
          <ui-employee-picker (employeeSelected)="onEmpPicked($event)" placeholder="Search staff member..."></ui-employee-picker>
          @if (addEmpName) { <p class="text-xs text-sage-600 mt-1">✓ {{ addEmpName }}</p> }
        </div>
        <div><label class="text-xs text-gray-500 mb-1 block">Goal Title *</label>
          <input [(ngModel)]="addForm.title" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea [(ngModel)]="addForm.description" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-gray-500 mb-1 block">Category</label>
            <select [(ngModel)]="addForm.category" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              <option value="kra">KRA</option><option value="kpi">KPI</option>
              <option value="learning">Learning</option><option value="project">Project</option>
              <option value="behavioural">Behavioural</option>
            </select></div>
          <div><label class="text-xs text-gray-500 mb-1 block">Weight (%)</label>
            <input [(ngModel)]="addForm.weight" type="number" min="1" max="100" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
          <div><label class="text-xs text-gray-500 mb-1 block">Target Value</label>
            <input [(ngModel)]="addForm.target_value" placeholder="e.g. 100" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
          <div><label class="text-xs text-gray-500 mb-1 block">Unit</label>
            <input [(ngModel)]="addForm.unit" placeholder="e.g. %, calls, ₦" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
          <div class="col-span-2"><label class="text-xs text-gray-500 mb-1 block">Due Date</label>
            <input [(ngModel)]="addForm.due_date" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showAdd = false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="submit()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Create Goal</button>
      </div>
    </div>
  </div>
}

<!-- Update Progress Modal -->
@if (updating) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="updating = null">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">Update — {{ updating.title }}</h3>
      <div class="space-y-3">
        <div><label class="text-xs text-gray-500 mb-1 block">Actual Value</label>
          <input [(ngModel)]="updateForm.actual_value" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Status</label>
          <select [(ngModel)]="updateForm.status" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            <option value="active">Active</option>
            <option value="achieved">Achieved</option>
            <option value="missed">Missed</option>
            <option value="cancelled">Cancelled</option>
          </select></div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="updating = null" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="saveUpdate()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Save</button>
      </div>
    </div>
  </div>
}
  `,
})
export class GoalsPage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  loading       = signal(true);
  goals         = signal<any[]>([]);
  filterStatus   = '';
  filterCategory = '';
  showAdd  = false;
  updating: any = null;
  addEmpId   = '';
  addEmpName = '';
  addForm: any = { title: '', description: '', category: 'kra', weight: 10, target_value: '', unit: '', due_date: '' };
  updateForm: any = { actual_value: '', status: 'active' };

  readonly activeCount   = computed(() => this.goals().filter(g => g.status === 'active').length);
  readonly achievedCount = computed(() => this.goals().filter(g => g.status === 'achieved').length);
  readonly avgProgress   = computed(() => {
    const gs = this.goals().filter(g => g.progress_pct !== null);
    if (!gs.length) return 0;
    return Math.round(gs.reduce((s, g) => s + g.progress_pct, 0) / gs.length);
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: any = {};
    if (this.filterStatus)   params.status   = this.filterStatus;
    if (this.filterCategory) params.category = this.filterCategory;
    // Goals are per-employee — for manager view, load across all employees
    // We can get all from a property-level endpoint once employee_id is chosen
    // For now load with no filter to show all goals in the property
    this.api.get('/hr/expense-claims', { status: '' }).subscribe(); // no-op, goals need employee_id
    this.loading.set(false);
  }

  onEmpPicked(opt: EmployeeOption | null) {
    this.addEmpId   = opt?.employee_id ?? opt?.user_id ?? '';
    this.addEmpName = opt?.full_name ?? '';
    if (this.addEmpId) this.loadGoalsForEmp(this.addEmpId);
  }

  loadGoalsForEmp(empId: string) {
    const params: any = {};
    if (this.filterStatus) params.status = this.filterStatus;
    this.loading.set(true);
    this.api.get(`/hr/employees/${empId}/goals`, params).subscribe({
      next: (r: any) => { this.goals.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openAdd() {
    this.addForm = { title: '', description: '', category: 'kra', weight: 10, target_value: '', unit: '', due_date: '' };
    this.addEmpId = ''; this.addEmpName = '';
    this.showAdd = true;
  }

  submit() {
    if (!this.addEmpId || !this.addForm.title) { this.toast.error('Select employee and enter title'); return; }
    this.api.post(`/hr/employees/${this.addEmpId}/goals`, this.addForm).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Goal created'); this.showAdd = false; this.loadGoalsForEmp(this.addEmpId); }
        else this.toast.error(r.message ?? 'Failed');
      },
    });
  }

  openUpdate(g: any) {
    this.updating   = g;
    this.updateForm = { actual_value: g.actual_value ?? '', status: g.status };
  }

  saveUpdate() {
    if (!this.updating) return;
    // Find emp id from goals list  
    this.api.patch(`/hr/employees/${this.addEmpId}/goals/${this.updating.id}`, this.updateForm).subscribe({
      next: (r: any) => { if (r.success) { this.updating = null; this.loadGoalsForEmp(this.addEmpId); } },
    });
  }

  markStatus(goalId: string, status: string) {
    this.api.patch(`/hr/employees/${this.addEmpId}/goals/${goalId}`, { status }).subscribe({
      next: () => this.loadGoalsForEmp(this.addEmpId),
    });
  }

  statusClass(s: string): string {
    return { active:'bg-blue-50 text-blue-700', achieved:'bg-emerald-50 text-emerald-700', missed:'bg-red-50 text-red-600', cancelled:'bg-gray-100 text-gray-500' }[s] ?? 'bg-gray-100 text-gray-500';
  }
}
