import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="Platform Settings" subtitle="Configure platform-wide integrations and defaults"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="space-y-6">
        <!-- ZeptoMail -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-1">📧 ZeptoMail Configuration</h3>
          <p class="text-xs text-gray-500 mb-4">Transactional email settings for welcome, reset, and invitation emails</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">API Key</label>
              <input [(ngModel)]="config.zeptomail_api_key" type="password" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Zoho-enczapikey_..."></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">From Email</label>
              <input [(ngModel)]="config.zeptomail_from_email" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="noreply@lodgik.com"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">From Name</label>
              <input [(ngModel)]="config.zeptomail_from_name" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Lodgik"></div>
            <div class="flex items-end"><button (click)="testEmail()" class="px-3 py-2 text-sm border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50">📨 Test Email</button></div>
          </div>
        </div>

        <!-- Termii -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-1">📱 Termii SMS / WhatsApp</h3>
          <p class="text-xs text-gray-500 mb-4">SMS OTP, WhatsApp notifications, and guest communication</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">API Key</label>
              <input [(ngModel)]="config.termii_api_key" type="password" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="TL..."></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Sender ID</label>
              <input [(ngModel)]="config.termii_sender_id" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Lodgik"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Channel</label>
              <select [(ngModel)]="config.termii_channel" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="both">Both</option>
              </select></div>
          </div>
        </div>

        <!-- Paystack -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-1">💳 Paystack Configuration</h3>
          <p class="text-xs text-gray-500 mb-4">Subscription billing (not used for guest payments)</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Secret Key</label>
              <input [(ngModel)]="config.paystack_secret_key" type="password" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="sk_live_..."></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Public Key</label>
              <input [(ngModel)]="config.paystack_public_key" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="pk_live_..."></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Webhook Secret</label>
              <input [(ngModel)]="config.paystack_webhook_secret" type="password" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Webhook URL</label>
              <input value="/api/subscriptions/webhook" disabled class="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-500"></div>
          </div>
        </div>

        <!-- Trial & Defaults -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-1">⏱️ Trial & Defaults</h3>
          <p class="text-xs text-gray-500 mb-4">Default settings for new tenant signups</p>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Trial Duration (days)</label>
              <input [(ngModel)]="config.default_trial_days" type="number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Max Rooms</label>
              <input [(ngModel)]="config.default_max_rooms" type="number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Max Staff</label>
              <input [(ngModel)]="config.default_max_staff" type="number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Currency</label>
              <select [(ngModel)]="config.default_currency" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="NGN">NGN (₦)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option>
              </select></div>
          </div>
        </div>

        <!-- Feature Flags -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-1">🚩 Feature Flags</h3>
          <p class="text-xs text-gray-500 mb-4">Global platform feature toggles</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            @for (f of featureFlags; track f.key) {
              <label class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
                     [class.bg-emerald-50]="config.flags[f.key]">
                <input type="checkbox" [(ngModel)]="config.flags[f.key]" class="rounded text-emerald-600">
                {{ f.label }}
              </label>
            }
          </div>
        </div>

        <div class="flex justify-end">
          <button (click)="save()" class="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            Save All Settings
          </button>
        </div>
      </div>
    }
  `,
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);

  config: any = {
    zeptomail_api_key: '', zeptomail_from_email: 'noreply@lodgik.com', zeptomail_from_name: 'Lodgik',
    termii_api_key: '', termii_sender_id: 'Lodgik', termii_channel: 'whatsapp',
    paystack_secret_key: '', paystack_public_key: '', paystack_webhook_secret: '',
    default_trial_days: 14, default_max_rooms: 10, default_max_staff: 5, default_currency: 'NGN',
    flags: {} as Record<string, boolean>,
  };

  featureFlags = [
    { key: 'allow_self_signup', label: 'Allow self-signup' },
    { key: 'require_email_verification', label: 'Require email verification' },
    { key: 'enable_whatsapp', label: 'Enable WhatsApp messages' },
    { key: 'enable_guest_app', label: 'Enable guest mobile app' },
    { key: 'enable_offline_mode', label: 'Enable offline mode' },
    { key: 'maintenance_mode', label: 'Maintenance mode (block logins)' },
  ];

  ngOnInit(): void {
    this.api.get('/admin/settings').subscribe({
      next: r => { if (r.success && r.data) { this.config = { ...this.config, ...r.data, flags: { ...this.config.flags, ...(r.data.flags || {}) } }; } this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    this.api.put('/admin/settings', this.config).subscribe({
      next: r => { if (r.success) this.toast.success('Settings saved'); else this.toast.error(r.message || 'Failed'); },
      error: () => this.toast.error('Failed to save'),
    });
  }

  testEmail(): void {
    this.api.post('/admin/settings/test-email', {}).subscribe({
      next: r => { if (r.success) this.toast.success('Test email sent'); else this.toast.error(r.message || 'Failed'); },
    });
  }
}
