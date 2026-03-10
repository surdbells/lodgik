import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, ToastService } from '@lodgik/shared';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-spa-page',
  standalone: true,
  imports: [FormsModule, DatePipe, TitleCasePipe, CurrencyPipe, DecimalPipe, RouterLink, LucideAngularModule],
  template: `
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Spa &amp; Pool</h1>
          <p class="text-sm text-gray-500">Manage spa services, bookings, and pool access</p>
        </div>
        <div class="flex gap-2">
          <button (click)="activeTab = 'services'" [class]="tabCls('services')">Services</button>
          <button (click)="activeTab = 'bookings'" [class]="tabCls('bookings')">
            Bookings
            @if (pendingCount() > 0) {
              <span class="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ pendingCount() }}</span>
            }
          </button>
          <button (click)="activeTab = 'pool'" [class]="tabCls('pool')">
            Pool
            <span class="ml-1 bg-cyan-100 text-cyan-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ poolOccupancy() }}</span>
          </button>
        </div>
      </div>

      <!-- ═══ SERVICES TAB ═══ -->
      @if (activeTab === 'services') {
        <div class="bg-white rounded-xl border border-gray-200">
          <div class="p-4 border-b flex items-center justify-between">
            <h2 class="font-semibold text-gray-900">Spa Services</h2>
            <button (click)="openAddService()" class="btn-primary text-sm px-3 py-2">+ Add Service</button>
          </div>

          @if (loadingServices()) {
            <div class="p-12 text-center text-gray-400">Loading…</div>
          } @else if (services().length === 0) {
            <div class="p-12 text-center text-gray-400">
              <p class="text-4xl mb-3">🧖</p>
              <p class="font-medium">No spa services yet</p>
              <p class="text-sm">Add your first service to get started</p>
            </div>
          } @else {
            <div class="divide-y divide-gray-100">
              @for (svc of services(); track svc.id) {
                <div class="p-4 flex items-center gap-4">
                  <div class="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-xl shrink-0">
                    {{ categoryIcon(svc.category) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="font-medium text-gray-900">{{ svc.name }}</p>
                      <span class="text-xs px-2 py-0.5 rounded-full"
                            [class]="svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                        {{ svc.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-500">{{ svc.category | titlecase }} · {{ svc.duration_minutes }} min</p>
                    @if (svc.description) {
                      <p class="text-xs text-gray-400 mt-0.5 truncate">{{ svc.description }}</p>
                    }
                  </div>
                  <div class="text-right shrink-0">
                    <p class="font-bold text-gray-900">₦{{ svc.price | number:'1.0-0' }}</p>
                  </div>
                  <div class="flex gap-2 shrink-0">
                    <button (click)="editService(svc)" class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50">Edit</button>
                    <button (click)="toggleServiceActive(svc)" class="text-xs px-2 py-1 rounded border"
                            [class]="svc.is_active ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-green-600 border-green-200 hover:bg-green-50'">
                      {{ svc.is_active ? 'Deactivate' : 'Activate' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Add/Edit Service Modal -->
        @if (showServiceForm()) {
          <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="closeServiceForm()">
            <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl" (click)="$event.stopPropagation()">
              <div class="p-6 border-b">
                <h3 class="font-bold text-gray-900">{{ editingService ? 'Edit Service' : 'Add New Service' }}</h3>
              </div>
              <div class="p-6 space-y-4">
                <div>
                  <label class="label">Service Name *</label>
                  <input [(ngModel)]="svcForm.name" class="input" placeholder="e.g. Swedish Massage">
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="label">Category *</label>
                    <select [(ngModel)]="svcForm.category" class="input">
                      <option value="">Select…</option>
                      <option value="massage">Massage</option>
                      <option value="facial">Facial</option>
                      <option value="body_treatment">Body Treatment</option>
                      <option value="nail">Nail</option>
                      <option value="hair">Hair</option>
                      <option value="wellness">Wellness</option>
                      <option value="pool">Pool</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label class="label">Duration (min) *</label>
                    <input [(ngModel)]="svcForm.duration_minutes" type="number" min="15" step="15" class="input" placeholder="60">
                  </div>
                </div>
                <div>
                  <label class="label">Price (₦) *</label>
                  <input [(ngModel)]="svcForm.price" type="number" min="0" class="input" placeholder="15000">
                </div>
                <div>
                  <label class="label">Description</label>
                  <textarea [(ngModel)]="svcForm.description" class="input" rows="2" placeholder="Optional description"></textarea>
                </div>
              </div>
              <div class="p-6 border-t flex justify-end gap-3">
                <button (click)="closeServiceForm()" class="btn-secondary">Cancel</button>
                <button (click)="saveService()" [disabled]="savingService()" class="btn-primary">
                  {{ savingService() ? 'Saving…' : (editingService ? 'Update' : 'Add Service') }}
                </button>
              </div>
            </div>
          </div>
        }
      }

      <!-- ═══ BOOKINGS TAB ═══ -->
      @if (activeTab === 'bookings') {
        <div class="bg-white rounded-xl border border-gray-200">
          <div class="p-4 border-b flex flex-wrap items-center gap-3">
            <h2 class="font-semibold text-gray-900 mr-auto">Spa Bookings</h2>
            <input [(ngModel)]="bookingDateFilter" type="date" class="input !w-auto text-sm"
                   (ngModelChange)="loadBookings()">
            <select [(ngModel)]="bookingStatusFilter" class="input !w-auto text-sm" (ngModelChange)="loadBookings()">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button (click)="openNewBooking()" class="btn-primary text-sm px-3 py-2">+ New Booking</button>
          </div>

          @if (loadingBookings()) {
            <div class="p-12 text-center text-gray-400">Loading…</div>
          } @else if (bookings().length === 0) {
            <div class="p-12 text-center text-gray-400">
              <p class="text-4xl mb-3">📅</p>
              <p class="font-medium">No bookings found</p>
              <p class="text-sm">Try adjusting the date or status filter</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date / Time</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (bk of bookings(); track bk.id) {
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-3">
                        <p class="font-medium text-gray-900">{{ bk.guest_name }}</p>
                        @if (bk.therapist_name) {
                          <p class="text-xs text-gray-400">Therapist: {{ bk.therapist_name }}</p>
                        }
                      </td>
                      <td class="px-4 py-3 text-gray-700">{{ bk.service_name }}</td>
                      <td class="px-4 py-3 text-gray-600">
                        <p>{{ bk.booking_date | date:'d MMM yyyy' }}</p>
                        <p class="text-xs text-gray-400">{{ bk.start_time }}</p>
                      </td>
                      <td class="px-4 py-3 font-medium text-gray-900">₦{{ bk.price | number:'1.0-0' }}</td>
                      <td class="px-4 py-3">
                        <span class="text-xs px-2 py-1 rounded-full font-medium" [class]="bookingStatusCls(bk.status)">
                          {{ bk.status | titlecase }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex gap-1 flex-wrap">
                          @if (bk.status === 'pending') {
                            <button (click)="confirmBooking(bk.id)" class="action-btn text-green-700 border-green-200 hover:bg-green-50">Confirm</button>
                            <button (click)="cancelBooking(bk.id)" class="action-btn text-red-600 border-red-200 hover:bg-red-50">Cancel</button>
                          }
                          @if (bk.status === 'confirmed') {
                            <button (click)="startBooking(bk.id)" class="action-btn text-blue-700 border-blue-200 hover:bg-blue-50">Start</button>
                            <button (click)="cancelBooking(bk.id)" class="action-btn text-red-600 border-red-200 hover:bg-red-50">Cancel</button>
                          }
                          @if (bk.status === 'in_progress') {
                            <button (click)="completeBooking(bk.id)" class="action-btn text-purple-700 border-purple-200 hover:bg-purple-50">Complete</button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- New Booking Modal -->
        @if (showBookingForm()) {
          <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="closeBookingForm()">
            <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl" (click)="$event.stopPropagation()">
              <div class="p-6 border-b">
                <h3 class="font-bold text-gray-900">New Spa Booking</h3>
              </div>
              <div class="p-6 space-y-4">
                <div>
                  <label class="label">Guest Name *</label>
                  <input [(ngModel)]="bkForm.guest_name" class="input" placeholder="Full name">
                </div>
                <div>
                  <label class="label">Service *</label>
                  <select [(ngModel)]="bkForm.service_id" class="input" (ngModelChange)="onServiceSelect($event)">
                    <option value="">Select service…</option>
                    @for (s of activeServices(); track s.id) {
                      <option [value]="s.id">{{ s.name }} — ₦{{ s.price | number:'1.0-0' }} ({{ s.duration_minutes }}min)</option>
                    }
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="label">Date *</label>
                    <input [(ngModel)]="bkForm.booking_date" type="date" class="input">
                  </div>
                  <div>
                    <label class="label">Start Time *</label>
                    <input [(ngModel)]="bkForm.start_time" type="time" class="input">
                  </div>
                </div>
                <div>
                  <label class="label">Therapist (optional)</label>
                  <input [(ngModel)]="bkForm.therapist_name" class="input" placeholder="Therapist name">
                </div>
                <div>
                  <label class="label">Price (₦)</label>
                  <input [(ngModel)]="bkForm.price" type="number" class="input">
                </div>
              </div>
              <div class="p-6 border-t flex justify-end gap-3">
                <button (click)="closeBookingForm()" class="btn-secondary">Cancel</button>
                <button (click)="saveBooking()" [disabled]="savingBooking()" class="btn-primary">
                  {{ savingBooking() ? 'Creating…' : 'Create Booking' }}
                </button>
              </div>
            </div>
          </div>
        }
      }

      <!-- ═══ POOL TAB ═══ -->
      @if (activeTab === 'pool') {
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-cyan-500 text-white rounded-xl p-5 col-span-1">
            <p class="text-sm text-cyan-100">Current Occupancy</p>
            <p class="text-5xl font-bold mt-1">{{ poolOccupancy() }}</p>
            <p class="text-sm text-cyan-100 mt-1">guests in pool area</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-5 col-span-2 flex items-center">
            <div class="flex-1">
              <p class="font-semibold text-gray-900 mb-1">Check in a guest to the pool</p>
              <p class="text-sm text-gray-500">Enter guest name and select pool area</p>
            </div>
            <button (click)="openPoolCheckIn()" class="btn-primary ml-4 shrink-0">Pool Check-In</button>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200">
          <div class="p-4 border-b flex items-center justify-between">
            <h2 class="font-semibold text-gray-900">Today's Pool Activity</h2>
            <input [(ngModel)]="poolDateFilter" type="date" class="input !w-auto text-sm" (ngModelChange)="loadPool()">
          </div>
          @if (loadingPool()) {
            <div class="p-12 text-center text-gray-400">Loading…</div>
          } @else if (poolLogs().length === 0) {
            <div class="p-10 text-center text-gray-400">
              <p class="text-3xl mb-2">🏊</p>
              <p class="text-sm">No pool activity recorded today</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-Out</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (log of poolLogs(); track log.id) {
                    <tr>
                      <td class="px-4 py-3 font-medium text-gray-900">{{ log.guest_name }}</td>
                      <td class="px-4 py-3 text-gray-600">{{ log.area | titlecase }}</td>
                      <td class="px-4 py-3 text-gray-600">{{ log.check_in_time }}</td>
                      <td class="px-4 py-3 text-gray-600">{{ log.check_out_time ?? '—' }}</td>
                      <td class="px-4 py-3 text-gray-500 text-xs">
                        @if (!log.check_out_time) {
                          <span class="text-green-600 font-medium">Active</span>
                        } @else {
                          {{ calcDuration(log.check_in_time, log.check_out_time) }}
                        }
                      </td>
                      <td class="px-4 py-3">
                        @if (!log.check_out_time) {
                          <button (click)="poolCheckOut(log.id)" class="action-btn text-red-600 border-red-200 hover:bg-red-50">Check Out</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Pool Check-In Modal -->
        @if (showPoolCheckIn()) {
          <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="closePoolCheckIn()">
            <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl" (click)="$event.stopPropagation()">
              <div class="p-6 border-b">
                <h3 class="font-bold text-gray-900">Pool Check-In</h3>
              </div>
              <div class="p-6 space-y-4">
                <div>
                  <label class="label">Guest Name *</label>
                  <input [(ngModel)]="poolForm.guest_name" class="input" placeholder="Full name">
                </div>
                <div>
                  <label class="label">Check-In Time *</label>
                  <input [(ngModel)]="poolForm.check_in_time" type="time" class="input">
                </div>
                <div>
                  <label class="label">Area</label>
                  <select [(ngModel)]="poolForm.area" class="input">
                    <option value="main_pool">Main Pool</option>
                    <option value="kids_pool">Kids Pool</option>
                    <option value="jacuzzi">Jacuzzi</option>
                    <option value="rooftop_pool">Rooftop Pool</option>
                  </select>
                </div>
              </div>
              <div class="p-6 border-t flex justify-end gap-3">
                <button (click)="closePoolCheckIn()" class="btn-secondary">Cancel</button>
                <button (click)="savePoolCheckIn()" [disabled]="savingPool()" class="btn-primary">
                  {{ savingPool() ? 'Checking In…' : 'Check In' }}
                </button>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .btn-primary { @apply bg-[#2d6a4f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#245a41] transition-colors disabled:opacity-50 disabled:cursor-not-allowed; }
    .btn-secondary { @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors; }
    .input { @apply w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]; }
    .label { @apply block text-xs font-medium text-gray-600 mb-1; }
    .action-btn { @apply text-xs px-2 py-1 rounded border transition-colors; }
  `],
})
export class SpaPage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  activeTab = 'services';

  // ── Services ─────────────────────────────────────────────────
  services       = signal<any[]>([]);
  loadingServices = signal(true);
  showServiceForm = signal(false);
  savingService   = signal(false);
  editingService: any = null;
  svcForm: any = {};

  activeServices = computed(() => this.services().filter(s => s.is_active));

  // ── Bookings ─────────────────────────────────────────────────
  bookings         = signal<any[]>([]);
  loadingBookings   = signal(false);
  showBookingForm   = signal(false);
  savingBooking     = signal(false);
  bookingDateFilter = '';
  bookingStatusFilter = '';
  bkForm: any = {};

  pendingCount = computed(() => this.bookings().filter(b => b.status === 'pending').length);

  // ── Pool ──────────────────────────────────────────────────────
  poolLogs      = signal<any[]>([]);
  poolOccupancy  = signal(0);
  loadingPool    = signal(false);
  showPoolCheckIn = signal(false);
  savingPool      = signal(false);
  poolDateFilter  = new Date().toISOString().split('T')[0];
  poolForm: any = { area: 'main_pool', check_in_time: '' };

  ngOnInit(): void {
    this.loadServices();
    this.loadBookings();
    this.loadPool();

    // default pool check-in time to now
    const now = new Date();
    this.poolForm.check_in_time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  }

  // ── Services methods ─────────────────────────────────────────

  loadServices(): void {
    this.loadingServices.set(true);
    this.api.get('/spa/services').subscribe({
      next: (r: any) => { this.services.set(r?.data || []); this.loadingServices.set(false); },
      error: () => { this.loadingServices.set(false); this.toast.error('Failed to load services'); },
    });
  }

  openAddService(): void {
    this.editingService = null;
    this.svcForm = { name: '', category: '', duration_minutes: 60, price: '', description: '' };
    this.showServiceForm.set(true);
  }

  editService(svc: any): void {
    this.editingService = svc;
    this.svcForm = { name: svc.name, category: svc.category, duration_minutes: svc.duration_minutes, price: svc.price, description: svc.description ?? '' };
    this.showServiceForm.set(true);
  }

  closeServiceForm(): void { this.showServiceForm.set(false); this.editingService = null; }

  saveService(): void {
    if (!this.svcForm.name || !this.svcForm.category || !this.svcForm.price) {
      this.toast.error('Name, category, and price are required'); return;
    }
    this.savingService.set(true);
    const payload = { ...this.svcForm, price: String(this.svcForm.price), duration_minutes: Number(this.svcForm.duration_minutes) };

    const req = this.editingService
      ? this.api.put(`/spa/services/${this.editingService.id}`, payload)
      : this.api.post('/spa/services', payload);

    req.subscribe({
      next: () => {
        this.toast.success(this.editingService ? 'Service updated' : 'Service added');
        this.closeServiceForm();
        this.loadServices();
        this.savingService.set(false);
      },
      error: () => { this.savingService.set(false); this.toast.error('Save failed'); },
    });
  }

  toggleServiceActive(svc: any): void {
    this.api.put(`/spa/services/${svc.id}`, { is_active: !svc.is_active }).subscribe({
      next: () => { this.toast.success(`Service ${svc.is_active ? 'deactivated' : 'activated'}`); this.loadServices(); },
      error: () => this.toast.error('Update failed'),
    });
  }

  categoryIcon(cat: string): string {
    const map: Record<string, string> = { massage: '💆', facial: '🧖', nail: '💅', hair: '💇', wellness: '🧘', pool: '🏊', body_treatment: '🛁' };
    return map[cat] ?? '✨';
  }

  // ── Bookings methods ─────────────────────────────────────────

  loadBookings(): void {
    this.loadingBookings.set(true);
    const params: any = {};
    if (this.bookingDateFilter) params['date'] = this.bookingDateFilter;
    if (this.bookingStatusFilter) params['status'] = this.bookingStatusFilter;
    this.api.get('/spa/bookings', params).subscribe({
      next: (r: any) => { this.bookings.set(r?.data || []); this.loadingBookings.set(false); },
      error: () => { this.loadingBookings.set(false); this.toast.error('Failed to load bookings'); },
    });
  }

  openNewBooking(): void {
    const today = new Date().toISOString().split('T')[0];
    this.bkForm = { guest_name: '', service_id: '', booking_date: today, start_time: '10:00', therapist_name: '', price: '' };
    this.showBookingForm.set(true);
  }

  closeBookingForm(): void { this.showBookingForm.set(false); }

  onServiceSelect(id: string): void {
    const svc = this.services().find(s => s.id === id);
    if (svc) this.bkForm.price = svc.price;
  }

  saveBooking(): void {
    if (!this.bkForm.guest_name || !this.bkForm.service_id || !this.bkForm.booking_date || !this.bkForm.start_time) {
      this.toast.error('Guest name, service, date, and time are required'); return;
    }
    const svc = this.services().find(s => s.id === this.bkForm.service_id);
    this.savingBooking.set(true);
    const payload = {
      service_id: this.bkForm.service_id,
      service_name: svc?.name ?? '',
      guest_id: null, // manual booking without guest account
      guest_name: this.bkForm.guest_name,
      booking_date: this.bkForm.booking_date,
      start_time: this.bkForm.start_time,
      price: String(this.bkForm.price || svc?.price || '0'),
      therapist_name: this.bkForm.therapist_name || null,
    };
    this.api.post('/spa/bookings', payload).subscribe({
      next: () => { this.toast.success('Booking created'); this.closeBookingForm(); this.loadBookings(); this.savingBooking.set(false); },
      error: (e: any) => { this.savingBooking.set(false); this.toast.error(e?.error?.message ?? 'Create failed'); },
    });
  }

  confirmBooking(id: string): void {
    this.api.post(`/spa/bookings/${id}/start`, {}).subscribe({
      next: () => { this.toast.success('Booking confirmed'); this.loadBookings(); },
      error: () => this.toast.error('Action failed'),
    });
  }

  startBooking(id: string): void {
    this.api.post(`/spa/bookings/${id}/start`, {}).subscribe({
      next: () => { this.toast.success('Booking started'); this.loadBookings(); },
      error: () => this.toast.error('Action failed'),
    });
  }

  completeBooking(id: string): void {
    this.api.post(`/spa/bookings/${id}/complete`, {}).subscribe({
      next: () => { this.toast.success('Booking completed'); this.loadBookings(); },
      error: () => this.toast.error('Action failed'),
    });
  }

  cancelBooking(id: string): void {
    if (!confirm('Cancel this spa booking?')) return;
    this.api.post(`/spa/bookings/${id}/cancel`, {}).subscribe({
      next: () => { this.toast.success('Booking cancelled'); this.loadBookings(); },
      error: () => this.toast.error('Action failed'),
    });
  }

  bookingStatusCls(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }

  // ── Pool methods ──────────────────────────────────────────────

  loadPool(): void {
    this.loadingPool.set(true);
    const params: any = {};
    if (this.poolDateFilter) params['date'] = this.poolDateFilter;
    this.api.get('/spa/pool', params).subscribe({
      next: (r: any) => { this.poolLogs.set(r?.data || []); this.loadingPool.set(false); },
      error: () => { this.loadingPool.set(false); this.toast.error('Failed to load pool logs'); },
    });
    this.api.get('/spa/pool/occupancy').subscribe({
      next: (r: any) => this.poolOccupancy.set(r?.data?.current_occupancy ?? 0),
      error: () => {},
    });
  }

  openPoolCheckIn(): void {
    const now = new Date();
    this.poolForm = {
      guest_name: '',
      area: 'main_pool',
      check_in_time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
    };
    this.showPoolCheckIn.set(true);
  }

  closePoolCheckIn(): void { this.showPoolCheckIn.set(false); }

  savePoolCheckIn(): void {
    if (!this.poolForm.guest_name || !this.poolForm.check_in_time) {
      this.toast.error('Guest name and check-in time are required'); return;
    }
    this.savingPool.set(true);
    this.api.post('/spa/pool/check-in', {
      guest_id: null,
      guest_name: this.poolForm.guest_name,
      check_in_time: this.poolForm.check_in_time,
      area: this.poolForm.area,
    }).subscribe({
      next: () => { this.toast.success('Guest checked into pool'); this.closePoolCheckIn(); this.loadPool(); this.savingPool.set(false); },
      error: (e: any) => { this.savingPool.set(false); this.toast.error(e?.error?.message ?? 'Check-in failed'); },
    });
  }

  poolCheckOut(id: string): void {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    this.api.post(`/spa/pool/${id}/check-out`, { check_out_time: time }).subscribe({
      next: () => { this.toast.success('Guest checked out of pool'); this.loadPool(); },
      error: () => this.toast.error('Check-out failed'),
    });
  }

  calcDuration(inTime: string, outTime: string): string {
    if (!inTime || !outTime) return '—';
    const [ih, im] = inTime.split(':').map(Number);
    const [oh, om] = outTime.split(':').map(Number);
    const diff = (oh * 60 + om) - (ih * 60 + im);
    if (diff <= 0) return '—';
    const h = Math.floor(diff / 60), m = diff % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  tabCls(tab: string): string {
    return this.activeTab === tab
      ? 'px-4 py-2 rounded-lg text-sm font-medium bg-[#2d6a4f] text-white'
      : 'px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200';
  }
}
