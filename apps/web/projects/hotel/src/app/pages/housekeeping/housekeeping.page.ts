import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-housekeeping',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Housekeeping" icon="spray-can" [breadcrumbs]="['Daily Operation', 'Housekeeping']" subtitle="Task management, cleaning schedules, and inspections">
      <button (click)="showCreateTask = true" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Create Task</button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-4 gap-3 mb-6">
        <ui-stats-card label="Total Tasks" [value]="stats().total" icon="clipboard-list"></ui-stats-card>
        <ui-stats-card label="Pending" [value]="stats().pending" icon="clock"></ui-stats-card>
        <ui-stats-card label="In Progress" [value]="stats().in_progress" icon="trending-up"></ui-stats-card>
        <ui-stats-card label="Completed" [value]="stats().completed" icon="circle-check"></ui-stats-card>
      </div>

      <!-- Filter Tabs -->
      <div class="flex gap-2 mb-4">
        @for (f of filters; track f.value) {
          <button (click)="filterStatus = f.value; load()" [class]="filterStatus === f.value ? 'px-4 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium' : 'px-4 py-2 bg-white border rounded-lg text-sm'">{{ f.label }}</button>
        }
      </div>

      <!-- Task Cards -->
      <div class="space-y-2">
        @for (t of tasks(); track t.id) {
          <div class="bg-white border rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <span class="text-lg">{{ priorityIcon(t.priority) }}</span>
                <div>
                  <div class="font-medium">Room {{ t.room_number }}</div>
                  <div class="text-xs text-gray-400">{{ t.task_type }} · {{ t.estimated_minutes }}min est.</div>
                </div>
              </div>
              <span class="text-xs px-2 py-1 rounded" [style.background]="t.status_color + '20'" [style.color]="t.status_color">{{ t.status_label }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-gray-400">{{ t.assigned_to_name || 'Unassigned' }} · {{ t.created_at }}</div>
              <div class="flex gap-2">
                @if (t.status === 'pending') { <button (click)="assignPrompt(t)" class="text-xs px-2 py-1 border rounded hover:bg-sage-50 text-sage-600">Assign</button> }
                @if (t.status === 'completed') {
                  <button (click)="inspect(t, true)" class="text-xs px-2 py-1 bg-green-100 rounded text-green-700">✅ Pass</button>
                  <button (click)="inspect(t, false)" class="text-xs px-2 py-1 bg-red-100 rounded text-red-700">🔄 Rework</button>
                }
              </div>
            </div>
            @if (t.checklist) {
              <div class="mt-2 flex flex-wrap gap-1">
                @for (item of t.checklist; track item.item) {
                  <span class="text-xs px-1.5 py-0.5 rounded" [class]="item.checked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">{{ item.checked ? '☑' : '☐' }} {{ item.item }}</span>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Lost & Found Section -->
      <div class="mt-8">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">Lost & Found</h3>
          <button (click)="showLostForm = true" class="text-sm text-sage-600 hover:underline">+ Report Item</button>
        </div>
        <div class="space-y-2">
          @for (item of lostItems(); track item.id) {
            <div class="bg-white border rounded-lg p-3 flex justify-between items-center">
              <div>
                <div class="font-medium text-sm">{{ item.description }}</div>
                <div class="text-xs text-gray-400">{{ item.found_location }} · {{ item.status }}</div>
              </div>
              @if (item.status === 'stored') { <button (click)="claimItem(item)" class="text-xs px-2 py-1 border rounded">Claim</button> }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class HousekeepingPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  loading = signal(true);
  tasks = signal<any[]>([]);
  stats = signal<any>({});
  lostItems = signal<any[]>([]);
  filterStatus = '';
  showCreateTask = false;
  showLostForm = false;
  filters = [{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Active', value: 'in_progress' }, { label: 'Completed', value: 'completed' }, { label: 'Inspected', value: 'inspected' }];

  ngOnInit() { this.load(); this.loadStats(); this.loadLostItems(); }

  load() {
    const pid = this.auth.currentUser?.property_id || '';
    let url = `/housekeeping/tasks?property_id=${pid}`;
    if (this.filterStatus) url += `&status=${this.filterStatus}`;
    this.api.get(url).subscribe({ next: (r: any) => { this.tasks.set(r.data || []); this.loading.set(false); } });
  }

  loadStats() {
    this.api.get(`/housekeeping/stats/today?property_id=${this.auth.currentUser?.property_id || ''}`).subscribe({
      next: (r: any) => this.stats.set(r.data || {}),
    });
  }

  loadLostItems() {
    this.api.get(`/housekeeping/lost-and-found?property_id=${this.auth.currentUser?.property_id || ''}`).subscribe({
      next: (r: any) => this.lostItems.set(r.data || []),
    });
  }

  priorityIcon(p: number): string { return p <= 1 ? '🔴' : p === 2 ? '🟠' : p === 3 ? '🟡' : '🟢'; }

  assignPrompt(task: any) {
    // In production: show staff selection modal
    this.api.post(`/housekeeping/tasks/${task.id}/assign`, { user_id: 'staff-1', user_name: 'Staff' }).subscribe({ next: () => this.load() });
  }

  inspect(task: any, passed: boolean) {
    this.api.post(`/housekeeping/tasks/${task.id}/inspect`, { passed }).subscribe({ next: () => { this.load(); this.loadStats(); } });
  }

  claimItem(item: any) {
    const claimedBy = prompt('Claimed by:');
    if (claimedBy) {
      this.api.post(`/housekeeping/lost-and-found/${item.id}/claim`, { claimed_by: claimedBy }).subscribe({ next: () => this.loadLostItems() });
    }
  }
}
