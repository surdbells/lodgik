import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, BadgeComponent } from '@lodgik/shared';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, FormsModule, BadgeComponent],
  template: `
    <ui-page-header title="Settings" icon="settings" [breadcrumbs]="['System', 'Settings']" subtitle="Manage your hotel, staff, and integrations"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="space-y-6">
        <!-- Hotel Branding -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">🎨 Hotel Branding</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Hotel Name</label>
              <input [(ngModel)]="branding.name" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Primary Color</label>
              <div class="flex gap-2"><input [(ngModel)]="branding.primary_color" type="color" class="w-12 h-9 rounded cursor-pointer"><input [(ngModel)]="branding.primary_color" class="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"></div></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Secondary Color</label>
              <div class="flex gap-2"><input [(ngModel)]="branding.secondary_color" type="color" class="w-12 h-9 rounded cursor-pointer"><input [(ngModel)]="branding.secondary_color" class="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"></div></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Logo</label>
              <input type="file" (change)="onLogoSelect($event)" accept="image/*" class="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-sage-50 file:text-sage-600">
              @if (branding.logo_url) { <img [src]="branding.logo_url" class="mt-2 h-10 rounded"> }</div>
          </div>
          <button (click)="saveBranding()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Save Branding</button>
        </div>

        <!-- Bank Accounts -->
        <div class="bg-white rounded-lg border p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-700">🏦 Bank Accounts (for guest payments)</h3>
            <button (click)="showAddBank = !showAddBank" class="text-xs text-sage-600 hover:underline">{{ showAddBank ? 'Cancel' : '+ Add Bank' }}</button>
          </div>
          @if (showAddBank) {
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <input [(ngModel)]="newBank.bank_name" placeholder="Bank name" class="px-3 py-2 border rounded-lg text-sm">
              <input [(ngModel)]="newBank.account_number" placeholder="Account number" class="px-3 py-2 border rounded-lg text-sm">
              <input [(ngModel)]="newBank.account_name" placeholder="Account name" class="px-3 py-2 border rounded-lg text-sm">
              <button (click)="addBank()" class="px-3 py-2 bg-sage-600 text-white text-sm rounded-lg">Add</button>
            </div>
          }
          <div class="space-y-2">
            @for (b of banks(); track b.id) {
              <div class="flex items-center justify-between py-2 border-b border-gray-100">
                <div><p class="text-sm font-medium">{{ b.bank_name }}</p><p class="text-xs text-gray-500">{{ b.account_number }} — {{ b.account_name }}</p></div>
                <div class="flex items-center gap-2">
                  @if (b.is_primary) { <ui-badge variant="success">Primary</ui-badge> }
                  @else { <button (click)="setPrimary(b.id)" class="text-xs text-sage-600 hover:underline">Set Primary</button> }
                </div>
              </div>
            } @empty { <p class="text-sm text-gray-400 py-2">No bank accounts configured</p> }
          </div>
        </div>

        <!-- Staff Invitations -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">👥 Invite Staff</h3>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
            <input [(ngModel)]="invite.email" placeholder="Email" class="px-3 py-2 border rounded-lg text-sm">
            <input [(ngModel)]="invite.first_name" placeholder="First name" class="px-3 py-2 border rounded-lg text-sm">
            <input [(ngModel)]="invite.last_name" placeholder="Last name" class="px-3 py-2 border rounded-lg text-sm">
            <select [(ngModel)]="invite.role" class="px-3 py-2 border rounded-lg text-sm">
              <option value="manager">Manager</option><option value="front_desk">Front Desk</option><option value="housekeeping">Housekeeping</option>
              <option value="maintenance">Maintenance</option><option value="kitchen">Kitchen</option><option value="bar">Bar</option>
              <option value="restaurant">Restaurant</option><option value="accountant">Accountant</option><option value="security">Security</option><option value="concierge">Concierge</option>
            </select>
          </div>
          <button (click)="sendInvite()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">📧 Send Invitation</button>

          @if (staffList().length) {
            <div class="mt-4 border-t pt-3">
              <h4 class="text-xs font-medium text-gray-500 mb-2">Current Staff ({{ staffList().length }})</h4>
              <div class="space-y-1">
                @for (s of staffList(); track s.id) {
                  <div class="flex items-center justify-between py-1">
                    <span class="text-sm">{{ s.first_name }} {{ s.last_name }} <span class="text-gray-400">({{ s.email }})</span></span>
                    <ui-badge [variant]="s.is_active ? 'success' : 'neutral'">{{ s.role }}</ui-badge>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Locale / Timezone -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">🌍 Locale & Timezone</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Locale</label>
              <select [(ngModel)]="tenant().locale" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="en">English</option><option value="yo">Yoruba</option><option value="ha">Hausa</option><option value="ig">Igbo</option><option value="fr">French</option><option value="ar">Arabic</option>
              </select></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
              <select [(ngModel)]="tenant().timezone" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="Africa/Lagos">Africa/Lagos (WAT)</option><option value="UTC">UTC</option><option value="Europe/London">Europe/London</option>
              </select></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select [(ngModel)]="tenant().currency" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="NGN">NGN (₦)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option>
              </select></div>
          </div>
          <button (click)="saveLocale()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-lg">Save</button>
        </div>
      </div>
    }
  `,
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);
  tenant = signal<any>({});
  banks = signal<any[]>([]);
  staffList = signal<any[]>([]);
  showAddBank = false;
  branding: any = { name: '', primary_color: '#1e3a5f', secondary_color: '#f59e0b', logo_url: null };
  newBank: any = { bank_name: '', account_number: '', account_name: '' };
  invite: any = { email: '', first_name: '', last_name: '', role: 'front_desk' };
  logoFile: File | null = null;

  ngOnInit(): void {
    this.api.get('/tenant').subscribe(r => { if (r.success) { this.tenant.set(r.data); this.branding = { name: r.data.name, primary_color: r.data.primary_color || '#1e3a5f', secondary_color: r.data.secondary_color || '#f59e0b', logo_url: r.data.logo_url }; } this.loading.set(false); });
    this.api.get('/tenant/bank-accounts').subscribe(r => { if (r.success) this.banks.set(r.data || []); });
    this.api.get('/staff').subscribe(r => { if (r.success) this.staffList.set(r.data || []); });
  }

  saveBranding(): void {
    this.api.post('/onboarding/branding', this.branding).subscribe(r => { if (r.success) this.toast.success('Branding saved'); else this.toast.error('Failed'); });
  }

  onLogoSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) { this.logoFile = file; /* Upload would use FormData */ this.toast.info('Logo upload — use onboarding/upload-logo endpoint'); }
  }

  addBank(): void {
    this.api.post('/onboarding/bank-account', this.newBank).subscribe(r => {
      if (r.success) { this.toast.success('Bank added'); this.showAddBank = false; this.newBank = { bank_name: '', account_number: '', account_name: '' }; this.ngOnInit(); }
    });
  }

  setPrimary(id: string): void {
    this.api.patch(`/tenant/bank-accounts/${id}/primary`).subscribe(r => { if (r.success) { this.toast.success('Primary bank set'); this.ngOnInit(); } });
  }

  sendInvite(): void {
    this.api.post('/onboarding/invite-staff', { invites: [this.invite] }).subscribe(r => {
      if (r.success) { this.toast.success('Invitation sent!'); this.invite = { email: '', first_name: '', last_name: '', role: 'front_desk' }; }
      else this.toast.error(r.message || 'Failed');
    });
  }

  saveLocale(): void {
    const t = this.tenant();
    this.api.patch('/tenant', { locale: t.locale, timezone: t.timezone, currency: t.currency }).subscribe(r => { if (r.success) this.toast.success('Saved'); });
  }
}
