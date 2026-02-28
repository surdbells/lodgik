import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService, StatsCardComponent, BadgeComponent, ActivePropertyService} from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

interface RoomFilters {
  property_id: string;
  room_type_id: string;
  status: string;
  floor: string;
  search: string;
}

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [FormsModule, DecimalPipe, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Rooms" subtitle="Manage rooms and room status">
      <div class="flex gap-2">
        <button class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                [class.bg-sage-50]="viewMode() === 'grid'" [class.border-blue-300]="viewMode() === 'grid'"
                (click)="viewMode.set('grid')">Grid</button>
        <button class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                [class.bg-sage-50]="viewMode() === 'list'" [class.border-blue-300]="viewMode() === 'list'"
                (click)="viewMode.set('list')">List</button>
        <button class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700" (click)="showBulk = !showBulk">
          {{ showBulk ? 'Cancel' : '⚡ Bulk Create' }}
        </button>
        <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700" (click)="showAdd = !showAdd">
          {{ showAdd ? 'Cancel' : '+ Add Room' }}
        </button>
      </div>
    </ui-page-header>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <ui-stats-card label="Total" [value]="statusCounts().total" icon="hotel"></ui-stats-card>
      <ui-stats-card label="Available" [value]="statusCounts().vacant_clean" icon="circle-check"></ui-stats-card>
      <ui-stats-card label="Occupied" [value]="statusCounts().occupied" icon="bed-double"></ui-stats-card>
      <ui-stats-card label="Dirty" [value]="statusCounts().vacant_dirty" icon="spray-can"></ui-stats-card>
      <ui-stats-card label="Reserved" [value]="statusCounts().reserved" icon="calendar-days"></ui-stats-card>
      <ui-stats-card label="OOO/Maint." [value]="(statusCounts().out_of_order || 0) + (statusCounts().maintenance || 0)" icon="wrench"></ui-stats-card>
    </div>

    <!-- Add Room Form -->
    @if (showAdd) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Add Room</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select [(ngModel)]="addForm.room_type_id" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Select Room Type</option>
            @for (rt of roomTypes(); track rt.id) {
              <option [value]="rt.id">{{ rt.name }} — ₦{{ rt.base_rate | number }}</option>
            }
          </select>
          <input [(ngModel)]="addForm.room_number" placeholder="Room number (e.g. 101)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.floor" type="number" placeholder="Floor" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.notes" placeholder="Notes (optional)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        </div>
        <div class="mt-3">
          <p class="text-xs text-gray-500 mb-2">Amenities</p>
          <div class="flex flex-wrap gap-2">
            @for (a of amenityOptions; track a) {
              <label class="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs cursor-pointer transition-colors"
                     [class]="addForm.amenities.includes(a) ? 'bg-sage-50 border-sage-400 text-sage-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'">
                <input type="checkbox" class="hidden" [checked]="addForm.amenities.includes(a)" (change)="toggleAmenity(addForm, a)">
                {{ a }}
              </label>
            }
          </div>
        </div>
        <button (click)="createRoom()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Create</button>
      </div>
    }

    <!-- Bulk Create Rooms Form -->
    @if (showBulk) {
      <div class="bg-white rounded-xl border border-indigo-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-1">Bulk Create Rooms</h3>
        <p class="text-xs text-gray-400 mb-4">Generate multiple rooms with sequential numbering in one step.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Room Type</label>
            <select [(ngModel)]="bulkForm.room_type_id" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="">Select Room Type</option>
              @for (rt of roomTypes(); track rt.id) {
                <option [value]="rt.id">{{ rt.name }} — ₦{{ rt.base_rate | number }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Floor</label>
            <input [(ngModel)]="bulkForm.floor" type="number" placeholder="e.g. 1" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Start Number</label>
            <input [(ngModel)]="bulkForm.start_number" type="number" placeholder="e.g. 101" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Count</label>
            <input [(ngModel)]="bulkForm.count" type="number" min="1" max="50" placeholder="e.g. 10" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          </div>
        </div>
        <div class="mb-3 p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700">
          Preview: Rooms <strong>{{ bulkForm.start_number }}</strong> to <strong>{{ (bulkForm.start_number || 0) + (bulkForm.count || 0) - 1 }}</strong> on floor {{ bulkForm.floor || '?' }} ({{ bulkForm.count || 0 }} rooms)
        </div>
        <div class="flex gap-2">
          <button (click)="bulkCreate()" class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Create {{ bulkForm.count || 0 }} Rooms</button>
          <button (click)="showBulk = false" class="px-4 py-2 text-sm text-gray-500 border rounded-lg">Cancel</button>
        </div>
      </div>
    }

    <!-- Edit Room Modal -->
    @if (showEdit && editForm) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showEdit = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">Edit Room {{ editForm.room_number }}</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-gray-500">Room Type</label>
              <select [(ngModel)]="editForm.room_type_id" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                @for (rt of roomTypes(); track rt.id) {
                  <option [value]="rt.id">{{ rt.name }}</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-500">Room Number</label>
                <input [(ngModel)]="editForm.room_number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
              <div>
                <label class="text-xs text-gray-500">Floor</label>
                <input [(ngModel)]="editForm.floor" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
            </div>
            <div>
              <label class="text-xs text-gray-500">Notes</label>
              <textarea [(ngModel)]="editForm.notes" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></textarea>
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Amenities</label>
              <div class="flex flex-wrap gap-2">
                @for (a of amenityOptions; track a) {
                  <label class="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs cursor-pointer transition-colors"
                         [class]="editForm.amenities?.includes(a) ? 'bg-sage-50 border-sage-400 text-sage-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'">
                    <input type="checkbox" class="hidden" [checked]="editForm.amenities?.includes(a)" (change)="toggleAmenity(editForm, a)">
                    {{ a }}
                  </label>
                }
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="editForm.is_active" id="editActive" class="rounded">
              <label for="editActive" class="text-sm text-gray-700">Active</label>
            </div>
          </div>
          <div class="flex gap-2 mt-5">
            <button (click)="saveEdit()" class="flex-1 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">Save</button>
            <button (click)="showEdit = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <select [(ngModel)]="filters.status" (ngModelChange)="load()" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        <option value="">All Statuses</option>
        <option value="vacant_clean">Vacant Clean</option>
        <option value="vacant_dirty">Vacant Dirty</option>
        <option value="occupied">Occupied</option>
        <option value="reserved">Reserved</option>
        <option value="out_of_order">Out of Order</option>
        <option value="maintenance">Maintenance</option>
      </select>
      <select [(ngModel)]="filters.room_type_id" (ngModelChange)="load()" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        <option value="">All Types</option>
        @for (rt of roomTypes(); track rt.id) {
          <option [value]="rt.id">{{ rt.name }}</option>
        }
      </select>
      <select [(ngModel)]="filters.floor" (ngModelChange)="load()" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        <option value="">All Floors</option>
        @for (f of floors(); track f) {
          <option [value]="f">Floor {{ f }}</option>
        }
      </select>
    </div>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Grid View -->
      @if (viewMode() === 'grid') {
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          @for (room of rooms(); track room.id) {
            <div class="relative rounded-lg border-2 p-3 text-center cursor-pointer hover:shadow-md transition-shadow"
                 [style.border-color]="room.status_color"
                 [style.background-color]="room.status_color + '15'"
                 (click)="selectedRoom = room; showStatusDialog = true">
              <div class="text-sm font-bold text-gray-800">{{ room.room_number }}</div>
              <div class="text-[10px] text-gray-500 mt-0.5">{{ room.status_label }}</div>
              <div class="w-2 h-2 rounded-full absolute top-1.5 right-1.5" [style.background-color]="room.status_color"></div>
            </div>
          }
        </div>
        @if (rooms().length === 0) {
          <div class="text-center py-12 text-gray-400">No rooms found</div>
        }
      }

      <!-- List View -->
      @if (viewMode() === 'list') {
        <ui-data-table [columns]="columns" [data]="rooms()" [actions]="actions" [totalItems]="total()" (pageChange)="onPage($event)"></ui-data-table>
      }
    }

    <!-- Status Change Dialog -->
    @if (showStatusDialog && selectedRoom) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showStatusDialog = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-1">Room {{ selectedRoom.room_number }}</h3>
          <p class="text-sm text-gray-500 mb-4">Current: <span class="font-medium" [style.color]="selectedRoom.status_color">{{ selectedRoom.status_label }}</span></p>
          <div class="space-y-2">
            @for (s of getTransitions(selectedRoom.status); track s) {
              <button (click)="changeStatus(selectedRoom.id, s)"
                      class="w-full text-left px-4 py-2.5 rounded-xl border border-gray-100 text-sm hover:bg-gray-50 transition-colors">
                → {{ statusLabels[s] }}
              </button>
            }
          </div>
          <button (click)="showStatusDialog = false" class="mt-4 w-full px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
        </div>
      </div>
    }
  `,
})
export class RoomsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  rooms = signal<any[]>([]);
  total = signal(0);
  roomTypes = signal<any[]>([]);
  floors = signal<number[]>([]);
  statusCounts = signal<any>({});
  viewMode = signal<'grid' | 'list'>('grid');
  page = 1;
  showAdd = false;
  showBulk = false;
  showStatusDialog = false;
  selectedRoom: any = null;

  filters: RoomFilters = { property_id: '', room_type_id: '', status: '', floor: '', search: '' };
  addForm: any = { room_type_id: '', room_number: '', floor: null, notes: '', amenities: [] as string[] };
  bulkForm: any = { room_type_id: '', floor: 1, start_number: 101, count: 10 };
  showEdit = false;
  editForm: any = null;

  amenityOptions = ['Wi-Fi', 'TV', 'AC', 'Mini Bar', 'Safe', 'Balcony', 'Bath Tub', 'Shower', 'Hair Dryer', 'Iron', 'Coffee Maker', 'Desk', 'Room Service', 'Sea View', 'City View', 'Pool Access', 'Parking'];

  statusLabels: Record<string, string> = {
    vacant_clean: 'Vacant Clean', vacant_dirty: 'Vacant Dirty', occupied: 'Occupied',
    reserved: 'Reserved', out_of_order: 'Out of Order', maintenance: 'Maintenance',
  };

  // State machine transitions (mirrors backend)
  private transitions: Record<string, string[]> = {
    vacant_clean: ['reserved', 'occupied', 'out_of_order', 'maintenance'],
    vacant_dirty: ['vacant_clean', 'out_of_order', 'maintenance'],
    occupied: ['vacant_dirty', 'out_of_order'],
    reserved: ['occupied', 'vacant_clean', 'out_of_order'],
    out_of_order: ['vacant_dirty', 'maintenance'],
    maintenance: ['vacant_dirty', 'out_of_order'],
  };

  columns: TableColumn[] = [
    { key: 'room_number', label: 'Room', sortable: true, width: '80px' },
    { key: 'floor', label: 'Floor', width: '60px' },
    { key: 'status_label', label: 'Status', type: 'badge', badgeColor: (r: any) => r.status_color || '#6b7280', badgeLabel: (r: any) => r.status_label || r.status },
    { key: 'room_type_id', label: 'Type', render: (_v: any, r: any) => this.getRoomTypeName(r.room_type_id) },
    { key: 'is_active', label: 'Active', render: (v: boolean) => v ? '<span class="text-emerald-600">Yes</span>' : '<span class="text-gray-400">No</span>' },
  ];

  actions: TableAction[] = [
    { label: 'Edit', handler: (r) => this.openEdit(r) },
    { label: 'Details', handler: (r) => this.router.navigate(['/rooms', r.id]) },
    { label: 'Change Status', handler: (r) => { this.selectedRoom = r; this.showStatusDialog = true; } },
  ];

  ngOnInit(): void {
    // Get property_id from auth
    const user = this.auth.currentUser;
    if (user?.property_id) this.filters.property_id = user.property_id;
    this.loadRoomTypes();
    this.load();
  }

  loadRoomTypes(): void {
    if (!this.filters.property_id) return;
    this.api.get('/room-types', { property_id: this.filters.property_id, limit: 50 }).subscribe(r => {
      if (r.success) this.roomTypes.set(r.data ?? []);
    });
    this.api.get('/rooms/floors', { property_id: this.filters.property_id }).subscribe(r => {
      if (r.success) this.floors.set(r.data ?? []);
    });
    this.api.get('/rooms/status-counts', { property_id: this.filters.property_id }).subscribe(r => {
      if (r.success) {
        const d = r.data as any;
        d.total = Object.values(d).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
        this.statusCounts.set(d);
      }
    });
  }

  load(): void {
    const params: any = { page: this.page, limit: 100 };
    if (this.filters.property_id) params.property_id = this.filters.property_id;
    if (this.filters.room_type_id) params.room_type_id = this.filters.room_type_id;
    if (this.filters.status) params.status = this.filters.status;
    if (this.filters.floor) params.floor = this.filters.floor;

    this.api.get('/rooms', params).subscribe({
      next: r => { if (r.success) { this.rooms.set(r.data ?? []); this.total.set(r.meta?.total ?? 0); } this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: any): void { this.page = e.page; this.load(); }

  createRoom(): void {
    if (!this.addForm.room_type_id || !this.addForm.room_number) {
      this.toast.error('Room type and number are required');
      return;
    }
    const body = { ...this.addForm, property_id: this.filters.property_id };
    this.api.post('/rooms', body).subscribe(r => {
      if (r.success) { this.toast.success('Room created'); this.showAdd = false; this.addForm = { room_type_id: '', room_number: '', floor: null, notes: '', amenities: [] }; this.load(); this.loadRoomTypes(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  bulkCreate(): void {
    if (!this.bulkForm.room_type_id || !this.bulkForm.count || !this.bulkForm.start_number) {
      this.toast.error('Room type, start number, and count are required');
      return;
    }
    const body = {
      property_id: this.filters.property_id,
      room_type_id: this.bulkForm.room_type_id,
      floor: this.bulkForm.floor,
      start_number: this.bulkForm.start_number,
      count: this.bulkForm.count,
    };
    this.api.post('/rooms/bulk-create', body).subscribe(r => {
      if (r.success) {
        this.toast.success(`${r.data?.created ?? this.bulkForm.count} rooms created successfully`);
        this.showBulk = false;
        this.bulkForm = { room_type_id: '', floor: 1, start_number: 101, count: 10 };
        this.load();
      } else this.toast.error(r.message || 'Failed to bulk create rooms');
    });
  }

  toggleAmenity(form: any, amenity: string): void {
    if (!form.amenities) form.amenities = [];
    const idx = form.amenities.indexOf(amenity);
    if (idx >= 0) form.amenities.splice(idx, 1);
    else form.amenities.push(amenity);
  }

  openEdit(room: any): void {
    this.editForm = {
      id: room.id,
      room_type_id: room.room_type_id,
      room_number: room.room_number,
      floor: room.floor,
      notes: room.notes || '',
      amenities: [...(room.amenities || [])],
      is_active: room.is_active ?? true,
    };
    this.showEdit = true;
  }

  saveEdit(): void {
    if (!this.editForm) return;
    const { id, ...body } = this.editForm;
    this.api.put(`/rooms/${id}`, body).subscribe(r => {
      if (r.success) { this.toast.success('Room updated'); this.showEdit = false; this.editForm = null; this.load(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  changeStatus(roomId: string, newStatus: string): void {
    this.api.patch(`/rooms/${roomId}/status`, { status: newStatus }).subscribe(r => {
      if (r.success) { this.toast.success('Status updated'); this.showStatusDialog = false; this.load(); this.loadRoomTypes(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  getTransitions(status: string): string[] {
    return this.transitions[status] ?? [];
  }

  getRoomTypeName(id: string): string {
    return this.roomTypes().find((rt: any) => rt.id === id)?.name ?? '—';
  }
}
