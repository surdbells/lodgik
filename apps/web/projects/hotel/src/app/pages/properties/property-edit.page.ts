import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, TokenService } from '@lodgik/shared';

@Component({
  selector: 'app-property-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header [title]="form.name || 'Edit Property'" subtitle="Update property details and operational settings">
      <a routerLink="/properties" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Back</a>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Basic Info -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Basic Information</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Property Name *</label>
              <input [(ngModel)]="form.name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input [(ngModel)]="form.email" type="email" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input [(ngModel)]="form.phone" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Star Rating</label>
              <select [(ngModel)]="form.star_rating" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option [ngValue]="null">Not Rated</option>
                <option [ngValue]="1">★</option><option [ngValue]="2">★★</option><option [ngValue]="3">★★★</option>
                <option [ngValue]="4">★★★★</option><option [ngValue]="5">★★★★★</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Address</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Address</label>
              <input [(ngModel)]="form.address" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">City</label>
                <input [(ngModel)]="form.city" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">State</label>
                <input [(ngModel)]="form.state" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Country</label>
              <input [(ngModel)]="form.country" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
          </div>
        </div>

        <!-- Operations -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Operations</h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Check-in Time</label>
                <input [(ngModel)]="form.check_in_time" type="time" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Check-out Time</label>
                <input [(ngModel)]="form.check_out_time" type="time" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <input [(ngModel)]="form.is_active" type="checkbox" id="active" class="rounded">
              <label for="active" class="text-sm text-gray-700">Property is active</label>
            </div>
          </div>
        </div>

        <!-- Bank Accounts -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Bank Accounts</h3>
          @if (bankAccounts().length > 0) {
            <div class="space-y-2">
              @for (ba of bankAccounts(); track ba.id) {
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <p class="font-medium">{{ ba.bank_name }}</p>
                    <p class="text-xs text-gray-400">{{ ba.account_number }} · {{ ba.account_name }}</p>
                  </div>
                  @if (ba.is_primary) {
                    <span class="px-2 py-0.5 bg-sage-100 text-sage-700 text-xs rounded-full">Primary</span>
                  }
                </div>
              }
            </div>
          } @else {
            <p class="text-gray-400 text-sm py-4 text-center">No bank accounts configured</p>
          }
        </div>

        <!-- Operational Settings — property_admin only -->
        @if (tokenSvc.role() === 'property_admin') {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 lg:col-span-2">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <h3 class="text-sm font-semibold text-gray-700">Operational Settings</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              <!-- Timing -->
              <div class="space-y-3">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timing</p>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Grace Period (minutes)</label>
                  <input type="number" min="0" max="240" [(ngModel)]="settings.grace_period_minutes"
                    placeholder="30"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
                  <p class="text-xs text-gray-400 mt-1">Time after checkout before late fees apply</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Late Checkout Fee (₦)</label>
                  <input type="number" min="0" step="100" [(ngModel)]="settings.late_checkout_fee_display"
                    placeholder="5000"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
                  <p class="text-xs text-gray-400 mt-1">Stored in kobo internally</p>
                </div>
              </div>

              <!-- WiFi -->
              <div class="space-y-3">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">WiFi</p>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">WiFi SSID</label>
                  <input [(ngModel)]="settings.wifi_ssid"
                    placeholder="HotelGuest_5G"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">WiFi Password</label>
                  <input [(ngModel)]="settings.wifi_password"
                    placeholder="password123"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-sage-400">
                  <p class="text-xs text-gray-400 mt-1">Shown to guests on their access page</p>
                </div>
              </div>

              <!-- Security & Controls -->
              <div class="space-y-3">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Security Controls</p>

                <!-- Card Enforcement -->
                <div class="p-3 border border-gray-200 rounded-lg">
                  <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0 mr-3">
                      <p class="text-sm font-medium text-gray-700">Guest Card Enforcement</p>
                      <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">
                        Require an active RFID guest card before check-in is allowed. Security staff issue cards at the gate; reception links them to bookings.
                      </p>
                    </div>
                    <button type="button" (click)="settings.card_enforcement_enabled = !settings.card_enforcement_enabled"
                      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                             transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2"
                      [class.bg-sage-600]="settings.card_enforcement_enabled"
                      [class.bg-gray-200]="!settings.card_enforcement_enabled"
                      [attr.aria-checked]="settings.card_enforcement_enabled">
                      <span class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform
                                   ring-0 transition duration-200 ease-in-out"
                            [class.translate-x-5]="settings.card_enforcement_enabled"
                            [class.translate-x-0]="!settings.card_enforcement_enabled">
                      </span>
                    </button>
                  </div>
                  @if (settings.card_enforcement_enabled) {
                    <div class="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5">
                      <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                      </svg>
                      Enabled — check-in will be blocked until a guest card is attached
                    </div>
                  }
                </div>
              </div>

            </div>

            <div class="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3">
              <button (click)="saveSettings()" [disabled]="savingSettings()"
                class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700
                       disabled:opacity-50 transition-colors flex items-center gap-2">
                @if (savingSettings()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                }
                Save Operational Settings
              </button>
              @if (settingsSaved()) {
                <span class="text-xs text-green-600 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                  Saved
                </span>
              }
            </div>
          </div>
        }

      </div>

      <!-- Save basic info -->
      <div class="mt-6 flex gap-3">
        <button (click)="save()" class="px-6 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">Save Changes</button>
        <a routerLink="/properties" class="px-6 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</a>
      </div>
    }
  `,
})
export class PropertyEditPage implements OnInit {
  private api   = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  tokenSvc      = inject(TokenService);

  loading        = signal(true);
  bankAccounts   = signal<any[]>([]);
  savingSettings = signal(false);
  settingsSaved  = signal(false);

  private propertyId = '';

  form: any = {
    name: '', email: '', phone: '', address: '', city: '', state: '',
    country: 'NG', star_rating: null, check_in_time: '14:00', check_out_time: '12:00', is_active: true,
  };

  /** Operational settings — maps directly to PATCH /api/properties/{id}/settings keys */
  settings: any = {
    grace_period_minutes:       30,
    late_checkout_fee_display:  0,     // UI value in ₦; converted to kobo on save
    checkout_time:              '12:00',
    checkin_time:               '14:00',
    wifi_ssid:                  '',
    wifi_password:              '',
    card_enforcement_enabled:   false,
  };

  ngOnInit(): void {
    this.propertyId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.propertyId) this.loadProperty();
  }

  loadProperty(): void {
    this.api.get(`/properties/${this.propertyId}`).subscribe(r => {
      if (r.success) {
        const d = r.data as any;
        this.form = {
          name: d.name, email: d.email || '', phone: d.phone || '',
          address: d.address || '', city: d.city || '', state: d.state || '',
          country: d.country || 'NG', star_rating: d.star_rating,
          check_in_time: d.check_in_time || '14:00', check_out_time: d.check_out_time || '12:00',
          is_active: d.is_active,
        };

        // Hydrate settings from the property's JSONB settings object
        const s = d.settings ?? {};
        this.settings = {
          grace_period_minutes:      s.grace_period_minutes      ?? 30,
          late_checkout_fee_display: s.late_checkout_fee_kobo != null
            ? Math.round(s.late_checkout_fee_kobo / 100)
            : 0,
          checkout_time:             s.checkout_time             ?? '12:00',
          checkin_time:              s.checkin_time              ?? '14:00',
          wifi_ssid:                 s.wifi_ssid                 ?? '',
          wifi_password:             s.wifi_password             ?? '',
          card_enforcement_enabled:  s.card_enforcement_enabled  ?? false,
        };

        this.loadBankAccounts();
      }
      this.loading.set(false);
    });
  }

  loadBankAccounts(): void {
    this.api.get(`/properties/${this.propertyId}/bank-accounts`).subscribe(r => {
      if (r.success) this.bankAccounts.set(r.data ?? []);
    });
  }

  save(): void {
    if (!this.form.name) { this.toast.error('Name is required'); return; }
    const body = { ...this.form };
    Object.keys(body).forEach(k => { if (body[k] === '') body[k] = null; });
    this.api.put(`/properties/${this.propertyId}`, body).subscribe(r => {
      if (r.success) this.toast.success('Property updated');
      else this.toast.error(r.message || 'Failed');
    });
  }

  saveSettings(): void {
    this.savingSettings.set(true);
    this.settingsSaved.set(false);

    const payload: Record<string, unknown> = {
      grace_period_minutes:      Number(this.settings.grace_period_minutes) || 0,
      late_checkout_fee_kobo:    Math.round((Number(this.settings.late_checkout_fee_display) || 0) * 100),
      checkout_time:             this.settings.checkout_time,
      checkin_time:              this.settings.checkin_time,
      wifi_ssid:                 this.settings.wifi_ssid   || null,
      wifi_password:             this.settings.wifi_password || null,
      card_enforcement_enabled:  !!this.settings.card_enforcement_enabled,
    };

    this.api.patch(`/properties/${this.propertyId}/settings`, payload).subscribe({
      next: (r: any) => {
        this.savingSettings.set(false);
        if (r.success) {
          this.toast.success('Operational settings saved');
          this.settingsSaved.set(true);
          setTimeout(() => this.settingsSaved.set(false), 3000);
        } else {
          this.toast.error(r.message || 'Failed to save settings');
        }
      },
      error: (e: any) => {
        this.savingSettings.set(false);
        this.toast.error(e?.error?.message ?? 'Failed to save settings');
      },
    });
  }
}
