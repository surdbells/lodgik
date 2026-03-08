import { Component, inject, OnInit, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  ApiService,
  AuthService,
  TokenService,
  PageHeaderComponent,
  LoadingSpinnerComponent,
  ToastService,
  ConfirmDialogService,
} from '@lodgik/shared';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header [title]="booking()?.booking_ref || 'Booking'" subtitle="Booking details and timeline">
      <a routerLink="/bookings" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Back</a>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && booking()) {
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- ── Main Info ─────────────────────────────────────── -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Status Banner -->
          <div class="rounded-xl p-4 flex items-center justify-between"
               [style.background-color]="booking()!.status_color + '15'"
               [style.border-left]="'4px solid ' + booking()!.status_color">
            <div>
              <span class="text-xs font-medium text-gray-500">Status</span>
              <p class="text-lg font-bold" [style.color]="booking()!.status_color">{{ booking()!.status_label }}</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-medium text-gray-500">Total</span>
              <p class="text-2xl font-bold text-gray-900">₦{{ (+booking()!.total_amount).toLocaleString() }}</p>
            </div>
          </div>

          <!-- Details Grid -->
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Booking Details</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><span class="text-gray-400">Reference</span><p class="font-medium mt-0.5">{{ booking()!.booking_ref }}</p></div>
              <div><span class="text-gray-400">Type</span><p class="font-medium mt-0.5">{{ booking()!.booking_type_label }}</p></div>
              <div><span class="text-gray-400">Source</span><p class="font-medium mt-0.5">{{ booking()!.source || 'Direct' }}</p></div>
              <div><span class="text-gray-400">Check-in</span><p class="font-medium mt-0.5">{{ booking()!.check_in | date:'medium' }}</p></div>
              <div><span class="text-gray-400">Check-out</span><p class="font-medium mt-0.5">{{ booking()!.check_out | date:'medium' }}</p></div>
              <div><span class="text-gray-400">Duration</span><p class="font-medium mt-0.5">{{ booking()!.duration_hours ? booking()!.duration_hours + ' hrs' : booking()!.nights + ' night(s)' }}</p></div>
              <div><span class="text-gray-400">Guests</span><p class="font-medium mt-0.5">{{ booking()!.adults }} adult(s), {{ booking()!.children }} child(ren)</p></div>
              <div><span class="text-gray-400">Rate</span><p class="font-medium mt-0.5">₦{{ (+booking()!.rate_per_night).toLocaleString() }} {{ booking()!.duration_hours ? '/hr' : '/night' }}</p></div>
              @if (+booking()!.discount_amount > 0) {
                <div><span class="text-gray-400">Discount</span><p class="font-medium text-red-500 mt-0.5">-₦{{ (+booking()!.discount_amount).toLocaleString() }}</p></div>
              }
            </div>
            @if (booking()!.special_requests) {
              <div class="mt-4 pt-4 border-t border-gray-100 text-sm">
                <span class="text-gray-400">Special Requests</span>
                <p class="mt-1 text-gray-700">{{ booking()!.special_requests }}</p>
              </div>
            }
          </div>

          <!-- Addons -->
          @if (booking()!.addons?.length > 0) {
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Add-ons</h3>
              <div class="space-y-2">
                @for (a of booking()!.addons; track a.id) {
                  <div class="flex justify-between text-sm py-2 border-b border-gray-50">
                    <span>{{ a.name }} <span class="text-gray-400">×{{ a.quantity }}</span></span>
                    <span class="font-medium">₦{{ (+a.line_total).toLocaleString() }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Actions -->
          <div class="flex flex-wrap gap-3">
            @if (booking()!.status === 'confirmed') {
              <button (click)="doCheckIn()"
                class="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                ✓ Check In Guest
              </button>
              <button (click)="doCancel()"
                class="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors">
                Cancel Booking
              </button>
              <button (click)="doNoShow()"
                class="px-5 py-2.5 bg-gray-50 text-gray-600 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
                Mark No-Show
              </button>
            }
            @if (booking()!.status === 'checked_in') {
              <button (click)="doCheckOut()"
                class="px-5 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 transition-colors">
                Check Out Guest
              </button>
              <!-- Show guest access / QR button for checked-in bookings -->
              <button (click)="openGuestAccess()"
                class="px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm font-medium rounded-lg
                       hover:bg-indigo-100 transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke-width="2"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke-width="2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke-width="2"/>
                  <path stroke-linecap="round" stroke-width="2" d="M14 14h3m0 0v3m0-3h4m-4 4v3"/>
                </svg>
                Guest PWA Access
              </button>
              <!-- Guest Card actions -->
              @if (!activeCard()) {
                <button (click)="issueGuestCard()" [disabled]="issuingCard()"
                  class="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2 disabled:opacity-50">
                  💳 {{ issuingCard() ? 'Issuing...' : 'Issue Guest Card' }}
                </button>
              } @else {
                <button (click)="openCardInfo()"
                  class="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                  💳 {{ activeCard()!.card_number }}
                </button>
              }
            }
            @if (booking()!.status === 'pending') {
              <button (click)="doCancel()"
                class="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors">
                Cancel Booking
              </button>
            }
          </div>

          <!-- Folio & Invoice Links -->
          @if (booking()!.status === 'checked_in' || booking()!.status === 'checked_out') {
            <div class="flex gap-3">
              @if (folioId()) {
                <a [routerLink]="['/folios', folioId()]"
                  class="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors">
                  📂 View Folio
                </a>
              }
              @if (invoiceId()) {
                <a [routerLink]="['/invoices', invoiceId()]"
                  class="flex items-center gap-2 px-4 py-2 bg-sage-50 border border-sage-200 text-sage-700 text-sm font-medium rounded-lg hover:bg-sage-100 transition-colors">
                  📄 View Invoice
                </a>
              }
            </div>
          }
        </div>

        <!-- ── Timeline Sidebar ───────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 self-start">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Timeline</h3>
          <div class="space-y-0">
            @for (log of statusHistory(); track log.id) {
              <div class="flex gap-3 pb-4 relative">
                @if (!$last) {
                  <div class="absolute left-[7px] top-5 bottom-0 w-px bg-gray-200"></div>
                }
                <div class="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 z-10 bg-white"
                     [style.border-color]="statusColor(log.new_status)"></div>
                <div class="min-w-0">
                  <span class="text-sm font-medium">{{ statusLabel(log.new_status) }}</span>
                  <p class="text-xs text-gray-400 mt-0.5">{{ log.created_at | date:'medium' }}</p>
                  @if (log.notes) {
                    <p class="text-xs text-gray-500 mt-1">{{ log.notes }}</p>
                  }
                </div>
              </div>
            }
            @if (statusHistory().length === 0) {
              <p class="text-gray-400 text-sm">No status changes recorded.</p>
            }
          </div>

          <div class="mt-6 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-400">
            <div class="flex justify-between"><span>Created</span><span>{{ booking()!.created_at | date:'short' }}</span></div>
            @if (booking()!.checked_in_at) {
              <div class="flex justify-between"><span>Checked In</span><span>{{ booking()!.checked_in_at | date:'short' }}</span></div>
            }
            @if (booking()!.checked_out_at) {
              <div class="flex justify-between"><span>Checked Out</span><span>{{ booking()!.checked_out_at | date:'short' }}</span></div>
            }
          </div>
        </div>

        <!-- ── Invoice Rate Override (property_admin only) ──────── -->
        @if (tokenSvc.role() === 'property_admin') {
          <div class="bg-white rounded-xl border border-amber-200 shadow-card p-5 self-start">
            <div class="flex items-center gap-2 mb-1">
              <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
              </svg>
              <h3 class="text-sm font-semibold text-gray-700">Invoice Rate Override</h3>
            </div>
            <p class="text-xs text-gray-400 mb-4 leading-relaxed">
              Override the rate shown on the guest's invoice. The actual booking rate is
              unchanged and will always appear in revenue reports.
            </p>

            <!-- Active override badge -->
            @if (booking()!.has_shadow_rate) {
              <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                <div class="flex items-center gap-1.5 font-semibold text-amber-800">
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  Override Active
                </div>
                <div class="text-amber-700">
                  Invoice rate: <strong>₦{{ (+booking()!.shadow_rate_per_night).toLocaleString() }}/night</strong>
                </div>
                <div class="text-amber-700">
                  Invoice total: <strong>₦{{ (+booking()!.shadow_total_amount).toLocaleString() }}</strong>
                </div>
                @if (booking()!.shadow_rate_set_at) {
                  <div class="text-amber-500 pt-0.5">
                    Set {{ booking()!.shadow_rate_set_at | date:'short' }}
                  </div>
                }
              </div>
            }

            <!-- Set / edit override form -->
            @if (!showShadowForm() && !booking()!.has_shadow_rate) {
              <button (click)="showShadowForm.set(true)"
                class="w-full py-2 px-3 border border-amber-300 text-amber-700 rounded-lg text-sm
                       font-medium hover:bg-amber-50 transition-colors">
                Set Invoice Override
              </button>
            }

            @if (!showShadowForm() && booking()!.has_shadow_rate) {
              <div class="flex gap-2">
                <button (click)="showShadowForm.set(true)"
                  class="flex-1 py-2 px-3 border border-amber-300 text-amber-700 rounded-lg text-sm
                         font-medium hover:bg-amber-50 transition-colors">
                  Edit Override
                </button>
                <button (click)="clearShadowRate()" [disabled]="savingShadow()"
                  class="flex-1 py-2 px-3 border border-red-200 text-red-600 rounded-lg text-sm
                         font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
                  Remove
                </button>
              </div>
            }

            @if (showShadowForm()) {
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">
                    Invoice Rate per Night (₦)
                  </label>
                  <input type="number" min="0" step="0.01"
                    [value]="shadowRate()"
                    (input)="shadowRate.set(+($any($event.target).value))"
                    placeholder="{{ (+booking()!.rate_per_night).toLocaleString() }}"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"/>
                  <p class="text-xs text-gray-400 mt-1">
                    Actual: ₦{{ (+booking()!.rate_per_night).toLocaleString() }}/night
                  </p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">
                    Invoice Total Amount (₦)
                  </label>
                  <input type="number" min="0" step="0.01"
                    [value]="shadowTotal()"
                    (input)="shadowTotal.set(+($any($event.target).value))"
                    placeholder="{{ (+booking()!.total_amount).toLocaleString() }}"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"/>
                  <p class="text-xs text-gray-400 mt-1">
                    Actual: ₦{{ (+booking()!.total_amount).toLocaleString() }}
                  </p>
                </div>
                @if (shadowFormError()) {
                  <p class="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{{ shadowFormError() }}</p>
                }
                <div class="flex gap-2 pt-1">
                  <button (click)="saveShadowRate()" [disabled]="savingShadow()"
                    class="flex-1 py-2 px-3 bg-amber-500 text-white rounded-lg text-sm font-medium
                           hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                    @if (savingShadow()) {
                      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    }
                    Save Override
                  </button>
                  <button (click)="cancelShadowForm()" [disabled]="savingShadow()"
                    class="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600
                           hover:bg-gray-50 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            }
          </div>
        }

      </div>
    }

    <!-- ══════════════════════════════════════════════════════════
         GUEST ACCESS MODAL
         Shown after check-in — staff sees code + QR to hand to guest.
         ══════════════════════════════════════════════════════════ -->
    @if (showAccessModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           (click)="closeAccessModal()">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
             (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 pt-6 pb-5 text-white">
            <div class="flex items-center justify-between mb-1">
              <h2 class="text-lg font-bold">Guest PWA Access</h2>
              <button (click)="closeAccessModal()"
                class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <p class="text-indigo-200 text-xs">{{ booking()!.booking_ref }} · Room {{ booking()!.room_number || '—' }}</p>
          </div>

          <div class="p-6">

            @if (loadingAccess()) {
              <div class="flex flex-col items-center py-8 gap-3">
                <div class="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-sm text-gray-400">Loading access code…</p>
              </div>
            } @else if (accessError()) {
              <div class="text-center py-6">
                <p class="text-3xl mb-3">⚠️</p>
                <p class="text-sm font-medium text-gray-700 mb-1">{{ accessError() }}</p>
                <p class="text-xs text-gray-400 mb-4">Make sure the guest is fully checked in before requesting the QR code.</p>
                <button (click)="loadGuestAccess()"
                  class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                  Retry
                </button>
              </div>
            } @else if (accessData()) {

              <!-- QR Code canvas -->
              <div class="flex flex-col items-center mb-5">
                <div class="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-inner inline-block">
                  <canvas #qrCanvas width="200" height="200"></canvas>
                </div>
                <p class="text-xs text-gray-400 mt-2">Scan to open guest portal</p>
              </div>

              <!-- Access Code display -->
              <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center mb-4">
                <p class="text-xs text-indigo-500 font-medium mb-1 uppercase tracking-wide">Access Code</p>
                <p class="text-4xl font-black tracking-[0.35em] text-indigo-700 font-mono">
                  {{ accessData()!.access_code }}
                </p>
                <p class="text-[11px] text-indigo-400 mt-1">
                  Expires {{ accessData()!.expires_at | date:'MMM d, y h:mm a' }}
                </p>
              </div>

              <!-- PWA URL copy row -->
              <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-5">
                <p class="text-[11px] text-gray-500 flex-1 truncate font-mono">{{ accessData()!.pwa_url }}</p>
                <button (click)="copyUrl()"
                  class="flex-shrink-0 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium
                         text-gray-600 hover:bg-gray-100 transition-colors">
                  {{ copied() ? '✓ Copied' : 'Copy' }}
                </button>
              </div>

              <!-- Instructions for staff -->
              <div class="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5">
                <p class="text-xs font-semibold text-amber-800 mb-1.5">How to give guest access:</p>
                <ol class="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                  <li>Show or print this QR code for the guest to scan</li>
                  <li>Or give the 6-digit code — guest enters it at the hotel portal</li>
                  <li>The code is valid until check-out date</li>
                </ol>
              </div>

              <!-- Action buttons -->
              <div class="flex gap-2">
                <button (click)="printAccess()"
                  class="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700
                         hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                  </svg>
                  Print
                </button>
                <button (click)="closeAccessModal()"
                  class="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold
                         hover:bg-indigo-700 transition-colors">
                  Done
                </button>
              </div>

            }
          </div>
        </div>
      </div>
    }

    <!-- ── Guest Card Info Modal ──────────────────────────────── -->
    @if (showCardModal() && activeCard()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-gray-900">Guest Card</h2>
              <p class="text-sm text-gray-500">RFID/QR dual-interface card</p>
            </div>
            <button (click)="showCardModal.set(false)" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div class="p-6 space-y-4">
            <div class="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white">
              <p class="text-xs text-emerald-200 mb-1">CARD NUMBER</p>
              <p class="text-2xl font-bold font-mono tracking-wider">{{ activeCard()!.card_number }}</p>
              <p class="text-xs text-emerald-200 mt-2 mb-0.5">CARD UID</p>
              <p class="font-mono text-sm">{{ activeCard()!.card_uid }}</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-gray-50 rounded-xl p-3">
                <p class="text-xs text-gray-400 mb-0.5">Status</p>
                <span class="px-2 py-0.5 rounded-full text-xs font-medium text-white inline-block"
                      [style.background-color]="activeCard()!.status_color">
                  {{ activeCard()!.status_label }}
                </span>
              </div>
              <div class="bg-gray-50 rounded-xl p-3">
                <p class="text-xs text-gray-400 mb-0.5">Issued At</p>
                <p class="text-sm font-medium text-gray-700">{{ activeCard()!.issued_at | date:'dd MMM, HH:mm' }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <a [routerLink]="['/guest-cards/events']" [queryParams]="{guest_id: booking()?.guest_id}"
                class="flex-1 text-center py-2.5 border border-gray-200 text-sm rounded-xl hover:bg-gray-50 text-gray-700">
                View History
              </a>
              <button (click)="reportCardLost()"
                class="flex-1 py-2.5 border border-amber-200 text-amber-700 text-sm rounded-xl hover:bg-amber-50">
                Report Lost
              </button>
              <button (click)="deactivateCard()"
                class="flex-1 py-2.5 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class BookingDetailPage implements OnInit {
  @ViewChild('qrCanvas') qrCanvasRef?: ElementRef<HTMLCanvasElement>;

  private api     = inject(ApiService);
  private auth    = inject(AuthService);
  private route   = inject(ActivatedRoute);
  private toast   = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  tokenSvc        = inject(TokenService);

  // ── Core state ──────────────────────────────────────────────
  loading       = signal(true);
  booking       = signal<any>(null);
  statusHistory = signal<any[]>([]);
  folioId       = signal('');
  invoiceId     = signal('');

  // ── Shadow rate (Invoice Override) state ─────────────────────
  showShadowForm  = signal(false);
  shadowRate      = signal(0);
  shadowTotal     = signal(0);
  savingShadow    = signal(false);
  shadowFormError = signal<string | null>(null);

  // ── Guest Access modal state ─────────────────────────────────
  showAccessModal = signal(false);
  loadingAccess   = signal(false);
  accessError     = signal<string | null>(null);
  accessData      = signal<any | null>(null);
  copied          = signal(false);

  // Guest card state
  activeCard      = signal<any | null>(null);
  showCardModal   = signal(false);
  issuingCard     = signal(false);

  private bookingId = '';

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.bookingId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.bookingId) this.loadBooking();
  }

  loadBooking(): void {
    this.loading.set(true);
    this.api.get(`/bookings/${this.bookingId}`).subscribe(r => {
      if (r.success) {
        this.booking.set(r.data);
        this.loadHistory();
        this.loadFolioAndInvoice();
        this.loadActiveCard();
      }
      this.loading.set(false);
    });
  }

  loadHistory(): void {
    this.api.get(`/bookings/${this.bookingId}/status-history`).subscribe(r => {
      if (r.success) this.statusHistory.set(r.data ?? []);
    });
  }

  loadFolioAndInvoice(): void {
    this.api.get(`/folios/by-booking/${this.bookingId}`).subscribe(r => {
      if (r.success && r.data?.folio) this.folioId.set(r.data.folio.id);
    });
    this.api.get(`/invoices/by-booking/${this.bookingId}`).subscribe(r => {
      if (r.success && r.data?.invoice) this.invoiceId.set(r.data.invoice.id);
    });
  }

  // ── Booking actions ───────────────────────────────────────────
  async doCheckIn(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Check In', message: 'Check in this guest?', variant: 'info' });
    if (!ok) return;

    this.api.post(`/bookings/${this.bookingId}/check-in`).subscribe(r => {
      if (r.success) {
        this.toast.success('Guest checked in!');
        this.loadBooking();
        // Automatically open guest access modal after check-in
        setTimeout(() => this.openGuestAccess(), 400);
      } else {
        this.toast.error(r.message || 'Check-in failed');
      }
    });
  }

  async doCheckOut(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Check Out', message: 'Check out this guest?', variant: 'info' });
    if (!ok) return;
    this.api.post(`/bookings/${this.bookingId}/check-out`).subscribe(r => {
      if (r.success) { this.toast.success('Guest checked out!'); this.loadBooking(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  async doCancel(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Cancel Booking', message: 'Cancel this booking?', variant: 'warning' });
    if (!ok) return;
    this.api.post(`/bookings/${this.bookingId}/cancel`).subscribe(r => {
      if (r.success) { this.toast.success('Booking cancelled'); this.loadBooking(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  async doNoShow(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'No Show', message: 'Mark this booking as no-show?', variant: 'warning' });
    if (!ok) return;
    this.api.post(`/bookings/${this.bookingId}/no-show`).subscribe(r => {
      if (r.success) { this.toast.success('Marked as no-show'); this.loadBooking(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  // ── Guest Access modal ────────────────────────────────────────
  openGuestAccess(): void {
    this.showAccessModal.set(true);
    this.accessData.set(null);
    this.accessError.set(null);
    this.loadGuestAccess();
  }

  closeAccessModal(): void {
    this.showAccessModal.set(false);
  }

  loadGuestAccess(): void {
    this.loadingAccess.set(true);
    this.accessError.set(null);

    this.api.get(`/bookings/${this.bookingId}/guest-access`).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.accessData.set(r.data);
          // Render QR code after the canvas is in the DOM
          setTimeout(() => this.renderQr(r.data.qr_data), 50);
        } else {
          this.accessError.set(r.message ?? 'Could not load guest access code.');
        }
        this.loadingAccess.set(false);
      },
      error: () => {
        this.accessError.set('Failed to load guest access. Please retry.');
        this.loadingAccess.set(false);
      },
    });
  }

  copyUrl(): void {
    const url = this.accessData()?.pwa_url;
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      this.toast.success('Link copied to clipboard');
      setTimeout(() => this.copied.set(false), 2500);
    });
  }

  printAccess(): void {
    const data = this.accessData();
    if (!data) return;

    const win = window.open('', '_blank', 'width=480,height=560');
    if (!win) { this.toast.error('Pop-up blocked — allow pop-ups to print'); return; }

    // Get the QR canvas image
    const canvas = this.qrCanvasRef?.nativeElement;
    const qrImg  = canvas ? canvas.toDataURL('image/png') : '';
    const b      = this.booking();

    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Guest Access — ${b?.booking_ref ?? ''}</title>
      <style>
        body { font-family: -apple-system, sans-serif; text-align: center; padding: 32px; color: #111; }
        .logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #3a543a; margin-bottom: 4px; }
        .ref  { font-size: 13px; color: #888; margin-bottom: 24px; }
        .qr   { border: 2px solid #e5e7eb; border-radius: 16px; padding: 16px; display: inline-block; margin-bottom: 20px; }
        .code { font-size: 48px; font-weight: 900; letter-spacing: 8px; font-family: monospace;
                color: #3730a3; background: #eef2ff; border-radius: 12px; padding: 12px 24px; margin-bottom: 8px; }
        .exp  { font-size: 11px; color: #aaa; margin-bottom: 20px; }
        .url  { font-size: 11px; color: #6b7280; word-break: break-all; margin-bottom: 24px; }
        .how  { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px;
                text-align: left; font-size: 12px; color: #92400e; max-width: 320px; margin: 0 auto; }
        .how li { margin-bottom: 4px; }
        @media print { .no-print { display: none; } }
      </style>
      </head><body>
      <div class="logo">Lodgik</div>
      <div class="ref">Booking ${b?.booking_ref ?? ''} · Room ${b?.room_number ?? '—'}</div>
      ${qrImg ? `<div class="qr"><img src="${qrImg}" width="180" height="180" alt="QR Code"/></div><br>` : ''}
      <div style="font-size:13px;color:#888;margin-bottom:8px;">Or enter your access code:</div>
      <div class="code">${data.access_code}</div>
      <div class="exp">Valid until ${new Date(data.expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      <div class="url">Open at: <strong>${data.pwa_url}</strong></div>
      <div class="how">
        <strong>How to access:</strong>
        <ol><li>Scan the QR code above with your phone camera</li>
        <li>Or visit the URL and enter your 6-digit code</li>
        <li>View your bill, request services, and chat with staff</li></ol>
      </div>
      <br>
      <button class="no-print" onclick="window.print()" style="padding:8px 20px;background:#3730a3;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Print</button>
      </body></html>
    `);
    win.document.close();
    win.focus();
  }

  // ── QR Code renderer (pure canvas — no external library) ──────
  private renderQr(data: string): void {
    const canvas = this.qrCanvasRef?.nativeElement;
    if (!canvas) return;

    // Use the QRCode API if available in window, otherwise draw a placeholder
    // We load qrcode.js via a dynamic script tag
    if (typeof (window as any).QRCode !== 'undefined') {
      this.drawQr(canvas, data);
    } else {
      this.loadQrScript(() => this.drawQr(canvas, data));
    }
  }

  private loadQrScript(callback: () => void): void {
    if (document.getElementById('qrcode-script')) { callback(); return; }
    const s = document.createElement('script');
    s.id  = 'qrcode-script';
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = callback;
    document.head.appendChild(s);
  }

  private drawQr(canvas: HTMLCanvasElement, data: string): void {
    try {
      // qrcode.js renders into a div, then we copy to canvas
      const tmp = document.createElement('div');
      tmp.style.visibility = 'hidden';
      tmp.style.position   = 'absolute';
      document.body.appendChild(tmp);

      new (window as any).QRCode(tmp, {
        text:         data,
        width:        200,
        height:       200,
        colorDark:    '#1e1b4b',
        colorLight:   '#ffffff',
        correctLevel: (window as any).QRCode.CorrectLevel.M,
      });

      // Copy the generated image onto our canvas
      setTimeout(() => {
        const img = tmp.querySelector('img') as HTMLImageElement | null;
        if (img && img.complete) {
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.drawImage(img, 0, 0, 200, 200); }
        } else if (img) {
          img.onload = () => {
            const ctx = canvas.getContext('2d');
            if (ctx) { ctx.drawImage(img, 0, 0, 200, 200); }
          };
        }
        document.body.removeChild(tmp);
      }, 100);
    } catch (e) {
      // Fallback: draw a basic placeholder with the code text
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#1e1b4b';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR unavailable', 100, 100);
      ctx.fillText('Use code below', 100, 120);
    }
  }

  // ── Status helpers ────────────────────────────────────────────
  statusLabel(status: string): string {
    return ({
      pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked In',
      checked_out: 'Checked Out', cancelled: 'Cancelled', no_show: 'No Show',
    } as Record<string, string>)[status] ?? status;
  }

  statusColor(status: string): string {
    return ({
      pending: '#f59e0b', confirmed: '#3b82f6', checked_in: '#22c55e',
      checked_out: '#6b7280', cancelled: '#ef4444', no_show: '#dc2626',
    } as Record<string, string>)[status] ?? '#6b7280';
  }

  // ── Guest Card Methods ────────────────────────────────────────
  loadActiveCard(): void {
    if (!this.bookingId) return;
    this.api.get(`/cards?booking_id=${this.bookingId}&status=active&limit=1`).subscribe({
      next: (r: any) => {
        const items = r.data?.items ?? [];
        this.activeCard.set(items.length ? items[0] : null);
      },
      error: () => {},
    });
  }

  issueGuestCard(): void {
    if (this.issuingCard()) return;
    this.issuingCard.set(true);
    this.api.post('/cards/issue', { booking_id: this.bookingId }).subscribe({
      next: (r: any) => {
        this.activeCard.set(r.data);
        this.toast.success(`Card ${r.data.card_number} issued to guest`);
        this.issuingCard.set(false);
      },
      error: (e: any) => {
        this.toast.error(e?.error?.message ?? 'No available cards in inventory');
        this.issuingCard.set(false);
      },
    });
  }

  openCardInfo(): void {
    this.showCardModal.set(true);
  }

  reportCardLost(): void {
    const card = this.activeCard();
    if (!card) return;
    this.api.post(`/cards/${card.id}/report-lost`, { notes: 'Reported at reception' }).subscribe({
      next: () => {
        this.toast.success('Card reported as lost');
        this.showCardModal.set(false);
        this.loadActiveCard();
      },
      error: (e: any) => this.toast.error(e?.error?.message ?? 'Failed'),
    });
  }

  deactivateCard(): void {
    const card = this.activeCard();
    if (!card) return;
    this.api.post(`/cards/${card.id}/deactivate`, { reason: 'manual' }).subscribe({
      next: () => {
        this.toast.success('Card deactivated');
        this.showCardModal.set(false);
        this.activeCard.set(null);
      },
      error: (e: any) => this.toast.error(e?.error?.message ?? 'Failed'),
    });
  }

  // ── Shadow Rate (Invoice Override) ────────────────────────────

  cancelShadowForm(): void {
    this.showShadowForm.set(false);
    this.shadowRate.set(0);
    this.shadowTotal.set(0);
    this.shadowFormError.set(null);
  }

  saveShadowRate(): void {
    const rate  = this.shadowRate();
    const total = this.shadowTotal();
    const actualRate  = +(this.booking()?.rate_per_night ?? 0);
    const actualTotal = +(this.booking()?.total_amount ?? 0);

    this.shadowFormError.set(null);

    if (!rate || !total) {
      this.shadowFormError.set('Both invoice rate and total are required.');
      return;
    }
    if (rate <= 0 || total <= 0) {
      this.shadowFormError.set('Values must be greater than zero.');
      return;
    }
    if (rate <= actualRate) {
      this.shadowFormError.set(
        `Invoice rate (₦${rate.toLocaleString()}) must exceed the actual rate (₦${actualRate.toLocaleString()}). ` +
        'The override is the higher amount shown to the guest; the difference is returned separately.'
      );
      return;
    }

    this.savingShadow.set(true);
    this.api.patch(`/bookings/${this.bookingId}/shadow-rate`, {
      shadow_rate_per_night: rate.toFixed(2),
      shadow_total_amount:   total.toFixed(2),
    }).subscribe({
      next: (r: any) => {
        this.savingShadow.set(false);
        if (r.success) {
          this.toast.success('Invoice rate override saved');
          this.booking.set(r.data);
          this.cancelShadowForm();
        } else {
          this.shadowFormError.set(r.message || 'Failed to save override');
        }
      },
      error: (e: any) => {
        this.savingShadow.set(false);
        this.shadowFormError.set(
          e?.error?.error?.message ?? e?.error?.message ?? 'Failed to save override'
        );
      },
    });
  }

  async clearShadowRate(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Remove Invoice Override',
      message: 'Remove the invoice rate override? The actual booking rate will appear on the invoice.',
      variant: 'warning',
    });
    if (!ok) return;

    this.savingShadow.set(true);
    this.api.patch(`/bookings/${this.bookingId}/shadow-rate`, { clear: true }).subscribe({
      next: (r: any) => {
        this.savingShadow.set(false);
        if (r.success) {
          this.toast.success('Invoice rate override removed');
          this.booking.set(r.data);
        } else {
          this.toast.error(r.message || 'Failed to remove override');
        }
      },
      error: (e: any) => {
        this.savingShadow.set(false);
        this.toast.error(e?.error?.message ?? 'Failed');
      },
    });
  }

}
