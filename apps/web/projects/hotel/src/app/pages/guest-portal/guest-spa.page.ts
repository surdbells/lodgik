import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  LucideAngularModule,
  ArrowLeft, Sparkles, Dumbbell, CalendarCheck, Clock, Plus, X, CheckCircle2,
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
          <p class="text-xs" [class]="th.muted()">Book treatments and gym classes</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex rounded-xl p-0.5 mb-5"
        [class]="th.isDark() ? 'bg-white/5' : 'bg-gray-100'">
        <button (click)="tab.set('spa')"
          class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all"
          [class]="tab() === 'spa'
            ? 'bg-amber-400 text-slate-900 shadow-sm'
            : th.muted()">
          <lucide-icon [img]="SparklesIcon" class="w-4 h-4"></lucide-icon>
          Spa
        </button>
        <button (click)="tab.set('gym')"
          class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all"
          [class]="tab() === 'gym'
            ? 'bg-amber-400 text-slate-900 shadow-sm'
            : th.muted()">
          <lucide-icon [img]="DumbbellIcon" class="w-4 h-4"></lucide-icon>
          Gym
        </button>
      </div>

      <!-- ══════════ SPA TAB ══════════ -->
      @if (tab() === 'spa') {

        <!-- My Bookings toggle -->
        @if (spaBookings().length > 0 && !showSpaForm()) {
          <button (click)="showSpaBookings.set(!showSpaBookings())"
            class="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-4"
            [class]="th.accentBg()">
            <span class="text-sm font-semibold" [class]="th.accentText()">
              My Spa Bookings ({{ spaBookings().length }})
            </span>
            <lucide-icon [img]="CalendarCheckIcon" class="w-4 h-4" [class]="th.accentText()"></lucide-icon>
          </button>
        }

        @if (showSpaBookings()) {
          @for (b of spaBookings(); track b.id) {
            <div class="rounded-2xl p-4 mb-3" [class]="th.card()">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-sm font-semibold" [class]="th.text()">{{ b.service_name }}</p>
                  <p class="text-xs mt-0.5" [class]="th.muted()">{{ b.booking_date | date:'dd MMM' }} at {{ b.start_time }}</p>
                  @if (b.therapist_name) {
                    <p class="text-xs" [class]="th.subtle()">with {{ b.therapist_name }}</p>
                  }
                </div>
                <div class="text-right">
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    [class]="statusClass(b.status, 'spa')">{{ b.status | titlecase }}</span>
                  @if (b.status === 'pending' || b.status === 'confirmed') {
                    <button (click)="cancelSpa(b.id)"
                      class="block text-[11px] mt-1.5 transition-colors" [class]="th.muted()">
                      Cancel
                    </button>
                  }
                </div>
              </div>
            </div>
          }
          <hr class="my-4" [class]="th.divider()">
        }

        <!-- Services list / booking form -->
        @if (spaLoading()) {
          <div class="flex justify-center py-12">
            <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
          </div>
        }

        @if (!spaLoading() && !showSpaForm()) {
          @if (spaServices().length === 0) {
            <div class="text-center py-12">
              <p class="text-sm" [class]="th.muted()">No spa services available at the moment.</p>
            </div>
          }
          @for (s of spaServices(); track s.id) {
            <div class="rounded-2xl p-4 mb-3" [class]="th.card()">
              <div class="flex items-start justify-between">
                <div class="flex-1 pr-3">
                  <p class="text-sm font-semibold" [class]="th.text()">{{ s.name }}</p>
                  @if (s.description) {
                    <p class="text-xs mt-0.5 leading-relaxed" [class]="th.muted()">{{ s.description }}</p>
                  }
                  <div class="flex items-center gap-3 mt-2">
                    <span class="flex items-center gap-1 text-xs" [class]="th.subtle()">
                      <lucide-icon [img]="ClockIcon" class="w-3.5 h-3.5"></lucide-icon>
                      {{ s.duration_minutes }}min
                    </span>
                    <span class="text-sm font-bold text-amber-400">₦{{ fmt(s.price) }}</span>
                  </div>
                </div>
                <button (click)="openSpaForm(s)"
                  class="flex items-center gap-1 bg-amber-400 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-all">
                  <lucide-icon [img]="PlusIcon" class="w-3.5 h-3.5"></lucide-icon>
                  Book
                </button>
              </div>
            </div>
          }
        }

        @if (showSpaForm() && selectedService()) {
          <div class="rounded-2xl p-5 mb-4" [class]="th.card()">
            <div class="flex items-center justify-between mb-4">
              <div>
                <p class="text-sm font-bold" [class]="th.text()">{{ selectedService()!.name }}</p>
                <p class="text-xs" [class]="th.muted()">{{ selectedService()!.duration_minutes }}min · ₦{{ fmt(selectedService()!.price) }}</p>
              </div>
              <button (click)="showSpaForm.set(false)" [class]="th.muted()">
                <lucide-icon [img]="XIcon" class="w-5 h-5"></lucide-icon>
              </button>
            </div>
            <div class="space-y-3">
              <div>
                <label class="block mb-1" [class]="th.inputLabel()">Date *</label>
                <input type="date" (input)="spaForm.date = $any($event.target).value"
                  class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
              </div>
              <div>
                <label class="block mb-1" [class]="th.inputLabel()">Preferred Time *</label>
                <input type="time" (input)="spaForm.start_time = $any($event.target).value"
                  class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
              </div>
              <div>
                <label class="block mb-1" [class]="th.inputLabel()">Therapist Preference (optional)</label>
                <input type="text" (input)="spaForm.therapist_name = $any($event.target).value"
                  placeholder="Leave blank for any available"
                  class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
              </div>
            </div>
            @if (spaFormError()) {
              <div class="mt-3 rounded-xl px-3 py-2.5 text-xs" [class]="th.danger()">{{ spaFormError() }}</div>
            }
            <button (click)="bookSpa()" [disabled]="spaBooking()"
              class="w-full mt-4 bg-amber-400 text-slate-900 font-bold rounded-xl py-3 text-sm
                     active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              @if (spaBooking()) {
                <span class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                Booking…
              } @else {
                <lucide-icon [img]="CalendarCheckIcon" class="w-4 h-4"></lucide-icon>
                Confirm Booking
              }
            </button>
          </div>
        }

        @if (spaBooked()) {
          <div class="text-center py-10">
            <div class="w-14 h-14 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <lucide-icon [img]="CheckCircle2Icon" class="w-7 h-7 text-emerald-400"></lucide-icon>
            </div>
            <p class="text-sm font-bold" [class]="th.text()">Spa appointment booked!</p>
            <p class="text-xs mt-1 mb-4" [class]="th.muted()">See you at the spa. We'll remind you beforehand.</p>
            <button (click)="spaBooked.set(false); showSpaBookings.set(true)"
              class="text-xs font-medium transition-colors" [class]="th.accent()">
              View my bookings →
            </button>
          </div>
        }
      }

      <!-- ══════════ GYM TAB ══════════ -->
      @if (tab() === 'gym') {

        <!-- Gym Plans -->
        @if (gymPlans().length > 0) {
          <div class="mb-5">
            <h3 class="text-xs font-bold uppercase tracking-wide mb-3" [class]="th.muted()">Membership Plans</h3>
            <div class="grid grid-cols-1 gap-3">
              @for (p of gymPlans(); track p.id) {
                <div class="rounded-2xl p-4" [class]="th.card()">
                  <div class="flex justify-between items-start">
                    <div>
                      <p class="text-sm font-bold" [class]="th.text()">{{ p.name }}</p>
                      <p class="text-xs mt-0.5" [class]="th.muted()">{{ p.plan_type | titlecase }}</p>
                    </div>
                    <p class="text-base font-black text-amber-400">₦{{ fmt(p.price) }}</p>
                  </div>
                  @if (p.description) {
                    <p class="text-xs mt-2" [class]="th.subtle()">{{ p.description }}</p>
                  }
                  <div class="flex gap-2 mt-3">
                    @if (p.includes_classes) {
                      <span class="text-[11px] px-2 py-0.5 rounded-full" [class]="th.badge()">Includes Classes</span>
                    }
                    @if (p.includes_pool) {
                      <span class="text-[11px] px-2 py-0.5 rounded-full" [class]="th.badge()">Pool Access</span>
                    }
                    @if (p.includes_spa) {
                      <span class="text-[11px] px-2 py-0.5 rounded-full" [class]="th.badge()">Spa Access</span>
                    }
                  </div>
                </div>
              }
            </div>
            <p class="text-xs mt-3 text-center" [class]="th.subtle()">
              Visit the gym reception to sign up for a membership.
            </p>
          </div>
        }

        <!-- My Class Bookings -->
        @if (gymClassBookings().length > 0) {
          <div class="mb-5">
            <h3 class="text-xs font-bold uppercase tracking-wide mb-3" [class]="th.muted()">My Class Bookings</h3>
            @for (b of gymClassBookings(); track b.id) {
              <div class="rounded-xl px-4 py-3 mb-2 flex items-center justify-between" [class]="th.card()">
                <div>
                  <p class="text-sm font-semibold" [class]="th.text()">{{ b.class_name ?? 'Gym Class' }}</p>
                  <p class="text-xs" [class]="th.muted()">{{ b.scheduled_at | date:'dd MMM, h:mm a' }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] px-2 py-0.5 rounded-full" [class]="statusClass(b.status, 'gym')">
                    {{ b.status | titlecase }}
                  </span>
                  @if (b.status === 'booked') {
                    <button (click)="cancelGymClass(b.id)"
                      class="text-[11px] transition-colors" [class]="th.muted()">Cancel</button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Upcoming Classes -->
        @if (gymLoading()) {
          <div class="flex justify-center py-12">
            <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
          </div>
        }

        @if (!gymLoading()) {
          <h3 class="text-xs font-bold uppercase tracking-wide mb-3" [class]="th.muted()">Upcoming Classes</h3>
          @if (gymClasses().length === 0) {
            <div class="text-center py-10">
              <p class="text-sm" [class]="th.muted()">No upcoming classes scheduled.</p>
            </div>
          }
          @for (c of gymClasses(); track c.id) {
            <div class="rounded-2xl p-4 mb-3" [class]="th.card()">
              <div class="flex items-start justify-between">
                <div class="flex-1 pr-3">
                  <p class="text-sm font-semibold" [class]="th.text()">{{ c.name }}</p>
                  <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs" [class]="th.muted()">
                    <span class="flex items-center gap-1">
                      <lucide-icon [img]="ClockIcon" class="w-3 h-3"></lucide-icon>
                      {{ c.scheduled_at | date:'dd MMM, h:mm a' }}
                    </span>
                    @if (c.instructor_name) {
                      <span>{{ c.instructor_name }}</span>
                    }
                    @if (c.location) {
                      <span>{{ c.location }}</span>
                    }
                  </div>
                  <div class="flex items-center gap-2 mt-1.5">
                    <span class="text-[11px]" [class]="c.is_full ? 'text-red-400' : 'text-emerald-400'">
                      {{ c.is_full ? 'Full' : c.spots_left + ' spots left' }}
                    </span>
                    <span class="text-[11px]" [class]="th.subtle()">{{ c.duration_minutes }}min</span>
                  </div>
                </div>
                @if (!c.is_full && !isBooked(c.id)) {
                  <button (click)="bookGymClass(c)"
                    [disabled]="bookingClassId() === c.id"
                    class="flex items-center gap-1 bg-amber-400 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl shrink-0 active:scale-95 transition-all disabled:opacity-60">
                    @if (bookingClassId() === c.id) {
                      <span class="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                    } @else {
                      <lucide-icon [img]="PlusIcon" class="w-3.5 h-3.5"></lucide-icon>
                    }
                    Book
                  </button>
                } @else if (isBooked(c.id)) {
                  <span class="text-xs text-emerald-400 font-semibold">Booked ✓</span>
                } @else {
                  <span class="text-xs font-medium" [class]="th.subtle()">Full</span>
                }
              </div>
            </div>
          }
        }
      }

    </div>
  `,
})
export default class GuestSpaPage implements OnInit {
  private api = inject(GuestApiService);
  readonly th = inject(GuestThemeService);

  readonly ArrowLeftIcon    = ArrowLeft;
  readonly SparklesIcon     = Sparkles;
  readonly DumbbellIcon     = Dumbbell;
  readonly CalendarCheckIcon = CalendarCheck;
  readonly ClockIcon        = Clock;
  readonly PlusIcon         = Plus;
  readonly XIcon            = X;
  readonly CheckCircle2Icon = CheckCircle2;

  tab = signal<Tab>('spa');

  // Spa
  spaServices      = signal<any[]>([]);
  spaBookings      = signal<any[]>([]);
  spaLoading       = signal(true);
  showSpaForm      = signal(false);
  showSpaBookings  = signal(false);
  selectedService  = signal<any | null>(null);
  spaBooking       = signal(false);
  spaBooked        = signal(false);
  spaFormError     = signal('');
  spaForm          = { date: '', start_time: '', therapist_name: '' };

  // Gym
  gymClasses       = signal<any[]>([]);
  gymPlans         = signal<any[]>([]);
  gymClassBookings = signal<any[]>([]);
  gymLoading       = signal(true);
  bookingClassId   = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSpa();
    this.loadGym();
  }

  private loadSpa(): void {
    this.api.get<any>('/guest/spa/services').subscribe({
      next: (r: any) => { this.spaServices.set(r.data ?? []); this.spaLoading.set(false); },
      error: () => this.spaLoading.set(false),
    });
    this.api.get<any>('/guest/spa/bookings').subscribe({
      next: (r: any) => this.spaBookings.set(r.data ?? []),
      error: () => {},
    });
  }

  private loadGym(): void {
    this.api.get<any>('/guest/gym/plans').subscribe({
      next: (r: any) => this.gymPlans.set(r.data ?? []),
      error: () => {},
    });
    this.api.get<any>('/guest/gym/classes').subscribe({
      next: (r: any) => { this.gymClasses.set(r.data ?? []); this.gymLoading.set(false); },
      error: () => this.gymLoading.set(false),
    });
    this.api.get<any>('/guest/gym/class-bookings').subscribe({
      next: (r: any) => this.gymClassBookings.set(r.data ?? []),
      error: () => {},
    });
  }

  openSpaForm(s: any): void {
    this.selectedService.set(s);
    this.spaForm = { date: '', start_time: '', therapist_name: '' };
    this.spaFormError.set('');
    this.showSpaForm.set(true);
  }

  bookSpa(): void {
    if (!this.spaForm.date) { this.spaFormError.set('Please select a date'); return; }
    if (!this.spaForm.start_time) { this.spaFormError.set('Please select a time'); return; }
    this.spaBooking.set(true);
    this.spaFormError.set('');
    const s = this.selectedService()!;
    this.api.post('/guest/spa/book', {
      service_id:    s.id,
      service_name:  s.name,
      date:          this.spaForm.date,
      start_time:    this.spaForm.start_time,
      price:         s.price,
      therapist_name: this.spaForm.therapist_name || null,
    }).subscribe({
      next: (r: any) => {
        this.spaBookings.update(b => [r.data, ...b]);
        this.spaBooking.set(false);
        this.showSpaForm.set(false);
        this.spaBooked.set(true);
      },
      error: (e: any) => {
        this.spaBooking.set(false);
        this.spaFormError.set(e?.error?.error?.message ?? 'Booking failed');
      },
    });
  }

  cancelSpa(id: string): void {
    this.api.delete(`/guest/spa/bookings/${id}`).subscribe({
      next: () => this.spaBookings.update(b => b.map(x => x.id === id ? { ...x, status: 'cancelled' } : x)),
      error: () => {},
    });
  }

  bookGymClass(c: any): void {
    this.bookingClassId.set(c.id);
    this.api.post(`/guest/gym/classes/${c.id}/book`, {}).subscribe({
      next: (r: any) => {
        this.gymClassBookings.update(b => [{ ...r.data, class_name: c.name, scheduled_at: c.scheduled_at }, ...b]);
        this.gymClasses.update(classes => classes.map(x =>
          x.id === c.id ? { ...x, current_bookings: x.current_bookings + 1, spots_left: x.spots_left - 1, is_full: x.spots_left <= 1 } : x
        ));
        this.bookingClassId.set(null);
      },
      error: () => this.bookingClassId.set(null),
    });
  }

  cancelGymClass(id: string): void {
    this.api.delete(`/guest/gym/class-bookings/${id}`).subscribe({
      next: () => this.gymClassBookings.update(b => b.map(x => x.id === id ? { ...x, status: 'cancelled' } : x)),
      error: () => {},
    });
  }

  isBooked(classId: string): boolean {
    return this.gymClassBookings().some(b => b.class_id === classId && b.status === 'booked');
  }

  fmt(v: any): string { return (+v || 0).toLocaleString('en-NG'); }

  statusClass(status: string, type: 'spa' | 'gym'): string {
    if (this.th.isDark()) {
      if (status === 'confirmed' || status === 'booked') return 'bg-emerald-500/20 text-emerald-300';
      if (status === 'pending')    return 'bg-amber-500/20 text-amber-300';
      if (status === 'cancelled')  return 'bg-white/10 text-white/40';
      return 'bg-white/10 text-white/50';
    }
    if (status === 'confirmed' || status === 'booked') return 'bg-emerald-100 text-emerald-700';
    if (status === 'pending')    return 'bg-amber-100 text-amber-700';
    if (status === 'cancelled')  return 'bg-gray-100 text-gray-500';
    return 'bg-gray-100 text-gray-600';
  }
}
