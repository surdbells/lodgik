import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, ActivePropertyService,
} from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

// Booking type definitions
interface BookingTypeOption {
  value: string;
  label: string;
  icon: string;
  desc: string;
  hourly: boolean;
  hours?: number;        // fixed hours; undefined = use halfDayHours from settings
  halfDay?: boolean;     // uses configurable half-day hours
}

@Component({
  selector: 'app-new-booking',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="New Booking" subtitle="Create a reservation">
      <a routerLink="/bookings" class="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50">← Cancel</a>
    </ui-page-header>

    <!-- Step pills -->
    <div class="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
      @for (s of steps; track s.num; let i = $index) {
        <div class="flex items-center gap-0 flex-shrink-0">
          <div class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
               [class.bg-sage-600]="step() >= s.num"
               [class.text-white]="step() >= s.num"
               [class.bg-gray-100]="step() < s.num"
               [class.text-gray-400]="step() < s.num">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  [class.bg-white]="step() >= s.num"
                  [class.text-sage-600]="step() >= s.num"
                  [class.bg-gray-300]="step() < s.num"
                  [class.text-gray-500]="step() < s.num">{{ s.num }}</span>
            {{ s.label }}
          </div>
          @if (i < steps.length - 1) {
            <div class="w-6 h-px mx-1 flex-shrink-0"
                 [class.bg-sage-400]="step() > s.num"
                 [class.bg-gray-200]="step() <= s.num"></div>
          }
        </div>
      }
    </div>

    <!-- ══ STEP 1: Guest ══ -->
    @if (step() === 1) {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-bold text-gray-800 mb-5">Who is checking in?</h3>

        <!-- Guest already selected -->
        @if (booking.guest_id) {
          <div class="flex items-center justify-between bg-sage-50 border border-sage-200 rounded-xl px-4 py-3 mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-sage-100 border border-sage-300 flex items-center justify-center text-sage-700 font-bold text-sm">
                {{ selectedGuestName.charAt(0) }}
              </div>
              <div>
                <p class="font-semibold text-sage-800 text-sm">{{ selectedGuestName }}</p>
                <p class="text-xs text-sage-500 mt-0.5">Guest selected</p>
              </div>
            </div>
            <button (click)="clearGuest()" class="text-xs text-sage-600 border border-sage-300 px-3 py-1.5 rounded-lg hover:bg-white">Change</button>
          </div>
        }

        <!-- Search (hide when guest selected and no search happening) -->
        @if (!booking.guest_id || guestSearch.length > 0) {
          <div class="relative mb-4">
            <div class="relative">
              <svg class="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input [(ngModel)]="guestSearch" (ngModelChange)="searchGuests()"
                     placeholder="Search by name, phone or email…"
                     class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-sage-300 focus:border-sage-400 focus:outline-none"
                     [attr.autofocus]="!booking.guest_id ? '' : null">
            </div>

            @if (guestResults().length > 0 || guestSearch.length >= 2) {
              <div class="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                @for (g of guestResults(); track g.id) {
                  <button (click)="selectGuest(g)"
                    class="w-full text-left px-4 py-3.5 text-sm hover:bg-sage-50 border-b border-gray-50 flex justify-between items-center last:border-0 active:bg-sage-100">
                    <div>
                      <span class="font-semibold text-gray-800">{{ g.full_name }}</span>
                      <br>
                      <span class="text-gray-400 text-xs">{{ g.phone || g.email || '' }}</span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 ml-2">{{ g.vip_status || 'Guest' }}</span>
                  </button>
                }
                <!-- Add new guest — only shown in dropdown when no guest selected -->
                @if (!booking.guest_id) {
                  <button (click)="openNewGuestPanel()"
                    class="w-full text-left px-4 py-3 flex items-center gap-2 text-sage-700 font-semibold text-sm border-t border-gray-100 hover:bg-sage-50">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add New Guest
                  </button>
                }
              </div>
            }
          </div>
        }

        <!-- Add new guest button — only shown when no guest selected and no search active -->
        @if (!booking.guest_id && !showNewGuestPanel && guestSearch.length < 2) {
          <button (click)="openNewGuestPanel()"
            class="flex items-center gap-2 text-sm text-sage-600 border border-dashed border-sage-300 rounded-xl px-4 py-3 hover:bg-sage-50 w-full justify-center transition-colors mb-4">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add New Guest
          </button>
        }

        <!-- New guest inline panel -->
        @if (showNewGuestPanel) {
          <div class="border border-sage-200 bg-sage-50 rounded-xl p-4 mb-4 space-y-3">
            <div class="flex items-center justify-between mb-1">
              <h4 class="text-sm font-bold text-sage-800">New Guest</h4>
              <button (click)="showNewGuestPanel = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">First Name *</label>
                <input [(ngModel)]="newGuestForm.first_name" placeholder="First name"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Last Name *</label>
                <input [(ngModel)]="newGuestForm.last_name" placeholder="Last name"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:outline-none">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Phone *</label>
              <input [(ngModel)]="newGuestForm.phone" placeholder="08xxxxxxxxxx" type="tel"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Email (optional)</label>
              <input [(ngModel)]="newGuestForm.email" type="email" placeholder="email@example.com"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-300 focus:outline-none">
            </div>
            <div class="flex gap-2 pt-1">
              <button (click)="saveNewGuest()" [disabled]="savingNewGuest"
                class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-semibold rounded-lg hover:bg-sage-700 disabled:opacity-50">
                {{ savingNewGuest ? 'Saving…' : 'Save & Select' }}
              </button>
              <button (click)="showNewGuestPanel = false"
                class="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-white">Cancel</button>
            </div>
          </div>
        }

        <div class="flex justify-end mt-6">
          <button (click)="nextStep()" [disabled]="!booking.guest_id"
            class="px-8 py-3 bg-sage-600 text-white text-sm font-bold rounded-xl hover:bg-sage-700 disabled:opacity-40 active:scale-95 transition-all">
            Next → Select Room & Dates
          </button>
        </div>
      </div>
    }

    <!-- ══ STEP 2: Booking Type + Dates ══ -->
    @if (step() === 2) {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-bold text-gray-800 mb-5">Booking Type & Dates</h3>

        <!-- Booking type: large tap tiles -->
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Booking Type</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          @for (bt of bookingTypes; track bt.value) {
            <button (click)="selectBookingType(bt)"
              class="flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all active:scale-95"
              [class.border-sage-500]="booking.booking_type === bt.value"
              [class.bg-sage-50]="booking.booking_type === bt.value"
              [class.border-gray-200]="booking.booking_type !== bt.value"
              [class.hover:border-gray-300]="booking.booking_type !== bt.value">
              <span class="text-xl">{{ bt.icon }}</span>
              <span class="text-sm font-bold" [class.text-sage-700]="booking.booking_type === bt.value" [class.text-gray-700]="booking.booking_type !== bt.value">
                {{ bt.label }}
              </span>
              <span class="text-[11px] leading-tight" [class.text-sage-500]="booking.booking_type === bt.value" [class.text-gray-400]="booking.booking_type !== bt.value">
                {{ bt.desc }}
              </span>
            </button>
          }
        </div>

        <!-- Check-in datetime -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1.5">
              Check-in Date & Time *
            </label>
            <input type="datetime-local"
                   [(ngModel)]="booking.check_in"
                   [min]="todayMin()"
                   (ngModelChange)="onCheckInChange()"
                   class="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-300 focus:outline-none">
            <p class="text-[11px] text-gray-400 mt-1">Standard check-in: 2:00 PM</p>
          </div>

          <!-- Checkout -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1.5">
              Check-out
            </label>
            @if (selectedType()?.hourly) {
              <!-- Hourly: auto-calculated, read-only -->
              <div class="w-full px-3 py-3 border border-gray-100 rounded-xl text-sm bg-gray-100 text-gray-600 min-h-[46px] flex items-center gap-2">
                <span class="text-gray-400">🕐</span>
                {{ checkoutDisplay() || 'Set check-in first' }}
              </div>
              <p class="text-[11px] text-gray-400 mt-1">
                Auto-set: check-in + {{ selectedType()?.halfDay ? halfDayHours : selectedType()?.hours }} hour{{ (selectedType()?.halfDay ? halfDayHours : selectedType()?.hours) !== 1 ? 's' : '' }}
              </p>
            } @else {
              <!-- Lodge: date only, auto-sets to 12:00 noon -->
              <input type="date"
                     [(ngModel)]="booking.check_out_date"
                     [min]="checkoutMinDate()"
                     (ngModelChange)="onCheckoutDateChange()"
                     class="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-300 focus:outline-none">
              <p class="text-[11px] text-gray-400 mt-1">Checkout at {{ checkoutTime() }}</p>
            }
          </div>
        </div>

        <!-- Guests -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1.5">Adults</label>
            <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button (click)="booking.adults = Math.max(1, booking.adults - 1)"
                class="w-12 h-12 text-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 flex-shrink-0">−</button>
              <span class="flex-1 text-center font-bold text-gray-800">{{ booking.adults }}</span>
              <button (click)="booking.adults = booking.adults + 1"
                class="w-12 h-12 text-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 flex-shrink-0">+</button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1.5">Children</label>
            <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button (click)="booking.children = Math.max(0, booking.children - 1)"
                class="w-12 h-12 text-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 flex-shrink-0">−</button>
              <span class="flex-1 text-center font-bold text-gray-800">{{ booking.children }}</span>
              <button (click)="booking.children = booking.children + 1"
                class="w-12 h-12 text-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 flex-shrink-0">+</button>
            </div>
          </div>
        </div>

        <div class="flex justify-between mt-6">
          <button (click)="prevStep()" class="px-6 py-3 text-sm text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50">← Back</button>
          <button (click)="nextStep()" [disabled]="!booking.check_in || !booking.check_out"
            class="px-8 py-3 bg-sage-600 text-white text-sm font-bold rounded-xl hover:bg-sage-700 disabled:opacity-40 active:scale-95 transition-all">
            Select Room →
          </button>
        </div>
      </div>
    }

    <!-- ══ STEP 3: Room ══ -->
    @if (step() === 3) {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-bold text-gray-800 mb-5">Select Room</h3>

        @if (loadingRooms()) {
          <div class="py-12 text-center text-gray-400 text-sm">Loading available rooms…</div>
        } @else if (availableRooms().length === 0) {
          <div class="py-12 text-center">
            <div class="text-4xl mb-3">🏨</div>
            <p class="text-gray-500 font-medium">No available rooms for selected dates</p>
            <p class="text-gray-400 text-xs mt-1">Try different dates</p>
          </div>
        } @else {
          <!-- Group by room type -->
          @for (rt of roomTypesWithRooms(); track rt.id) {
            <div class="mb-5">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{ rt.name }}</p>
                <span class="text-xs text-gray-400">
                  {{ selectedType()?.hourly ? '₦' + (+rt.hourly_rate || +rt.base_rate / 24 | number:'1.0-0') + '/hr'
                                            : '₦' + (+rt.base_rate | number:'1.0-0') + '/night' }}
                </span>
              </div>
              <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                @for (r of rt.rooms; track r.id) {
                  <button (click)="selectRoom(r)"
                    class="aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 text-center p-2"
                    [class.border-sage-500]="booking.room_id === r.id"
                    [class.bg-sage-50]="booking.room_id === r.id"
                    [class.border-gray-200]="booking.room_id !== r.id"
                    [class.hover:border-sage-300]="booking.room_id !== r.id">
                    <span class="text-sm font-bold" [class.text-sage-700]="booking.room_id === r.id" [class.text-gray-700]="booking.room_id !== r.id">
                      {{ r.room_number }}
                    </span>
                    @if (r.floor) {
                      <span class="text-[9px] text-gray-400">Fl {{ r.floor }}</span>
                    }
                  </button>
                }
              </div>
            </div>
          }
        }

        <div class="flex justify-between mt-6">
          <button (click)="prevStep()" class="px-6 py-3 text-sm text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50">← Back</button>
          <button (click)="nextStep(); previewRate()" [disabled]="!booking.room_id"
            class="px-8 py-3 bg-sage-600 text-white text-sm font-bold rounded-xl hover:bg-sage-700 disabled:opacity-40 active:scale-95 transition-all">
            Next →
          </button>
        </div>
      </div>
    }

    <!-- ══ STEP 4: Add-ons ══ -->
    @if (step() === 4) {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-bold text-gray-800 mb-1">Add-ons</h3>
        <p class="text-xs text-gray-400 mb-5">Optional extras to add to this booking</p>
        <div class="space-y-3">
          @for (addon of addons; track $index; let i = $index) {
            <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <input [(ngModel)]="addon.name" placeholder="Item name"
                class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <div class="relative">
                <span class="absolute left-2 top-2 text-xs text-gray-400">₦</span>
                <input [(ngModel)]="addon.amount" type="number" placeholder="0"
                  class="w-28 pl-6 pr-2 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              </div>
              <div class="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden">
                <button (click)="addon.quantity = Math.max(1, addon.quantity - 1)"
                  class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100">−</button>
                <span class="w-8 text-center text-sm font-medium">{{ addon.quantity }}</span>
                <button (click)="addon.quantity = addon.quantity + 1"
                  class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100">+</button>
              </div>
              <button (click)="removeAddon(i)" class="text-red-400 hover:text-red-600 w-8 h-8 flex items-center justify-center">✕</button>
            </div>
          }
        </div>
        <button (click)="addAddon()" class="mt-3 px-4 py-2.5 text-sm text-sage-600 border border-sage-200 rounded-xl hover:bg-sage-50 flex items-center gap-2">
          <span class="font-bold">+</span> Add Item
        </button>
        <div class="flex justify-between mt-6">
          <button (click)="prevStep()" class="px-6 py-3 text-sm text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50">← Back</button>
          <button (click)="nextStep(); previewRate()"
            class="px-8 py-3 bg-sage-600 text-white text-sm font-bold rounded-xl hover:bg-sage-700 active:scale-95 transition-all">
            Review Pricing →
          </button>
        </div>
      </div>
    }

    <!-- ══ STEP 5: Pricing ══ -->
    @if (step() === 5) {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-bold text-gray-800 mb-5">Pricing Summary</h3>
        <div class="space-y-2 text-sm max-w-md">
          <div class="flex justify-between py-2 border-b border-gray-100">
            <span class="text-gray-500">Rate</span>
            <span class="font-medium">₦{{ (+ratePreview().rate || 0) | number:'1.0-0' }} {{ ratePreview().hours ? '/hr' : '/night' }}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-100">
            <span class="text-gray-500">Duration</span>
            <span class="font-medium">{{ ratePreview().hours ? ratePreview().hours + ' hour(s)' : ratePreview().nights + ' night(s)' }}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-100">
            <span class="text-gray-500">Subtotal</span>
            <span class="font-medium">₦{{ (+ratePreview().subtotal || 0) | number:'1.0-0' }}</span>
          </div>
          @for (addon of addons; track $index) {
            @if (addon.name && addon.amount) {
              <div class="flex justify-between py-2 border-b border-gray-100">
                <span class="text-gray-500">{{ addon.name }} ×{{ addon.quantity }}</span>
                <span class="font-medium">₦{{ (addon.amount * addon.quantity) | number:'1.0-0' }}</span>
              </div>
            }
          }
          <div class="pt-2">
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Discount (₦)</label>
            <input [(ngModel)]="booking.discount_amount" type="number" min="0" (ngModelChange)="previewRate()"
              class="w-48 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          </div>
          @if (+booking.discount_amount > 0) {
            <div class="flex justify-between py-2 border-b border-gray-100 text-orange-600">
              <span>Discount</span><span>-₦{{ (+booking.discount_amount) | number:'1.0-0' }}</span>
            </div>
          }
          <div class="flex justify-between py-3 mt-2 bg-emerald-50 rounded-xl px-3 border border-emerald-100">
            <span class="text-base font-bold text-gray-800">Total</span>
            <span class="text-xl font-bold text-emerald-600">₦{{ grandTotal() | number:'1.0-0' }}</span>
          </div>
        </div>
        <div class="flex justify-between mt-6">
          <button (click)="prevStep()" class="px-6 py-3 text-sm text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50">← Back</button>
          <button (click)="nextStep()"
            class="px-8 py-3 bg-sage-600 text-white text-sm font-bold rounded-xl hover:bg-sage-700 active:scale-95 transition-all">
            Confirm →
          </button>
        </div>
      </div>
    }

    <!-- ══ STEP 6: Confirm ══ -->
    @if (step() === 6) {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-bold text-gray-800 mb-5">Confirm Booking</h3>

        <!-- Summary card -->
        <div class="bg-gray-50 rounded-xl p-4 mb-5 space-y-2.5 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Guest</span>
            <span class="font-semibold">{{ selectedGuestName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Room</span>
            <span class="font-semibold">{{ selectedRoomNumber }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Type</span>
            <span class="font-semibold">{{ selectedType()?.label || booking.booking_type }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Check-in</span>
            <span class="font-semibold">{{ formatDisplay(booking.check_in) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Check-out</span>
            <span class="font-semibold">{{ checkoutDisplay() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Guests</span>
            <span class="font-semibold">{{ booking.adults }} adult(s), {{ booking.children }} child(ren)</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 mt-1">
            <span class="font-bold text-gray-800">Total</span>
            <span class="text-lg font-bold text-emerald-600">₦{{ grandTotal() | number:'1.0-0' }}</span>
          </div>
        </div>

        <div class="mb-5">
          <label class="block text-xs font-semibold text-gray-500 mb-1.5">Special Requests (optional)</label>
          <textarea [(ngModel)]="booking.special_requests" rows="2"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50"
            placeholder="Any special requests…"></textarea>
        </div>

        <!-- Action buttons: Confirm only vs Confirm + Check In Now -->
        <div class="space-y-3">
          <!-- Confirm & Check In Now (faster flow) -->
          <button (click)="submitBooking(true)" [disabled]="submitting()"
            class="w-full py-4 bg-emerald-600 text-white text-base font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2">
            @if (submitting() && checkInAfter) {
              <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            }
            ✓ Confirm Booking & Check In Now
          </button>

          <button (click)="submitBooking(false)" [disabled]="submitting()"
            class="w-full py-3 border-2 border-sage-400 text-sage-700 text-sm font-bold rounded-xl hover:bg-sage-50 disabled:opacity-50 active:scale-95 transition-all">
            @if (submitting() && !checkInAfter) {
              <svg class="animate-spin w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            }
            Confirm Reservation Only
          </button>
        </div>

        <button (click)="prevStep()" class="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600">← Back</button>
      </div>
    }
  `,
})
export class NewBookingPage implements OnInit {
  private api            = inject(ApiService);
  private auth           = inject(AuthService);
  private toast          = inject(ToastService);
  private router         = inject(Router);
  private activeProperty = inject(ActivePropertyService);

  readonly Math = Math;

  step          = signal(1);
  submitting    = signal(false);
  loadingRooms  = signal(false);
  availableRooms = signal<any[]>([]);
  roomTypes      = signal<any[]>([]);
  guestResults   = signal<any[]>([]);
  ratePreview    = signal<any>({});

  propertyId        = '';
  checkoutTimeStr   = '12:00';   // from property settings
  halfDayHours      = 6;         // from property settings

  guestSearch       = '';
  showNewGuestPanel = false;
  savingNewGuest    = false;
  newGuestForm      = { first_name: '', last_name: '', phone: '', email: '' };
  selectedGuestName  = '';
  selectedRoomNumber = '';
  checkInAfter      = false;

  private searchTimer: any;

  steps = [
    { num: 1, label: 'Guest' },
    { num: 2, label: 'Dates' },
    { num: 3, label: 'Room' },
    { num: 4, label: 'Add-ons' },
    { num: 5, label: 'Pricing' },
    { num: 6, label: 'Confirm' },
  ];

  bookingTypes: BookingTypeOption[] = [];

  booking: any = {
    guest_id: '', room_id: '', booking_type: 'lodge',
    check_in: '', check_out: '', check_out_date: '',
    adults: 1, children: 0, discount_amount: 0,
    special_requests: '', source: 'front_desk',
  };
  addons: any[] = [];

  grandTotal = computed(() => {
    const rate      = +(this.ratePreview()?.total || 0);
    const addonSum  = this.addons.reduce((s, a) => s + (+(a.amount || 0)) * (a.quantity || 1), 0);
    return rate + addonSum;
  });

  selectedType = computed(() =>
    this.bookingTypes.find(bt => bt.value === this.booking.booking_type) ?? null
  );

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (user?.property_id) this.propertyId = user.property_id;
    this.loadPropertySettings();
    this.loadRoomTypes();
  }

  // ── Property settings ────────────────────────────────────────────────────
  loadPropertySettings(): void {
    if (!this.propertyId) { this.buildBookingTypes(); return; }
    this.api.get(`/tenant/properties/${this.propertyId}`).subscribe(r => {
      if (r.success && r.data?.settings) {
        const s = r.data.settings;
        this.checkoutTimeStr = s.checkout_time ?? '12:00';
        this.halfDayHours    = +(s.half_day_hours ?? 6);
      }
      this.buildBookingTypes();
    });
  }

  buildBookingTypes(): void {
    this.bookingTypes = [
      {
        value: 'lodge', label: 'Lodge', icon: '🌙', hourly: false,
        desc: `Overnight stay · Checkout ${this.checkoutTimeStr} noon`,
      },
      {
        value: 'short_rest_1hr', label: 'Short Rest 1hr', icon: '⚡', hourly: true, hours: 1,
        desc: 'Check-in now · checkout in 1 hour',
      },
      {
        value: 'short_rest_2hr', label: 'Short Rest 2hrs', icon: '⚡', hourly: true, hours: 2,
        desc: 'Check-in now · checkout in 2 hours',
      },
      {
        value: 'short_rest_3hr', label: 'Short Rest 3hrs', icon: '⚡', hourly: true, hours: 3,
        desc: 'Check-in now · checkout in 3 hours',
      },
      {
        value: 'half_day', label: `Half Day (${this.halfDayHours}hrs)`, icon: '🌅', hourly: true, halfDay: true,
        desc: `Check-in now · checkout in ${this.halfDayHours} hours`,
      },
      {
        value: 'corporate', label: 'Corporate', icon: '🏢', hourly: false,
        desc: `Corporate account · Checkout ${this.checkoutTimeStr} noon`,
      },
    ];
    // Set default check-in to today 2pm if not already set
    if (!this.booking.check_in) this.setDefaultCheckIn();
  }

  // ── Date helpers ──────────────────────────────────────────────────────────
  todayMin(): string {
    // datetime-local min: today at 00:00
    const now = new Date();
    const y   = now.getFullYear();
    const m   = String(now.getMonth() + 1).padStart(2, '0');
    const d   = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00`;
  }

  checkoutMinDate(): string {
    if (!this.booking.check_in) return this.todayMin().slice(0, 10);
    const ci = new Date(this.booking.check_in);
    ci.setDate(ci.getDate() + 1);
    return ci.toISOString().slice(0, 10);
  }

  setDefaultCheckIn(): void {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = String(now.getMonth() + 1).padStart(2, '0');
    const d   = String(now.getDate()).padStart(2, '0');
    this.booking.check_in = `${y}-${m}-${d}T14:00`;
    this.onCheckInChange();
  }

  selectBookingType(bt: BookingTypeOption): void {
    this.booking.booking_type = bt.value;
    this.onCheckInChange();
  }

  onCheckInChange(): void {
    if (!this.booking.check_in) return;
    const bt = this.selectedType();
    if (!bt) return;

    if (bt.hourly) {
      // Auto-set checkout = check-in + hours
      const hours = bt.halfDay ? this.halfDayHours : (bt.hours ?? 1);
      const ci  = new Date(this.booking.check_in);
      const co  = new Date(ci.getTime() + hours * 3600 * 1000);
      this.booking.check_out = this.toDateTimeLocal(co);
    } else {
      // Lodge: checkout = next day at checkout_time (default 12:00)
      if (this.booking.check_out_date) {
        this.onCheckoutDateChange();
      } else {
        // Auto-set checkout to next day
        const ci  = new Date(this.booking.check_in);
        const co  = new Date(ci);
        co.setDate(co.getDate() + 1);
        const [h, min] = this.checkoutTimeStr.split(':').map(Number);
        co.setHours(h, min, 0, 0);
        this.booking.check_out_date = co.toISOString().slice(0, 10);
        this.booking.check_out      = this.toDateTimeLocal(co);
      }
    }
  }

  onCheckoutDateChange(): void {
    if (!this.booking.check_out_date) return;
    const [h, m] = this.checkoutTimeStr.split(':').map(Number);
    const co = new Date(`${this.booking.check_out_date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
    this.booking.check_out = this.toDateTimeLocal(co);
  }

  checkoutDisplay(): string {
    if (!this.booking.check_out) return '';
    return this.formatDisplay(this.booking.check_out);
  }

  checkoutTime(): string {
    const [h, m] = this.checkoutTimeStr.split(':').map(Number);
    const suffix  = h >= 12 ? 'PM' : 'AM';
    const h12     = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  formatDisplay(dt: string): string {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleString('en-NG', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  private toDateTimeLocal(d: Date): string {
    const y    = d.getFullYear();
    const mo   = String(d.getMonth() + 1).padStart(2, '0');
    const day  = String(d.getDate()).padStart(2, '0');
    const h    = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${day}T${h}:${min}`;
  }

  // ── Room type grouping ────────────────────────────────────────────────────
  roomTypesWithRooms = computed(() => {
    const rooms = this.availableRooms();
    const types = this.roomTypes();
    return types.map(rt => ({
      ...rt,
      rooms: rooms.filter((r: any) => r.room_type_id === rt.id),
    })).filter(rt => rt.rooms.length > 0);
  });

  // ── Guest search ──────────────────────────────────────────────────────────
  searchGuests(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (this.guestSearch.length < 2) { this.guestResults.set([]); return; }
      this.api.get('/guests/search', { q: this.guestSearch }).subscribe(r => {
        if (r.success) this.guestResults.set(r.data ?? []);
      });
    }, 280);
  }

  selectGuest(g: any): void {
    this.booking.guest_id  = g.id;
    this.selectedGuestName = g.full_name;
    this.guestSearch       = '';
    this.guestResults.set([]);
    this.showNewGuestPanel = false;
  }

  clearGuest(): void {
    this.booking.guest_id  = '';
    this.selectedGuestName = '';
    this.guestSearch       = '';
  }

  openNewGuestPanel(): void {
    this.newGuestForm = { first_name: '', last_name: '', phone: '', email: '' };
    this.showNewGuestPanel = true;
    this.guestResults.set([]);
  }

  saveNewGuest(): void {
    if (!this.newGuestForm.first_name.trim()) { this.toast.error('First name required'); return; }
    if (!this.newGuestForm.last_name.trim())  { this.toast.error('Last name required');  return; }
    if (!this.newGuestForm.phone.trim())       { this.toast.error('Phone required');       return; }
    this.savingNewGuest = true;
    const body: any = {
      first_name:  this.newGuestForm.first_name.trim(),
      last_name:   this.newGuestForm.last_name.trim(),
      phone:       this.newGuestForm.phone.trim(),
      property_id: this.activeProperty.propertyId(),
    };
    if (this.newGuestForm.email.trim()) body.email = this.newGuestForm.email.trim();
    this.api.post('/guests', body).subscribe({
      next: (r: any) => {
        this.savingNewGuest = false;
        if (r.success && r.data) {
          const g = r.data;
          this.selectGuest({ id: g.id, full_name: `${g.first_name} ${g.last_name}`.trim() });
          this.toast.success('Guest created and selected');
        } else {
          this.toast.error(r.message || 'Failed');
        }
      },
      error: () => { this.savingNewGuest = false; this.toast.error('Failed to create guest'); },
    });
  }

  // ── Room selection ────────────────────────────────────────────────────────
  selectRoom(r: any): void {
    this.booking.room_id = r.id;
    this.selectedRoomNumber = r.room_number;
  }

  loadRoomTypes(): void {
    if (!this.propertyId) return;
    this.api.get('/room-types', { property_id: this.propertyId, limit: 50 }).subscribe(r => {
      if (r.success) this.roomTypes.set(r.data ?? []);
    });
  }

  loadAvailableRooms(): void {
    if (!this.propertyId) return;
    this.loadingRooms.set(true);
    this.api.get('/rooms/available', { property_id: this.propertyId }).subscribe(r => {
      if (r.success) this.availableRooms.set(r.data ?? []);
      this.loadingRooms.set(false);
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  nextStep(): void {
    if (this.step() === 2) this.loadAvailableRooms();
    if (this.step() < 6) this.step.update(s => s + 1);
  }
  prevStep(): void { if (this.step() > 1) this.step.update(s => s - 1); }

  previewRate(): void {
    const room = this.availableRooms().find((r: any) => r.id === this.booking.room_id);
    if (!room || !this.booking.check_in || !this.booking.check_out) return;
    this.api.post('/bookings/preview-rate', {
      room_type_id:    room.room_type_id,
      booking_type:    this.booking.booking_type,
      check_in:        this.booking.check_in,
      check_out:       this.booking.check_out,
      discount_amount: String(this.booking.discount_amount || 0),
    }).subscribe(r => { if (r.success) this.ratePreview.set(r.data); });
  }

  addAddon():              void { this.addons.push({ name: '', amount: null, quantity: 1 }); }
  removeAddon(i: number):  void { this.addons.splice(i, 1); }

  // ── Submit ────────────────────────────────────────────────────────────────
  submitBooking(checkInNow: boolean): void {
    this.checkInAfter = checkInNow;
    this.submitting.set(true);
    const body = {
      ...this.booking,
      property_id:     this.propertyId,
      discount_amount: String(this.booking.discount_amount || 0),
      addons: this.addons
        .filter(a => a.name && a.amount)
        .map(a => ({ name: a.name, amount: String(a.amount), quantity: a.quantity || 1 })),
    };
    this.api.post('/bookings', body).subscribe({
      next: r => {
        if (!r.success) {
          this.submitting.set(false);
          this.toast.error(r.message || 'Failed to create booking');
          return;
        }
        const bookingId = r.data?.id;
        this.toast.success(`Booking created: ${r.data?.booking_ref}`);

        if (checkInNow && bookingId) {
          // Immediately check the guest in
          this.api.post(`/bookings/${bookingId}/check-in`, {}).subscribe(ci => {
            this.submitting.set(false);
            if (ci.success) {
              this.toast.success('Guest checked in successfully');
            } else {
              this.toast.error(ci.message || 'Booking created but check-in failed');
            }
            this.router.navigate(['/bookings', bookingId]);
          });
        } else {
          this.submitting.set(false);
          this.router.navigate(['/bookings', bookingId]);
        }
      },
      error: () => { this.submitting.set(false); this.toast.error('Error creating booking'); },
    });
  }
}
