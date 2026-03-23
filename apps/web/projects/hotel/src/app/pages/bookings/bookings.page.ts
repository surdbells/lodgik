import { PAGE_TOURS } from '../../services/page-tours';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService, StatsCardComponent, ActivePropertyService, HasPermDirective, PermDisableDirective, TokenService , TourService} from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, StatsCardComponent, HasPermDirective, PermDisableDirective],
  template: `
    <ui-page-header title="Bookings" subtitle="Reservations, check-ins and check-outs"
      tourKey="bookings" (tourClick)="startTour()">
      <div class="flex gap-2">
        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
          <button (click)="viewMode.set('list')" class="px-3 py-2 text-sm font-medium transition-colors"
            [class.bg-sage-600]="viewMode()==='list'" [class.text-white]="viewMode()==='list'"
            [class.bg-white]="viewMode()!=='list'" [class.text-gray-500]="viewMode()!=='list'">☰ List</button>
          <button (click)="viewMode.set('calendar'); loadCalendar()" class="px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200"
            [class.bg-sage-600]="viewMode()==='calendar'" [class.text-white]="viewMode()==='calendar'"
            [class.bg-white]="viewMode()!=='calendar'" [class.text-gray-500]="viewMode()!=='calendar'">📅 Calendar</button>
          <button (click)="viewMode.set('gantt'); loadCalendar()" class="px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200"
            [class.bg-sage-600]="viewMode()==='gantt'" [class.text-white]="viewMode()==='gantt'"
            [class.bg-white]="viewMode()!=='gantt'" [class.text-gray-500]="viewMode()!=='gantt'">📊 Gantt</button>
        </div>
        <a *hasPerm="'bookings.create'" routerLink="/bookings/new" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700" data-tour="bookings-new">+ New Booking</a>
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
        <button (click)="createBooking()" [permDisable]="'bookings.create'" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Create Booking</button>
      </div>
    }

    <!-- Status Filter Tabs — only in list mode -->
    @if (viewMode() === 'list') {
      <div class="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        @for (s of statusTabs; track s.value) {
          <button (click)="statusFilter = s.value; page = 1; load()"
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

    <!-- Gantt View -->
    @if (viewMode() === 'gantt') {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <!-- Gantt header: navigation + date range -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <button (click)="prevMonth()" class="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">‹</button>
          <h2 class="text-base font-semibold text-gray-800">{{ calendarMonth() | date:'MMMM yyyy' }}</h2>
          <button (click)="nextMonth()" class="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">›</button>
        </div>

        <ui-loading [loading]="calendarLoading()"></ui-loading>

        @if (!calendarLoading()) {
          <div class="overflow-x-auto">
            <!-- Day columns header -->
            <div class="flex" style="min-width: max-content">
              <div class="w-36 shrink-0 border-r border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Room</div>
              @for (day of ganttDays(); track day.date) {
                <div class="w-8 shrink-0 border-r border-gray-50 px-0.5 py-2 text-center"
                  [class.bg-blue-50]="day.isToday">
                  <p class="text-[10px] text-gray-400">{{ day.label }}</p>
                  <p class="text-xs font-semibold" [class.text-blue-600]="day.isToday" [class.text-gray-700]="!day.isToday">{{ day.day }}</p>
                </div>
              }
            </div>

            <!-- Room rows -->
            @for (row of ganttRows(); track row.room_id) {
              <div class="flex border-t border-gray-50 hover:bg-gray-50/50" style="min-width: max-content">
                <!-- Room label -->
                <div class="w-36 shrink-0 border-r border-gray-100 px-3 py-2">
                  <p class="text-xs font-semibold text-gray-800 truncate">{{ row.room_number }}</p>
                  <p class="text-[10px] text-gray-400 truncate">{{ row.room_type }}</p>
                </div>
                <!-- Day cells -->
                @for (day of ganttDays(); track day.date) {
                  @let booking = row.bookingByDate[day.date];
                  <div class="w-8 h-10 shrink-0 border-r border-gray-50 relative"
                    [class.bg-blue-50]="day.isToday">
                    @if (booking && booking.isStart) {
                      <div class="absolute inset-y-1 left-0.5 rounded-sm cursor-pointer z-10 flex items-center px-1"
                        [style.background-color]="statusColor(booking.status)"
                        [style.width.px]="booking.spanDays * 32 - 4"
                        (click)="viewCalendarBooking(booking)"
                        [title]="booking.guest_name + ' · ' + booking.booking_ref">
                        <span class="text-[9px] text-white font-medium truncate">{{ booking.guest_name }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Legend -->
          <div class="flex gap-4 px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-amber-400 inline-block"></span> Pending</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span> Confirmed</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span> Checked In</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-gray-400 inline-block"></span> Checked Out</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-red-400 inline-block"></span> Cancelled</span>
          </div>
        }
      </div>
    }

    <!-- Booking Detail Modal -->
    @if (showDetail && detail) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showDetail = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex justify-between items-start mb-4">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold font-mono tracking-wide">{{ detail.booking_ref }}</h3>
                <button (click)="copyRef(detail.booking_ref)"
                        class="text-gray-300 hover:text-gray-500 transition-colors" title="Copy reference">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
              <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white mt-1"
                    [style.background-color]="detail.status_color">{{ detail.status_label }}</span>
            </div>
            <button (click)="showDetail = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>

          <!-- Guest info panel -->
          @if (detail.guest_name) {
            <div class="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
                <span class="text-sage-700 font-semibold text-sm">{{ detail.guest_name.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-800 text-sm truncate">{{ detail.guest_name }}</p>
                @if (detail.guest_email) {
                  <p class="text-xs text-gray-400 truncate">{{ detail.guest_email }}</p>
                }
                @if (detail.guest_phone) {
                  <p class="text-xs text-gray-400">{{ detail.guest_phone }}</p>
                }
              </div>
            </div>
          }

          <!-- Core details grid -->
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-gray-400 text-xs">Type</span><p class="font-medium">{{ detail.booking_type_label }}</p></div>
            <div>
              <span class="text-gray-400 text-xs">Room</span>
              <p class="font-medium">{{ detail.room_number || getRoomNumber(detail.room_id) }}</p>
              @if (detail.room_type_name) {
                <p class="text-xs text-gray-400">{{ detail.room_type_name }}</p>
              }
            </div>
            <div><span class="text-gray-400 text-xs">Check-in</span><p class="font-medium">{{ detail.check_in | date:'mediumDate' }}</p></div>
            <div><span class="text-gray-400 text-xs">Check-out</span><p class="font-medium">{{ detail.check_out | date:'mediumDate' }}</p></div>
            <div><span class="text-gray-400 text-xs">Guests</span><p class="font-medium">{{ detail.adults }} adults{{ detail.children ? ', ' + detail.children + ' children' : '' }}</p></div>
            <div>
              <span class="text-gray-400 text-xs">Total</span>
              <p class="font-semibold text-emerald-600 text-base">₦{{ detail.total_amount | number }}</p>
            </div>
          </div>

          @if (detail.special_requests) {
            <div class="mt-3 text-sm bg-amber-50 border border-amber-100 rounded-lg p-3">
              <span class="text-amber-600 text-xs font-medium">Special Requests</span>
              <p class="mt-1 text-gray-700">{{ detail.special_requests }}</p>
            </div>
          }

          <!-- Folio quick-link -->
          @if (detail.status === 'checked_in' || detail.status === 'checked_out') {
            <div class="mt-3 p-3 border border-gray-100 rounded-xl flex items-center justify-between">
              <span class="text-sm text-gray-500">View Folio & Payments</span>
              <a [href]="'/bookings/' + detail.id"
                 class="text-sm text-sage-600 font-medium hover:underline" target="_blank">
                Open Folio ↗
              </a>
            </div>
          }

          <!-- Action buttons based on status -->
          <div class="flex flex-wrap gap-2 mt-5">
            @if (detail.status === 'pending') {
              <button (click)="doConfirm(detail.id)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Confirm</button>
              <button (click)="doCancel(detail.id)" [permDisable]="'bookings.cancel'" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Cancel</button>
            }
            @if (detail.status === 'confirmed') {
              <button (click)="doCheckIn(detail.id)" [permDisable]="'bookings.check_in'" class="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Check In</button>
              <button (click)="doCancel(detail.id)" [permDisable]="'bookings.cancel'" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Cancel</button>
            }
            @if (detail.status === 'checked_in') {
              <button (click)="doCheckOut(detail.id)" [permDisable]="'bookings.check_out'" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Check Out</button>
            }
            <button (click)="showDetail = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class BookingsPage implements OnInit {
  private tour = inject(TourService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private auth  = inject(AuthService);
  private token = inject(TokenService);
  private router = inject(Router);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  bookings = signal<any[]>([]);
  total = signal(0);
  availableRooms = signal<any[]>([]);
  roomTypes = signal<any[]>([]);
  guestResults = signal<any[]>([]);
  todayStats = signal<any>({ check_ins: 0, check_outs: 0, in_house: 0, upcoming: 0 });
  viewMode = signal<'list' | 'calendar' | 'gantt'>('list');
  calendarLoading = signal(false);
  calendarMonth = signal<Date>(new Date());
  calendarBookings = signal<any[]>([]);
  calendarCells = computed(() => this.buildCells());

  ganttDays = computed(() => {
    const d = this.calendarMonth();
    const year = d.getFullYear(), month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const days: any[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
      days.push({ date, day: i, label: ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(year, month, i).getDay()], isToday });
    }
    return days;
  });

  ganttRows = computed(() => {
    const bookings = this.calendarBookings();
    const days = this.ganttDays();
    const allRooms = this.availableRooms();

    // Build a lookup map from the fully-loaded rooms list (has room_number, room_type_name)
    const roomLookup = new Map<string, any>();
    for (const r of allRooms) {
      roomLookup.set(r.id, r);
    }

    // Group unique rooms from bookings; resolve name from roomLookup
    const roomMap = new Map<string, any>();
    for (const b of bookings) {
      if (b.room_id && !roomMap.has(b.room_id)) {
        const roomData = roomLookup.get(b.room_id);
        roomMap.set(b.room_id, {
          room_id: b.room_id,
          room_number: roomData?.room_number ?? b.room_number ?? '—',
          room_type: roomData?.room_type_name ?? b.room_type_name ?? '',
        });
      }
    }
    return Array.from(roomMap.values()).map(room => {
      const bookingByDate: Record<string, any> = {};
      const roomBookings = bookings.filter(b => b.room_id === room.room_id);
      for (const b of roomBookings) {
        const ciDate = b.check_in?.split('T')[0];
        const coDate = b.check_out?.split('T')[0];
        if (!ciDate || !coDate) continue;
        // Count how many days within this month this booking spans
        let spanDays = 0;
        let started = false;
        for (const day of days) {
          if (day.date >= ciDate && day.date < coDate) {
            spanDays++;
            if (!started) {
              bookingByDate[day.date] = { ...b, isStart: true, spanDays: 0 };
              started = true;
            } else {
              bookingByDate[day.date] = { ...b, isStart: false };
            }
          }
        }
        // Update spanDays on the start cell
        if (started && ciDate >= days[0]?.date) {
          bookingByDate[ciDate].spanDays = spanDays;
        } else if (started) {
          // booking started before this month — update first visible day
          const firstVisible = days.find(d => d.date >= ciDate && d.date < coDate);
          if (firstVisible) bookingByDate[firstVisible.date] = { ...b, isStart: true, spanDays };
        }
      }
      return { ...room, bookingByDate };
    });
  });
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
    {
      key: 'booking_ref', label: 'Ref', sortable: true, width: '155px',
      render: (v: string) => v, // monospace + copy handled by template slot if DataTable supports it
    },
    { key: 'guest_name', label: 'Guest', render: (v: string) => v || '—' },
    { key: 'room_number', label: 'Room', render: (v: string) => v || '—', width: '80px' },
    { key: 'status_label', label: 'Status', type: 'badge', badgeColor: (r) => r.status_color || '#6b7280', badgeLabel: (r) => r.status_label || r.status },
    { key: 'booking_type_label', label: 'Type' },
    { key: 'check_in', label: 'Check-in', render: (v: string) => new Date(v).toLocaleDateString() },
    { key: 'check_out', label: 'Check-out', render: (v: string) => new Date(v).toLocaleDateString() },
    { key: 'total_amount', label: 'Total (₦)', render: (v: any) => `₦${Number(v).toLocaleString()}` },
  ];

  get actions(): TableAction[] {
    return [
      { label: 'View',      handler: (r) => this.router.navigate(['/bookings', r.id]) },
      { label: 'Confirm',   color: 'primary',  handler: (r) => this.doConfirm(r.id),   hidden: (r) => r.status !== 'pending' },
      { label: 'Check In',  color: 'primary',  handler: (r) => this.doCheckIn(r.id),   hidden: (r) => r.status !== 'confirmed'  || !this.token.can('bookings.check_in') },
      { label: 'Check Out', color: 'primary',  handler: (r) => this.doCheckOut(r.id),  hidden: (r) => r.status !== 'checked_in' || !this.token.can('bookings.check_out') },
      { label: 'Cancel',    color: 'danger',   handler: (r) => this.doCancel(r.id),    hidden: (r) => !['pending','confirmed'].includes(r.status) || !this.token.can('bookings.cancel') },
    ];
  }

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

  getRoomNumber(roomId: string): string {
    if (!roomId) return 'Unassigned';
    return this.availableRooms().find((r: any) => r.id === roomId)?.room_number ?? roomId;
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

  async doConfirm(bookingId: string): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Confirm Booking', message: 'Mark this booking as confirmed?', variant: 'info' });
    if (ok) {
      this.api.post(`/bookings/${bookingId}/confirm`).subscribe(r => {
        if (r.success) { this.toast.success('Booking confirmed'); this.showDetail = false; this.load(); this.loadTodayStats(); }
        else this.toast.error(r.message || 'Failed to confirm booking');
      });
    }
  }

  copyRef(ref: string): void {
    navigator.clipboard?.writeText(ref).then(
      () => this.toast.success('Booking reference copied'),
      () => this.toast.error('Could not copy to clipboard'),
    );
  }

  startTour(): void {
    this.tour.start(PAGE_TOURS['bookings'] ?? [], 'bookings');
  }
}
