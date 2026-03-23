import { PAGE_TOURS } from '../../services/page-tours';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, ActivePropertyService , TourService} from '@lodgik/shared';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="Settings" icon="settings" [breadcrumbs]="['System', 'Settings']" subtitle="Manage hotel configuration, staff, and operational rules"
      tourKey="settings" (tourClick)="startTour()"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="space-y-5">

        <!-- ── Hotel Branding ─────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span class="text-base">🎨</span> Hotel Branding
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Hotel Name</label>
              <input [(ngModel)]="branding.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Primary Color</label>
              <div class="flex gap-2">
                <input [(ngModel)]="branding.primary_color" type="color" class="w-12 h-9 rounded cursor-pointer border border-gray-200">
                <input [(ngModel)]="branding.primary_color" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Secondary Color</label>
              <div class="flex gap-2">
                <input [(ngModel)]="branding.secondary_color" type="color" class="w-12 h-9 rounded cursor-pointer border border-gray-200">
                <input [(ngModel)]="branding.secondary_color" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Logo</label>
              <input type="file" (change)="onLogoSelect($event)" accept="image/*"
                class="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-sage-50 file:text-sage-600">
              @if (branding.logo_url) { <img [src]="branding.logo_url" class="mt-2 h-10 rounded"> }
            </div>
          </div>
          <button (click)="saveBranding()" class="mt-4 px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors">Save Branding</button>
        </div>

        <!-- ── Operational Settings ───────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 class="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <span class="text-base">⚙️</span> Property Operational Settings
          </h3>
          <p class="text-xs text-gray-400 mb-5">Rules for timing, security, finance controls, and housekeeping for this property.</p>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Timing -->
            <div class="space-y-4">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">⏱ Timing</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Grace Period <span class="text-gray-400">(mins)</span></label>
                  <input type="number" min="0" max="240" [(ngModel)]="ps.grace_period_minutes" placeholder="30"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                  <p class="text-xs text-gray-400 mt-0.5">After checkout time before room is flagged</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Late Checkout Fee <span class="text-gray-400">(₦)</span></label>
                  <input type="number" min="0" [(ngModel)]="ps.late_checkout_fee" placeholder="0"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                  <p class="text-xs text-gray-400 mt-0.5">Charged if guest stays past grace period</p>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Checkout Discrepancy Threshold <span class="text-gray-400">(mins)</span></label>
                <input type="number" min="0" [(ngModel)]="ps.checkout_discrepancy_threshold_minutes" placeholder="30"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                <p class="text-xs text-gray-400 mt-0.5">Gap between receptionist checkout and security exit that triggers a discrepancy alert</p>
              </div>
            </div>

            <!-- WiFi -->
            <div class="space-y-4">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">📶 WiFi</p>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">WiFi Network Name (SSID)</label>
                <input [(ngModel)]="ps.wifi_ssid" placeholder="e.g. GrandHotel_Guests"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">WiFi Password</label>
                <input [(ngModel)]="ps.wifi_password" type="password" placeholder="••••••••"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                <p class="text-xs text-gray-400 mt-0.5">Shown to guests on their folio and concierge tablet</p>
              </div>
            </div>

            <!-- Security Controls -->
            <div class="space-y-4">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">🔒 Security Controls</p>
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-gray-700">Require Card on Check-in</p>
                  <p class="text-xs text-gray-400 mt-0.5">Block check-in unless a guest card has been issued and linked to the booking</p>
                </div>
                <button type="button" (click)="ps.card_enforcement_enabled = !ps.card_enforcement_enabled"
                  class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none"
                  [class.bg-sage-600]="ps.card_enforcement_enabled" [class.bg-gray-200]="!ps.card_enforcement_enabled">
                  <span class="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                    [class.translate-x-5]="ps.card_enforcement_enabled" [class.translate-x-0]="!ps.card_enforcement_enabled"></span>
                </button>
              </div>
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-gray-700">Require Payment Receipt at Checkout</p>
                  <p class="text-xs text-gray-400 mt-0.5">Staff must confirm balance is zero or attach proof of payment before checkout is finalised</p>
                </div>
                <button type="button" (click)="ps.require_payment_receipt = !ps.require_payment_receipt"
                  class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none"
                  [class.bg-sage-600]="ps.require_payment_receipt" [class.bg-gray-200]="!ps.require_payment_receipt">
                  <span class="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                    [class.translate-x-5]="ps.require_payment_receipt" [class.translate-x-0]="!ps.require_payment_receipt"></span>
                </button>
              </div>
            </div>

            <!-- Finance Controls -->
            <div class="space-y-4">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">💰 Finance Controls</p>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Market Purchase Spending Limit <span class="text-gray-400">(₦, 0 = no limit)</span></label>
                <input type="number" min="0" [(ngModel)]="ps.market_purchase_spending_limit_display" placeholder="0"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                <p class="text-xs text-gray-400 mt-0.5">Single purchase above this triggers dual approval</p>
              </div>
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-gray-700">Require Dual Approval for Purchases</p>
                  <p class="text-xs text-gray-400 mt-0.5">A second approver (manager/admin) must confirm all market purchases</p>
                </div>
                <button type="button" (click)="ps.market_purchase_require_dual_approval = !ps.market_purchase_require_dual_approval"
                  class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none"
                  [class.bg-sage-600]="ps.market_purchase_require_dual_approval" [class.bg-gray-200]="!ps.market_purchase_require_dual_approval">
                  <span class="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                    [class.translate-x-5]="ps.market_purchase_require_dual_approval" [class.translate-x-0]="!ps.market_purchase_require_dual_approval"></span>
                </button>
              </div>
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-gray-700">Require Receipt or Signed Note</p>
                  <p class="text-xs text-gray-400 mt-0.5">Staff must attach proof for every market / walk-in purchase</p>
                </div>
                <button type="button" (click)="ps.market_purchase_require_receipt_or_note = !ps.market_purchase_require_receipt_or_note"
                  class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none"
                  [class.bg-sage-600]="ps.market_purchase_require_receipt_or_note" [class.bg-gray-200]="!ps.market_purchase_require_receipt_or_note">
                  <span class="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                    [class.translate-x-5]="ps.market_purchase_require_receipt_or_note" [class.translate-x-0]="!ps.market_purchase_require_receipt_or_note"></span>
                </button>
              </div>
            </div>

            <!-- VAT & Tax Controls -->
            <div class="space-y-4 lg:col-span-2 border-t border-gray-100 pt-5">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">🧾 VAT & Tax Settings</p>

              <!-- Master VAT switch -->
              <div class="flex items-start justify-between gap-4 max-w-xl">
                <div>
                  <p class="text-sm font-medium text-gray-700">Charge VAT on Bookings</p>
                  <p class="text-xs text-gray-400 mt-0.5">When disabled, no VAT is calculated or shown on invoices for this property</p>
                </div>
                <button type="button" (click)="ps.charge_vat_on_booking = !ps.charge_vat_on_booking"
                  class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none"
                  [class.bg-sage-600]="ps.charge_vat_on_booking" [class.bg-gray-200]="!ps.charge_vat_on_booking">
                  <span class="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                    [class.translate-x-5]="ps.charge_vat_on_booking" [class.translate-x-0]="!ps.charge_vat_on_booking"></span>
                </button>
              </div>

              <!-- Inclusive / Exclusive info box -->
              @if (ps.charge_vat_on_booking) {
                <div class="max-w-xl bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
                  <p class="font-semibold text-amber-800">How VAT is applied to invoices</p>
                  <p class="text-amber-700">
                    The VAT mode (inclusive or exclusive) is configured per room type.
                    For <strong>VAT-inclusive</strong> room types, the room price already contains VAT —
                    the invoice will extract and display the VAT component without adding to the total.
                    For <strong>VAT-exclusive</strong> room types, VAT is added on top of the room price on the invoice.
                  </p>
                  <p class="text-amber-600 text-xs">
                    ✦ Most Nigerian hotels use <strong>VAT-inclusive</strong> pricing. This is the default for new room types.
                    You can change this per room type in <strong>Rooms → Room Types</strong>.
                  </p>
                </div>
              }
            </div>

            <!-- Housekeeping Controls -->
            <div class="space-y-4 lg:col-span-2 border-t border-gray-100 pt-5">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">🧹 Housekeeping Controls</p>
              <div class="flex items-start justify-between gap-4 max-w-xl">
                <div>
                  <p class="text-sm font-medium text-gray-700">Require Admin Approval for Consumable Requests</p>
                  <p class="text-xs text-gray-400 mt-0.5">Housekeeping store requests go through storekeeper → admin before being fulfilled</p>
                </div>
                <button type="button" (click)="ps.require_admin_approval_for_consumables = !ps.require_admin_approval_for_consumables"
                  class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none"
                  [class.bg-sage-600]="ps.require_admin_approval_for_consumables" [class.bg-gray-200]="!ps.require_admin_approval_for_consumables">
                  <span class="inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                    [class.translate-x-5]="ps.require_admin_approval_for_consumables" [class.translate-x-0]="!ps.require_admin_approval_for_consumables"></span>
                </button>
              </div>
            </div>

          </div>

          <div class="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3">
            <button (click)="savePropertySettings()" [disabled]="savingSettings()"
              class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50 transition-colors">
              {{ savingSettings() ? 'Saving…' : 'Save Operational Settings' }}
            </button>
            @if (settingsSaved()) {
              <span class="text-xs text-green-600 font-medium flex items-center gap-1">✓ Saved</span>
            }
          </div>
        </div>

        <!-- ── Bank Accounts ───────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2"><span class="text-base">🏦</span> Bank Accounts <span class="text-xs font-normal text-gray-400">(displayed on guest invoices)</span></h3>
            <button (click)="showAddBank = !showAddBank" class="text-xs text-sage-600 hover:underline font-medium">{{ showAddBank ? 'Cancel' : '+ Add Account' }}</button>
          </div>
          @if (showAddBank) {
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <input [(ngModel)]="newBank.bank_name" placeholder="Bank name" class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <input [(ngModel)]="newBank.account_number" placeholder="Account number" class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <input [(ngModel)]="newBank.account_name" placeholder="Account name" class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <button (click)="addBank()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Add Account</button>
            </div>
          }
          <div class="space-y-2">
            @for (b of banks(); track b.id) {
              <div class="flex items-center justify-between py-2.5 border-b border-gray-50">
                <div>
                  <p class="text-sm font-medium text-gray-800">{{ b.bank_name }}</p>
                  <p class="text-xs text-gray-400 font-mono">{{ b.account_number }} — {{ b.account_name }}</p>
                </div>
                <div class="flex items-center gap-3">
                  @if (b.is_primary) { <span class="text-xs bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full font-medium">Primary</span> }
                  @else { <button (click)="setPrimary(b.id)" class="text-xs text-sage-600 hover:underline">Set Primary</button> }
                </div>
              </div>
            } @empty {
              <p class="text-sm text-gray-400 py-2">No bank accounts configured — add one above</p>
            }
          </div>
        </div>

        <!-- ── Invite Staff ────────────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><span class="text-base">👥</span> Invite Staff</h3>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
            <input [(ngModel)]="invite.email" placeholder="Email address" class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <input [(ngModel)]="invite.first_name" placeholder="First name" class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <input [(ngModel)]="invite.last_name" placeholder="Last name" class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <select [(ngModel)]="invite.role" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
              <option value="front_desk">Front Desk</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="security">Security</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button (click)="sendInvite()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors">📧 Send Invitation</button>
          @if (staffList().length) {
            <div class="mt-5 border-t border-gray-100 pt-4">
              <h4 class="text-xs font-semibold text-gray-500 mb-3">Current Staff ({{ staffList().length }})</h4>
              <div class="space-y-1.5">
                @for (s of staffList(); track s.id) {
                  <div class="flex items-center justify-between py-1.5">
                    <div>
                      <p class="text-sm font-medium text-gray-800">{{ s.first_name }} {{ s.last_name }}</p>
                      <p class="text-xs text-gray-400">{{ s.email }}</p>
                    </div>
                    <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{{ s.role }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- ── Locale & Timezone ──────────────────────────────── -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><span class="text-base">🌍</span> Locale & Timezone</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Locale</label>
              <select [(ngModel)]="tenant().locale" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                <option value="en">English</option><option value="yo">Yoruba</option><option value="ha">Hausa</option>
                <option value="ig">Igbo</option><option value="fr">French</option><option value="ar">Arabic</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Timezone</label>
              <select [(ngModel)]="tenant().timezone" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Currency</label>
              <select [(ngModel)]="tenant().currency" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                <option value="NGN">NGN (₦)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
          <button (click)="saveLocale()" class="mt-4 px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors">Save</button>
        </div>

      </div>
    }
  `,
})
export class SettingsPage implements OnInit {
  private tour = inject(TourService);
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  loading       = signal(true);
  savingSettings = signal(false);
  settingsSaved  = signal(false);

  tenant    = signal<any>({});
  banks     = signal<any[]>([]);
  staffList = signal<any[]>([]);

  showAddBank = false;
  branding: any = { name: '', primary_color: '#1e3a5f', secondary_color: '#f59e0b', logo_url: null };
  newBank: any  = { bank_name: '', account_number: '', account_name: '' };
  invite: any   = { email: '', first_name: '', last_name: '', role: 'front_desk' };
  logoFile: File | null = null;

  // Operational / property-level settings
  ps: any = {
    grace_period_minutes:                    30,
    late_checkout_fee:                       0,
    checkout_discrepancy_threshold_minutes:  30,
    wifi_ssid:                               '',
    wifi_password:                           '',
    card_enforcement_enabled:                false,
    require_payment_receipt:                 false,
    market_purchase_spending_limit_display:  0,
    market_purchase_require_dual_approval:   false,
    market_purchase_require_receipt_or_note: false,
    require_admin_approval_for_consumables:  false,
    // VAT settings
    charge_vat_on_booking:                   true,
  };

  ngOnInit(): void {
    this.api.get('/tenant').subscribe(r => {
      if (r.success) {
        this.tenant.set(r.data);
        this.branding = {
          name:            r.data.name,
          primary_color:   r.data.primary_color   || '#1e3a5f',
          secondary_color: r.data.secondary_color || '#f59e0b',
          logo_url:        r.data.logo_url,
        };
      }
      this.loading.set(false);
    });

    this.api.get('/tenant/bank-accounts').subscribe(r => {
      if (r.success) this.banks.set(r.data || []);
    });

    this.api.get('/staff').subscribe(r => {
      if (r.success) this.staffList.set(r.data || []);
    });

    // Load current property settings
    const pid = this.activeProperty.propertyId();
    if (pid) {
      this.api.get(`/tenant/properties/${pid}`).subscribe(r => {
        if (r.success && r.data?.settings) {
          const s = r.data.settings;
          this.ps = {
            grace_period_minutes:                    s.grace_period_minutes                    ?? 30,
            late_checkout_fee:                       (s.late_checkout_fee_kobo ?? 0) / 100,
            checkout_discrepancy_threshold_minutes:  s.checkout_discrepancy_threshold_minutes  ?? 30,
            wifi_ssid:                               s.wifi_ssid                               ?? '',
            wifi_password:                           s.wifi_password                           ?? '',
            card_enforcement_enabled:                s.card_enforcement_enabled                ?? false,
            require_payment_receipt:                 s.require_payment_receipt                 ?? false,
            market_purchase_spending_limit_display:  (s.market_purchase_spending_limit_kobo ?? 0) / 100,
            market_purchase_require_dual_approval:   s.market_purchase_require_dual_approval   ?? false,
            market_purchase_require_receipt_or_note: s.market_purchase_require_receipt_or_note ?? false,
            require_admin_approval_for_consumables:  s.require_admin_approval_for_consumables  ?? false,
            charge_vat_on_booking:                   s.charge_vat_on_booking                   ?? true,
          };
        }
      });
    }
  }

  savePropertySettings(): void {
    const pid = this.activeProperty.propertyId();
    if (!pid) { this.toast.error('No active property selected'); return; }
    this.savingSettings.set(true);
    this.settingsSaved.set(false);

    const payload = {
      grace_period_minutes:                    Number(this.ps.grace_period_minutes) || 0,
      late_checkout_fee_kobo:                  Math.round((Number(this.ps.late_checkout_fee) || 0) * 100),
      checkout_discrepancy_threshold_minutes:  Number(this.ps.checkout_discrepancy_threshold_minutes) || 30,
      wifi_ssid:                               this.ps.wifi_ssid,
      wifi_password:                           this.ps.wifi_password,
      card_enforcement_enabled:                !!this.ps.card_enforcement_enabled,
      require_payment_receipt:                 !!this.ps.require_payment_receipt,
      market_purchase_spending_limit_kobo:     Math.round((Number(this.ps.market_purchase_spending_limit_display) || 0) * 100),
      market_purchase_require_dual_approval:   !!this.ps.market_purchase_require_dual_approval,
      market_purchase_require_receipt_or_note: !!this.ps.market_purchase_require_receipt_or_note,
      require_admin_approval_for_consumables:  !!this.ps.require_admin_approval_for_consumables,
      charge_vat_on_booking:                   !!this.ps.charge_vat_on_booking,
    };

    this.api.patch(`/tenant/properties/${pid}/settings`, payload).subscribe({
      next: r => {
        this.savingSettings.set(false);
        if (r.success) {
          this.settingsSaved.set(true);
          this.toast.success('Operational settings saved');
          setTimeout(() => this.settingsSaved.set(false), 3000);
        } else {
          this.toast.error(r.message || 'Failed to save settings');
        }
      },
      error: () => { this.savingSettings.set(false); this.toast.error('Failed to save settings'); },
    });
  }

  saveBranding(): void {
    this.api.post('/onboarding/branding', this.branding).subscribe(r => {
      if (r.success) this.toast.success('Branding saved');
      else this.toast.error('Failed to save branding');
    });
  }

  onLogoSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) { this.logoFile = file; this.toast.info('Logo selected — upload via the logo endpoint'); }
  }

  addBank(): void {
    this.api.post('/onboarding/bank-account', this.newBank).subscribe(r => {
      if (r.success) {
        this.toast.success('Bank account added');
        this.showAddBank = false;
        this.newBank = { bank_name: '', account_number: '', account_name: '' };
        this.ngOnInit();
      } else {
        this.toast.error(r.message || 'Failed to add bank account');
      }
    });
  }

  setPrimary(id: string): void {
    this.api.patch(`/tenant/bank-accounts/${id}/primary`).subscribe(r => {
      if (r.success) { this.toast.success('Primary bank set'); this.ngOnInit(); }
    });
  }

  sendInvite(): void {
    this.api.post('/onboarding/invite-staff', { invites: [this.invite] }).subscribe(r => {
      if (r.success) {
        this.toast.success('Invitation sent!');
        this.invite = { email: '', first_name: '', last_name: '', role: 'front_desk' };
      } else {
        this.toast.error(r.message || 'Failed to send invitation');
      }
    });
  }

  saveLocale(): void {
    const t = this.tenant();
    this.api.patch('/tenant', { locale: t.locale, timezone: t.timezone, currency: t.currency }).subscribe(r => {
      if (r.success) this.toast.success('Locale saved');
    });
  }

  startTour(): void {
    this.tour.start(PAGE_TOURS['settings'] ?? [], 'settings');
  }
}
