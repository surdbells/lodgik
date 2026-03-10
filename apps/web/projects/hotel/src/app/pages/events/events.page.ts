import {
  Component, inject, signal, computed, effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe, TitleCasePipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, BadgeComponent, EmptyStateComponent, StatsCardComponent,
} from '@lodgik/shared';
import { ActivePropertyService } from '@lodgik/shared';

interface EventSpace {
  id: string;
  name: string;
  capacity: number;
  layouts: string[];
  amenities: string[];
  full_day_rate_ngn: number | null;
  half_day_rate_ngn: number | null;
  hourly_rate_ngn: number | null;
  is_active: boolean;
}

interface EventBooking {
  id: string;
  reference: string;
  event_name: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_type: string;
  expected_guests: number;
  layout: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  company_name: string | null;
  status: string;
  venue_rate_ngn: number;
  catering_total_ngn: number;
  extras_total_ngn: number;
  deposit_paid_ngn: number;
  total_ngn: number;
  balance_due_ngn: number;
  catering_items: any[];
  extra_items: any[];
  space_name?: string | null;
}

interface Dashboard {
  total_active: number;
  today_events: number;
  this_month_events: number;
  upcoming_events: number;
  month_revenue_ngn: number;
  next_events: any[];
}

const EVENT_TYPES = [
  'conference', 'wedding', 'birthday', 'corporate',
  'seminar', 'product_launch', 'gala', 'training', 'other',
];

const DURATION_TYPES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'half_day', label: 'Half Day (AM/PM)' },
  { value: 'full_day', label: 'Full Day' },
];

const LAYOUTS = ['boardroom', 'theatre', 'u_shape', 'classroom', 'cocktail', 'banquet'];

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';
const STATUS_COLORS: Record<string, BadgeVariant> = {
  tentative: 'warning', confirmed: 'success', in_progress: 'info',
  completed: 'neutral', cancelled: 'danger',
};

const EMPTY_EVENT_FORM = () => ({
  event_name: '', event_type: 'conference', event_date: '',
  start_time: '', end_time: '', duration_type: 'full_day',
  expected_guests: 0, layout: '',
  client_name: '', client_email: '', client_phone: '', company_name: '',
  event_space_id: '', group_booking_id: '',
  venue_rate_ngn: 0, catering_total_ngn: 0, extras_total_ngn: 0, deposit_paid_ngn: 0,
  special_requirements: '', notes: '',
  catering_items: [] as any[], extra_items: [] as any[],
});

const EMPTY_SPACE_FORM = () => ({
  name: '', description: '', capacity: 0,
  layouts: [] as string[], amenities: [] as string[],
  full_day_rate_ngn: null as number|null,
  half_day_rate_ngn: null as number|null,
  hourly_rate_ngn: null as number|null,
  notes: '',
});

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent,
            EmptyStateComponent, StatsCardComponent, DecimalPipe, DatePipe, TitleCasePipe],
  template: `
    <ui-page-header title="Events & Banquets" icon="calendar-days"
      [breadcrumbs]="['Operations', 'Events & Banquets']"
      subtitle="Manage event spaces, banquet bookings and venue hire">
      <div class="flex gap-2">
        <button (click)="activeTab.set('spaces')"
          class="px-3 py-2 text-sm rounded-xl transition-colors"
          [class]="activeTab() === 'spaces' ? 'bg-sage-600 text-white' : 'border hover:bg-gray-50 text-gray-600'">
          Spaces
        </button>
        <button (click)="activeTab.set('bookings')"
          class="px-3 py-2 text-sm rounded-xl transition-colors"
          [class]="activeTab() === 'bookings' ? 'bg-sage-600 text-white' : 'border hover:bg-gray-50 text-gray-600'">
          Event Bookings
        </button>
        <button (click)="activeTab() === 'spaces' ? openCreateSpace() : openCreateEvent()"
          class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700 transition-colors">
          + New {{ activeTab() === 'spaces' ? 'Space' : 'Event' }}
        </button>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {

      <!-- ── Dashboard KPIs ── -->
      @if (dashboard()) {
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div class="bg-white rounded-xl border p-4 text-center">
            <p class="text-2xl font-bold text-gray-900">{{ dashboard()!.today_events }}</p>
            <p class="text-xs text-gray-500 mt-1">Today</p>
          </div>
          <div class="bg-white rounded-xl border p-4 text-center">
            <p class="text-2xl font-bold text-blue-600">{{ dashboard()!.upcoming_events }}</p>
            <p class="text-xs text-gray-500 mt-1">Upcoming</p>
          </div>
          <div class="bg-white rounded-xl border p-4 text-center">
            <p class="text-2xl font-bold text-green-600">{{ dashboard()!.this_month_events }}</p>
            <p class="text-xs text-gray-500 mt-1">This Month</p>
          </div>
          <div class="bg-white rounded-xl border p-4 text-center col-span-2">
            <p class="text-2xl font-bold text-purple-600">₦{{ dashboard()!.month_revenue_ngn | number:'1.0-0' }}</p>
            <p class="text-xs text-gray-500 mt-1">Month Revenue</p>
          </div>
        </div>

        @if (dashboard()!.next_events.length > 0) {
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <p class="text-xs font-semibold text-amber-700 mb-2">⚡ Coming Up</p>
            <div class="flex flex-wrap gap-3">
              @for (e of dashboard()!.next_events; track e.reference) {
                <div class="bg-white rounded-lg px-3 py-2 text-sm shadow-sm">
                  <p class="font-medium text-gray-800">{{ e.event_name }}</p>
                  <p class="text-xs text-gray-500">{{ e.event_date }} · {{ e.expected_guests }} guests</p>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- ═══════════════ SPACES TAB ═══════════════ -->
      @if (activeTab() === 'spaces') {
        @if (spaces().length === 0) {
          <ui-empty-state icon="building-2" title="No event spaces configured"
            description="Add conference halls, ballrooms, and banquet venues to start taking event bookings.">
          </ui-empty-state>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (s of spaces(); track s.id) {
              <div class="bg-white rounded-xl border shadow-sm">
                <div class="p-4 border-b flex items-start justify-between">
                  <div>
                    <h3 class="font-semibold text-gray-900">{{ s.name }}</h3>
                    <p class="text-sm text-gray-500">Capacity: {{ s.capacity }} guests</p>
                  </div>
                  <ui-badge [variant]="s.is_active ? 'success' : 'neutral'">{{ s.is_active ? 'Active' : 'Inactive' }}</ui-badge>
                </div>
                <div class="p-4 space-y-3 text-sm">
                  @if (s.layouts?.length) {
                    <div>
                      <p class="text-xs text-gray-400 mb-1">Layouts</p>
                      <div class="flex flex-wrap gap-1">
                        @for (l of s.layouts; track l) {
                          <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{{ l }}</span>
                        }
                      </div>
                    </div>
                  }
                  @if (s.amenities?.length) {
                    <div>
                      <p class="text-xs text-gray-400 mb-1">Amenities</p>
                      <div class="flex flex-wrap gap-1">
                        @for (a of s.amenities; track a) {
                          <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{{ a }}</span>
                        }
                      </div>
                    </div>
                  }
                  <div class="grid grid-cols-3 gap-2 pt-1">
                    @if (s.hourly_rate_ngn) {
                      <div class="text-center bg-gray-50 rounded p-2">
                        <p class="text-xs text-gray-400">Hourly</p>
                        <p class="text-xs font-bold">₦{{ s.hourly_rate_ngn | number:'1.0-0' }}</p>
                      </div>
                    }
                    @if (s.half_day_rate_ngn) {
                      <div class="text-center bg-gray-50 rounded p-2">
                        <p class="text-xs text-gray-400">Half Day</p>
                        <p class="text-xs font-bold">₦{{ s.half_day_rate_ngn | number:'1.0-0' }}</p>
                      </div>
                    }
                    @if (s.full_day_rate_ngn) {
                      <div class="text-center bg-gray-50 rounded p-2">
                        <p class="text-xs text-gray-400">Full Day</p>
                        <p class="text-xs font-bold">₦{{ s.full_day_rate_ngn | number:'1.0-0' }}</p>
                      </div>
                    }
                  </div>
                </div>
                <div class="px-4 pb-4">
                  <button (click)="openEditSpace(s)"
                    class="w-full px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                    ✏️ Edit Space
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ═══════════════ BOOKINGS TAB ═══════════════ -->
      @if (activeTab() === 'bookings') {
        <!-- Filters -->
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
          <input [(ngModel)]="bookingSearch" placeholder="Search event name, client, reference..."
            class="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
          <select [(ngModel)]="bookingStatusFilter" class="px-3 py-2 border rounded-lg text-sm">
            <option value="">All Status</option>
            <option value="tentative">Tentative</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select [(ngModel)]="bookingTypeFilter" class="px-3 py-2 border rounded-lg text-sm">
            <option value="">All Types</option>
            @for (t of eventTypes; track t) {
              <option [value]="t">{{ t | titlecase }}</option>
            }
          </select>
        </div>

        @if (filteredBookings().length === 0) {
          <ui-empty-state icon="calendar-days" title="No events found"
            description="Create your first event booking for a conference, wedding, or corporate function.">
          </ui-empty-state>
        } @else {
          <div class="space-y-3">
            @for (e of filteredBookings(); track e.id) {
              <div class="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-mono text-gray-400">{{ e.reference }}</span>
                      <ui-badge [variant]="statusColors[e.status] ?? 'neutral'">{{ e.status | titlecase }}</ui-badge>
                      <span class="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">{{ e.event_type }}</span>
                    </div>
                    <h3 class="font-semibold text-gray-900 mt-1">{{ e.event_name }}</h3>
                    <p class="text-sm text-gray-500">
                      {{ e.event_date }} · {{ e.expected_guests }} guests
                      @if (e.space_name) { · <span class="text-blue-600">{{ e.space_name }}</span> }
                    </p>
                    <p class="text-xs text-gray-400">Client: {{ e.client_name }}{{ e.company_name ? ' (' + e.company_name + ')' : '' }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-bold text-gray-900">₦{{ e.total_ngn | number:'1.0-0' }}</p>
                    @if (e.balance_due_ngn > 0) {
                      <p class="text-xs text-red-600">₦{{ e.balance_due_ngn | number:'1.0-0' }} due</p>
                    } @else if (e.status !== 'cancelled') {
                      <p class="text-xs text-green-600">Fully paid</p>
                    }
                  </div>
                </div>

                <!-- Actions -->
                <div class="px-4 pb-4 flex flex-wrap gap-2">
                  @if (e.status === 'tentative') {
                    <button (click)="confirm(e.id)"
                      class="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      ✓ Confirm
                    </button>
                  }
                  @if (e.status === 'confirmed') {
                    <button (click)="markInProgress(e.id)"
                      class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      ▶ Start Event
                    </button>
                  }
                  @if (e.status === 'in_progress') {
                    <button (click)="complete(e.id)"
                      class="px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
                      ✓ Complete
                    </button>
                  }
                  @if (['tentative', 'confirmed'].includes(e.status) && e.balance_due_ngn > 0) {
                    <button (click)="openDeposit(e)"
                      class="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      💰 Record Payment
                    </button>
                  }
                  <button (click)="openEditEvent(e)"
                    class="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                    ✏️ Edit
                  </button>
                  @if (!['completed', 'cancelled'].includes(e.status)) {
                    <button (click)="cancelEvent(e.id)"
                      class="px-3 py-1.5 text-xs border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
                      ✕ Cancel
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      }
    }

    <!-- ═══════════ Space Form Modal ═══════════ -->
    @if (showSpaceForm()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click.self)="showSpaceForm.set(false)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="p-5 border-b flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">{{ editingSpaceId() ? 'Edit Event Space' : 'New Event Space' }}</h3>
            <button (click)="showSpaceForm.set(false)" class="text-gray-400 text-xl">×</button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Space Name *</label>
              <input [(ngModel)]="spaceForm.name" placeholder="Grand Ballroom, Conference Room A..."
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Capacity (guests)</label>
                <input type="number" min="0" [(ngModel)]="spaceForm.capacity"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div></div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea [(ngModel)]="spaceForm.description" rows="2"
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none resize-none"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-2">Available Layouts</label>
              <div class="flex flex-wrap gap-2">
                @for (l of allLayouts; track l) {
                  <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" [checked]="spaceForm.layouts.includes(l)"
                      (change)="toggleLayout(l)"
                      class="rounded">
                    <span class="capitalize">{{ l.replace('_', '-') }}</span>
                  </label>
                }
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Hourly Rate (₦)</label>
                <input type="number" min="0" [(ngModel)]="spaceForm.hourly_rate_ngn"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Half Day (₦)</label>
                <input type="number" min="0" [(ngModel)]="spaceForm.half_day_rate_ngn"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Full Day (₦)</label>
                <input type="number" min="0" [(ngModel)]="spaceForm.full_day_rate_ngn"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
            </div>
          </div>
          <div class="p-5 border-t flex justify-end gap-3">
            <button (click)="showSpaceForm.set(false)"
              class="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button (click)="saveSpace()" [disabled]="saving()"
              class="px-6 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-50 transition-colors">
              {{ saving() ? 'Saving…' : 'Save Space' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════ Event Form Modal ═══════════ -->
    @if (showEventForm()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click.self)="showEventForm.set(false)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="p-5 border-b flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">{{ editingEventId() ? 'Edit Event Booking' : 'New Event Booking' }}</h3>
            <button (click)="showEventForm.set(false)" class="text-gray-400 text-xl">×</button>
          </div>
          <div class="p-5 space-y-4">
            <!-- Event details -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-gray-500 mb-1">Event Name *</label>
                <input [(ngModel)]="eventForm.event_name" placeholder="Adebayo-Nwosu Wedding Reception"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Event Type *</label>
                <select [(ngModel)]="eventForm.event_type" class="w-full px-3 py-2 border rounded-lg text-sm">
                  @for (t of eventTypes; track t) {
                    <option [value]="t">{{ t | titlecase }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Event Date *</label>
                <input type="date" [(ngModel)]="eventForm.event_date"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                <input type="time" [(ngModel)]="eventForm.start_time"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                <input type="time" [(ngModel)]="eventForm.end_time"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                <select [(ngModel)]="eventForm.duration_type" class="w-full px-3 py-2 border rounded-lg text-sm">
                  @for (d of durationTypes; track d.value) {
                    <option [value]="d.value">{{ d.label }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Expected Guests</label>
                <input type="number" min="0" [(ngModel)]="eventForm.expected_guests"
                  class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Event Space</label>
                <select [(ngModel)]="eventForm.event_space_id" class="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">— Select Space —</option>
                  @for (s of spaces(); track s.id) {
                    <option [value]="s.id">{{ s.name }} ({{ s.capacity }} cap.)</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Room Layout</label>
                <select [(ngModel)]="eventForm.layout" class="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">— No preference —</option>
                  @for (l of allLayouts; track l) {
                    <option [value]="l">{{ l | titlecase }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Client -->
            <div class="border-t pt-4">
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Client / Organiser</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Client Name *</label>
                  <input [(ngModel)]="eventForm.client_name" placeholder="Mrs. Chioma Adebayo"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Company (optional)</label>
                  <input [(ngModel)]="eventForm.company_name"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input type="email" [(ngModel)]="eventForm.client_email"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input [(ngModel)]="eventForm.client_phone"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
              </div>
            </div>

            <!-- Pricing -->
            <div class="border-t pt-4">
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Pricing (₦)</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Venue Rate</label>
                  <input type="number" min="0" [(ngModel)]="eventForm.venue_rate_ngn"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Catering</label>
                  <input type="number" min="0" [(ngModel)]="eventForm.catering_total_ngn"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Extras (AV/Decor)</label>
                  <input type="number" min="0" [(ngModel)]="eventForm.extras_total_ngn"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Deposit Paid</label>
                  <input type="number" min="0" [(ngModel)]="eventForm.deposit_paid_ngn"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
              </div>
              <!-- Live total -->
              <div class="mt-3 bg-gray-50 rounded-lg px-4 py-2 flex items-center justify-between">
                <span class="text-sm text-gray-600">Total</span>
                <span class="font-bold text-gray-900">
                  ₦{{ ((+eventForm.venue_rate_ngn)+(+eventForm.catering_total_ngn)+(+eventForm.extras_total_ngn)) | number:'1.0-0' }}
                </span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Special Requirements</label>
              <textarea [(ngModel)]="eventForm.special_requirements" rows="2"
                placeholder="Dietary restrictions, AV needs, setup preferences..."
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none resize-none"></textarea>
            </div>
          </div>
          <div class="p-5 border-t flex justify-end gap-3">
            <button (click)="showEventForm.set(false)"
              class="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button (click)="saveEvent()" [disabled]="saving()"
              class="px-6 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700 disabled:opacity-50 transition-colors">
              {{ saving() ? 'Saving…' : (editingEventId() ? 'Update Event' : 'Create Booking') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════ Deposit Modal ═══════════ -->
    @if (depositEvent()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click.self)="depositEvent.set(null)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div class="p-5 border-b">
            <h3 class="font-semibold text-gray-800">Record Payment</h3>
            <p class="text-sm text-gray-500">{{ depositEvent()!.event_name }}</p>
          </div>
          <div class="p-5 space-y-3">
            <p class="text-sm text-gray-600">Balance due: <span class="font-bold text-red-600">₦{{ depositEvent()!.balance_due_ngn | number:'1.0-0' }}</span></p>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Amount Received (₦)</label>
              <input type="number" min="1" [(ngModel)]="depositAmount"
                class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
            </div>
          </div>
          <div class="p-5 border-t flex gap-3">
            <button (click)="depositEvent.set(null)"
              class="flex-1 px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button (click)="saveDeposit()" [disabled]="saving()"
              class="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
              {{ saving() ? 'Saving…' : 'Confirm Payment' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export default class EventsPage {
  private api     = inject(ApiService);
  private propSvc = inject(ActivePropertyService);
  private toast   = inject(ToastService);

  loading         = signal(true);
  saving          = signal(false);
  activeTab       = signal<'spaces' | 'bookings'>('bookings');
  spaces          = signal<EventSpace[]>([]);
  bookings        = signal<EventBooking[]>([]);
  dashboard       = signal<Dashboard | null>(null);
  showSpaceForm   = signal(false);
  showEventForm   = signal(false);
  editingSpaceId  = signal<string | null>(null);
  editingEventId  = signal<string | null>(null);
  depositEvent    = signal<EventBooking | null>(null);
  depositAmount   = 0;
  bookingSearch   = '';
  bookingStatusFilter = '';
  bookingTypeFilter = '';
  spaceForm       = EMPTY_SPACE_FORM();
  eventForm       = EMPTY_EVENT_FORM();

  readonly statusColors = STATUS_COLORS;
  readonly eventTypes   = EVENT_TYPES;
  readonly durationTypes = DURATION_TYPES;
  readonly allLayouts   = LAYOUTS;

  filteredBookings = computed(() => {
    let list = this.bookings();
    const q  = this.bookingSearch.toLowerCase().trim();
    if (q) list = list.filter(e =>
      e.event_name.toLowerCase().includes(q) ||
      e.client_name.toLowerCase().includes(q) ||
      e.reference.toLowerCase().includes(q) ||
      (e.company_name ?? '').toLowerCase().includes(q)
    );
    if (this.bookingStatusFilter) list = list.filter(e => e.status === this.bookingStatusFilter);
    if (this.bookingTypeFilter)   list = list.filter(e => e.event_type === this.bookingTypeFilter);
    return list;
  });

  constructor() {
    effect(() => {
      const pid = this.propSvc.propertyId();
      if (pid) this.loadAll(pid);
    });
  }

  loadAll(pid: string): void {
    this.loading.set(true);
    const params = { property_id: pid };
    let done = 0;
    const check = () => { if (++done === 3) this.loading.set(false); };

    this.api.get('/events/dashboard', params).subscribe({ next: (r: any) => { this.dashboard.set(r.data); check(); }, error: check });
    this.api.get('/events/spaces', params).subscribe({ next: (r: any) => { this.spaces.set(r.data ?? []); check(); }, error: check });
    this.api.get('/events', params).subscribe({ next: (r: any) => { this.bookings.set(r.data ?? []); check(); }, error: check });
  }

  // ── Spaces ──────────────────────────────────────────────────────────────

  openCreateSpace(): void { this.editingSpaceId.set(null); this.spaceForm = EMPTY_SPACE_FORM(); this.showSpaceForm.set(true); }

  openEditSpace(s: EventSpace): void {
    this.editingSpaceId.set(s.id);
    this.spaceForm = {
      name: s.name, description: '', capacity: s.capacity,
      layouts: [...(s.layouts ?? [])], amenities: [...(s.amenities ?? [])],
      full_day_rate_ngn: s.full_day_rate_ngn,
      half_day_rate_ngn: s.half_day_rate_ngn,
      hourly_rate_ngn: s.hourly_rate_ngn,
      notes: '',
    };
    this.showSpaceForm.set(true);
  }

  toggleLayout(l: string): void {
    const idx = this.spaceForm.layouts.indexOf(l);
    if (idx >= 0) this.spaceForm.layouts.splice(idx, 1);
    else this.spaceForm.layouts.push(l);
  }

  saveSpace(): void {
    if (!this.spaceForm.name.trim()) { this.toast.error('Space name is required'); return; }
    this.saving.set(true);
    const pid = this.propSvc.propertyId();
    const payload = { ...this.spaceForm, property_id: pid };
    const req = this.editingSpaceId()
      ? this.api.put(`/events/spaces/${this.editingSpaceId()}`, payload)
      : this.api.post('/events/spaces', payload);
    req.subscribe({
      next: (r: any) => {
        if (this.editingSpaceId()) this.spaces.update(l => l.map(s => s.id === this.editingSpaceId() ? r.data : s));
        else this.spaces.update(l => [r.data, ...l]);
        this.saving.set(false); this.showSpaceForm.set(false);
        this.toast.success(this.editingSpaceId() ? 'Space updated' : 'Space created');
      },
      error: (err: any) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to save space'); },
    });
  }

  // ── Events ──────────────────────────────────────────────────────────────

  openCreateEvent(): void { this.editingEventId.set(null); this.eventForm = EMPTY_EVENT_FORM(); this.showEventForm.set(true); }

  openEditEvent(e: EventBooking): void {
    this.editingEventId.set(e.id);
    this.eventForm = {
      event_name: e.event_name, event_type: e.event_type, event_date: e.event_date,
      start_time: e.start_time ?? '', end_time: e.end_time ?? '',
      duration_type: e.duration_type, expected_guests: e.expected_guests, layout: e.layout ?? '',
      client_name: e.client_name, client_email: e.client_email ?? '',
      client_phone: e.client_phone ?? '', company_name: e.company_name ?? '',
      event_space_id: '', group_booking_id: '',
      venue_rate_ngn: e.venue_rate_ngn, catering_total_ngn: e.catering_total_ngn,
      extras_total_ngn: e.extras_total_ngn, deposit_paid_ngn: e.deposit_paid_ngn,
      special_requirements: '', notes: '',
      catering_items: e.catering_items ?? [], extra_items: e.extra_items ?? [],
    };
    this.showEventForm.set(true);
  }

  saveEvent(): void {
    if (!this.eventForm.event_name.trim()) { this.toast.error('Event name is required'); return; }
    if (!this.eventForm.event_date) { this.toast.error('Event date is required'); return; }
    if (!this.eventForm.client_name.trim()) { this.toast.error('Client name is required'); return; }
    this.saving.set(true);
    const pid = this.propSvc.propertyId();
    const payload = { ...this.eventForm, property_id: pid };
    const req = this.editingEventId()
      ? this.api.put(`/events/${this.editingEventId()}`, payload)
      : this.api.post('/events', payload);
    req.subscribe({
      next: (r: any) => {
        const ev = r.data;
        if (this.editingEventId()) this.bookings.update(l => l.map(e => e.id === this.editingEventId() ? ev : e));
        else this.bookings.update(l => [ev, ...l]);
        this.saving.set(false); this.showEventForm.set(false);
        this.toast.success(this.editingEventId() ? 'Event updated' : 'Event booking created');
      },
      error: (err: any) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to save event'); },
    });
  }

  confirm(id: string): void {
    this.api.post(`/events/${id}/confirm`, {}).subscribe({
      next: (r: any) => { this.bookings.update(l => l.map(e => e.id === id ? r.data : e)); this.toast.success('Event confirmed'); },
      error: () => this.toast.error('Failed to confirm event'),
    });
  }

  markInProgress(id: string): void {
    // Update status to in_progress via update endpoint
    this.api.put(`/events/${id}`, { status: 'in_progress' }).subscribe({
      next: (r: any) => { this.bookings.update(l => l.map(e => e.id === id ? r.data : e)); this.toast.success('Event started'); },
      error: () => this.toast.error('Failed to update event'),
    });
  }

  complete(id: string): void {
    this.api.post(`/events/${id}/complete`, {}).subscribe({
      next: (r: any) => { this.bookings.update(l => l.map(e => e.id === id ? r.data : e)); this.toast.success('Event marked complete'); },
      error: () => this.toast.error('Failed to complete event'),
    });
  }

  cancelEvent(id: string): void {
    if (!confirm('Cancel this event booking?')) return;
    this.api.post(`/events/${id}/cancel`, {}).subscribe({
      next: (r: any) => { this.bookings.update(l => l.map(e => e.id === id ? r.data : e)); this.toast.success('Event cancelled'); },
      error: () => this.toast.error('Failed to cancel event'),
    });
  }

  openDeposit(e: EventBooking): void { this.depositEvent.set(e); this.depositAmount = 0; }

  saveDeposit(): void {
    if (!this.depositAmount || this.depositAmount <= 0) { this.toast.error('Enter a valid amount'); return; }
    this.saving.set(true);
    const id = this.depositEvent()!.id;
    this.api.post(`/events/${id}/record-deposit`, { amount_ngn: this.depositAmount }).subscribe({
      next: (r: any) => {
        this.bookings.update(l => l.map(e => e.id === id ? r.data : e));
        this.saving.set(false); this.depositEvent.set(null);
        this.toast.success('Payment recorded');
      },
      error: () => { this.saving.set(false); this.toast.error('Failed to record payment'); },
    });
  }
}
