import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, ActivePropertyService,
} from '@lodgik/shared';

@Component({
  selector: 'app-additional-guest-validation',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Additional Guest Validation" subtitle="Validate visitor codes presented at front desk">
      <a routerLink="/bookings" class="px-3 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50">← Back</a>
    </ui-page-header>

    <!-- Code entry -->
    <div class="max-w-lg">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-5">
        <h3 class="text-sm font-bold text-gray-700 mb-4">Enter Visitor Code</h3>
        <div class="flex gap-3">
          <input
            [(ngModel)]="code"
            (ngModelChange)="code = $event.toUpperCase()"
            (keyup.enter)="validate()"
            placeholder="8-character code (e.g. A1B2C3D4)"
            maxlength="8"
            class="flex-1 px-4 py-3 border-2 rounded-xl text-center text-lg font-mono font-bold tracking-widest uppercase
                   focus:ring-2 focus:ring-sage-300 focus:border-sage-400 focus:outline-none
                   border-gray-200 bg-gray-50"
            [class.border-red-300]="error()"
            [class.bg-red-50]="error()"
            autofocus>
          <button (click)="validate()" [disabled]="validating() || code.length < 4"
            class="px-6 py-3 bg-sage-600 text-white font-bold rounded-xl hover:bg-sage-700 disabled:opacity-40 transition-colors whitespace-nowrap">
            {{ validating() ? '…' : 'Validate' }}
          </button>
        </div>
        @if (error()) {
          <div class="mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <span>⚠</span> {{ error() }}
          </div>
        }
        <p class="text-xs text-gray-400 mt-3">Guest generates this code from their Lodgik Guest App → Visitor Codes</p>
      </div>

      <!-- Validation result -->
      @if (result()) {
        <div class="space-y-4">
          <!-- Validity status banner -->
          <div class="flex items-center gap-3 px-5 py-3 rounded-2xl border-2"
               [class]="result()!.booking ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'">
            <span class="text-2xl">{{ result()!.booking ? '✅' : '❌' }}</span>
            <div>
              <p class="font-bold text-sm" [class]="result()!.booking ? 'text-emerald-800' : 'text-red-800'">
                {{ result()!.booking ? 'Valid Visitor Code' : 'Code Invalid or Expired' }}
              </p>
              <p class="text-xs mt-0.5" [class]="result()!.booking ? 'text-emerald-600' : 'text-red-600'">
                Code: <span class="font-mono font-bold">{{ result()!.code }}</span>
                · Valid until {{ fmtDate(result()!.valid_until) }}
              </p>
            </div>
          </div>

          @if (result()!.booking) {
            <!-- Visitor details -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Visitor</p>
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-bold text-lg">
                  {{ result()!.visitor_name?.charAt(0) }}
                </div>
                <div>
                  <p class="font-bold text-gray-900">{{ result()!.visitor_name }}</p>
                  @if (result()!.visitor_phone) {
                    <p class="text-sm text-gray-500">{{ result()!.visitor_phone }}</p>
                  }
                  @if (result()!.purpose) {
                    <p class="text-xs text-gray-400 mt-0.5">Purpose: {{ result()!.purpose }}</p>
                  }
                </div>
              </div>
            </div>

            <!-- Booking + Room -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Booking Details</p>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-gray-400 text-xs">Room</p>
                  <p class="font-bold text-2xl text-gray-900 mt-0.5">{{ result()!.room?.room_number ?? result()!.room_number ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-gray-400 text-xs">Booking Ref</p>
                  <p class="font-mono font-bold text-gray-800 mt-0.5">{{ result()!.booking?.booking_ref ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-gray-400 text-xs">Check-in</p>
                  <p class="font-semibold text-gray-800 mt-0.5">
                    {{ result()!.booking?.check_in ? fmtDate(result()!.booking!.check_in) : '—' }}
                  </p>
                </div>
                <div>
                  <p class="text-gray-400 text-xs">Check-out</p>
                  <p class="font-semibold text-gray-800 mt-0.5">
                    {{ result()!.booking?.check_out ? fmtDate(result()!.booking!.check_out) : '—' }}
                  </p>
                </div>
                <div>
                  <p class="text-gray-400 text-xs">Booking Type</p>
                  <p class="font-semibold text-gray-800 mt-0.5 capitalize">{{ result()!.booking?.booking_type?.split('_').join(' ') ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-gray-400 text-xs">Guests</p>
                  <p class="font-semibold text-gray-800 mt-0.5">{{ result()!.booking?.adults }}A {{ result()!.booking?.children > 0 ? result()!.booking?.children + 'C' : '' }}</p>
                </div>
              </div>
            </div>

            <!-- Primary Guest -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Primary Guest (Room Holder)</p>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-sage-100 border border-sage-300 flex items-center justify-center text-sage-700 font-bold">
                    {{ result()!.primary_guest?.name?.charAt(0) ?? '?' }}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900">{{ result()!.primary_guest?.name ?? 'Unknown' }}</p>
                    <p class="text-xs text-gray-500 mt-0.5">{{ result()!.primary_guest?.phone ?? '' }}</p>
                  </div>
                </div>
                @if (result()!.booking?.id) {
                  <a [routerLink]="['/bookings', result()!.booking!.id]"
                    class="text-xs text-sage-700 border border-sage-200 px-3 py-1.5 rounded-lg hover:bg-sage-50">
                    View Booking →
                  </a>
                }
              </div>
            </div>

            <!-- Notify primary guest -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notify Primary Guest of Visitor Arrival</p>
              <p class="text-xs text-gray-500 mb-3">
                Send a notification to <strong>{{ result()!.primary_guest?.name }}</strong> to confirm they are expecting
                <strong>{{ result()!.visitor_name }}</strong>.
              </p>

              <!-- Channel selection -->
              <div class="flex flex-wrap gap-2 mb-4">
                @for (ch of notifyChannels; track ch.value) {
                  <button (click)="toggleNotifyChannel(ch.value)"
                    class="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors"
                    [class.bg-sage-100]="selectedChannels.includes(ch.value)"
                    [class.border-sage-400]="selectedChannels.includes(ch.value)"
                    [class.text-sage-700]="selectedChannels.includes(ch.value)"
                    [class.bg-gray-50]="!selectedChannels.includes(ch.value)"
                    [class.border-gray-200]="!selectedChannels.includes(ch.value)"
                    [class.text-gray-600]="!selectedChannels.includes(ch.value)"
                    [disabled]="!channelAvailable(ch.value)">
                    {{ ch.icon }} {{ ch.label }}
                    @if (!channelAvailable(ch.value)) {
                      <span class="text-[10px] text-gray-400">(no {{ ch.value }})</span>
                    }
                  </button>
                }
              </div>

              <button (click)="notifyGuest()" [disabled]="notifying() || !selectedChannels.length"
                class="w-full py-3 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                @if (notifying()) {
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sending…
                } @else {
                  📣 Notify Primary Guest
                }
              </button>

              @if (notified().length) {
                <div class="mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
                  ✓ Notification sent via: {{ notified().join(', ') }}
                </div>
              }
            </div>

            <!-- Action buttons -->
            <div class="flex gap-3 pb-6">
              <button (click)="reset()"
                class="flex-1 py-3 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
                ✕ Validate Another
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdditionalGuestValidationPage {
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  code       = '';
  validating = signal(false);
  notifying  = signal(false);
  error      = signal('');
  result     = signal<any>(null);
  notified   = signal<string[]>([]);
  selectedChannels: string[] = ['sms', 'whatsapp'];

  notifyChannels = [
    { value: 'sms',      icon: '💬', label: 'SMS' },
    { value: 'whatsapp', icon: '📱', label: 'WhatsApp' },
    { value: 'email',    icon: '📧', label: 'Email' },
    { value: 'chat',     icon: '💬', label: 'In-app Chat' },
  ];

  validate(): void {
    const trimmed = this.code.trim().toUpperCase();
    if (trimmed.length < 4) { this.error.set('Enter the visitor code'); return; }
    const pid = this.activeProperty.propertyId();
    if (!pid) { this.error.set('No property selected'); return; }

    this.validating.set(true);
    this.error.set('');
    this.result.set(null);
    this.notified.set([]);

    this.api.post('/security/visitor-codes/validate', {
      code: trimmed,
      property_id: pid,
    }).subscribe({
      next: r => {
        this.validating.set(false);
        if (r.success) {
          this.result.set(r.data);
        } else {
          this.error.set(r.message || 'Invalid or expired visitor code');
        }
      },
      error: e => {
        this.validating.set(false);
        this.error.set(e?.error?.message || 'Invalid or expired visitor code');
      },
    });
  }

  toggleNotifyChannel(ch: string): void {
    const i = this.selectedChannels.indexOf(ch);
    i >= 0 ? this.selectedChannels.splice(i, 1) : this.selectedChannels.push(ch);
  }

  channelAvailable(ch: string): boolean {
    const g = this.result()?.primary_guest;
    if (!g) return false;
    if (ch === 'sms' || ch === 'whatsapp') return !!g.phone;
    if (ch === 'email') return !!g.email;
    return true; // chat always available
  }

  notifyGuest(): void {
    if (!this.result() || !this.selectedChannels.length) return;
    const pid = this.activeProperty.propertyId();
    this.notifying.set(true);

    this.api.post('/security/visitor-codes/validate', {
      code:            this.code.trim().toUpperCase(),
      property_id:     pid,
      notify:          true,
      notify_channels: this.selectedChannels,
    }).subscribe(r => {
      this.notifying.set(false);
      const sent = r.data?.notified_via ?? [];
      if (sent.length) {
        this.notified.set(sent);
        this.toast.success(`Primary guest notified via: ${sent.join(', ')}`);
      } else {
        this.toast.error('Notification could not be sent — check guest contact details');
      }
    });
  }

  fmtDate(dt: string): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  reset(): void {
    this.code = '';
    this.result.set(null);
    this.error.set('');
    this.notified.set([]);
  }
}
