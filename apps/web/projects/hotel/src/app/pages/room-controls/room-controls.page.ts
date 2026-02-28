import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, AuthService, ActivePropertyService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-room-controls',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Room Controls" icon="sliders-horizontal" [breadcrumbs]="['Daily Operation', 'Room Controls']"
      subtitle="DND status, make-up requests, and maintenance reports">
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- ── Resolve Modal ──────────────────────────────────── -->
    @if (resolvingId) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="resolvingId = null">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <h3 class="text-base font-semibold text-gray-800 mb-1">Resolve Maintenance</h3>
          <p class="text-sm text-gray-400 mb-4">Room {{ resolvingRoom }}</p>
          <label class="text-xs font-medium text-gray-500 mb-1 block">Resolution Notes (optional)</label>
          <textarea [(ngModel)]="resolveNotes" rows="3" placeholder="What was done..."
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none mb-4"></textarea>
          <div class="flex gap-2">
            <button (click)="submitResolve()" class="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700">Mark Resolved</button>
            <button (click)="resolvingId = null" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Assign Modal ───────────────────────────────────── -->
    @if (assigningId) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="assigningId = null">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Assign — Room {{ assigningRoom }}</h3>
            <button (click)="assigningId = null" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="space-y-2 max-h-60 overflow-y-auto mb-4">
            @if (staffLoading) {
              <p class="text-sm text-gray-400 text-center py-6">Loading staff...</p>
            } @else if (staffList().length === 0) {
              <p class="text-sm text-gray-400 text-center py-6">No staff found</p>
            } @else {
              @for (s of staffList(); track s.id) {
                <button (click)="submitAssign(s)"
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
          <button (click)="assigningId = null" class="w-full px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    }

    @if (!loading()) {
      <!-- Stats Row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <ui-stats-card label="Total Requests" [value]="allRequests().length" icon="clipboard-list"></ui-stats-card>
        <ui-stats-card label="Maintenance" [value]="countByType('maintenance')" icon="wrench"></ui-stats-card>
        <ui-stats-card label="DND Active" [value]="countByType('dnd')" icon="bell"></ui-stats-card>
        <ui-stats-card label="Make Up" [value]="countByType('make_up_room')" icon="spray-can"></ui-stats-card>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-4 flex-wrap">
        @for (tab of tabs; track tab.key) {
          <button (click)="activeTab = tab.key; statusFilter = ''; load()"
            [class]="activeTab === tab.key
              ? 'px-4 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium'
              : 'px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50'">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Status sub-filter (maintenance only) -->
      @if (activeTab === 'maintenance') {
        <div class="flex gap-2 mb-4">
          @for (f of statusFilters; track f.value) {
            <button (click)="statusFilter = f.value; load()"
              [class]="statusFilter === f.value
                ? 'px-3 py-1 text-xs font-medium bg-gray-800 text-white rounded-lg'
                : 'px-3 py-1 text-xs bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50'">
              {{ f.label }}
            </button>
          }
        </div>
      }

      <!-- Request Cards -->
      <div class="space-y-2">
        @for (r of requests(); track r.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-gray-800">{{ typeIcon(r.request_type) }} Room {{ r.room_number }}</span>
                  <span class="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">{{ typeLabel(r.request_type) }}</span>
                </div>
                @if (r.description) {
                  <p class="text-sm text-gray-600 mt-1">{{ r.description }}</p>
                }
                <div class="text-xs text-gray-400 mt-1 flex flex-wrap gap-2">
                  @if (r.assigned_to_name) { <span>👤 {{ r.assigned_to_name }}</span> }
                  @if (r.staff_notes) { <span class="text-green-600">📝 {{ r.staff_notes }}</span> }
                  @if (r.photo_url) { <span>📷 Photo attached</span> }
                  <span>{{ formatTime(r.created_at) }}</span>
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full" [class]="statusBadge(r.status)">{{ r.status }}</span>
                <div class="flex gap-1 flex-wrap justify-end">
                  @if (r.request_type === 'maintenance') {
                    @if (r.status === 'pending') {
                      <button (click)="openAssign(r)" class="text-xs px-2.5 py-1 border border-sage-200 text-sage-600 rounded-lg hover:bg-sage-50 font-medium">Assign</button>
                    }
                    @if (r.status === 'acknowledged' || r.status === 'in_progress') {
                      <button (click)="openResolve(r)" class="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">✓ Resolve</button>
                    }
                  }
                  @if (r.request_type === 'dnd' || r.request_type === 'make_up_room') {
                    @if (r.status !== 'cancelled' && r.status !== 'resolved') {
                      <button (click)="cancelRequest(r)" class="text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">Cancel</button>
                    }
                  }
                </div>
              </div>
            </div>
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">{{ tabs.find(t => t.key === activeTab)?.emptyIcon || '📋' }}</div>
            <p class="text-sm font-medium">No {{ typeLabel(activeTab) }} requests</p>
          </div>
        }
      </div>
    }
  `,
})
export class RoomControlsPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  private toast = inject(ToastService);

  loading = signal(true);
  allRequests = signal<any[]>([]);
  requests = signal<any[]>([]);
  staffList = signal<any[]>([]);

  activeTab = 'maintenance';
  statusFilter = '';
  staffLoading = false;
  resolvingId: string | null = null;
  resolvingRoom = '';
  resolveNotes = '';
  assigningId: string | null = null;
  assigningRoom = '';

  tabs = [
    { key: 'maintenance', label: '🔧 Maintenance', emptyIcon: '🔧' },
    { key: 'dnd', label: '🔕 DND', emptyIcon: '🔕' },
    { key: 'make_up_room', label: '🧹 Make Up', emptyIcon: '🧹' },
  ];
  statusFilters = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Acknowledged', value: 'acknowledged' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
  ];

  ngOnInit() { this.loadAll(); }

  loadAll() {
    // Load all types for stats, then filter
    this.loading.set(true);
    const pid = this.activeProperty.propertyId();
    this.api.get(`/room-controls/requests?property_id=${pid}`).subscribe({
      next: (r: any) => {
        this.allRequests.set(r.data || []);
        this.load();
      },
      error: () => { this.toast.error('Failed to load requests'); this.loading.set(false); },
    });
  }

  load() {
    const pid = this.activeProperty.propertyId();
    let url = `/room-controls/requests?property_id=${pid}&type=${this.activeTab}`;
    if (this.statusFilter) url += `&status=${this.statusFilter}`;
    this.api.get(url).subscribe({
      next: (r: any) => { this.requests.set(r.data || []); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load'); this.loading.set(false); },
    });
  }

  countByType(type: string): number {
    return this.allRequests().filter(r => r.request_type === type && r.status !== 'cancelled' && r.status !== 'resolved').length;
  }

  loadStaff() {
    this.staffLoading = true;
    this.staffList.set([]);
    this.api.get(`/employees?property_id=${this.activeProperty.propertyId()}`).subscribe({
      next: (r: any) => { this.staffList.set(r.data || r.items || []); this.staffLoading = false; },
      error: () => { this.staffLoading = false; },
    });
  }

  // Assign
  openAssign(r: any) { this.assigningId = r.id; this.assigningRoom = r.room_number; this.loadStaff(); }

  submitAssign(staff: any) {
    const name = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
    this.api.post(`/room-controls/maintenance/${this.assigningId}/assign`, { user_id: staff.id, user_name: name }).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success(`Assigned to ${name}`); this.assigningId = null; this.load(); this.loadAll(); }
        else { this.toast.error(r.message || 'Failed to assign'); }
      },
      error: () => this.toast.error('Failed to assign'),
    });
  }

  // Resolve
  openResolve(r: any) { this.resolvingId = r.id; this.resolvingRoom = r.room_number; this.resolveNotes = ''; }

  submitResolve() {
    this.api.post(`/room-controls/maintenance/${this.resolvingId}/resolve`, { staff_notes: this.resolveNotes || null }).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success('Maintenance resolved'); this.resolvingId = null; this.load(); this.loadAll(); }
        else { this.toast.error(r.message || 'Failed to resolve'); }
      },
      error: () => this.toast.error('Failed to resolve'),
    });
  }

  // Cancel DND / Make Up
  cancelRequest(req: any) {
    const endpoint = req.request_type === 'dnd' ? '/room-controls/dnd' : '/room-controls/make-up';
    this.api.post(endpoint, {
      property_id: this.activeProperty.propertyId(),
      booking_id: req.booking_id,
      guest_id: req.guest_id || '',
      room_id: req.room_id,
      room_number: req.room_number,
      active: false,
    }).subscribe({
      next: (r: any) => {
        if (r.success) { this.toast.success(`${this.typeLabel(req.request_type)} cancelled`); this.load(); this.loadAll(); }
        else { this.toast.error(r.message || 'Failed to cancel'); }
      },
      error: () => this.toast.error('Failed to cancel request'),
    });
  }

  // Helpers
  typeIcon(t: string): string { return t === 'dnd' ? '🔕' : t === 'make_up_room' ? '🧹' : '🔧'; }

  typeLabel(t: string): string {
    return t === 'dnd' ? 'DND' : t === 'make_up_room' ? 'Make Up Room' : 'Maintenance';
  }

  statusBadge(s: string): string {
    const map: Record<string, string> = {
      resolved: 'bg-green-100 text-green-700',
      in_progress: 'bg-blue-100 text-blue-700',
      acknowledged: 'bg-amber-100 text-amber-700',
      cancelled: 'bg-gray-100 text-gray-400',
      pending: 'bg-red-100 text-red-600',
    };
    return map[s] || 'bg-gray-100 text-gray-500';
  }

  formatTime(dt: string): string {
    if (!dt) return '';
    try { return new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return dt; }
  }
}
