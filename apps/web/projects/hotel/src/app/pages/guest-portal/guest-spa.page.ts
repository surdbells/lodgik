import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  LucideAngularModule,
  ArrowLeft, Sparkles, Dumbbell, Plus, X, CheckCircle2, Clock, Calendar,
} from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

type Tab = 'spa' | 'gym';

@Component({
  selector: 'app-guest-spa',
  standalone: true,
  imports: [RouterLink, DatePipe, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div>
          <h2 class="text-lg font-bold" [class]="th.text()">Spa & Gym</h2>
          <p class="text-xs" [class]="th.muted()">Book treatments and fitness classes</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex rounded-xl p-0.5 mb-5" [class]="th.cardSubtle()">
        <button (click)="tab.set('spa')"
          class="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all"
          [class]="tab() === 'spa' ? 'bg-amber-400 text-slate-900 shadow-sm' : th.muted()">
          <lucide-icon [img]="SparklesIcon" class="w-4 h-4"></lucide-icon>
          Spa
        </button>
        <button (click)="tab.set('gym')"
          class="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all"
          [class]="tab() === 'gym' ? 'bg-amber-400 text-slate-900 shadow-sm' : th.muted()">
          <lucide-icon [img]="DumbbellIcon" class="w-4 h-4"></lucide-icon>
          Gym
        </button>
      </div>

      <!-- ── SPA TAB ──────────────────────────────── -->
      @if (tab() === 'spa') {

        <!-- Sub-tabs -->
        <div class="flex gap-2 mb-5">
          <button (click)="spaView.set('services')"
            class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            [class]="spaView() === 'services' ? 'bg-amber-400 text-slate-900' : th.badge()">
            Services
          </button>
          <button (click)="loadSpaBookings(); spaView.set('bookings')"
            class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            [class]="spaView() === 'bookings' ? 'bg-amber-400 text-slate-900' : th.badge()">
            My Bookings
          </button>
        </div>

        <!-- Services list -->
        @if (spaView() === 'services') {
          @if (spaLoading()) {
            <div class="flex justify-center py-12">
              <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
            </div>
          }
          @if (!spaLoading()) {
            @if (spaServices().length === 0) {
              <div class="text-center py-12">
                <p class="text-sm" [class]="th.muted()">No spa services available right now.</p>
              </div>
            }
            @for (svc of spaServices(); track svc.id) {
              <div class="rounded-2xl p-4 mb-3" [class]="th.card()">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1 pr-3">
                    <p class="text-sm font-bold" [class]="th.text()">{{ svc.name }}</p>
                    @if (svc.description) {
                      <p class="text-xs mt-0.5" [class]="th.muted()">{{ svc.description }}</p>
                    }
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-sm font-bold text-amber-400">₦{{ fmt(svc.price) }}</p>
                    @if (svc.duration_minutes) {
                      <p class="text-[11px] mt-0.5" [class]="th.subtle()">{{ svc.duration_minutes }} min</p>
                    }
                  </div>
                </div>
                <button (click)="openSpaBookingForm(svc)"
                  class="w-full mt-2 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold
                         bg-amber-400 text-slate-900 transition-all active:scale-95">
                  <lucide-icon [img]="CalendarIcon" class="w-3.5 h-3.5"></lucide-icon>
                  Book Now
                </button>
              </div>
            }
          }
        }

        <!-- My spa bookings -->
        @if (spaView() === 'bookings') {
          @if (spaBookingsLoading()) {
            <div class="flex justify-center py-12">
              <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
            </div>
          }
          @if (!spaBookingsLoading()) {
            @if (spaBookings().length === 0) {
              <div class="text-center py-12">
                <p class="text-sm" [class]="th.muted()">No spa bookings yet.</p>
                <button (click)="spaView.set('services')" class="mt-3 text-xs transition-colors" [class]="th.accent()">
                  Browse services →
                </button>
              </div>
            }
            @for (b of spaBookings(); track b.id) {
              <div class="rounded-2xl p-4 mb-3" [class]="th.card()">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <p class="text-sm font-bold" [class]="th.text()">{{ b.service_name }}</p>
                    @if (b.therapist_name) {
                      <p class="text-xs mt-0.5" [class]="th.muted()">Therapist: {{ b.therapist_name }}</p>
                    }
                  </div>
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    [class]="spaStatusClass(b.status)">
                    {{ b.status | titlecase }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs" [class]="th.muted()">
                  <lucide-icon [img]="ClockIcon" class="w-3.5 h-3.5"></lucide-icon>
                  <span>{{ b.booking_date | date:'dd MMM' }} at {{ b.start_time }}</span>
                  <span class="ml-auto font-semibold text-amber-400">₦{{ fmt(b.price) }}</span>
                </div>
                @if (b.status === 'pending' || b.status === 'confirmed') {
                  <button (click)="cancelSpaBooking(b.id)"
                    class="mt-3 w-full text-xs py-2 rounded-xl transition-all border"
                    [class]="th.isDark() ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-300 text-red-600 hover:bg-red-50'">
                    Cancel Appointment
                  </button>
                }
              </div>
            }
          }
        }

      }

      <!-- ── GYM TAB ──────────────────────────────── -->
      @if (tab() === 'gym') {

        <!-- Sub-tabs -->
        <div class="flex gap-2 mb-5">
          <button (click)="gymView.set('classes')"
            class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            [class]="gymView() === 'classes' ? 'bg-amber-400 text-slate-900' : th.badge()">
            Classes
          </button>
          <button (click)="loadGymBookings(); gymView.set('my-bookings')"
            class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            [class]="gymView() === 'my-bookings' ? 'bg-amber-400 text-slate-900' : th.badge()">
            My Bookings
          </button>
          <button (click)="gymView.set('plans')"
            class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            [class]="gymView() === 'plans' ? 'bg-amber-400 text-slate-900' : th.badge()">
            Plans
          </button>
        </div>

        <!-- Classes -->
        @if (gymView() === 'classes') {
          @if (gymLoading()) {
            <div class="flex justify-center py-12">
              <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
            </div>
          }
          @if (!gymLoading()) {
            @if (gymClasses().length === 0) {
              <div class="text-center py-12">
                <p class="text-sm" [class]="th.muted()">No upcoming gym classes.</p>
              </div>
            }
            @for (cls of gymClasses(); track cls.id) {
              <div class="rounded-2xl p-4 mb-3" [class]="th.card()">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1 pr-3">
                    <p class="text-sm font-bold" [class]="th.text()">{{ cls.name }}</p>
                    <p class="text-xs mt-0.5" [class]="th.muted()">
                      {{ cls.instructor_name ? 'Instructor: ' + cls.instructor_name : '' }}
                      {{ cls.location ? ' · ' + cls.location : '' }}
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-xs font-semibold" [class]="cls.is_full ? 'text-red-400' : 'text-emerald-400'">
                      {{ cls.is_full ? 'Full' : cls.spots_left + ' spots' }}
                    </p>
                    <p class="text-[11px] mt-0.5" [class]="th.subtle()">{{ cls.duration_minutes }} min</p>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-xs" [class]="th.muted()">
                    <lucide-icon [img]="ClockIcon" class="w-3.5 h-3.5"></lucide-icon>
                    <span>{{ cls.scheduled_at | date:'dd MMM, h:mm a' }}</span>
                  </div>
                  <button (click)="bookGymClass(cls.id)" [disabled]="cls.is_full || bookingClassId() === cls.id"
                    class="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    [class]="cls.is_full ? (th.isDark() ? 'bg-white/10 text-white/30' : 'bg-gray-100 text-gray-400') : 'bg-amber-400 text-slate-900'">
                    @if (bookingClassId() === cls.id) {
                      <span class="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                    } @else {
                      <lucide-icon [img]="PlusIcon" class="w-3.5 h-3.5"></lucide-icon>
                    }
                    Book
                  </button>
                </div>
              </div>
            }
          }
        }

        <!-- My gym bookings -->
        @if (gymView() === 'my-bookings') {
          @if (gymBookingsLoading()) {
            <div class="flex justify-center py-12">
              <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
            </div>
          }
          @if (!gymBookingsLoading()) {
            @if (gymBookings().length === 0) {
              <div class="text-center py-12">
                <p class="text-sm" [class]="th.muted()">No class bookings yet.</p>
                <button (click)="gymView.set('classes')" class="mt-3 text-xs transition-colors" [class]="th.accent()">
                  Browse classes →
                </button>
              </div>
            }
            @for (b of gymBookings(); track b.id) {
              <div class="rounded-2xl p-4 mb-3" [class]="th.card()">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-sm font-bold" [class]="th.text()">Class Booking</p>
                  <span class="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    [class]="b.status === 'booked' ? (th.isDark() ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                            : (th.isDark() ? 'bg-white/10 text-white/40' : 'bg-gray-100 text-gray-500')">
                    {{ b.status | titlecase }}
                  </span>
                </div>
                <p class="text-xs" [class]="th.muted()">Booked {{ b.created_at | date:'dd MMM' }}</p>
                @if (b.status === 'booked') {
                  <button (click)="cancelGymBooking(b.id)"
                    class="mt-3 w-full text-xs py-2 rounded-xl transition-all border"
                    [class]="th.isDark() ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-300 text-red-600 hover:bg-red-50'">
                    Cancel
                  </button>
                }
              </div>
            }
          }
        }

        <!-- Plans -->
        @if (gymView() === 'plans') {
          @if (gymPlansLoading()) {
            <div class="flex justify-center py-12">
              <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
            </div>
          }
          @if (!gymPlansLoading()) {
            @if (gymPlans().length === 0) {
              <div class="text-center py-12">
                <p class="text-sm" [class]="th.muted()">No gym plans available. Ask at reception.</p>
              </div>
            }
            @for (p of gymPlans(); track p.id) {
              <div class="rounded-2xl p-5 mb-3" [class]="th.card()">
                <div class="flex items-start justify-between mb-2">
                  <p class="text-base font-bold" [class]="th.text()">{{ p.name }}</p>
                  <p class="text-base font-black text-amber-400">₦{{ fmt(p.price) }}</p>
                </div>
                <p class="text-xs font-medium mb-2" [class]="th.muted()">{{ p.plan_type | titlecase }}</p>
                <div class="flex flex-wrap gap-2 text-[11px]">
                  @if (p.includes_classes) {
                    <span class="px-2 py-1 rounded-full" [class]="th.isDark() ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'">✓ Classes</span>
                  }
                  @if (p.includes_pool) {
                    <span class="px-2 py-1 rounded-full" [class]="th.isDark() ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-700'">✓ Pool</span>
                  }
                  @if (p.includes_spa) {
                    <span class="px-2 py-1 rounded-full" [class]="th.isDark() ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-700'">✓ Spa</span>
                  }
                  @if (p.max_visits) {
                    <span class="px-2 py-1 rounded-full" [class]="th.badge()">{{ p.max_visits }} visits</span>
                  }
                </div>
                @if (p.description) {
                  <p class="text-xs mt-2" [class]="th.subtle()">{{ p.description }}</p>
                }
                <p class="text-[11px] mt-3" [class]="th.subtle()">Contact reception to subscribe to this plan.</p>
              </div>
            }
          }
        }

      }

      <!-- ── SPA BOOKING MODAL ──────────────────── -->
      @if (spaBookingForm()) {
        <div class="fixed inset-0 z-50 flex items-end justify-center p-4"
          style="background:rgba(0,0,0,0.6)" (click)="closeSpaForm()">
          <div class="w-full max-w-md rounded-2xl p-5" [class]="th.isDark() ? 'bg-slate-800' : 'bg-white'"
            (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <p class="text-sm font-bold" [class]="th.text()">Book: {{ spaBookingForm()!.name }}</p>
              <button (click)="closeSpaForm()" [class]="th.muted()">
                <lucide-icon [img]="XIcon" class="w-5 h-5"></lucide-icon>
              </button>
            </div>
            <div class="space-y-3">
              <div>
                <label class="block mb-1" [class]="th.inputLabel()">Date *</label>
                <input type="date" [value]="spaDate()"
                  (input)="spaDate.set($any($event.target).value)"
                  class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
              </div>
              <div>
                <label class="block mb-1" [class]="th.inputLabel()">Start Time *</label>
                <input type="time" [value]="spaTime()"
                  (input)="spaTime.set($any($event.target).value)"
                  class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
              </div>
              <div>
                <label class="block mb-1" [class]="th.inputLabel()">Preferred Therapist</label>
                <input type="text" [value]="spaTherapist()"
                  (input)="spaTherapist.set($any($event.target).value)"
                  placeholder="Optional"
                  class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
              </div>
            </div>
            @if (spaFormError()) {
              <div class="mt-3 rounded-xl px-3 py-2.5 text-xs" [class]="th.danger()">{{ spaFormError() }}</div>
            }
            <button (click)="submitSpaBooking()" [disabled]="spaSubmitting()"
              class="w-full mt-4 bg-amber-400 text-slate-900 font-bold rounded-xl py-3 text-sm
                     transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
              @if (spaSubmitting()) {
                <span class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                Booking…
              } @else {
                <lucide-icon [img]="CheckCircle2Icon" class="w-4 h-4"></lucide-icon>
                Confirm Booking
              }
            </button>
          </div>
        </div>
      }

    </div>
  `,
})
export default class GuestSpaPage implements OnInit {
  private api = inject(GuestApiService);
  readonly th = inject(GuestThemeService);

  readonly ArrowLeftIcon  = ArrowLeft;
  readonly SparklesIcon   = Sparkles;
  readonly DumbbellIcon   = Dumbbell;
  readonly PlusIcon       = Plus;
  readonly XIcon          = X;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly ClockIcon      = Clock;
  readonly CalendarIcon   = Calendar;

  tab     = signal<Tab>('spa');
  spaView = signal<'services' | 'bookings'>('services');
  gymView = signal<'classes' | 'my-bookings' | 'plans'>('classes');

  // Spa
  spaServices        = signal<any[]>([]);
  spaBookings        = signal<any[]>([]);
  spaLoading         = signal(true);
  spaBookingsLoading = signal(false);
  spaBookingForm     = signal<any | null>(null);
  spaDate            = signal('');
  spaTime            = signal('');
  spaTherapist       = signal('');
  spaSubmitting      = signal(false);
  spaFormError       = signal('');

  // Gym
  gymClasses         = signal<any[]>([]);
  gymPlans           = signal<any[]>([]);
  gymBookings        = signal<any[]>([]);
  gymLoading         = signal(true);
  gymPlansLoading    = signal(false);
  gymBookingsLoading = signal(false);
  bookingClassId     = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get<any>('/guest/spa/services').subscribe({
      next: (r: any) => { this.spaServices.set(r.data ?? []); this.spaLoading.set(false); },
      error: () => this.spaLoading.set(false),
    });
    this.api.get<any>('/guest/gym/classes').subscribe({
      next: (r: any) => { this.gymClasses.set(r.data ?? []); this.gymLoading.set(false); },
      error: () => this.gymLoading.set(false),
    });
  }

  loadSpaBookings(): void {
    if (this.spaBookings().length) return;
    this.spaBookingsLoading.set(true);
    this.api.get<any>('/guest/spa/bookings').subscribe({
      next: (r: any) => { this.spaBookings.set(r.data ?? []); this.spaBookingsLoading.set(false); },
      error: () => this.spaBookingsLoading.set(false),
    });
  }

  loadGymBookings(): void {
    if (this.gymBookings().length) return;
    this.gymBookingsLoading.set(true);
    this.api.get<any>('/guest/gym/class-bookings').subscribe({
      next: (r: any) => { this.gymBookings.set(r.data ?? []); this.gymBookingsLoading.set(false); },
      error: () => this.gymBookingsLoading.set(false),
    });
    if (!this.gymPlans().length) {
      this.gymPlansLoading.set(true);
      this.api.get<any>('/guest/gym/plans').subscribe({
        next: (r: any) => { this.gymPlans.set(r.data ?? []); this.gymPlansLoading.set(false); },
        error: () => this.gymPlansLoading.set(false),
      });
    }
  }

  openSpaBookingForm(svc: any): void {
    this.spaBookingForm.set(svc);
    this.spaDate.set('');
    this.spaTime.set('');
    this.spaTherapist.set('');
    this.spaFormError.set('');
  }

  closeSpaForm(): void { this.spaBookingForm.set(null); }

  submitSpaBooking(): void {
    const svc = this.spaBookingForm();
    if (!this.spaDate()) { this.spaFormError.set('Please select a date'); return; }
    if (!this.spaTime()) { this.spaFormError.set('Please select a start time'); return; }
    this.spaSubmitting.set(true);
    this.spaFormError.set('');
    this.api.post('/guest/spa/book', {
      service_id:     svc.id,
      service_name:   svc.name,
      date:           this.spaDate(),
      start_time:     this.spaTime(),
      price:          svc.price,
      therapist_name: this.spaTherapist() || null,
    }).subscribe({
      next: (r: any) => {
        this.spaBookings.update(b => [r.data, ...b]);
        this.spaSubmitting.set(false);
        this.closeSpaForm();
        this.spaView.set('bookings');
      },
      error: (e: any) => {
        this.spaSubmitting.set(false);
        this.spaFormError.set(e?.error?.error?.message ?? 'Booking failed');
      },
    });
  }

  cancelSpaBooking(id: string): void {
    this.api.delete(`/guest/spa/bookings/${id}`).subscribe({
      next: () => this.spaBookings.update(b => b.map(x => x.id === id ? { ...x, status: 'cancelled' } : x)),
      error: () => {},
    });
  }

  bookGymClass(classId: string): void {
    this.bookingClassId.set(classId);
    this.api.post(`/guest/gym/classes/${classId}/book`, {}).subscribe({
      next: (r: any) => {
        this.bookingClassId.set(null);
        this.gymClasses.update(c => c.map(x =>
          x.id === classId ? { ...x, current_bookings: x.current_bookings + 1, spots_left: x.spots_left - 1 } : x
        ));
        this.gymBookings.update(b => [r.data, ...b]);
      },
      error: () => this.bookingClassId.set(null),
    });
  }

  cancelGymBooking(id: string): void {
    this.api.delete(`/guest/gym/class-bookings/${id}`).subscribe({
      next: () => this.gymBookings.update(b => b.map(x => x.id === id ? { ...x, status: 'cancelled' } : x)),
      error: () => {},
    });
  }

  fmt(v: number | string): string {
    return (+v || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  spaStatusClass(status: string): string {
    if (this.th.isDark()) {
      return status === 'confirmed'  ? 'bg-emerald-500/20 text-emerald-300'
           : status === 'pending'    ? 'bg-amber-500/20 text-amber-300'
           : status === 'completed'  ? 'bg-blue-500/20 text-blue-300'
           : 'bg-white/10 text-white/40';
    }
    return status === 'confirmed' ? 'bg-emerald-100 text-emerald-700'
         : status === 'pending'   ? 'bg-amber-100 text-amber-700'
         : status === 'completed' ? 'bg-blue-100 text-blue-700'
         : 'bg-gray-100 text-gray-500';
  }
}
