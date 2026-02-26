import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, AuthService, ActivePropertyService} from '@lodgik/shared';

@Component({
  selector: 'app-room-controls', standalone: true, imports: [PageHeaderComponent, FormsModule],
  template: `
    <ui-page-header title="Room Controls" subtitle="DND status, make-up requests, maintenance reports"></ui-page-header>
    <div class="flex gap-1 mb-4">
      @for (tab of tabs; track tab.key) {
        <button (click)="activeTab = tab.key; load()" [class]="activeTab === tab.key ? 'px-4 py-2 bg-sage-600 text-white rounded-lg text-sm' : 'px-4 py-2 border rounded-lg text-sm hover:bg-gray-50'">{{ tab.label }}</button>
      }
    </div>
    <div class="space-y-2">
      @for (r of requests(); track r.id) {
        <div class="bg-white border rounded-lg p-4">
          <div class="flex justify-between items-start">
            <div>
              <div class="font-medium">{{ typeIcon(r.request_type) }} Room {{ r.room_number }} <span class="text-xs bg-gray-100 rounded px-2 py-0.5 ml-2">{{ r.request_type.replace('_', ' ') }}</span></div>
              @if (r.description) { <div class="text-sm text-gray-600 mt-1">{{ r.description }}</div> }
              @if (r.photo_url) { <div class="text-xs text-sage-500 mt-1">📷 Photo attached</div> }
              @if (r.assigned_to_name) { <div class="text-xs text-gray-400 mt-1">Assigned: {{ r.assigned_to_name }}</div> }
              @if (r.staff_notes) { <div class="text-xs text-green-600 mt-1">Notes: {{ r.staff_notes }}</div> }
            </div>
            <div class="flex gap-2 items-center">
              <span [class]="'text-xs font-bold px-2 py-1 rounded ' + statusBadge(r.status)">{{ r.status }}</span>
              @if (r.request_type === 'maintenance' && r.status === 'pending') {
                <button (click)="assign(r.id)" class="px-3 py-1 bg-sage-600 text-white rounded text-xs">Assign</button>
              }
              @if (r.request_type === 'maintenance' && (r.status === 'acknowledged' || r.status === 'in_progress')) {
                <button (click)="resolve(r.id)" class="px-3 py-1 bg-green-600 text-white rounded text-xs">Resolve</button>
              }
            </div>
          </div>
        </div>
      }
      @if (requests().length === 0) { <div class="text-center text-gray-400 p-8">No {{ activeTab }} requests</div> }
    </div>
  `,
})
export class RoomControlsPage implements OnInit {
  private api = inject(ApiService); private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  requests = signal<any[]>([]);
  activeTab = 'maintenance';
  tabs = [{ key: 'maintenance', label: '🔧 Maintenance' }, { key: 'dnd', label: '🔕 DND' }, { key: 'make_up_room', label: '🧹 Make Up' }];

  ngOnInit() { this.load(); }

  load() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/room-controls/requests?property_id=${pid}&type=${this.activeTab}`).subscribe({ next: (r: any) => this.requests.set(r.data || []) });
  }

  assign(id: string) {
    const user = this.auth.currentUser;
    this.api.post(`/room-controls/maintenance/${id}/assign`, { user_id: user?.id || '', user_name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Staff' }).subscribe({ next: () => this.load() });
  }

  resolve(id: string) {
    const notes = prompt('Resolution notes (optional):') || '';
    this.api.post(`/room-controls/maintenance/${id}/resolve`, { staff_notes: notes }).subscribe({ next: () => this.load() });
  }

  typeIcon(t: string): string { return t === 'dnd' ? '🔕' : t === 'make_up_room' ? '🧹' : '🔧'; }
  statusBadge(s: string): string { return s === 'resolved' ? 'bg-green-100 text-green-700' : s === 'in_progress' ? 'bg-sage-100 text-sage-700' : s === 'acknowledged' ? 'bg-amber-100 text-amber-700' : s === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'; }
}
