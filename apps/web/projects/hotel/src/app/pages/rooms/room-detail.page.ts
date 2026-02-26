import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, ActivePropertyService} from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header [title]="'Room ' + (room()?.room_number || '')" subtitle="Room details, status history and current booking">
      <a routerLink="/rooms" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Back</a>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && room()) {
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Room Info Card -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                 [style.background-color]="room()!.status_color">
              {{ room()!.room_number }}
            </div>
            <div>
              <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold text-white" [style.background-color]="room()!.status_color">{{ room()!.status_label }}</span>
              <p class="text-xs text-gray-400 mt-1">Floor {{ room()!.floor }}</p>
            </div>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-gray-400">Room Type</span><span class="font-medium">{{ roomTypeName() }}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">Active</span><span class="font-medium">{{ room()!.is_active ? 'Yes' : 'No' }}</span></div>
            @if (room()!.notes) {
              <div class="pt-2 border-t border-gray-100"><span class="text-gray-400">Notes</span><p class="mt-1 text-gray-700">{{ room()!.notes }}</p></div>
            }
          </div>

          <!-- Status Change -->
          <div class="mt-5 pt-4 border-t border-gray-100">
            <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Change Status</h4>
            <div class="flex flex-wrap gap-2">
              @for (s of getTransitions(room()!.status); track s) {
                <button (click)="changeStatus(s)" class="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                  → {{ statusLabels[s] }}
                </button>
              }
              @if (getTransitions(room()!.status).length === 0) {
                <p class="text-xs text-gray-400">No transitions available</p>
              }
            </div>
          </div>
        </div>

        <!-- Current Booking + Amenities -->
        <div class="space-y-6">
          <!-- Current Booking -->
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Current Booking</h3>
            @if (currentBooking()) {
              <div class="space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-gray-400">Ref</span><a [routerLink]="['/bookings', currentBooking()!.id]" class="font-medium text-sage-600 hover:underline">{{ currentBooking()!.booking_ref }}</a></div>
                <div class="flex justify-between"><span class="text-gray-400">Guest</span><span class="font-medium">{{ currentBooking()!.guest_id }}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Status</span><span class="px-2 py-0.5 rounded-full text-xs font-medium text-white" [style.background-color]="currentBooking()!.status_color">{{ currentBooking()!.status_label }}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Check-in</span><span class="font-medium">{{ currentBooking()!.check_in | date:'mediumDate' }}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Check-out</span><span class="font-medium">{{ currentBooking()!.check_out | date:'mediumDate' }}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Total</span><span class="font-bold text-emerald-600">₦{{ (+currentBooking()!.total_amount).toLocaleString() }}</span></div>
              </div>
            } @else {
              <p class="text-gray-400 text-sm py-4 text-center">No active booking</p>
            }
          </div>

          <!-- Amenities -->
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Amenities</h3>
            @if (amenitiesList().length > 0) {
              <div class="flex flex-wrap gap-2">
                @for (a of amenitiesList(); track a) {
                  <span class="inline-block px-2.5 py-1 bg-sage-50 text-sage-700 text-xs font-medium rounded-full">{{ a }}</span>
                }
              </div>
            } @else {
              <p class="text-gray-400 text-sm">No amenities configured</p>
            }
          </div>
        </div>

        <!-- Status History -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Status History</h3>
          <div class="space-y-0 max-h-[400px] overflow-y-auto">
            @for (log of statusHistory(); track log.id) {
              <div class="flex gap-3 pb-3 relative">
                @if (!$last) {
                  <div class="absolute left-[7px] top-5 bottom-0 w-px bg-gray-200"></div>
                }
                <div class="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 z-10 bg-white" [style.border-color]="statusColorMap[log.new_status] || '#6b7280'"></div>
                <div class="min-w-0">
                  <div class="text-sm">
                    <span class="text-gray-400">{{ statusLabels[log.old_status] || log.old_status }}</span>
                    <span class="mx-1">→</span>
                    <span class="font-medium">{{ statusLabels[log.new_status] || log.new_status }}</span>
                  </div>
                  <p class="text-xs text-gray-400">{{ log.created_at | date:'short' }}</p>
                  @if (log.notes) {
                    <p class="text-xs text-gray-500 mt-0.5">{{ log.notes }}</p>
                  }
                </div>
              </div>
            }
            @if (statusHistory().length === 0) {
              <p class="text-gray-400 text-sm text-center py-4">No history yet</p>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class RoomDetailPage implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  room = signal<any>(null);
  currentBooking = signal<any>(null);
  statusHistory = signal<any[]>([]);
  roomTypes = signal<any[]>([]);
  amenitiesList = signal<string[]>([]);

  statusLabels: Record<string, string> = {
    vacant_clean: 'Vacant Clean', vacant_dirty: 'Vacant Dirty', occupied: 'Occupied',
    reserved: 'Reserved', out_of_order: 'Out of Order', maintenance: 'Maintenance',
  };

  statusColorMap: Record<string, string> = {
    vacant_clean: '#22c55e', vacant_dirty: '#f59e0b', occupied: '#3b82f6',
    reserved: '#8b5cf6', out_of_order: '#ef4444', maintenance: '#dc2626',
  };

  private transitions: Record<string, string[]> = {
    vacant_clean: ['reserved', 'occupied', 'out_of_order', 'maintenance'],
    vacant_dirty: ['vacant_clean', 'out_of_order', 'maintenance'],
    occupied: ['vacant_dirty', 'out_of_order'],
    reserved: ['occupied', 'vacant_clean', 'out_of_order'],
    out_of_order: ['vacant_dirty', 'maintenance'],
    maintenance: ['vacant_dirty', 'out_of_order'],
  };

  private roomId = '';

  ngOnInit(): void {
    this.roomId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.roomId) this.loadRoom();
  }

  loadRoom(): void {
    this.api.get(`/rooms/${this.roomId}`).subscribe(r => {
      if (r.success) {
        this.room.set(r.data);
        this.amenitiesList.set(r.data?.amenities ?? []);
        this.loadStatusHistory();
        this.loadCurrentBooking();
        this.loadRoomTypes();
      }
      this.loading.set(false);
    });
  }

  loadStatusHistory(): void {
    this.api.get(`/rooms/${this.roomId}/status-history`).subscribe(r => {
      if (r.success) this.statusHistory.set(r.data ?? []);
    });
  }

  loadCurrentBooking(): void {
    const user = this.auth.currentUser;
    const propertyId = user?.property_id;
    if (!propertyId) return;
    this.api.get('/bookings', { room_id: this.roomId, status: 'checked_in', property_id: propertyId, limit: 1 }).subscribe(r => {
      if (r.success && r.data?.length > 0) this.currentBooking.set(r.data[0]);
    });
  }

  loadRoomTypes(): void {
    const user = this.auth.currentUser;
    const propertyId = user?.property_id;
    if (!propertyId) return;
    this.api.get('/room-types', { property_id: propertyId, limit: 50 }).subscribe(r => {
      if (r.success) this.roomTypes.set(r.data ?? []);
    });
  }

  roomTypeName(): string {
    return this.roomTypes().find((rt: any) => rt.id === this.room()?.room_type_id)?.name ?? '—';
  }

  getTransitions(status: string): string[] {
    return this.transitions[status] ?? [];
  }

  changeStatus(newStatus: string): void {
    this.api.patch(`/rooms/${this.roomId}/status`, { status: newStatus }).subscribe(r => {
      if (r.success) { this.toast.success('Status updated'); this.loadRoom(); }
      else this.toast.error(r.message || 'Failed');
    });
  }
}
