import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService, StatsCardComponent, ActivePropertyService} from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Bookings" subtitle="Reservations, check-ins and check-outs">
      <div class="flex gap-2">
        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
          <button (click)="viewMode.set('list')" class="px-3 py-2 text-sm font-medium transition-colors"
            [class.bg-sage-600]="viewMode()==='list'" [class.text-white]="viewMode()==='list'"
            [class.bg-white]="viewMode()!=='list'" [class.text-gray-500]="viewMode()!=='list'">☰ List</button>
          <button (click)="viewMode.set('calendar'); loadCalendar()" class="px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200"
            [class.bg-sage-600]="viewMode()==='calendar'" [class.text-white]="viewMode()==='calendar'"
            [class.bg-white]="viewMode()!=='calendar'" [class.text-gray-500]="viewMode()!=='calendar'">📅 Calendar</button>
        </div>
        <a routerLink="/bookings/new" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ New Booking</a>
      </div>
    </ui-page-header>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <ui-stats-card label="Today's Check-ins" [value]="todayStats().check_ins" icon="door-open"></ui-stats-card>
      <ui-stats-card label="Today's Check-outs" [value]="todayStats().check_outs" icon="log-out"></ui-stats-card>
      <ui-stats-card label="In-House" [value]="todayStats().in_house" icon="hotel"></ui-stats-card>
      <ui-stats-card label="Upcoming" [value]="todayStats().upcoming" icon="calendar-days"></ui-stats-card>
    </div>

    <!-- New Booking Form -->
    @if (showNew) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">New Booking</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <!-- Guest search -->
          <div class="relative">
            <input [(ngModel)]="guestSearch" (ngModelChange)="searchGuests()" placeholder="Search guest by name/phone..." class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            @if (guestResults().length > 0) {
              <div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                @for (g of guestResults(); track g.id) {
                  <button (click)="selectGuest(g)" class="w-full text-left px-3 py-2 text-sm hover:bg-sage-50 border-b border-gray-50">
                    <span class="font-medium">{{ g.full_name }}</span>
                    <span class="text-gray-400 ml-2">{{ g.phone || g.email || '' }}</span>
                  </button>
                }
              </div>
            }
            @if (form.guest_id) {
              <div class="mt-1 text-xs text-emerald-600">Selected: {{ selectedGuestName }}</div>
            }
          </div>

          <select [(ngModel)]="form.room_id" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Select Room</option>
            @for (r of availableRooms(); track r.id) {
              <option [value]="r.id">{{ r.room_number }} ({{ getRoomTypeName(r.room_type_id) }})</option>
            }
          </select>

          <select [(ngModel)]="form.booking_type" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="overnight">Overnight</option>
            <option value="short_rest_3hr">Short Rest (3hrs)</option>
            <option value="short_rest_6hr">Short Rest (6hrs)</option>
            <option value="half_day">Half Day (12hrs)</option>
            <option value="walk_in">Walk-In</option>
            <option value="corporate">Corporate</option>
          </select>

          <input [(ngModel)]="form.check_in" type="date" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.check_out" type="date" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">

          <input [(ngModel)]="form.adults" type="number" min="1" placeholder="Adults" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        </div>
        <div class="mt-3">
          <textarea [(ngModel)]="form.special_requests" placeholder="Special requests" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></textarea>
        </div>
        <button (click)="createBooking()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Create Booking</button>
      </div>
    }

    <!-- Status Filter Tabs — only in list mode -->
    @if (viewMode() === 'list') {
      <div class="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        @for (s of statusTabs; track s.value) {
          <button (click)="statusFilter = s.value; load()"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                  [class.bg-white]="statusFilter === s.value" [class.shadow-sm]="statusFilter === s.value"
                  [class.text-gray-500]="statusFilter !== s.value">
            {{ s.label }}
          </button>
        }
      </div>

      <ui-loading [loading]="loading()"></ui-loading>
      @if (!loading()) {
        <ui-data-table [columns]="columns" [data]="bookings()" [actions]="actions" [totalItems]="total()" [searchable]="true" searchPlaceholder="Search by ref..." (pageChange)="onPage($event)"></ui-data-table>
      }
    }

    <!-- Calendar View -->
    @if (viewMode() === 'calendar') {
      <!-- Month Navigation -->
      <div class="flex items-center justify-between mb-4">
        <button (click)="prevMonth()" class="p-2 rounded-lg hover:bg-gray-100 text-gray-600">◀</button>
        <h2 class="text-base font-semibold text-gray-800">{{ calendarMonth() | date:'MMMM yyyy' }}</h2>
        <button (click)="nextMonth()" class="p-2 rounded-lg hover:bg-gray-100 text-gray-600">▶</button>
      </div>
      <ui-loading [loading]="calendarLoading()"></ui-loading>
      @if (!calendarLoading()) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <!-- Day headers -->
          <div class="grid grid-cols-7 border-b border-gray-100">
            @for (d of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; track d) {
              <div class="px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase">{{ d }}</div>
            }
          </div>
          <!-- Calendar grid -->
          <div class="grid grid-cols-7">
            @for (cell of calendarCells(); track $index) {
              <div class="min-h-[80px] border-r border-b border-gray-50 p-1.5"
                   [class.bg-gray-50]="!cell.inMonth" [class.bg-sage-50]="cell.isToday">
                <div class="text-xs font-medium mb-1"
                     [class.text-gray-300]="!cell.inMonth"
                     [class.text-sage-700]="cell.isToday"
                     [class.text-gray-600]="cell.inMonth && !cell.isToday">
                  {{ cell.day }}
                </div>
                @for (b of cell.bookings; track b.id) {
                  <div (click)="viewCalendarBooking(b)"
                       class="px-1 py-0.5 rounded text-[10px] font-medium text-white mb-0.5 cursor-pointer truncate"
                       [style.background-color]="b.status_color"
                       [title]="b.booking_ref + ' — ' + b.guest_name">
                    {{ b.booking_ref }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
        <!-- Legend -->
        <div class="flex flex-wrap gap-3 mt-3">
          @for (s of statusTabs.slice(1); track s.value) {
            <div class="flex items-center gap-1.5 text-xs text-gray-500">
              <span class="w-3 h-3 rounded-full inline-block" [style.background]="statusColor(s.value)"></span>
              {{ s.label }}
            </div>
          }
        </div>
      }

    }

    <!-- Booking Detail Modal -->
    @if (showDetail && detail) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showDetail = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-semibold">{{ detail.booking_ref }}</h3>
              <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white mt-1" [style.background-color]="detail.status_color">{{ detail.status_label }}</span>
            </div>
            <button (click)="showDetail = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-gray-400">Type</span><p class="font-medium">{{ detail.booking_type_label }}</p></div>
            <div><span class="text-gray-400">Room</span><p class="font-medium">{{ detail.room_id || 'Unassigned' }}</p></div>
            <div><span class="text-gray-400">Check-in</span><p class="font-medium">{{ detail.check_in | date:'medium' }}</p></div>
            <div><span class="text-gray-400">Check-out</span><p class="font-medium">{{ detail.check_out | date:'medium' }}</p></div>
            <div><span class="text-gray-400">Guests</span><p class="font-medium">{{ detail.adults }} adults, {{ detail.children }} children</p></div>
            <div><span class="text-gray-400">Total</span><p class="font-medium text-emerald-600 text-lg">₦{{ detail.total_amount | number }}</p></div>
          </div>
          @if (detail.special_requests) {
            <div class="mt-3 text-sm"><span class="text-gray-400">Special Requests</span><p class="mt-1">{{ detail.special_requests }}</p></div>
          }
          <!-- Action buttons based on status -->
          <div class="flex gap-2 mt-5">
            @if (detail.status === 'confirmed') {
              <button (click)="doCheckIn(detail.id)" class="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Check In</button>
              <button (click)="doCancel(detail.id)" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Cancel</button>
            }
            @if (detail.status === 'checked_in') {
              <button (click)="doCheckOut(detail.id)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Check Out</button>
            }
            @if (detail.status === 'pending') {
              <button (click)="doCancel(detail.id)" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Cancel</button>
            }
            <button (click)="showDetail = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class BookingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  bookings = signal<any[]>([]);
  total = signal(0);
  availableRooms = signal<any[]>([]);
  roomTypes = signal<any[]>([]);
  guestResults = signal<any[]>([]);
  todayStats = signal<any>({ check_ins: 0, check_outs: 0, in_house: 0, upcoming: 0 });
  viewMode = signal<'list' | 'calendar'>('list');
  calendarLoading = signal(false);
  calendarMonth = signal<Date>(new Date());
  calendarBookings = signal<any[]>([]);
  calendarCells = computed(() => this.buildCells());
  page = 1;
  statusFilter = '';
  showNew = false;
  showDetail = false;
  detail: any = null;
  propertyId = '';
  guestSearch = '';
  selectedGuestName = '';
  private searchTimer: any;

  form: any = { guest_id: '', room_id: '', booking_type: 'overnight', check_in: '', check_out: '', adults: 1, children: 0, special_requests: '', source: 'front_desk' };

  statusTabs = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Checked In', value: 'checked_in' },
    { label: 'Checked Out', value: 'checked_out' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  columns: TableColumn[] = [
    { key: 'booking_ref', label: 'Ref', sortable: true, width: '140px' },
    { key: 'status_label', label: 'Status', render: (_v: any, r: any) => `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style="background:${r.status_color}">${r.status_label}</span>` },
    { key: 'booking_type_label', label: 'Type' },
    { key: 'check_in', label: 'Check-in', render: (v: string) => new Date(v).toLocaleDateString() },
    { key: 'check_out', label: 'Check-out', render: (v: string) => new Date(v).toLocaleDateString() },
    { key: 'total_amount', label: 'Total (₦)', render: (v: any) => `₦${Number(v).toLocaleString()}` },
  ];

  actions: TableAction[] = [
    { label: 'View', handler: (r) => this.router.navigate(['/bookings', r.id]) },
    { label: 'Check In', color: 'primary', handler: (r) => this.doCheckIn(r.id), hidden: (r) => r.status !== 'confirmed' },
    { label: 'Check Out', color: 'primary', handler: (r) => this.doCheckOut(r.id), hidden: (r) => r.status !== 'checked_in' },
    { label: 'Cancel', color: 'danger', handler: (r) => this.doCancel(r.id), hidden: (r) => !['pending', 'confirmed'].includes(r.status) },
  ];

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (user?.property_id) this.propertyId = user.property_id;
    this.loadRoomTypes();
    this.loadAvailableRooms();
    this.loadTodayStats();
    this.load();
  }

  load(): void {
    const params: any = { property_id: this.propertyId, page: this.page, limit: 20 };
    if (this.statusFilter) params.status = this.statusFilter;

    this.api.get('/bookings', params).subscribe({
      next: r => { if (r.success) { this.bookings.set(r.data ?? []); this.total.set(r.meta?.total ?? 0); } this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadAvailableRooms(): void {
    if (!this.propertyId) return;
    this.api.get('/rooms/available', { property_id: this.propertyId }).subscribe(r => {
      if (r.success) this.availableRooms.set(r.data ?? []);
    });
  }

  loadRoomTypes(): void {
    if (!this.propertyId) return;
    this.api.get('/room-types', { property_id: this.propertyId, limit: 50 }).subscribe(r => {
      if (r.success) this.roomTypes.set(r.data ?? []);
    });
  }

  loadTodayStats(): void {
    if (!this.propertyId) return;
    this.api.get('/bookings/today', { property_id: this.propertyId }).subscribe(r => {
      if (r.success) {
        const bookings = r.data as any[] ?? [];
        this.todayStats.set({
          check_ins: bookings.filter((b: any) => b.status === 'checked_in').length,
          check_outs: bookings.filter((b: any) => b.status === 'checked_out').length,
          in_house: bookings.filter((b: any) => b.status === 'checked_in').length,
          upcoming: bookings.filter((b: any) => b.status === 'confirmed').length,
        });
      }
    });
  }

  onPage(e: any): void { this.page = e.page; this.load(); }

  resetForm(): void {
    this.form = { guest_id: '', room_id: '', booking_type: 'overnight', check_in: '', check_out: '', adults: 1, children: 0, special_requests: '', source: 'front_desk' };
    this.guestSearch = '';
    this.selectedGuestName = '';
    this.guestResults.set([]);
  }

  searchGuests(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (this.guestSearch.length < 2) { this.guestResults.set([]); return; }
      this.api.get('/guests/search', { q: this.guestSearch }).subscribe(r => {
        if (r.success) this.guestResults.set(r.data ?? []);
      });
    }, 300);
  }

  selectGuest(g: any): void {
    this.form.guest_id = g.id;
    this.selectedGuestName = g.full_name;
    this.guestSearch = g.full_name;
    this.guestResults.set([]);
  }

  getRoomTypeName(id: string): string {
    return this.roomTypes().find((rt: any) => rt.id === id)?.name ?? '—';
  }

  createBooking(): void {
    if (!this.form.guest_id || !this.form.room_id || !this.form.check_in || !this.form.check_out) {
      this.toast.error('Guest, room, check-in and check-out are required');
      return;
    }
    const body = { ...this.form, property_id: this.propertyId };
    this.api.post('/bookings', body).subscribe(r => {
      if (r.success) { this.toast.success(`Booking created: ${r.data?.booking_ref}`); this.showNew = false; this.resetForm(); this.load(); this.loadAvailableRooms(); this.loadTodayStats(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  viewDetail(row: any): void {
    this.api.get(`/bookings/${row.id}`).subscribe(r => {
      if (r.success) { this.detail = r.data; this.showDetail = true; }
    });
  }

  loadCalendar(): void {
    this.calendarLoading.set(true);
    const d = this.calendarMonth();
    const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    this.api.get('/bookings/calendar', { property_id: this.propertyId, from, to }).subscribe({
      next: r => { this.calendarBookings.set(r.data ?? []); this.calendarLoading.set(false); },
      error: () => this.calendarLoading.set(false),
    });
  }

  prevMonth(): void {
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.loadCalendar();
  }

  nextMonth(): void {
    const d = this.calendarMonth();
    this.calendarMonth.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.loadCalendar();
  }

  buildCells(): any[] {
    const d = this.calendarMonth();
    const year = d.getFullYear(), month = d.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const cells: any[] = [];
    // Pad start
    for (let i = 0; i < firstDay; i++) {
      const day = new Date(year, month, -firstDay + i + 1).getDate();
      cells.push({ day, inMonth: false, isToday: false, bookings: [] });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
      const bookings = this.calendarBookings().filter((b: any) => {
        const ci = b.check_in?.split('T')[0];
        const co = b.check_out?.split('T')[0];
        return ci <= dateStr && co >= dateStr;
      });
      cells.push({ day: i, inMonth: true, isToday, bookings, dateStr });
    }
    // Pad end to complete grid (multiple of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) cells.push({ day: i, inMonth: false, isToday: false, bookings: [] });
    return cells;
  }

  viewCalendarBooking(b: any): void {
    this.detail = b; this.showDetail = true;
  }

  statusColor(status: string): string {
    return { pending: '#f59e0b', confirmed: '#3b82f6', checked_in: '#22c55e', checked_out: '#6b7280', cancelled: '#ef4444' }[status] ?? '#6b7280';
  }

  async doCheckIn(bookingId: string): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Check In', message: 'Check in this guest?', variant: 'info' });
    if (ok) {
      this.api.post(`/bookings/${bookingId}/check-in`).subscribe(r => {
        if (r.success) { this.toast.success('Checked in!'); this.showDetail = false; this.load(); this.loadAvailableRooms(); this.loadTodayStats(); }
        else this.toast.error(r.message || 'Failed');
      });
    }
  }

  async doCheckOut(bookingId: string): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Check Out', message: 'Check out this guest?', variant: 'info' });
    if (ok) {
      this.api.post(`/bookings/${bookingId}/check-out`).subscribe(r => {
        if (r.success) { this.toast.success('Checked out!'); this.showDetail = false; this.load(); this.loadAvailableRooms(); this.loadTodayStats(); }
        else this.toast.error(r.message || 'Failed');
      });
    }
  }

  async doCancel(bookingId: string): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Cancel Booking', message: 'Are you sure you want to cancel this booking?', variant: 'warning' });
    if (ok) {
      this.api.post(`/bookings/${bookingId}/cancel`).subscribe(r => {
        if (r.success) { this.toast.success('Cancelled'); this.showDetail = false; this.load(); this.loadAvailableRooms(); this.loadTodayStats(); }
        else this.toast.error(r.message || 'Failed');
      });
    }
  }
}
