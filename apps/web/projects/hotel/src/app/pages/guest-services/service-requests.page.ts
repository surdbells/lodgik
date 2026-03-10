import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  StatsCardComponent, ToastService, ActivePropertyService,
} from '@lodgik/shared';

@Component({
  selector: 'app-service-requests',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Service Requests" icon="concierge-bell"
      subtitle="Guest requests — acknowledge, assign and complete"
      [breadcrumbs]="['Guest Experience', 'Service Requests']">
      <div class="flex gap-2">
        <button (click)="load()" class="px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 flex items-center gap-1.5">
          🔄 Refresh
        </button>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Total"       [value]="summary().total"       icon="list"></ui-stats-card>
        <ui-stats-card label="Pending"     [value]="summary().pending"     icon="clock"></ui-stats-card>
        <ui-stats-card label="In Progress" [value]="summary().in_progress" icon="activity"></ui-stats-card>
        <ui-stats-card label="Completed"   [value]="summary().completed"   icon="circle-check"></ui-stats-card>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Status</label>
          <select [(ngModel)]="filterStatus"
            class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Category</label>
          <select [(ngModel)]="filterCategory"
            class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">All categories</option>
            <option value="room_service">Room Service</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="food_beverage">Food & Beverage</option>
            <option value="maintenance">Maintenance</option>
            <option value="transport">Transport</option>
            <option value="concierge">Concierge</option>
            <option value="amenity">Amenity</option>
            <option value="laundry">Laundry</option>
            <option value="stay_extension">Stay Extension</option>
            <option value="lost_and_found">Lost & Found</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Priority</label>
          <select [(ngModel)]="filterPriority"
            class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">All priorities</option>
            <option value="1">Low</option>
            <option value="2">Normal</option>
            <option value="3">High</option>
            <option value="4">Urgent</option>
          </select>
        </div>
      </div>

      <!-- Kanban / List toggle -->
      <div class="flex gap-2 mb-4">
        @for (v of ['list','kanban']; track v) {
          <button (click)="viewMode = v"
            class="px-3 py-1.5 text-xs rounded-lg border transition-colors"
            [class]="viewMode === v ? 'bg-sage-600 text-white border-sage-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
            {{ v === 'list' ? '☰ List' : '⬛ Kanban' }}
          </button>
        }
      </div>

      <!-- List View -->
      @if (viewMode === 'list') {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Request</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Category</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Room</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">Priority</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Time</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (r of filteredRequests(); track r.id) {
                <tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" (click)="openDetail(r)">
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-900">{{ r.category_icon }} {{ r.title }}</p>
                    @if (r.description) {
                      <p class="text-xs text-gray-400 truncate max-w-[200px]">{{ r.description }}</p>
                    }
                  </td>
                  <td class="px-4 py-3 text-gray-600">{{ r.category_label }}</td>
                  <td class="px-4 py-3">
                    @if (r.room_number) {
                      <span class="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{{ r.room_number }}</span>
                    } @else { <span class="text-gray-300">—</span> }
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 rounded text-xs font-medium" [class]="priorityClass(r.priority)">
                      {{ r.priority_label }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-medium" [style.background-color]="r.status_color + '22'"
                      [style.color]="r.status_color">{{ r.status_label }}</span>
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-400">{{ r.created_at | date:'HH:mm' }}</td>
                  <td class="px-4 py-3" (click)="$event.stopPropagation()">
                    <div class="flex gap-1.5">
                      @if (r.status === 'pending') {
                        <button (click)="acknowledge(r.id)" class="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Acknowledge</button>
                      }
                      @if (r.status === 'acknowledged') {
                        <button (click)="startProgress(r.id)" class="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100">Start</button>
                      }
                      @if (r.status === 'in_progress') {
                        <button (click)="complete(r.id)" class="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100">Complete</button>
                      }
                      @if (['pending','acknowledged'].includes(r.status)) {
                        <button (click)="cancel(r.id)" class="px-2 py-1 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100">Cancel</button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                    No service requests found.
                    @if (filterStatus || filterCategory) { <button (click)="clearFilters()" class="ml-2 text-sage-600 hover:underline">Clear filters</button> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Kanban View -->
      @if (viewMode === 'kanban') {
        <div class="grid grid-cols-4 gap-4">
          @for (col of kanbanCols; track col.status) {
            <div class="bg-gray-50 rounded-xl p-3">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ col.label }}</h3>
                <span class="bg-white border rounded-full px-2 py-0.5 text-xs font-medium text-gray-500">
                  {{ kanbanItems(col.status).length }}
                </span>
              </div>
              <div class="space-y-2">
                @for (r of kanbanItems(col.status); track r.id) {
                  <div class="bg-white rounded-lg border border-gray-100 p-3 shadow-sm cursor-pointer hover:border-sage-200"
                       (click)="openDetail(r)">
                    <p class="text-xs font-medium text-gray-800 mb-1">{{ r.category_icon }} {{ r.title }}</p>
                    @if (r.room_number) {
                      <p class="text-xs text-gray-400">Room {{ r.room_number }}</p>
                    }
                    <div class="flex items-center justify-between mt-2">
                      <span class="text-[10px] px-1.5 py-0.5 rounded" [class]="priorityClass(r.priority)">{{ r.priority_label }}</span>
                      <span class="text-[10px] text-gray-400">{{ r.created_at | date:'HH:mm' }}</span>
                    </div>
                  </div>
                }
                @if (kanbanItems(col.status).length === 0) {
                  <p class="text-xs text-gray-300 text-center py-4">Empty</p>
                }
              </div>
            </div>
          }
        </div>
      }
    }

    <!-- Detail Modal -->
    @if (selectedRequest()) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
           (click)="selectedRequest.set(null)">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900">
                {{ selectedRequest()!.category_icon }} {{ selectedRequest()!.title }}
              </h3>
              <p class="text-xs text-gray-400">{{ selectedRequest()!.category_label }}
                @if (selectedRequest()!.room_number) { · Room {{ selectedRequest()!.room_number }} }
              </p>
            </div>
            <span class="px-2 py-1 rounded-full text-xs font-medium"
              [style.background-color]="selectedRequest()!.status_color + '22'"
              [style.color]="selectedRequest()!.status_color">
              {{ selectedRequest()!.status_label }}
            </span>
          </div>
          @if (selectedRequest()!.description) {
            <p class="text-sm text-gray-700 mb-4 bg-gray-50 rounded-lg p-3">{{ selectedRequest()!.description }}</p>
          }
          <div class="grid grid-cols-2 gap-3 text-sm mb-4">
            @if (selectedRequest()!.guest_name) {
              <div><span class="text-xs text-gray-400">Guest</span>
                <p class="font-medium">{{ selectedRequest()!.guest_name }}</p></div>
            }
            @if (selectedRequest()!.room_number) {
              <div><span class="text-xs text-gray-400">Room</span>
                <p class="font-medium">{{ selectedRequest()!.room_number }}</p></div>
            }
            <div><span class="text-xs text-gray-400">Priority</span>
              <p class="font-medium">{{ selectedRequest()!.priority_label }}</p></div>
            <div><span class="text-xs text-gray-400">Created</span>
              <p class="font-medium">{{ selectedRequest()!.created_at | date:'dd MMM HH:mm' }}</p></div>
            @if (selectedRequest()!.acknowledged_at) {
              <div><span class="text-xs text-gray-400">Acknowledged</span>
                <p class="font-medium">{{ selectedRequest()!.acknowledged_at | date:'HH:mm' }}</p></div>
            }
            @if (selectedRequest()!.completed_at) {
              <div><span class="text-xs text-gray-400">Completed</span>
                <p class="font-medium">{{ selectedRequest()!.completed_at | date:'HH:mm' }}</p></div>
            }
          </div>
          <!-- Stay extension metadata -->
          @if (selectedRequest()!.category === 'stay_extension' && selectedRequest()!.metadata) {
            <div class="bg-blue-50 rounded-lg p-3 mb-4">
              <p class="text-xs font-semibold text-blue-700 mb-2">📅 Extension Details</p>
              <div class="grid grid-cols-2 gap-2 text-xs text-blue-800">
                <div><span class="text-blue-500">Original checkout</span>
                  <p class="font-medium">{{ selectedRequest()!.metadata.original_checkout | date:'dd MMM yyyy HH:mm' }}</p></div>
                <div><span class="text-blue-500">Requested checkout</span>
                  <p class="font-medium">{{ selectedRequest()!.metadata.requested_checkout | date:'dd MMM yyyy HH:mm' }}</p></div>
                <div><span class="text-blue-500">Extra nights</span>
                  <p class="font-medium">{{ selectedRequest()!.metadata.extra_nights }}</p></div>
                <div><span class="text-blue-500">Rate/night</span>
                  <p class="font-medium">₦{{ selectedRequest()!.metadata.rate_per_night | number }}</p></div>
              </div>
            </div>
          }
          @if (selectedRequest()!.staff_notes) {
            <div class="bg-amber-50 rounded-lg p-3 mb-4">
              <p class="text-xs font-semibold text-amber-700 mb-1">Staff Notes</p>
              <p class="text-sm text-amber-800">{{ selectedRequest()!.staff_notes }}</p>
            </div>
          }
          <!-- Staff notes input -->
          <div class="mb-4">
            <label class="block text-xs text-gray-500 mb-1">Add staff note</label>
            <textarea [(ngModel)]="staffNote" rows="2"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 resize-none"
              placeholder="Internal note…"></textarea>
          </div>
          <div class="flex flex-wrap gap-2">
            <button (click)="selectedRequest.set(null)"
              class="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Close</button>
            @if (selectedRequest()!.status === 'pending') {
              <button (click)="acknowledge(selectedRequest()!.id)"
                class="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">Acknowledge</button>
            }
            @if (selectedRequest()!.status === 'acknowledged') {
              <button (click)="startProgress(selectedRequest()!.id)"
                class="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm hover:bg-amber-600">Start</button>
            }
            @if (selectedRequest()!.status === 'in_progress') {
              <button (click)="complete(selectedRequest()!.id)"
                class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">Mark Complete</button>
            }
            @if (['pending','acknowledged'].includes(selectedRequest()!.status)) {
              <button (click)="cancel(selectedRequest()!.id)"
                class="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm hover:bg-red-100">Cancel</button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ServiceRequestsPage implements OnInit {
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  loading         = signal(true);
  requests        = signal<any[]>([]);
  selectedRequest = signal<any | null>(null);
  summary         = signal({ total: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0 });

  filterStatus   = '';
  filterCategory = '';
  filterPriority = '';
  viewMode       = 'list';
  staffNote      = '';

  readonly kanbanCols = [
    { status: 'pending',     label: 'Pending' },
    { status: 'acknowledged',label: 'Acknowledged' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'completed',   label: 'Completed' },
  ];

  readonly filteredRequests = computed(() => {
    let list = this.requests();
    if (this.filterStatus)   list = list.filter(r => r.status === this.filterStatus);
    if (this.filterCategory) list = list.filter(r => r.category === this.filterCategory);
    if (this.filterPriority) list = list.filter(r => String(r.priority) === this.filterPriority);
    return list;
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const pid = this.activeProperty.propertyId();
    this.api.get<any>('/service-requests', { property_id: pid }).subscribe({
      next: r => { this.requests.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.get<any>('/service-requests/summary', { property_id: pid }).subscribe({
      next: r => { if (r.success) this.summary.set(r.data); },
    });
  }

  openDetail(r: any): void { this.staffNote = ''; this.selectedRequest.set(r); }

  kanbanItems(status: string): any[] {
    return this.filteredRequests().filter(r => r.status === status);
  }

  acknowledge(id: string): void {
    this.api.post<any>(`/service-requests/${id}/acknowledge`, { notes: this.staffNote || null }).subscribe({
      next: r => { if (r.success) { this.toast.success('Request acknowledged'); this.selectedRequest.set(null); this.load(); } },
      error: () => this.toast.error('Failed to acknowledge'),
    });
  }

  startProgress(id: string): void {
    this.api.post<any>(`/service-requests/${id}/progress`, { notes: this.staffNote || null }).subscribe({
      next: r => { if (r.success) { this.toast.success('Request started'); this.selectedRequest.set(null); this.load(); } },
      error: () => this.toast.error('Failed to start'),
    });
  }

  complete(id: string): void {
    this.api.post<any>(`/service-requests/${id}/complete`, { notes: this.staffNote || null }).subscribe({
      next: r => { if (r.success) { this.toast.success('Request completed ✓'); this.selectedRequest.set(null); this.load(); } },
      error: () => this.toast.error('Failed to complete'),
    });
  }

  cancel(id: string): void {
    this.api.post<any>(`/service-requests/${id}/cancel`, {}).subscribe({
      next: r => { if (r.success) { this.toast.success('Request cancelled'); this.selectedRequest.set(null); this.load(); } },
      error: () => this.toast.error('Failed to cancel'),
    });
  }

  clearFilters(): void { this.filterStatus = ''; this.filterCategory = ''; this.filterPriority = ''; }

  priorityClass(p: number): string {
    const m: Record<number, string> = {
      1: 'bg-gray-100 text-gray-500',
      2: 'bg-blue-100 text-blue-600',
      3: 'bg-amber-100 text-amber-700',
      4: 'bg-red-100 text-red-700',
    };
    return m[p] ?? 'bg-gray-100 text-gray-500';
  }
}
