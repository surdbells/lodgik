import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms'
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, AuthService, ActivePropertyService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-housekeeping',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Housekeeping" icon="spray-can" [breadcrumbs]="['Daily Operation', 'Housekeeping']" subtitle="Task management, cleaning schedules, and inspections">
      <button (click)="openCreateTask()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Create Task</button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- ── Create Task Modal ─────────────────────────────── -->
    @if (showCreateTask) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="showCreateTask = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Create Housekeeping Task</h3>
            <button (click)="showCreateTask = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Room Number *</label>
              <input [(ngModel)]="taskForm.room_number" placeholder="e.g. 101" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Room ID</label>
              <input [(ngModel)]="taskForm.room_id" placeholder="Room ID (optional)" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Task Type *</label>
              <select [(ngModel)]="taskForm.task_type" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option value="checkout_clean">Checkout Clean</option>
                <option value="stayover_clean">Stayover Clean</option>
                <option value="deep_clean">Deep Clean</option>
                <option value="turndown">Turndown</option>
                <option value="inspection">Inspection</option>
                <option value="touch_up">Touch Up</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
              <select [(ngModel)]="taskForm.priority" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option [value]="1">🔴 Urgent</option>
                <option [value]="2">🟠 High</option>
                <option [value]="3">🟡 Normal</option>
                <option [value]="4">🟢 Low</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Est. Minutes</label>
              <input type="number" [(ngModel)]="taskForm.estimated_minutes" placeholder="30" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Due At</label>
              <input type="datetime-local" [(ngModel)]="taskForm.due_at" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div class="col-span-2">
              <label class="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
              <textarea [(ngModel)]="taskForm.notes" rows="2" placeholder="Additional instructions..." class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none"></textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="createTask()" [disabled]="creatingTask" class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ creatingTask ? 'Creating...' : 'Create Task' }}
            </button>
            <button (click)="showCreateTask = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Assign Staff Modal ─────────────────────────────── -->
    @if (assigningTask) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="assigningTask = null">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Assign — Room {{ assigningTask.room_number }}</h3>
            <button (click)="assigningTask = null" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="space-y-2 max-h-64 overflow-y-auto mb-4">
            @if (staffLoading()) {
              <p class="text-sm text-gray-400 text-center py-6">Loading staff...</p>
            } @else if (staffList().length === 0) {
              <p class="text-sm text-gray-400 text-center py-6">No housekeeping staff found</p>
            } @else {
              @for (s of staffList(); track s.id) {
                <button (click)="assignToStaff(s)"
                  class="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-sage-300 hover:bg-sage-50 text-left transition-colors">
                  <div class="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-xs font-bold text-sage-700 shrink-0">
                    {{ (s.first_name || '?').charAt(0) }}{{ (s.last_name || '').charAt(0) }}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-800">{{ s.first_name }} {{ s.last_name }}</div>
                    <div class="text-xs text-gray-400">{{ s.role }}</div>
                  </div>
                </button>
              }
            }
          </div>
          <button (click)="assigningTask = null" class="w-full px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    }

    <!-- ── Complete Task Modal ───────────────────────────── -->
    @if (completingTask) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="completingTask = null">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Complete — Room {{ completingTask.room_number }}</h3>
            <button (click)="completingTask = null" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          @if (completeChecklist.length) {
            <div class="mb-4">
              <p class="text-xs font-semibold text-gray-500 uppercase mb-2">Checklist</p>
              <div class="space-y-2">
                @for (item of completeChecklist; track item.item) {
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="item.checked" class="rounded border-gray-300 text-sage-600">
                    <span class="text-sm text-gray-700" [class.line-through]="item.checked" [class.text-gray-400]="item.checked">{{ item.item }}</span>
                  </label>
                }
              </div>
              <div class="mt-2 text-xs text-gray-400">{{ checkedCount() }}/{{ completeChecklist.length }} items checked</div>
            </div>
          } @else {
            <p class="text-sm text-gray-500 mb-4">Mark this task as completed?</p>
          }
          <div class="flex gap-2">
            <button (click)="submitComplete()" class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700">Mark Complete</button>
            <button (click)="completingTask = null" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Inspect Modal ──────────────────────────────────── -->
    @if (inspectingTask) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="inspectingTask = null">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <h3 class="text-base font-semibold text-gray-800 mb-1">
            {{ inspectPassed ? 'Approve' : 'Send Back for Rework' }}
          </h3>
          <p class="text-sm text-gray-400 mb-4">Room {{ inspectingTask.room_number }} — {{ taskTypeLabel(inspectingTask.task_type) }}</p>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Notes (optional)</label>
          <textarea [(ngModel)]="inspectNotes" rows="3" placeholder="Inspection notes..."
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none mb-4"></textarea>
          <div class="flex gap-2">
            <button (click)="submitInspect()"
              class="px-5 py-2 text-white text-sm font-medium rounded-xl"
              [class]="inspectPassed ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'">
              {{ inspectPassed ? 'Approve' : 'Send Back' }}
            </button>
            <button (click)="inspectingTask = null" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Claim Modal ────────────────────────────────────── -->
    @if (claimingItem) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="claimingItem = null">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <h3 class="text-base font-semibold text-gray-800 mb-1">Claim Item</h3>
          <p class="text-sm text-gray-500 mb-4">{{ claimingItem.description }}</p>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Claimed By *</label>
          <input [(ngModel)]="claimForm.claimed_by" placeholder="Full name of claimant"
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 mb-4">
          <div class="flex gap-2">
            <button (click)="submitClaim()" [disabled]="!claimForm.claimed_by"
              class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">Confirm Claim</button>
            <button (click)="claimingItem = null" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    @if (!loading()) {
      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <ui-stats-card label="Total Tasks" [value]="stats().total ?? 0" icon="clipboard-list"></ui-stats-card>
        <ui-stats-card label="Pending" [value]="stats().pending ?? 0" icon="clock"></ui-stats-card>
        <ui-stats-card label="In Progress" [value]="stats().in_progress ?? 0" icon="trending-up"></ui-stats-card>
        <ui-stats-card label="Completed" [value]="stats().completed ?? 0" icon="circle-check"></ui-stats-card>
      </div>

      <!-- Filter Tabs -->
      <div class="flex flex-wrap gap-2 mb-4">
        @for (f of filters; track f.value) {
          <button (click)="setFilter(f.value)"
            [class]="filterStatus === f.value
              ? 'px-4 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium'
              : 'px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50'">
            {{ f.label }}
          </button>
        }
      </div>

      <!-- Task Cards -->
      <div class="space-y-2 mb-8">
        @for (t of tasks(); track t.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 min-w-0">
                <span class="text-lg shrink-0 mt-0.5">{{ priorityIcon(t.priority) }}</span>
                <div class="min-w-0">
                  <div class="font-semibold text-gray-800">Room {{ t.room_number }}
                    <span class="ml-2 text-xs font-normal text-gray-400">{{ taskTypeLabel(t.task_type) }}</span>
                  </div>
                  <div class="text-xs text-gray-400 mt-0.5">
                    {{ t.assigned_to_name || 'Unassigned' }}
                    @if (t.estimated_minutes) { · {{ t.estimated_minutes }}min }
                    @if (t.due_at) { · Due {{ formatDue(t.due_at) }} }
                  </div>
                  @if (t.notes) {
                    <div class="text-xs text-gray-500 mt-1 italic">"{{ t.notes }}"</div>
                  }
                  @if (t.checklist?.length) {
                    <div class="mt-2 flex flex-wrap gap-1">
                      @for (item of t.checklist; track item.item) {
                        <span class="text-[10px] px-1.5 py-0.5 rounded"
                          [class]="item.checked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                          {{ item.checked ? '☑' : '☐' }} {{ item.item }}
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full"
                  [style.background]="(t.status_color || '#6b7280') + '20'"
                  [style.color]="t.status_color || '#6b7280'">
                  {{ t.status_label || t.status }}
                </span>
                <div class="flex gap-1 flex-wrap justify-end">
                  @if (t.status === 'pending') {
                    <button (click)="openAssign(t)" class="text-xs px-2.5 py-1 border border-sage-200 rounded-lg text-sage-600 hover:bg-sage-50 font-medium">Assign</button>
                  }
                  @if (t.status === 'assigned') {
                    <button (click)="startTask(t)" class="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">▶ Start</button>
                  }
                  @if (t.status === 'assigned' || t.status === 'in_progress') {
                    <button (click)="openComplete(t)" class="text-xs px-2.5 py-1 bg-sage-100 text-sage-700 rounded-lg font-medium hover:bg-sage-200">✓ Complete</button>
                  }
                  @if (t.status === 'completed') {
                    <button (click)="openInspect(t, true)" class="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">✅ Pass</button>
                    <button (click)="openInspect(t, false)" class="text-xs px-2.5 py-1 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200">🔄 Rework</button>
                  }
                </div>
              </div>
            </div>
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">🧹</div>
            <p class="text-sm font-medium">No tasks for this filter</p>
          </div>
        }
      </div>

      <!-- ── Lost & Found ──────────────────────────────────── -->
      <div class="border-t border-gray-100 pt-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-semibold text-gray-800">Lost &amp; Found</h3>
            <p class="text-xs text-gray-400 mt-0.5">Report and track found items</p>
          </div>
          <button (click)="showLostForm = !showLostForm"
            class="px-3 py-1.5 text-sm font-medium text-sage-600 border border-sage-200 rounded-lg hover:bg-sage-50">
            {{ showLostForm ? 'Cancel' : '+ Report Item' }}
          </button>
        </div>

        @if (showLostForm) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 mb-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Description *</label>
                <input [(ngModel)]="lostForm.description" placeholder="e.g. Black iPhone 14" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Found Location *</label>
                <input [(ngModel)]="lostForm.found_location" placeholder="e.g. Room 205, Bathroom" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Found By</label>
                <input [(ngModel)]="lostForm.found_by" placeholder="Staff name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
            </div>
            <div class="flex gap-2">
              <button (click)="reportLostItem()" [disabled]="reportingItem || !lostForm.description || !lostForm.found_location"
                class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
                {{ reportingItem ? 'Reporting...' : 'Report Item' }}
              </button>
              <button (click)="showLostForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        }

        <!-- Filter -->
        <div class="flex gap-2 mb-3">
          @for (f of lostFilters; track f.value) {
            <button (click)="lostFilter = f.value; loadLostItems()"
              [class]="lostFilter === f.value
                ? 'px-3 py-1 text-xs font-medium bg-sage-600 text-white rounded-lg'
                : 'px-3 py-1 text-xs bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50'">
              {{ f.label }}
            </button>
          }
        </div>

        <div class="space-y-2">
          @for (item of lostItems(); track item.id) {
            <div class="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-sm">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-gray-800">{{ item.description }}</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  📍 {{ item.found_location }}
                  @if (item.found_by) { · Found by {{ item.found_by }} }
                  @if (item.claimed_by) { · Claimed by <span class="font-medium text-gray-600">{{ item.claimed_by }}</span> }
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0 ml-3">
                <span class="text-xs font-semibold px-2 py-1 rounded-full"
                  [class]="item.status === 'claimed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">
                  {{ item.status }}
                </span>
                @if (item.status !== 'claimed') {
                  <button (click)="openClaim(item)" class="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Claim</button>
                }
              </div>
            </div>
          } @empty {
            <div class="text-center py-8 text-gray-400 text-sm">No items recorded</div>
          }
        </div>
      </div>
    }
  `,
})
export class HousekeepingPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  private toast = inject(ToastService);

  loading = signal(true);
  tasks = signal<any[]>([]);
  stats = signal<any>({});
  lostItems = signal<any[]>([]);
  staffList = signal<any[]>([]);
  staffLoading = signal(false);

  filterStatus = '';
  lostFilter = '';
  showCreateTask = false;
  showLostForm = false;
  creatingTask = false;
  reportingItem = false;

  assigningTask: any = null;
  completingTask: any = null;
  completeChecklist: any[] = [];
  inspectingTask: any = null;
  inspectPassed = true;
  inspectNotes = '';
  claimingItem: any = null;
  claimForm = { claimed_by: '' };

  taskForm: any = { room_number: '', room_id: '', task_type: 'checkout_clean', priority: 3, estimated_minutes: '', due_at: '', notes: '' };
  lostForm: any = { description: '', found_location: '', found_by: '' };

  filters = [
    { label: 'All', value: '' },
    { label: '⏳ Pending', value: 'pending' },
    { label: '👤 Assigned', value: 'assigned' },
    { label: '▶ Active', value: 'in_progress' },
    { label: '✅ Completed', value: 'completed' },
    { label: '🔍 Inspected', value: 'inspected' },
  ];
  lostFilters = [
    { label: 'All', value: '' },
    { label: 'Stored', value: 'stored' },
    { label: 'Claimed', value: 'claimed' },
  ];

  ngOnInit() { this.load(); this.loadStats(); this.loadLostItems(); }

  setFilter(v: string) { this.filterStatus = v; this.load(); }

  load() {
    const pid = this.activeProperty.propertyId();
    let url = `/housekeeping/tasks?property_id=${pid}`;
    if (this.filterStatus) url += `&status=${this.filterStatus}`;
    this.api.get(url).subscribe({
      next: (r: any) => { this.tasks.set(r.data || []); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load tasks'); this.loading.set(false); },
    });
  }

  loadStats() {
    this.api.get(`/housekeeping/stats/today?property_id=${this.activeProperty.propertyId()}`).subscribe({
      next: (r: any) => this.stats.set(r.data || {}),
    });
  }

  loadLostItems() {
    let url = `/housekeeping/lost-and-found?property_id=${this.activeProperty.propertyId()}`;
    if (this.lostFilter) url += `&status=${this.lostFilter}`;
    this.api.get(url).subscribe({ next: (r: any) => this.lostItems.set(r.data || []) });
  }

  loadStaff() {
    this.staffLoading.set(true);
    this.staffList.set([]);
    this.api.get(`/employees?property_id=${this.activeProperty.propertyId()}`).subscribe({
      next: (r: any) => { this.staffList.set(r.data || r.items || []); this.staffLoading.set(false); },
      error: () => { this.staffLoading.set(false); },
    });
  }

  // Create Task
  openCreateTask() {
    this.taskForm = { room_number: '', room_id: '', task_type: 'checkout_clean', priority: 3, estimated_minutes: '', due_at: '', notes: '' };
    this.showCreateTask = true;
  }

  createTask() {
    if (!this.taskForm.room_number || !this.taskForm.task_type) {
      this.toast.error('Room number and task type are required'); return;
    }
    this.creatingTask = true;
    const body: any = { ...this.taskForm, property_id: this.activeProperty.propertyId() };
    if (!body.room_id) body.room_id = body.room_number;
    if (!body.estimated_minutes) delete body.estimated_minutes;
    if (!body.due_at) delete body.due_at;
    if (!body.notes) delete body.notes;
    this.api.post('/housekeeping/tasks', body).subscribe({
      next: (r: any) => {
        this.creatingTask = false;
        if (r.success) { this.showCreateTask = false; this.toast.success('Task created'); this.load(); this.loadStats(); }
        else { this.toast.error(r.message || 'Failed to create task'); }
      },
      error: () => { this.creatingTask = false; this.toast.error('Failed to create task'); },
    });
  }

  // Assign
  openAssign(task: any) { this.assigningTask = task; this.loadStaff(); }

  assignToStaff(staff: any) {
    const name = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
    this.api.post(`/housekeeping/tasks/${this.assigningTask.id}/assign`, { user_id: staff.id, user_name: name }).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success(`Assigned to ${name}`); this.assigningTask = null; this.load(); }
        else { this.toast.error(r.message || 'Failed to assign'); }
      },
      error: () => this.toast.error('Failed to assign task'),
    });
  }

  // Start
  startTask(task: any) {
    this.api.post(`/housekeeping/tasks/${task.id}/start`, {}).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Task started'); this.load(); this.loadStats(); }
        else { this.toast.error(r.message || 'Failed to start task'); }
      },
      error: () => this.toast.error('Failed to start task'),
    });
  }

  // Complete
  openComplete(task: any) {
    this.completingTask = task;
    this.completeChecklist = (task.checklist || []).map((item: any) => ({ ...item }));
  }

  submitComplete() {
    const task = this.completingTask;
    if (!task) return;
    const body: any = {};
    if (this.completeChecklist.length) body.checklist = this.completeChecklist;
    this.api.post(`/housekeeping/tasks/${task.id}/complete`, body).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Task completed'); this.completingTask = null; this.load(); this.loadStats(); }
        else { this.toast.error(r.message || 'Failed'); }
      },
      error: () => this.toast.error('Failed to complete task'),
    });
  }

  checkedCount(): number { return this.completeChecklist.filter(i => i.checked).length; }

  // Inspect
  openInspect(task: any, passed: boolean) { this.inspectingTask = task; this.inspectPassed = passed; this.inspectNotes = ''; }

  submitInspect() {
    const task = this.inspectingTask;
    if (!task) return;
    this.api.post(`/housekeeping/tasks/${task.id}/inspect`, {
      passed: this.inspectPassed, notes: this.inspectNotes || null,
    }).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.toast.success(this.inspectPassed ? 'Task approved' : 'Task sent back for rework');
          this.inspectingTask = null; this.load(); this.loadStats();
        } else { this.toast.error(r.message || 'Failed to inspect'); }
      },
      error: () => this.toast.error('Failed to submit inspection'),
    });
  }

  // Lost & Found
  reportLostItem() {
    if (!this.lostForm.description || !this.lostForm.found_location) {
      this.toast.error('Description and found location are required'); return;
    }
    this.reportingItem = true;
    this.api.post('/housekeeping/lost-and-found', { ...this.lostForm, property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => {
        this.reportingItem = false;
        if (r.success) {
          this.showLostForm = false;
          this.lostForm = { description: '', found_location: '', found_by: '' };
          this.toast.success('Item reported');
          this.loadLostItems();
        } else { this.toast.error(r.message || 'Failed to report item'); }
      },
      error: () => { this.reportingItem = false; this.toast.error('Failed to report item'); },
    });
  }

  openClaim(item: any) { this.claimingItem = item; this.claimForm = { claimed_by: '' }; }

  submitClaim() {
    if (!this.claimForm.claimed_by) return;
    this.api.post(`/housekeeping/lost-and-found/${this.claimingItem.id}/claim`, { claimed_by: this.claimForm.claimed_by }).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Item claimed'); this.claimingItem = null; this.loadLostItems(); }
        else { this.toast.error(r.message || 'Failed to claim'); }
      },
      error: () => this.toast.error('Failed to claim item'),
    });
  }

  // Helpers
  priorityIcon(p: number): string { return p <= 1 ? '🔴' : p === 2 ? '🟠' : p === 3 ? '🟡' : '🟢'; }

  taskTypeLabel(type: string): string {
    const map: Record<string, string> = {
      checkout_clean: 'Checkout Clean', stayover_clean: 'Stayover Clean',
      deep_clean: 'Deep Clean', turndown: 'Turndown', inspection: 'Inspection', touch_up: 'Touch Up',
    };
    return map[type] || type;
  }

  formatDue(dt: string): string {
    try { return new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return dt; }
  }
}
