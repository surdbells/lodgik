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
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-700">📧 ZeptoMail Configuration</h3>
            <span class="text-xs px-2 py-0.5 rounded-full" [class]="config().zeptomail_configured ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">
              {{ config().zeptomail_configured ? '● Connected' : '○ Not configured' }}
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">API Key</label>
              <input [(ngModel)]="zeptomail.api_key" type="password" placeholder="zm-****" class="w-full px-3 py-2 border rounded-lg text-sm font-mono"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">From Email</label>
              <input [(ngModel)]="zeptomail.from_email" placeholder="noreply@lodgik.co" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">From Name</label>
              <input [(ngModel)]="zeptomail.from_name" placeholder="Lodgik" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          </div>
          <div class="flex gap-2 mt-3">
            <button (click)="saveSection('zeptomail', zeptomail)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Save</button>
            <button (click)="testEmail()" class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">📬 Send Test Email</button>
          </div>
        </div>

        <!-- Termii SMS / WhatsApp -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-700">📱 Termii (SMS + WhatsApp)</h3>
            <span class="text-xs px-2 py-0.5 rounded-full" [class]="config().termii_configured ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">
              {{ config().termii_configured ? '● Connected' : '○ Not configured' }}
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">API Key</label>
              <input [(ngModel)]="termii.api_key" type="password" placeholder="TL****" class="w-full px-3 py-2 border rounded-lg text-sm font-mono"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Sender ID</label>
              <input [(ngModel)]="termii.sender_id" placeholder="Lodgik" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Channel</label>
              <select [(ngModel)]="termii.default_channel" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="generic">Generic</option>
              </select></div>
          </div>
          <p class="text-xs text-gray-400 mt-2">WhatsApp webhook: <code class="bg-gray-100 px-1 rounded">{{ config().base_url || '' }}/api/webhooks/whatsapp</code></p>
          <div class="flex gap-2 mt-3">
            <button (click)="saveSection('termii', termii)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Save</button>
            <button (click)="testSms()" class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">📱 Send Test SMS</button>
          </div>
        </div>

        <!-- Paystack -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-700">💳 Paystack (Subscription Billing)</h3>
            <span class="text-xs px-2 py-0.5 rounded-full" [class]="config().paystack_configured ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'">
              {{ config().paystack_configured ? '● Connected' : '○ Not configured' }}
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Secret Key</label>
              <input [(ngModel)]="paystack.secret_key" type="password" placeholder="sk_****" class="w-full px-3 py-2 border rounded-lg text-sm font-mono"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Public Key</label>
              <input [(ngModel)]="paystack.public_key" type="password" placeholder="pk_****" class="w-full px-3 py-2 border rounded-lg text-sm font-mono"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Webhook Secret</label>
              <input [(ngModel)]="paystack.webhook_secret" type="password" placeholder="whsec_****" class="w-full px-3 py-2 border rounded-lg text-sm font-mono"></div>
          </div>
          <p class="text-xs text-gray-400 mt-2">Webhook URL: <code class="bg-gray-100 px-1 rounded">{{ config().base_url || '' }}/api/subscriptions/webhook</code></p>
          <button (click)="saveSection('paystack', paystack)" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Save</button>
        </div>

        <!-- Trial & Defaults -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">⏱️ Trial & Default Settings</h3>
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Trial (days)</label>
              <input [(ngModel)]="defaults.trial_days" type="number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Max Rooms</label>
              <input [(ngModel)]="defaults.default_max_rooms" type="number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Max Staff</label>
              <input [(ngModel)]="defaults.default_max_staff" type="number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Currency</label>
              <select [(ngModel)]="defaults.default_currency" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="NGN">NGN (₦)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option>
              </select></div>
          </div>
          <button (click)="saveSection('defaults', defaults)" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Save</button>
        </div>

        <!-- Feature Flags -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">🚩 Global Feature Flags</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (flag of flags; track flag.key) {
              <label class="flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm cursor-pointer hover:bg-gray-50"
                     [class.bg-emerald-50]="flagValues[flag.key]" [class.border-emerald-200]="flagValues[flag.key]">
                <div><span class="font-medium">{{ flag.label }}</span><p class="text-xs text-gray-400">{{ flag.description }}</p></div>
                <input type="checkbox" [(ngModel)]="flagValues[flag.key]" class="rounded text-emerald-600 ml-3">
              </label>
            }
          </div>
          <button (click)="saveSection('feature_flags', flagValues)" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Save Flags</button>
        </div>
      </div>
    }
  `,
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);
  config = signal<any>({});

  zeptomail: any = { api_key: '', from_email: 'noreply@lodgik.co', from_name: 'Lodgik' };
  termii: any = { api_key: '', sender_id: 'Lodgik', default_channel: 'whatsapp' };
  paystack: any = { secret_key: '', public_key: '', webhook_secret: '' };
  defaults: any = { trial_days: 14, default_max_rooms: 10, default_max_staff: 5, default_currency: 'NGN' };
  flagValues: Record<string, boolean> = {};

  flags = [
    { key: 'allow_self_registration', label: 'Self Registration', description: 'Hotels can register without invitation' },
    { key: 'require_email_verification', label: 'Email Verification', description: 'Require email verification on signup' },
    { key: 'enable_whatsapp', label: 'WhatsApp Messaging', description: 'Enable WhatsApp via Termii' },
    { key: 'enable_sms_otp', label: 'SMS OTP', description: 'Enable SMS OTP for guest login' },
    { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Show maintenance page to all tenants' },
    { key: 'enable_app_updates', label: 'App Auto-Updates', description: 'Push update prompts to apps' },
  ];

  ngOnInit(): void {
    this.api.get('/admin/settings').subscribe({
      next: r => {
        if (r.success) {
          const d = r.data;
          this.config.set(d);
          if (d.zeptomail) this.zeptomail = { ...this.zeptomail, ...d.zeptomail };
          if (d.termii) this.termii = { ...this.termii, ...d.termii };
          if (d.paystack) this.paystack = { ...this.paystack, ...d.paystack };
          if (d.defaults) this.defaults = { ...this.defaults, ...d.defaults };
          if (d.feature_flags) this.flagValues = { ...this.flagValues, ...d.feature_flags };
        }
        this.flags.forEach(f => { if (this.flagValues[f.key] === undefined) this.flagValues[f.key] = false; });
        this.loading.set(false);
      },
      error: () => { this.flags.forEach(f => { if (this.flagValues[f.key] === undefined) this.flagValues[f.key] = false; }); this.loading.set(false); },
    });
  }

  saveSection(section: string, data: any): void {
    this.api.patch('/admin/settings', { [section]: data }).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.toast.success(`${section} settings saved`);
          // Update local state from response
          if (r.data?.settings) {
            const d = r.data.settings;
            this.config.set(d);
            if (d.zeptomail) this.zeptomail = { ...this.zeptomail, ...d.zeptomail };
            if (d.termii) this.termii = { ...this.termii, ...d.termii };
            if (d.paystack) this.paystack = { ...this.paystack, ...d.paystack };
            if (d.defaults) this.defaults = { ...this.defaults, ...d.defaults };
            if (d.feature_flags) this.flagValues = { ...this.flagValues, ...d.feature_flags };
          }
        } else {
          this.toast.error(r.message || 'Failed');
        }
      },
      error: (e: any) => this.toast.error(e?.error?.message || 'Failed to save'),
    });
  }

  testEmail(): void {
    const email = prompt('Send test email to:', 'admin@lodgik.co');
    if (!email) return;
    this.api.post('/admin/settings/test-email', { email }).subscribe({
      next: (r: any) => { r.success ? this.toast.success(r.message || 'Test email sent') : this.toast.error(r.message || 'Failed'); },
      error: (e: any) => this.toast.error(e?.error?.message || 'Failed'),
    });
  }

  testSms(): void {
    const phone = prompt('Send test SMS to (with country code):', '+234');
    if (!phone) return;
    this.api.post('/admin/settings/test-sms', { phone }).subscribe({
      next: (r: any) => { r.success ? this.toast.success(r.message || 'Test SMS sent') : this.toast.error(r.message || 'Failed'); },
      error: (e: any) => this.toast.error(e?.error?.message || 'Failed'),
    });
  }
}
